/* Institutions / migration des mairies, isolé du moteur de contacts historique. */
(function () {
"use strict";
let proposals = null;
let choices = new Set();
let busy = false;
let status = "";
let query = "";
let selectedId = "";

const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/['’]/g," ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
const cleanTown = (v) => norm(String(v || "").replace(/\s*\(\d+\)\s*$/, ""));
const escape = (v) => String(v ?? "").replace(/[&<>"']/g,(x)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[x]));
const display = (v) => [v.firstName,v.lastName||v.usageName].filter(Boolean).join(" ") || v.organization || v.id;
const values = (v) => Array.isArray(v.keywords) ? v.keywords : String(v.keywords || "").split(/[,;]/).map(x=>x.trim()).filter(Boolean);
const tagged = (v,t) => values(v).some(x=>norm(x)===t);
const identity = (v) => norm((v.firstName||"")+" "+(v.lastName||v.usageName||""));
const institutions = () => Array.isArray(adminState.institutions) ? adminState.institutions : [];
const persons = () => (adminState.localContacts||[]).filter(v=>v.entityType!=="institution");
const candidateEvidence = (v) => {
  const signals = [];
  const org = norm(v.organization), role = norm(v.role), label = norm(display(v));
  const mail = norm(v.email), address = norm([v.streetNameFull,v.streetName].filter(Boolean).join(" "));
  if (/\b(mairie|hotel de ville|commune de)\b/.test(org)) signals.push("organisation mairie");
  if (/\b(mairie|hotel de ville)\b/.test(label)) signals.push("nom institutionnel");
  if (["institution","administration"].includes(norm(v.category))) signals.push("catégorie institutionnelle");
  if (/\b(secretariat de mairie|accueil mairie|service municipal|mairie de)\b/.test(role)) signals.push("fonction administrative");
  if (/(^|[ ._-])mairie([ ._-]|$)/.test(mail)) signals.push("courriel mairie");
  if (/\b(hotel de ville|place de la mairie|rue de la mairie)\b/.test(address)) signals.push("adresse mairie");
  return signals;
};
function analyze() {
  const existing = institutions();
  const existingTowns = new Set(existing.map(x=>cleanTown(x.city)));
  const grouped = new Map();
  for(const contact of adminState.localContacts||[]) {
    if (contact.entityType === "institution") continue;
    const town = cleanTown(contact.city);
    if(!town) continue;
    if(!grouped.has(town)) grouped.set(town,[]);
    grouped.get(town).push(contact);
  }
  const result=[], warnings=[];
  for (const [town, records] of grouped) {
    if(existingTowns.has(town)) continue;
    const labeled = records.map(c=>({c, evidence:candidateEvidence(c)})).filter(x=>x.evidence.length);
    if(!labeled.length) continue;
    // A commune with several possible institution records requires human review.
    for (const {c,evidence} of labeled) {
      const sameName = identity(c);
      const otherPeople = records.filter(p=>p.id!==c.id && sameName && identity(p)===sameName && p.firstName && (p.lastName||p.usageName));
      const otherInstitution = labeled.filter(v=>v.c.id!==c.id);
      const strong = evidence.some(t=>["organisation mairie","nom institutionnel","fonction administrative","courriel mairie"].includes(t));
      const safe = strong && otherInstitution.length===0 && (otherPeople.length===1 || !c.firstName);
      const personId = otherPeople.length===1 ? otherPeople[0].id : "";
      const reason = otherInstitution.length ? "Plusieurs fiches institutionnelles possibles dans la commune" :
        otherPeople.length>1 ? "Plusieurs personnes homonymes" :
        !strong ? "Indice insuffisant pour classification automatique" :
        c.firstName && !personId ? "Personne physique correspondante introuvable" : "";
      result.push({ id:c.id, town, city:c.city, personId, evidence, safe, reason, contact:c });
    }
  }
  return { items:result.sort((a,b)=>a.city.localeCompare(b.city,"fr")), warnings,
    peopleCount: persons().length, existingCount:existing.length };
}
function refresh() {
  proposals=analyze();
  choices=new Set(proposals.items.filter(p=>p.safe).map(p=>p.id));
}
function snapshot() {
  return { format:"institutions-backup-v1", createdAt:new Date().toISOString(),
    localContacts:adminState.localContacts, institutions:institutions() };
}
function backup() {
  downloadFile("sauvegarde-contacts-institutions-"+new Date().toISOString().slice(0,10)+".json",
    JSON.stringify(snapshot(),null,2),"application/json;charset=utf-8");
  status="Sauvegarde JSON téléchargée.";
  if(activeAdminSection==="institution-migration") renderAdmin();
}
const newInstitution = (c, personId, ids) => {
  const city = c.city||"";
  const id="mairie-"+cleanTown(city).replace(/ /g,"-");
  const now=new Date().toISOString();
  return {id:ids.has(id) ? id+"-"+ids.size : id,
    kind:"mairie",name:"Mairie de "+city,city,postalCode:c.postalCode||"",
    streetNumber:c.streetNumber||"",streetName:c.streetName||"",streetNameFull:c.streetNameFull||"",
    phone:c.phone||c.mobile||"",email:c.email||"",
    mayorContactId:personId||"",deputyContactIds:[],
    legacyContactId:c.id,createdAt:now,updatedAt:now};
};
function plan() {
  if (!proposals) return null;
  const selected=proposals.items.filter(p=>choices.has(p.id));
  const existingIds=new Set(institutions().map(x=>x.id));
  const byTown=new Set(institutions().map(x=>cleanTown(x.city)));
  const changes=[], created=[], newPeople=[], conflicts=[];
  const usedContactIds=new Set((adminState.localContacts||[]).map(c=>c.id));
  const byId=new Map((adminState.localContacts||[]).map(x=>[x.id,x]));
  const changed=new Map();
  for(const p of selected) {
    if(byTown.has(p.town)){conflicts.push(p.city+" : mairie déjà enregistrée");continue;}
    if(p.reason && /plusieurs/i.test(p.reason)){conflicts.push(p.city+" : correspondance ambiguë");continue;}
    const legacy=byId.get(p.id);
    if(!legacy) continue;
    let person=p.personId ? byId.get(p.personId) : null;
    if(p.personId && (!person || person.id===legacy.id || person.entityType==="institution")) {
      conflicts.push(p.city+" : personne associée invalide"); continue;
    }
    if(!person && legacy.firstName && (legacy.lastName || legacy.usageName)) {
      // Separate a single institutional mayor record without losing the real person.
      person=normalizeContactRecord({
        firstName:legacy.firstName,lastName:legacy.lastName||legacy.usageName,
        city:legacy.city,category:"maire",keywords:["maire"],
        entityType:"person",mandates:[],institutionId:""
      },usedContactIds);
      newPeople.push(person);
    }
    const entry=newInstitution(legacy,person?.id||"",existingIds);
    existingIds.add(entry.id);
    byTown.add(p.town);
    created.push(entry);
    // Non destructive: original remains available to existing letters/events by its ID.
    const kw=values(legacy).filter(x=>norm(x)!=="maire" && norm(x)!=="adjoint");
    if(!kw.some(x=>norm(x)==="institutionnel")) kw.push("institutionnel");
    changed.set(legacy.id,{...legacy,entityType:"institution",institutionId:entry.id,
      category:"institution",keywords:kw,updatedAt:new Date().toISOString()});
    if(person) {
      const mandates=Array.isArray(person.mandates)?person.mandates.slice():[];
      if(!mandates.some(m=>m.institutionId===entry.id && m.role==="maire" && m.active)) {
        mandates.push({role:"maire",institutionId:entry.id,startDate:"",endDate:"",active:true});
      }
      const pkw=values(person);
      if(!pkw.some(x=>norm(x)==="maire")) pkw.push("maire");
      const nextPerson={...person,entityType:"person",institutionId:entry.id,
        mandates,keywords:pkw,updatedAt:new Date().toISOString()};
      if(newPeople.some(p=>p.id===person.id)) {
        newPeople[newPeople.findIndex(p=>p.id===person.id)]=nextPerson;
      } else changed.set(person.id,nextPerson);
    }
  }
  return {created,newPeople,changed:[...changed.values()],conflicts,selected:selected.length};
}
function renderMigration() {
  if(!proposals) refresh();
  const current=plan();
  const items=proposals.items;
  return `<div class="institutions-page">
    <section class="admin-panel"><h2>Réorganiser les mairies</h2>
      <p>Analyse non destructive : une personne physique conserve sa fiche. La mairie devient une institution distincte, liée au maire. Les fiches anciennes sont conservées pour ne pas casser les courriers et événements.</p>
      <p><strong>À vérifier :</strong> les correspondances sont proposées à partir des coordonnées et des noms. Une adresse ou un courriel institutionnel ne prouve pas, à lui seul, qu'une fiche est un doublon.</p>
      <div class="institution-stats"><div><strong>${proposals.peopleCount}</strong><span>Fiches de personnes</span></div>
        <div><strong>${proposals.existingCount}</strong><span>Institutions existantes</span></div>
        <div><strong>${items.length}</strong><span>Fiches candidates</span></div>
        <div><strong>${items.filter(x=>x.safe).length}</strong><span>Rapprochements probables</span></div>
        <div><strong>${choices.size}</strong><span>Sélectionnées</span></div></div>
      <div class="institution-actions"><button type="button" class="secondary-action" data-institution-backup>Exporter une sauvegarde JSON</button>
        <button type="button" class="secondary-action" data-institution-refresh>Relancer l'analyse</button></div>
      ${status ? `<p role="status">${escape(status)}</p>` : ""}
    </section>
    <section class="admin-panel"><h3>Propositions de migration</h3>
      <p>Les propositions considérées fiables sont présélectionnées. Les autres nécessitent un examen avant activation. Aucune fusion ni suppression physique n'est effectuée.</p>
      <div class="institution-candidates">${items.map(p=>`<label class="institution-candidate">
        <input type="checkbox" data-institution-choice="${escape(p.id)}" ${choices.has(p.id)?"checked":""} ${busy?"disabled":""}/>
        <span><strong>${escape(p.city)} — ${escape(display(p.contact))}</strong>
          <small>${escape(p.evidence.join(", "))} · ${p.personId ? "Personne correspondante : "+escape(display((adminState.localContacts||[]).find(c=>c.id===p.personId)||{})) : "Aucune personne correspondante"}</small>
          ${p.reason ? `<em>À examiner : ${escape(p.reason)}</em>` : '<em>Correspondance probable</em>'}
        </span></label>`).join("") || "<p>Aucune fiche candidate détectée.</p>"}</div>
      <p><strong>Prévisualisation :</strong> ${current.created.length} institution(s), ${current.newPeople.length} personne(s) à créer et ${current.changed.length} fiche(s) à actualiser.
        ${current.conflicts.length ? escape(current.conflicts.join(" · ")) : ""}</p>
      <button type="button" class="primary-action" data-institution-apply ${busy||!current.created.length||!isAdmin()?"disabled":""}>Confirmer la migration sélectionnée</button>
    </section>
    <section class="admin-panel"><h3>Restauration</h3><p>Une sauvegarde JSON ne sera pas supprimée automatiquement. En cas d'erreur, vous pouvez restaurer l'état des contacts et institutions depuis ce fichier (administrateur uniquement).</p>
      <label>Fichier de sauvegarde <input type="file" data-institution-restore accept=".json,application/json" ${busy?"disabled":""}/></label></section>
    </div>`;
}
function renderDirectory() {
  const filtered=institutions().filter(x=>!query || norm(x.name+" "+x.city).includes(norm(query))).sort((a,b)=>String(a.city).localeCompare(String(b.city),"fr"));
  const all=persons();
  const current=filtered.find(x=>x.id===selectedId)||filtered[0];
  if(current)selectedId=current.id;
  const mayor=all.find(p=>p.id===current?.mayorContactId);
  const deputies=all.filter(p=>p.institutionId===current?.id && (Array.isArray(p.mandates)&&p.mandates.some(m=>m.role==="adjoint"&&m.active)||tagged(p,"adjoint")));
  const available=current ? all.filter(p=>cleanTown(p.city)===cleanTown(current.city)).slice(0,600) : [];
  return `<div class="institutions-page"><section class="admin-panel"><h2>Institutions · Mairies</h2>
    <p>${institutions().length} institution(s). Une mairie est une structure indépendante du maire actuellement en fonction.</p>
    <input type="search" data-institution-search placeholder="Rechercher une commune ou une mairie" value="${escape(query)}"/>
    <button type="button" class="secondary-action" data-admin-section="institution-migration">Réorganisation automatique</button>
    </section><div class="institutions-layout"><section class="admin-panel institutions-list">
    ${filtered.slice(0,250).map(i=>`<button type="button" class="${i.id===current?.id?"active":""}" data-institution-select="${escape(i.id)}">${escape(i.name)}</button>`).join("")||"Aucune mairie enregistrée."}
    ${filtered.length>250?"<small>250 premiers résultats : affinez la recherche.</small>":""}</section>
    ${current ? `<section class="admin-panel"><h3>${escape(current.name)}</h3>
      <p>${escape([current.streetNumber,current.streetNameFull||current.streetName,current.postalCode,current.city].filter(Boolean).join(" "))}</p>
      <p>✉ ${escape(current.email||"Non renseigné")} · ☎ ${escape(current.phone||"Non renseigné")}</p>
      <p><strong>Maire actuel :</strong> ${mayor ? escape(display(mayor)) : "Non renseigné"}</p>
      <p><strong>Adjoints liés :</strong> ${deputies.length ? deputies.map(p=>escape(display(p))).join(", ") : "Aucun adjoint associé"}</p>
      <label>Modifier le maire actuel
        <select data-institution-mayor="${escape(current.id)}" ${!isAdmin()?"disabled":""}>
          <option value="">Non renseigné</option>
          ${available.map(p=>`<option value="${escape(p.id)}" ${p.id===mayor?.id?"selected":""}>${escape(display(p))}</option>`).join("")}
        </select></label>
      <small>Le changement de maire conserve l'historique des mandats. Il retire le mot-clé « maire » à l'ancien titulaire et l'attribue au nouveau.</small>
      <p><button type="button" class="secondary-action" data-institution-export>Exporter les institutions en CSV</button></p>
    </section>`:""}</div></div>`;
}
async function persistMigration() {
  if(busy||!isAdmin())return;
  const action=plan();
  if(!action.created.length)return;
  if(!confirm("Créer "+action.created.length+" mairie(s) et modifier "+action.changed.length+" fiche(s) ? Une sauvegarde JSON est recommandée avant confirmation."))return;
  const previousState=cloneAdminState();
  busy=true;
  const replace=new Map(action.changed.map(x=>[x.id,x]));
  adminState.localContacts=adminState.localContacts.map(c=>replace.get(c.id)||c).concat(action.newPeople);
  adminState.institutions=[...institutions(),...action.created];
  try{
    const ok=await saveAdminStateToDatabaseOnly("migration","migration institution",action.created.length+" mairies",previousState);
    status=ok?"Migration enregistrée. Les anciens contacts institutionnels restent conservés mais ne sont plus comptés comme personnes.":"Échec de l'enregistrement : les données ont été restaurées.";
    if(ok)refresh();
  }catch(e){adminState=normalizeAdminState(previousState);resetContactLookupCaches();status="Erreur de sauvegarde : "+e.message;}
  finally{busy=false;renderAdmin();}
}
async function changeMayor(id,personId) {
  if(busy||!isAdmin())return;
  const current=institutions().find(x=>x.id===id);
  if(!current)return;
  if(personId && !persons().some(p=>p.id===personId&&cleanTown(p.city)===cleanTown(current.city))){showToast("Cette personne n'appartient pas à la commune.");return;}
  if(personId===current.mayorContactId)return;
  if(!confirm("Changer le maire de "+current.city+" ?"))return;
  const previous=cloneAdminState(),old=current.mayorContactId,now=new Date().toISOString();
  const mutations=new Map();
  for(const person of adminState.localContacts) {
    if(person.id!==old&&person.id!==personId)continue;
    let kw=values(person);
    const mandates=Array.isArray(person.mandates)?person.mandates.map(m=>({...m})):[];
    if(person.id===old) {
      kw=kw.filter(x=>norm(x)!=="maire");
      for(const m of mandates)if(m.institutionId===id&&m.role==="maire"&&m.active){m.active=false;m.endDate=new Date().toISOString().slice(0,10);}
    }
    if(person.id===personId){
      if(!kw.some(x=>norm(x)==="maire"))kw.push("maire");
      if(!mandates.some(m=>m.institutionId===id&&m.role==="maire"&&m.active))mandates.push({role:"maire",institutionId:id,startDate:"",endDate:"",active:true});
    }
    mutations.set(person.id,{...person,entityType:"person",institutionId:personId===person.id?id:person.institutionId,keywords:kw,mandates,updatedAt:now});
  }
  busy=true;
  adminState.localContacts=adminState.localContacts.map(c=>mutations.get(c.id)||c);
  adminState.institutions=institutions().map(i=>i.id===id?{...i,mayorContactId:personId,updatedAt:now}:i);
  try{
    const ok=await saveAdminStateToDatabaseOnly("modification","institution",current.city,previous);
    if(!ok)showToast("Modification non enregistrée.");
  }catch(e){adminState=normalizeAdminState(previous);resetContactLookupCaches();showToast(e.message);}
  finally{busy=false;renderAdmin();}
}
async function restore(file) {
  if(!file||!isAdmin())return;
  if(file.size>40*1024*1024){showToast("Fichier trop volumineux.");return;}
  let parsed;
  try{parsed=JSON.parse(await file.text());}catch{showToast("Fichier JSON invalide.");return;}
  if(parsed?.format!=="institutions-backup-v1"||!Array.isArray(parsed.localContacts)||!Array.isArray(parsed.institutions)||parsed.localContacts.some(c=>!c||!c.id)){showToast("Ce fichier n'est pas une sauvegarde valide de ce module.");return;}
  if(!confirm("Restaurer les fiches contacts et institutions depuis la sauvegarde du "+parsed.createdAt+" ? Les changements effectués depuis seront perdus."))return;
  const previous=cloneAdminState();busy=true;
  adminState.localContacts=parsed.localContacts;
  adminState.institutions=parsed.institutions;
  try{const ok=await saveAdminStateToDatabaseOnly("restauration","migration institution","restauration sauvegarde",previous);status=ok?"Sauvegarde restaurée.":"Restauration échouée.";}
  catch(e){adminState=normalizeAdminState(previous);resetContactLookupCaches();status=e.message;}
  finally{busy=false;refresh();renderAdmin();}
}
function exportInstitutions() {
  const rows=[["Institution","Commune","Adresse","Code postal","Téléphone","Email","Maire actuel"]];
  for(const i of institutions()){const p=persons().find(c=>c.id===i.mayorContactId);
    rows.push([i.name,i.city,[i.streetNumber,i.streetNameFull||i.streetName].filter(Boolean).join(" "),i.postalCode,i.phone,i.email,p?display(p):""]);}
  const csv=rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
  downloadFile("institutions-mairies.csv","\uFEFF"+csv,"text/csv;charset=utf-8");
}
document.addEventListener("click",(event)=>{
  if(activeAdminSection==="institution-migration"){
    if(event.target.closest("[data-institution-refresh]")){refresh();renderAdmin();return;}
    if(event.target.closest("[data-institution-backup]")){backup();return;}
    if(event.target.closest("[data-institution-apply]")){persistMigration();return;}
  }
  if(activeAdminSection==="institutions"){
    const selected=event.target.closest("[data-institution-select]");
    if(selected){selectedId=selected.dataset.institutionSelect;renderAdmin();return;}
    if(event.target.closest("[data-institution-export]")){exportInstitutions();return;}
  }
});
document.addEventListener("change",(event)=>{
  if(activeAdminSection==="institution-migration"){
    const input=event.target.closest("[data-institution-choice]");
    if(input){input.checked?choices.add(input.dataset.institutionChoice):choices.delete(input.dataset.institutionChoice);renderAdmin();return;}
    const restoreInput=event.target.closest("[data-institution-restore]");
    if(restoreInput){restore(restoreInput.files?.[0]);return;}
  }
  if(activeAdminSection==="institutions"){
    const selector=event.target.closest("[data-institution-mayor]");
    if(selector){changeMayor(selector.dataset.institutionMayor,selector.value);return;}
    const search=event.target.closest("[data-institution-search]");
    if(search){query=search.value;renderAdmin();return;}
  }
});
document.addEventListener("input",(event)=>{
  if(activeAdminSection==="institutions"&&event.target.matches("[data-institution-search]")){
    query=event.target.value;
    // Do not re-render on every keystroke and lose focus.
    clearTimeout(window.__institutionSearchTimer);
    window.__institutionSearchTimer=setTimeout(()=>{if(activeAdminSection==="institutions"){const el=document.querySelector("[data-institution-search]");if(el){query=el.value;renderAdmin();document.querySelector("[data-institution-search]")?.focus();}}},250);
  }
});
window.InstitutionManager={renderDirectory,renderMigration,analyze,plan};
})();
