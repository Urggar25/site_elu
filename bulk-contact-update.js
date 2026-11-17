/* Mise à jour de fiches — prévisualisation obligatoire, aucune création ni fusion automatique. */
const bulkContactUpdate = { mode: "excel", file: null, headers: [], rows: [], sheet: "", mapping: [], matchMode: "city", scope: "all", listId: "", preview: null, busy: false, error: "", lastResult: "" };

function bulkNormalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g," ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function bulkDate(value) {
  if (typeof value === "number" || /^\d{5}(\.\d+)?$/.test(String(value ?? "").trim())) {
    const n = Number(value);
    if (n > 10000 && n < 100000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000).toISOString().slice(0, 10);
  }
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (match) return match[3]+"-"+match[2].padStart(2,"0")+"-"+match[1].padStart(2,"0");
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return iso ? iso[1]+"-"+iso[2].padStart(2,"0")+"-"+iso[3].padStart(2,"0") : "";
}
function bulkKey(name, first, third, mode) {
  const firstPart = bulkNormalize(name), secondPart = bulkNormalize(first);
  const thirdPart = mode === "birth" ? bulkDate(third) : bulkNormalize(third);
  return firstPart && secondPart && thirdPart ? JSON.stringify([firstPart, secondPart, thirdPart]) : "";
}
function bulkContactKey(contact, mode) {
  const names = [contact.lastName, contact.usageName, contact.birthName].filter(Boolean);
  const third = mode === "birth" ? contact.birthDate : contact.city;
  return [...new Set(names.map(name=>bulkKey(name,contact.firstName,third,mode)).filter(Boolean))];
}
function bulkColumns(headers, mode, mapping) {
  const out = {};
  ["lastName","firstName",mode === "birth" ? "birthDate" : "city"].forEach(field=>{
    const indexes = mapping.map((id,i)=>id==="match_"+field?i:-1).filter(i=>i>=0);
    if(indexes.length!==1)throw new Error("Associez une seule colonne à "+field+" pour identifier les contacts.");
    out[field]=indexes[0];
  });
  return out;
}
function bulkEligibleFields() {
  // Une modification de l'identité changerait l'ID de la fiche et ses liens : volontairement exclue.
  const blocked = new Set(["id","keywords","deathDateApprox","createdAt","updatedAt","tags"]);
  return contactFields().filter(f=>!blocked.has(f.id));
}
function bulkScopeContacts(scope, listId) {
  const all = adminState.localContacts.filter(c=>c.entityType!=="institution");
  if(scope==="all")return all;
  if(scope==="selected") {
    return isAllFilteredContactSelectionActive(contactSearchFilters()) ? filteredContacts() : all.filter(c=>selectedContactIds.has(c.id));
  }
  if(scope==="results")return filteredContacts();
  if(scope==="list") {
    const lists = normalizeSavedContactSearches(adminState.savedContactSearches);
    const list = lists.find(item=>item.id===listId);
    return list ? savedSearchContacts(list,lists) : [];
  }
  return [];
}
function bulkEvaluateExcel(rows, mapping, mode, scopeContacts) {
  const keys = bulkColumns([],mode,mapping);
  const fields = new Map(bulkEligibleFields().map(f=>[f.id,f]));
  const updates = mapping.map((id,i)=>fields.has(id)?[i,fields.get(id)]:null).filter(Boolean);
  if(!updates.length)throw new Error("Associez au moins une colonne à un champ à mettre à jour.");
  if(new Set(updates.map(item=>item[1].id)).size!==updates.length)throw new Error("Chaque champ à modifier ne peut être associé qu'à une seule colonne.");
  const index=new Map();
  scopeContacts.forEach(contact=>bulkContactKey(contact,mode).forEach(key=>{
    if(!index.has(key))index.set(key,[]);
    if(!index.get(key).some(c=>c.id===contact.id))index.get(key).push(contact);
  }));
  const items=[],usedIds=new Set(),errors={unmatched:0,ambiguous:0,duplicate:0,unchanged:0,invalid:0};
  rows.forEach((row,i)=>{
    if(!row.some(v=>String(v??"").trim()))return;
    const key=bulkKey(row[keys.lastName],row[keys.firstName],row[keys[mode==="birth"?"birthDate":"city"]],mode);
    if(!key){errors.invalid++;return;}
    const matches=index.get(key)||[];
    if(!matches.length){errors.unmatched++;return;}
    if(matches.length!==1){errors.ambiguous++;return;}
    const contact=matches[0];
    if(usedIds.has(contact.id)){errors.duplicate++;const previous=items.findIndex(item=>item.id===contact.id);if(previous>=0){items.splice(previous,1);errors.duplicate++;}return;}
    usedIds.add(contact.id);
    const changes={};
    for(const [col,field] of updates){
      const raw=String(row[col]??"").trim();
      if(!raw)continue; // Les cellules vides ne suppriment aucune donnée.
      const value=field.type==="date" ? bulkDate(raw) : parseContactImportValue(raw,field);
      if(field.type==="date"&&!value){errors.invalid++;continue;}
      if(field.type==="number"&&!Number.isFinite(value)){errors.invalid++;continue;}
      if(field.type==="boolean" && !/^(1|0|oui|non|yes|no|true|false|vrai|faux|x)$/i.test(raw)){errors.invalid++;continue;}
      if(JSON.stringify(contact[field.id]??"")!==JSON.stringify(value))changes[field.id]=value;
    }
    if(Object.keys(changes).length)items.push({id:contact.id,name:contactDisplayName(contact),row:i+2,changes});
    else errors.unchanged++;
  });
  return {items,errors,sourceRows:rows.length,scopeCount:scopeContacts.length};
}
function bulkApplyTags(contacts,add,remove) {
  const addIds=new Set(add.map(v=>bulkNormalize(v))),removeIds=new Set(remove.map(v=>bulkNormalize(v)));
  const items=[];
  contacts.forEach(contact=>{
    const original=contactKeywordValues(contact);
    let next=[...new Map(original.map(v=>[bulkNormalize(v),v])).values()];
    next=next.filter(v=>!removeIds.has(bulkNormalize(v)));
    add.forEach(v=>{if(!next.some(w=>bulkNormalize(w)===bulkNormalize(v)))next.push(v);});
    // Le statut décès est exclusif et réversible.
    if(next.some(isDeathKeyword))next=["décès"];
    if(JSON.stringify(next)!==JSON.stringify(original.filter((v,i,a)=>a.findIndex(x=>bulkNormalize(x)===bulkNormalize(v))===i))) {
      items.push({id:contact.id,name:contactDisplayName(contact),changes:{keywords:next,tags:[...next],...(removeIds.has("deces")?{deathDateApprox:""}:{})}});
    }
  });
  return {items,scopeCount:contacts.length};
}
function bulkReadXml(source) {
  const doc=new DOMParser().parseFromString(source,"application/xml");
  if(doc.querySelector("parsererror"))throw new Error("Le fichier Excel contient du XML illisible.");
  return doc;
}
function bulkXmlElements(doc,tag){return [...doc.getElementsByTagNameNS("*",tag)];}
function bulkCellColumn(ref){
  let col=0;for(const char of (String(ref).match(/^[A-Z]+/i)||[""])[0].toUpperCase())col=col*26+char.charCodeAt(0)-64;
  return col-1;
}
async function bulkReadExcel(file) {
  if(file.size>12*1024*1024)throw new Error("Fichier trop volumineux (12 Mo maximum).");
  if(/\.csv$/i.test(file.name)) {
    const rows=parseCsv(await file.text());
    if(rows.length<2)throw new Error("CSV vide ou sans données.");
    if(rows.length>10001)throw new Error("Maximum 10 000 lignes par opération.");
    return {headers:rows[0],rows:rows.slice(1),sheet:"CSV"};
  }
  if(!/\.xlsx$/i.test(file.name))throw new Error("Choisissez un fichier .xlsx ou .csv.");
  const entries=await readZipEntries(await file.arrayBuffer());
  const zip=new Map(entries.map(e=>[e.name,new TextDecoder("utf-8").decode(e.data)]));
  const workbook=bulkReadXml(zip.get("xl/workbook.xml")||"");
  const sheets=bulkXmlElements(workbook,"sheet");
  if(!sheets.length)throw new Error("Le classeur ne contient aucune feuille.");
  const relId=sheets[0].getAttribute("r:id")||sheets[0].getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
  const rels=bulkReadXml(zip.get("xl/_rels/workbook.xml.rels")||"");
  const rel=bulkXmlElements(rels,"Relationship").find(node=>node.getAttribute("Id")===relId);
  if(!rel)throw new Error("Impossible d'ouvrir la première feuille Excel.");
  const target=String(rel.getAttribute("Target")||"").replace(/\\/g,"/");
  const path=target.startsWith("/")?target.slice(1):"xl/"+target.replace(/^\.\//,"");
  const sheet=bulkReadXml(zip.get(path)||zip.get("xl/worksheets/sheet1.xml")||"");
  const shared=zip.has("xl/sharedStrings.xml")?bulkXmlElements(bulkReadXml(zip.get("xl/sharedStrings.xml")),"si").map(si=>bulkXmlElements(si,"t").map(t=>t.textContent||"").join("")):[];
  const rows=bulkXmlElements(sheet,"row").slice(0,10002).map(row=>{
    const values=[];
    bulkXmlElements(row,"c").forEach(cell=>{
      const idx=bulkCellColumn(cell.getAttribute("r"));
      if(idx<0||idx>512)return;
      const type=cell.getAttribute("t");
      const val=bulkXmlElements(cell,"v")[0]?.textContent||"";
      values[idx]=type==="s" ? (shared[Number(val)]||"") : type==="inlineStr" ? bulkXmlElements(cell,"t").map(t=>t.textContent||"").join("") : type==="b" ? (val==="1"?"oui":"non") : val;
    });
    return values;
  }).filter(row=>row.some(v=>String(v??"").trim()));
  if(rows.length<2)throw new Error("La première feuille ne contient pas de données.");
  if(rows.length>10001)throw new Error("Maximum 10 000 lignes par opération.");
  return {headers:rows[0],rows:rows.slice(1),sheet:sheets[0].getAttribute("name")||"Feuille 1"};
}
function bulkAutoMapping(headers) {
  const aliases=contactImportAliases();
  return headers.map(h=>{const id=aliases[slugify(h).replace(/-/g,"")]||"";return ["lastName","firstName","city","birthDate"].includes(id)?"match_"+id:id;});
}
function bulkSelectedTags(root,name) {
  return [...root.querySelectorAll('input[name="'+name+'"]:checked')].map(input=>input.value);
}
function bulkEscape(value) {return text(value);}
function bulkOptions(values,selected) {return values.map(item=>'<option value="'+attr(item[0])+'"'+(item[0]===selected?" selected":"")+'>'+bulkEscape(item[1])+'</option>').join("");}
function bulkScopeSelector() {
  const selectedCount=isAllFilteredContactSelectionActive(contactSearchFilters())?filteredContacts().length:selectedContactIds.size;
  const lists=normalizeSavedContactSearches(adminState.savedContactSearches);
  const scopes=[["all","Tous les contacts"],["selected","Contacts sélectionnés ("+selectedCount+")"],["results","Résultats de la recherche actuelle"],["list","Une liste sauvegardée"]];
  return '<div class="bulk-contact-scope"><label>Périmètre des fiches <select data-bulk-scope>'+bulkOptions(scopes,bulkContactUpdate.scope)+'</select></label>'+
    (bulkContactUpdate.scope==="list"?'<label>Liste <select data-bulk-list>'+bulkOptions([["","Choisir une liste…"],...lists.map(item=>[item.id,item.name])],bulkContactUpdate.listId)+'</select></label>':"")+
    '<small>Seules les fiches de ce périmètre seront modifiées. Aucun contact n’est créé.</small></div>';
}
function bulkExcelPanel() {
  const state=bulkContactUpdate;
  const fields=[["","Ignorer cette colonne"],["match_lastName","Clé : Nom"],["match_firstName","Clé : Prénom"],["match_city","Clé : Commune"],["match_birthDate","Clé : Date de naissance"],...bulkEligibleFields().map(f=>[f.id,"Modifier : "+f.label])];
  const map=state.headers.length?'<section class="bulk-contact-card"><h4>Associer les colonnes</h4><p>Les trois colonnes d’identité servent uniquement au rapprochement. Les autres champs sont mis à jour lorsque la cellule n’est pas vide.</p><div class="bulk-contact-columns">'+state.headers.map((header,i)=>'<label><strong>'+bulkEscape(header||"Colonne "+(i+1))+'</strong><small>'+bulkEscape(state.rows[0]?.[i]??"")+'</small><select data-bulk-column="'+i+'">'+bulkOptions(fields,state.mapping[i]||"")+'</select></label>').join("")+'</div></section>':"";
  const preview=state.preview&&state.mode==="excel"?bulkPreviewHtml(state.preview):"";
  return '<div class="bulk-contact-card"><h4>1. Fichier de mise à jour</h4><p>Excel (.xlsx), première feuille, ou CSV. Le fichier est analysé dans votre navigateur. Vérifiez les correspondances avant d’appliquer.</p><label class="contact-dropzone">↑ Choisir un fichier .xlsx ou .csv<input data-bulk-file type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" /></label>'+
    (state.file?'<p><strong>'+bulkEscape(state.file.name)+'</strong> · '+bulkEscape(state.sheet)+' · '+state.rows.length+' ligne(s)</p>':"")+'</div>'+
    (state.headers.length?'<section class="bulk-contact-card"><h4>2. Critère de rapprochement</h4><label>Identification par <select data-bulk-match>'+bulkOptions([["city","Nom + prénom + commune"],["birth","Nom + prénom + date de naissance"]],state.matchMode)+'</select></label><p>Si plusieurs fiches correspondent ou si une ligne est introuvable, elle est ignorée. Aucun rapprochement approximatif.</p></section>':"")+
    map+(state.headers.length?'<button type="button" class="primary-action" data-bulk-preview>Prévisualiser les changements</button>':"")+preview;
}
function bulkTagPanel() {
  const choices=contactKeywordChoices(),state=bulkContactUpdate;
  return '<section class="bulk-contact-card"><h4>Ajouter et retirer des mots-clés</h4><p>Sélectionnez un ou plusieurs mots-clés existants ; seules les fiches du périmètre choisi seront concernées. Le mot-clé « décès » reste exclusif.</p>'+
    '<div class="bulk-contact-tag-grids"><fieldset><legend>À ajouter</legend>'+choices.map(w=>'<label><input type="checkbox" name="bulkAdd" value="'+attr(w.label)+'" '+((state.tagAdd||[]).includes(w.label)?"checked":"")+'> '+bulkEscape(w.label)+'</label>').join("")+'</fieldset><fieldset><legend>À retirer</legend>'+choices.map(w=>'<label><input type="checkbox" name="bulkRemove" value="'+attr(w.label)+'" '+((state.tagRemove||[]).includes(w.label)?"checked":"")+'> '+bulkEscape(w.label)+'</label>').join("")+'</fieldset></div>'+
    '<button type="button" class="primary-action" data-bulk-tag-preview>Prévisualiser les changements</button></section>'+
    (state.preview&&state.mode==="tags"?bulkPreviewHtml(state.preview):"");
}
function bulkPreviewHtml(preview) {
  const state=bulkContactUpdate, stats=preview.errors;
  const details=stats?'<p class="bulk-contact-warning">Sans correspondance : '+stats.unmatched+' · Ambiguës : '+stats.ambiguous+' · Doublons Excel : '+stats.duplicate+' · Inchangées : '+stats.unchanged+' · Incomplètes / valeurs invalides : '+stats.invalid+'</p>':"";
  return '<section class="bulk-contact-card bulk-contact-preview"><h4>3. Vérification avant enregistrement</h4><p><strong>'+preview.items.length+' fiche(s) à modifier</strong> sur '+preview.scopeCount+' fiche(s) éligibles.</p>'+details+
    (preview.items.length?'<div class="bulk-contact-preview-table"><table><thead><tr><th>Fiche</th><th>Modifications</th></tr></thead><tbody>'+preview.items.slice(0,25).map(item=>'<tr><td>'+bulkEscape(item.name)+'</td><td>'+Object.entries(item.changes).map(([id,value])=>'<strong>'+bulkEscape(id)+'</strong> : '+bulkEscape(Array.isArray(value)?value.join(", "):value)).join(" · ")+'</td></tr>').join("")+'</tbody></table></div><p>Aperçu des 25 premières fiches. Les cellules vides ne suppriment jamais les valeurs existantes.</p><button type="button" class="primary-action" data-bulk-commit '+(state.busy?"disabled":"")+'>'+ (state.busy?"Enregistrement…":"Confirmer la mise à jour des "+preview.items.length+" fiches")+'</button>':"<p>Aucune modification à enregistrer.</p>")+'</section>';
}
function renderBulkContactUpdates() {
  const s=bulkContactUpdate;
  return '<section class="contact-io-workspace bulk-contact-workspace"><header class="contact-io-workspace-head"><div><h3>Mise à jour de fiches</h3><p>Mise à jour massive avec rapprochement strict et prévisualisation. Aucun contact créé, aucune donnée effacée sans action explicite.</p></div></header>'+
    '<div class="bulk-contact-modes"><button type="button" data-bulk-mode="excel" class="'+(s.mode==="excel"?"is-active":"")+'">À partir d’un Excel</button><button type="button" data-bulk-mode="tags" class="'+(s.mode==="tags"?"is-active":"")+'">Mots-clés en masse</button></div>'+
    bulkScopeSelector()+(s.error?'<p class="bulk-contact-error" role="alert">'+bulkEscape(s.error)+'</p>':"")+
    (s.lastResult?'<p class="bulk-contact-success" role="status">'+bulkEscape(s.lastResult)+'</p>':"")+
    (s.mode==="excel"?bulkExcelPanel():bulkTagPanel())+'</section>';
}
async function bulkCommit() {
  const s=bulkContactUpdate,preview=s.preview;
  if(s.busy||!preview?.items.length)return;
  if(!confirm("Mettre à jour "+preview.items.length+" fiches ? Cette opération modifie la base de contacts."))return;
  const current=new Map(adminState.localContacts.map(contact=>[contact.id,contact]));
  if(preview.items.some(item=>!current.has(item.id))) {s.preview=null;s.error="Des contacts ont changé. Relancez la prévisualisation.";renderAdmin();return;}
  const previous={...cloneAdminState(),localContacts:adminState.localContacts.map(c=>({...c,keywords:[...(c.keywords||[])],tags:Array.isArray(c.tags)?[...c.tags]:c.tags}))};
  const now=new Date().toISOString();
  for(const item of preview.items) {
    const contact=current.get(item.id);
    const previousId=contact.id;
    Object.assign(contact,item.changes);
    if(["firstName","lastName","usageName","birthName","birthDate"].some(id=>Object.prototype.hasOwnProperty.call(item.changes,id))) {
      synchronizeContactIdentity(contact);
      assignUniqueContactId(contact,previousId);
      updateContactReferences(previousId,contact.id);
      if(selectedContactId===previousId)selectedContactId=contact.id;
    }
    if(item.changes.keywords) {
      contact.tags=[...contact.keywords];
      synchronizeDeathKeyword(contact);
    }
    contact.updatedAt=now;
  }
  s.busy=true;
  const ok=await saveAdminStateToDatabaseOnly("mise à jour massive","mise à jour de fiches",preview.items.length+" fiches",previous);
  s.busy=false;s.preview=null;
  if(ok) {s.lastResult=preview.items.length+" fiches mises à jour.";s.error="";showToast(s.lastResult);}
  else {s.error="Enregistrement impossible : la mise à jour a été annulée.";s.lastResult="";}
  renderAdmin();
}
if(typeof document!=="undefined"){
  document.addEventListener("change",async event=>{
    const t=event.target;
    if(t.matches("[data-bulk-file]")){
      const file=t.files?.[0];if(!file)return;
      bulkContactUpdate.error="";bulkContactUpdate.preview=null;bulkContactUpdate.file=null;
      try {
        const sheet=await bulkReadExcel(file);
        Object.assign(bulkContactUpdate,{file,headers:sheet.headers,rows:sheet.rows,sheet:sheet.sheet,mapping:bulkAutoMapping(sheet.headers)});
      } catch(error) {bulkContactUpdate.error=error.message||"Lecture impossible.";}
      renderAdmin();return;
    }
    if(t.matches("[data-bulk-column]")){bulkContactUpdate.mapping[Number(t.dataset.bulkColumn)]=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-match]")){bulkContactUpdate.matchMode=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-scope]")){bulkContactUpdate.scope=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-list]")){bulkContactUpdate.listId=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches('input[name="bulkAdd"],input[name="bulkRemove"]')){bulkContactUpdate.preview=null;const pane=t.closest(".bulk-contact-workspace");bulkContactUpdate.tagAdd=bulkSelectedTags(pane,"bulkAdd");bulkContactUpdate.tagRemove=bulkSelectedTags(pane,"bulkRemove");renderAdmin();}
  });
  document.addEventListener("click",async event=>{
    const t=event.target,s=bulkContactUpdate;
    if(t.closest("[data-bulk-mode]")){s.mode=t.closest("[data-bulk-mode]").dataset.bulkMode;s.scope=s.mode==="tags"?(selectedContactIds.size?"selected":"results"):"all";s.preview=null;s.error="";renderAdmin();return;}
    if(t.closest("[data-bulk-preview]")){
      s.error="";s.preview=null;
      try{
        if(!s.rows.length)throw new Error("Chargez un fichier d'abord.");
        const contacts=bulkScopeContacts(s.scope,s.listId);
        if(!contacts.length)throw new Error("Le périmètre choisi ne contient aucun contact.");
        s.preview=bulkEvaluateExcel(s.rows,s.mapping,s.matchMode,contacts);
      }catch(error){s.error=error.message;}
      renderAdmin();return;
    }
    if(t.closest("[data-bulk-tag-preview]")){
      s.error="";s.preview=null;
      const root=t.closest(".bulk-contact-workspace");
      const add=bulkSelectedTags(root,"bulkAdd"),remove=bulkSelectedTags(root,"bulkRemove");
      if(!add.length&&!remove.length){s.error="Choisissez des mots-clés à ajouter ou à retirer.";renderAdmin();return;}
      if(add.some(v=>remove.some(w=>bulkNormalize(v)===bulkNormalize(w)))){s.error="Un mot-clé ne peut pas être ajouté et retiré simultanément.";renderAdmin();return;}
      const contacts=bulkScopeContacts(s.scope,s.listId);
      if(!contacts.length){s.error="Le périmètre choisi ne contient aucun contact.";renderAdmin();return;}
      s.preview=bulkApplyTags(contacts,add,remove);
      // Conserver les sélections pendant la prévisualisation après le re-rendu.
      s.tagAdd=add;s.tagRemove=remove;
      renderAdmin();
      const pane=document.querySelector(".bulk-contact-workspace");
      pane?.querySelectorAll('input[name="bulkAdd"],input[name="bulkRemove"]').forEach(input=>input.checked=(input.name==="bulkAdd"?add:remove).includes(input.value));
      return;
    }
    if(t.closest("[data-bulk-commit]")){await bulkCommit();}
  });
}
