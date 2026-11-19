/* Mise à jour de fiches — prévisualisation obligatoire, aucune création ni fusion automatique. */
const bulkContactUpdate = { mode: "excel", file: null, headers: [], rows: [], sheet: "", mapping: [], matchMode: "city", scope: "all", listId: "", preview: null, createMissing: true, columnPolicies: [], busy: false, error: "", lastResult: "" };

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

function bulkAddressParts(input) {
  const raw=String(input??"").trim().replace(/\s+/g," ");
  if(!raw)return {number:"",street:""};
  const match=raw.match(/^(\d{1,5})(?:\s*[-,]?\s*(bis|ter|quater|[A-Z]))?(?:\s*[,.-]?\s+|\s*,\s*)(.+)$/i);
  return match ? {number:match[1]+(match[2]?" "+match[2].toLowerCase():""),street:match[3].trim()} : {number:"",street:raw};
}
function bulkColumnPolicies(mapping,policies=[]) {
  return mapping.map((id,i)=>id.startsWith("match_")||!id?"ignore":(["ignore","overwrite","empty"].includes(policies[i])?policies[i]:"overwrite"));
}
function bulkApplyValue(target,field,value,policy) {
  if(!field||policy==="ignore"||value===""||value==null||(Array.isArray(value)&&!value.length))return;
  const old=target[field],empty=old==null||String(old).trim()===""||(Array.isArray(old)&&!old.length);
  if(policy==="empty"&&!empty)return;
  if(JSON.stringify(old??"")!==JSON.stringify(value))target[field]=value;
}
function bulkEvaluateExcel(rows,mapping,mode,scopeContacts,options={}) {
  const keys=bulkColumns([],mode,mapping),fields=new Map(bulkEligibleFields().map(f=>[f.id,f]));
  const policies=bulkColumnPolicies(mapping,options.policies||[]);
  const updates=mapping.map((id,i)=>(id==="address_auto"||fields.has(id))&&policies[i]!=="ignore"?{col:i,id,policy:policies[i]}:null).filter(Boolean);
  if(!updates.length)throw new Error("Associez au moins une colonne à renseigner avec une action active.");
  if(new Set(updates.map(item=>item.id)).size!==updates.length)throw new Error("Un même champ est associé à plusieurs colonnes.");
  if(updates.some(item=>item.id==="address_auto")&&updates.some(item=>["streetNumber","streetName","streetNameFull"].includes(item.id)))throw new Error("Ne combinez pas l'adresse complète et ses colonnes séparées.");
  const allContacts=options.allContacts||scopeContacts,index=new Map(),globalIndex=new Map();
  const add=(map,contact)=>bulkContactKey(contact,mode).forEach(key=>{
    if(!map.has(key))map.set(key,[]);
    if(!map.get(key).some(c=>c.id===contact.id))map.get(key).push(contact);
  });
  scopeContacts.forEach(c=>add(index,c));
  allContacts.filter(c=>c.entityType!=="institution").forEach(c=>add(globalIndex,c));
  const items=[],creates=[],rejected=[],errors={unmatched:0,ambiguous:0,duplicate:0,unchanged:0,invalid:0,outsideScope:0};
  const rowKeys=rows.map(row=>bulkKey(row[keys.lastName],row[keys.firstName],row[keys[mode==="birth"?"birthDate":"city"]],mode));
  const occurrences=new Map();rowKeys.forEach(key=>{if(key)occurrences.set(key,(occurrences.get(key)||0)+1);});
  const usedIds=new Set(allContacts.map(c=>c.id));
  rows.forEach((row,i)=>{
    if(!row.some(v=>String(v??"").trim()))return;
    const key=rowKeys[i],line=i+2;
    const reject=(reason,type)=>{errors[type]++;rejected.push({row:line,reason});};
    if(!key){reject("Identité incomplète","invalid");return;}
    if(occurrences.get(key)>1){reject("Identité dupliquée dans le fichier","duplicate");return;}
    const matches=index.get(key)||[];
    if(matches.length>1){reject("Plusieurs fiches correspondent","ambiguous");return;}
    if(!matches.length&&(globalIndex.get(key)||[]).length){reject("Fiche existante hors du périmètre choisi","outsideScope");return;}
    const creating=!matches.length;
    if(creating&&!options.createMissing){reject("Aucune fiche correspondante","unmatched");return;}
    const original=creating?{
      id:"",firstName:String(row[keys.firstName]??"").trim(),lastName:String(row[keys.lastName]??"").trim(),
      [mode==="birth"?"birthDate":"city"]:mode==="birth"?bulkDate(row[keys.birthDate]):String(row[keys.city]??"").trim(),
      keywords:[],tags:[],comments:[]
    }:matches[0];
    const candidate={...original};let invalid=false;
    for(const update of updates){
      const raw=String(row[update.col]??"").trim();
      if(!raw)continue;
      if(update.id==="address_auto"){
        const address=bulkAddressParts(raw);
        bulkApplyValue(candidate,"streetNumber",address.number,update.policy);
        bulkApplyValue(candidate,"streetName",address.street,update.policy);
        bulkApplyValue(candidate,"streetNameFull",address.street,update.policy);
        continue;
      }
      const field=fields.get(update.id);
      const value=field.type==="date"?bulkDate(raw):parseContactImportValue(raw,field);
      if((field.type==="date"&&!value)||(field.type==="number"&&!Number.isFinite(value))||(field.type==="boolean"&&!/^(1|0|oui|non|yes|no|true|false|vrai|faux|x)$/i.test(raw))){invalid=true;break;}
      bulkApplyValue(candidate,field.id,value,update.policy);
    }
    if(invalid){reject("Valeur de colonne invalide","invalid");return;}
    if(creating){
      const now=new Date().toISOString();
      const contact=normalizeContactRecord({...candidate,createdAt:now,updatedAt:now},usedIds);
      creates.push({id:contact.id,name:contactDisplayName(contact),row:line,contact});
    }else{
      const changes=Object.fromEntries(Object.keys(candidate).filter(id=>JSON.stringify(candidate[id])!==JSON.stringify(original[id])).map(id=>[id,candidate[id]]));
      if(Object.keys(changes).length)items.push({id:original.id,name:contactDisplayName(original),row:line,changes});
      else errors.unchanged++;
    }
  });
  return {items,creates,rejected,errors,sourceRows:rows.length,scopeCount:scopeContacts.length};
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
  return headers.map(h=>{const key=slugify(h).replace(/-/g,"");const id=aliases[key]||(key==="commune"||key==="municipalite"?"city":"");return ["lastName","firstName","city","birthDate"].includes(id)?"match_"+id:id;});
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
    '<small>Ce périmètre limite les fiches recherchées ; les nouvelles fiches sont créées uniquement si elles sont absentes de toute la base.</small></div>';
}
function bulkExcelPanel() {
  const state=bulkContactUpdate;
  const fields=[["","Ignorer cette colonne"],["match_lastName","Clé : Nom"],["match_firstName","Clé : Prénom"],["match_city","Clé : Commune"],["match_birthDate","Clé : Date de naissance"],["address_auto","Adresse complète (numéro et rue)"],...bulkEligibleFields().map(f=>[f.id,"Champ : "+f.label])];
  const policies=bulkColumnPolicies(state.mapping,state.columnPolicies);
  const map=state.headers.length?'<section class="bulk-contact-card"><h4>Associer les colonnes</h4><p>Les colonnes-clés servent au rapprochement. Chaque colonne de données dispose de sa propre règle de mise à jour ; une adresse complète peut être séparée automatiquement.</p><div class="bulk-contact-columns">'+state.headers.map((header,i)=>'<label><strong>'+bulkEscape(header||"Colonne "+(i+1))+'</strong><small>'+bulkEscape(state.rows[0]?.[i]??"")+'</small><select data-bulk-column="'+i+'">'+bulkOptions(fields,state.mapping[i]||"")+'</select><select data-bulk-policy="'+i+'" aria-label="Action pour '+attr(header||("colonne "+(i+1)))+'" '+(!state.mapping[i]||state.mapping[i].startsWith("match_")?"disabled":"")+'>'+bulkOptions([["ignore","Ignorer"],["overwrite","Remplir si différent mais non vide"],["empty","Remplir si vide"]],policies[i])+'</select></label>').join("")+'</div></section>':"";
  const preview=state.preview&&state.mode==="excel"?bulkPreviewHtml(state.preview):"";
  return '<div class="bulk-contact-card"><h4>1. Fichier de mise à jour</h4><p>Excel (.xlsx), première feuille, ou CSV. Le fichier est analysé dans votre navigateur. Vérifiez les correspondances avant d’appliquer.</p><label class="contact-dropzone">↑ Choisir un fichier .xlsx ou .csv<input data-bulk-file type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" /></label>'+
    (state.file?'<p><strong>'+bulkEscape(state.file.name)+'</strong> · '+bulkEscape(state.sheet)+' · '+state.rows.length+' ligne(s)</p>':"")+'</div>'+
    (state.headers.length?'<section class="bulk-contact-card"><h4>2. Critère de rapprochement</h4><label>Identification par <select data-bulk-match>'+bulkOptions([["city","Nom + prénom + commune"],["birth","Nom + prénom + date de naissance"]],state.matchMode)+'</select></label><p>Les correspondances ambiguës et les doublons sont ignorés.</p><label class="check-line"><input type="checkbox" data-bulk-create '+(state.createMissing?"checked":"")+' /> Créer les fiches sans correspondance et renseigner leurs colonnes</label></section>':"")+
    map+(state.headers.length?'<button type="button" class="primary-action" data-bulk-preview>Prévisualiser les changements</button>':"")+preview;
}
function bulkTagPanel() {
  const choices=contactKeywordChoices(),state=bulkContactUpdate;
  return '<section class="bulk-contact-card"><h4>Ajouter et retirer des mots-clés</h4><p>Sélectionnez un ou plusieurs mots-clés existants ; seules les fiches du périmètre choisi seront concernées. Le mot-clé « décès » reste exclusif.</p>'+
    '<label>Créer et ajouter un ou plusieurs nouveaux mots-clés (séparés par une virgule)<input data-bulk-tag-new type="text" maxlength="500" value="'+attr(state.tagNew||'')+'" placeholder="Ex. bénévole, association locale" /></label><div class="bulk-contact-tag-grids"><fieldset><legend>À ajouter</legend>'+choices.map(w=>'<label><input type="checkbox" name="bulkAdd" value="'+attr(w.label)+'" '+((state.tagAdd||[]).includes(w.label)?"checked":"")+'> '+bulkEscape(w.label)+'</label>').join("")+'</fieldset><fieldset><legend>À retirer</legend>'+choices.map(w=>'<label><input type="checkbox" name="bulkRemove" value="'+attr(w.label)+'" '+((state.tagRemove||[]).includes(w.label)?"checked":"")+'> '+bulkEscape(w.label)+'</label>').join("")+'</fieldset></div>'+
    '<button type="button" class="primary-action" data-bulk-tag-preview>Prévisualiser les changements</button></section>'+
    (state.preview&&state.mode==="tags"?bulkPreviewHtml(state.preview):"");
}

function bulkPreviewHtml(preview) {
  const state=bulkContactUpdate,creates=preview.creates||[],total=preview.items.length+creates.length,stats=preview.errors;
  const details=stats?'<p class="bulk-contact-warning">Sans correspondance : '+stats.unmatched+' · Ambiguës : '+stats.ambiguous+' · Lignes Excel dupliquées : '+stats.duplicate+' · Inchangées : '+stats.unchanged+' · Hors périmètre : '+(stats.outsideScope||0)+' · Invalides : '+stats.invalid+'</p>':"";
  const rejects=preview.rejected?.length?'<details><summary>Voir les lignes ignorées ('+preview.rejected.length+')</summary><ul>'+preview.rejected.slice(0,30).map(item=>'<li>Ligne '+item.row+' — '+bulkEscape(item.reason)+'</li>').join("")+'</ul></details>':"";
  const updated=preview.items.slice(0,25).map(item=>'<tr><td>'+bulkEscape(item.name)+'</td><td>'+Object.entries(item.changes).map(([key,value])=>'<strong>'+bulkEscape(key)+'</strong> : '+bulkEscape(Array.isArray(value)?value.join(", "):value)).join(" · ")+'</td></tr>').join("");
  const newRows=creates.slice(0,Math.max(0,25-preview.items.length)).map(item=>'<tr><td>'+bulkEscape(item.name)+' <strong>(création)</strong></td><td>'+Object.entries(item.contact).filter(([key])=>!["id","comments","tags","createdAt","updatedAt"].includes(key)).map(([key,value])=>'<strong>'+bulkEscape(key)+'</strong> : '+bulkEscape(Array.isArray(value)?value.join(", "):value)).join(" · ")+'</td></tr>').join("");
  return '<section class="bulk-contact-card bulk-contact-preview"><h4>3. Vérification avant enregistrement</h4><p><strong>'+preview.items.length+' fiche(s) à modifier</strong> et <strong>'+creates.length+' fiche(s) à créer</strong> parmi '+preview.scopeCount+' contacts recherchés.</p>'+details+rejects+
    (total?'<div class="bulk-contact-preview-table"><table><thead><tr><th>Contact</th><th>Données prévues</th></tr></thead><tbody>'+updated+newRows+'</tbody></table></div><p>Aperçu des 25 premiers contacts. Les cellules vides ne suppriment aucune donnée.</p><button type="button" class="primary-action" data-bulk-commit '+(state.busy?"disabled":"")+'>'+(state.busy?"Enregistrement…":"Confirmer "+preview.items.length+" modification(s) et "+creates.length+" création(s)")+'</button>':"<p>Aucune modification à enregistrer.</p>")+'</section>';
}
function renderBulkContactUpdates() {
  const s=bulkContactUpdate;
  return '<section class="contact-io-workspace bulk-contact-workspace"><header class="contact-io-workspace-head"><div><h3>Mise à jour de fiches</h3><p>Mise à jour massive avec rapprochement strict et prévisualisation. Création optionnelle des contacts absents ; prévisualisation avant tout enregistrement.</p></div></header>'+
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
    const oldName=contact.lastName,oldUsage=contact.usageName;
    Object.assign(contact,item.changes);
    if(Object.prototype.hasOwnProperty.call(item.changes,"lastName")&&!Object.prototype.hasOwnProperty.call(item.changes,"usageName")&&bulkNormalize(oldUsage)===bulkNormalize(oldName)) contact.usageName=contact.lastName;
    if(["firstName","lastName","usageName","birthName","birthDate"].some(id=>Object.prototype.hasOwnProperty.call(item.changes,id))) {
      synchronizeContactIdentity(contact);
      assignUniqueContactId(contact,previousId);
      updateContactReferences(previousId,contact.id);
      if(selectedContactId===previousId)selectedContactId=contact.id;
    }
    if(item.changes.keywords) {
      contact.tags=[...contact.keywords];
      synchronizeDeathKeyword(contact);
      registerContactKeywords(contact);
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
        Object.assign(bulkContactUpdate,{file,headers:sheet.headers,rows:sheet.rows,sheet:sheet.sheet,mapping:bulkAutoMapping(sheet.headers),columnPolicies:[]});
      } catch(error) {bulkContactUpdate.error=error.message||"Lecture impossible.";}
      renderAdmin();return;
    }
    if(t.matches("[data-bulk-column]")){bulkContactUpdate.mapping[Number(t.dataset.bulkColumn)]=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-policy]")){bulkContactUpdate.columnPolicies[Number(t.dataset.bulkPolicy)]=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-create]")){bulkContactUpdate.createMissing=t.checked;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-match]")){bulkContactUpdate.matchMode=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-scope]")){bulkContactUpdate.scope=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-list]")){bulkContactUpdate.listId=t.value;bulkContactUpdate.preview=null;renderAdmin();return;}
    if(t.matches("[data-bulk-tag-new]")){bulkContactUpdate.tagNew=t.value;bulkContactUpdate.preview=null;return;}
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
        s.preview=bulkEvaluateExcel(s.rows,s.mapping,s.matchMode,contacts,{createMissing:s.createMissing,policies:s.columnPolicies,allContacts:adminState.localContacts});
      }catch(error){s.error=error.message;}
      renderAdmin();return;
    }
    if(t.closest("[data-bulk-tag-preview]")){
      s.error="";s.preview=null;
      const root=t.closest(".bulk-contact-workspace");
      const newLabels=String(root.querySelector("[data-bulk-tag-new]")?.value||"").split(/[,;]/).map(x=>x.trim()).filter(Boolean);
      if(newLabels.some(label=>label.length>80)||newLabels.length>20){s.error="Maximum 20 nouveaux mots-clés de 80 caractères chacun.";renderAdmin();return;}
      const add=[...new Set([...bulkSelectedTags(root,"bulkAdd"),...newLabels])],remove=bulkSelectedTags(root,"bulkRemove");
      s.tagNew=String(root.querySelector("[data-bulk-tag-new]")?.value||"");
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
