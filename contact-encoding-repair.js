/* Réparation encodage : aucun changement avant confirmation ET sauvegarde. */
const encodingRepairState={
  issues:[],scanned:0,scanning:false,scanTotal:0,query:"",mode:"all",page:0,
  selections:new Set(),overrides:new Map(),backupDone:false,backupSignature:"",
  busy:false,error:"",message:"",lastVerified:0,view:"groups",groups:[],groupSelections:new Set(),groupOverrides:new Map()
};
const repairDeniedFields=new Set(["id","keywords","tags","email","mobile","phone","telephone","birthDate","createdAt","updatedAt","gender","deathDateApprox","institutionId","contactId","externalId"]);
const repairMojibakePattern=/(?:Ã.|Â[\u0080-\u00BF]|â[€œ„]|�)/u;
const repairMojibakeSimple=/(?:Ã.|Â[\u0080-\u00BF]|â[€œ„])/u;
const repairCp1252Overrides={"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};
function repairDecodeOnce(input){
  const data=[];
  for(const char of input){
    const code=char.codePointAt(0);
    const byte=repairCp1252Overrides[char] ?? code;
    if(byte>255||byte<0)return null;
    data.push(byte);
  }
  try{return new TextDecoder("utf-8",{fatal:true}).decode(new Uint8Array(data));}
  catch{return null;}
}
function repairMojibake(input){
  if(!repairMojibakeSimple.test(input))return "";
  let result=input;
  for(let pass=0;pass<3;pass++){
    const next=repairDecodeOnce(result);
    if(!next||next===result)break;
    result=next;
    if(!repairMojibakeSimple.test(result))break;
  }
  if(result===input||result.includes("�")||repairMojibakeSimple.test(result))return "";
  return result;
}

function repairCandidateKey(value){
  return String(value||"").normalize("NFC").toLocaleLowerCase("fr");
}
function repairGroupKey(field,value){return JSON.stringify([field,value]);}
function repairBuildGroups(issues){
  const groups=new Map();
  for(const issue of issues){
    const key=repairGroupKey(issue.field,issue.value);
    let group=groups.get(key);
    if(!group){
      group={key,field:issue.field,value:issue.value,suggestion:issue.suggestion,confidence:issue.confidence,issues:[],samples:[]};
      groups.set(key,group);
    }
    group.issues.push(issue);
    if(group.samples.length<3)group.samples.push(issue.name);
  }
  return [...groups.values()].sort((a,b)=>b.issues.length-a.issues.length||a.field.localeCompare(b.field));
}
function repairGroupValue(group){
  return encodingRepairState.groupOverrides.get(group.key)??group.suggestion;
}
function repairGroupValid(group){
  const next=repairGroupValue(group);
  return typeof next==="string"&&next.trim()&&next!==group.value&&!next.includes("�")&&!repairMojibakeSimple.test(next);
}
function repairGroupList(){
  const s=encodingRepairState,q=s.query.trim().toLocaleLowerCase("fr");
  return s.groups.filter(group=>{
    if(s.mode==="selected"&&!s.groupSelections.has(group.key))return false;
    if(s.mode==="automatic"&&group.confidence!=="automatic")return false;
    if(s.mode==="manual"&&group.confidence==="automatic")return false;
    return !q||[group.field,group.value,group.suggestion,...group.samples].some(v=>String(v||"").toLocaleLowerCase("fr").includes(q));
  });
}
function repairSelectedStats(){
  const s=encodingRepairState;
  if(s.view==="groups"){
    let selected=0,valid=0;
    for(const group of s.groups)if(s.groupSelections.has(group.key)){
      selected+=group.issues.length;
      if(repairGroupValid(group))valid+=group.issues.length;
    }
    return {selected,valid};
  }
  const selected=s.selections.size;
  let valid=0;
  for(const issue of s.issues)if(s.selections.has(issue.key)){
    const next=repairIssueValue(issue);
    if(next&&next!==issue.value&&!next.includes("�")&&!repairMojibakeSimple.test(next))valid++;
  }
  return {selected,valid};
}

function repairSafeFields(){
  const fromFields=contactFields().filter(f=>!repairDeniedFields.has(f.id)&&f.type!=="number"&&f.type!=="date"&&f.type!=="boolean"&&f.type!=="multilist"&&f.type!=="list").map(f=>f.id);
  return [...new Set([...fromFields,"firstName","lastName","usageName","birthName","city","streetName","streetNameFull","profession","function"].filter(id=>!repairDeniedFields.has(id)))];
}
function repairMaskKey(input) {return String(input).normalize("NFC").toLocaleLowerCase("fr").replace(/[�]/g,"?");}
function repairSuggestion(value,cleanValues){
  if(!value.includes("�"))return "";
  const key=repairCandidateKey(value),len=value.length;
  const matching=new Map();
  for(const good of cleanValues?.get(len)||[]){
    if(good.length!==len||good===value)continue;
    const goodKey=repairCandidateKey(good);
    let ok=true;
    for(let i=0;i<len;i++){
      if(key[i]!=="�"&&key[i]!==goodKey[i]){ok=false;break;}
    }
    if(ok){
      // Upper/lowercase variants of the same French place do not count as ambiguity.
      const normalized=goodKey.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      if(!matching.has(normalized))matching.set(normalized,good);
      if(matching.size>1)return "";
    }
  }
  if(matching.size!==1)return "";
  const correct=[...matching.values()][0];
  // Keep uppercase source layout when entirely uppercase.
  return value===value.toLocaleUpperCase("fr")?correct.toLocaleUpperCase("fr"):correct;
}
function repairFieldValues(contacts,fields){
  const byField=new Map(fields.map(id=>[id,new Map()]));
  for(const c of contacts)for(const field of fields){
    const v=c[field];
    if(typeof v==="string"&&v.length<=150&&!repairMojibakePattern.test(v)){
      const lengthValues=byField.get(field);
      if(!lengthValues.has(v.length))lengthValues.set(v.length,new Set());
      lengthValues.get(v.length).add(v);
    }
  }
  return byField;
}
function repairIssueKey(id,field){return JSON.stringify([id,field]);}
function repairIssueValue(issue){
  return encodingRepairState.overrides.get(issue.key) ?? issue.suggestion;
}
function repairRelevantIssues(){
  const state=encodingRepairState;
  return state.issues.filter(issue=>{
    if(state.mode==="selected"&&!state.selections.has(issue.key))return false;
    if(state.mode==="automatic"||state.mode==="manual"){
      if((issue.confidence==="automatic")!==(state.mode==="automatic"))return false;
    }
    const q=state.query.trim().toLocaleLowerCase("fr");
    return !q||[issue.name,issue.field,issue.value,issue.suggestion,issue.type].some(v=>String(v||"").toLocaleLowerCase("fr").includes(q));
  });
}
async function repairScanContacts(){
  const state=encodingRepairState;
  if(state.scanning||state.busy)return;
  state.scanning=true;state.error="";state.message="";state.backupDone=false;state.backupSignature="";
  state.issues=[];state.selections.clear();state.overrides.clear();state.groupSelections.clear();state.groupOverrides.clear();state.groups=[];state.page=0;
  const contacts=adminState.localContacts.filter(c=>c.entityType!=="institution");
  const fields=repairSafeFields(),dictionary=repairFieldValues(contacts,fields),suggestionCache=new Map();
  state.scanTotal=contacts.length;state.scanned=0;
  renderAdmin();
  try{
    for(let i=0;i<contacts.length;i++){
      const contact=contacts[i];
      for(const field of fields){
        const value=contact[field];
        if(typeof value!=="string"||!repairMojibakePattern.test(value))continue;
        const cacheKey=repairGroupKey(field,value);
        let cached=suggestionCache.get(cacheKey);
        if(!cached){const fixed=repairMojibake(value);const suggestion=fixed||repairSuggestion(value,dictionary.get(field));cached={suggestion,confidence:fixed?"automatic":suggestion?"review":"unresolved"};suggestionCache.set(cacheKey,cached);}
        const {suggestion,confidence}=cached;
        const issue={key:repairIssueKey(contact.id,field),id:contact.id,field,
          name:contactDisplayName(contact),value,suggestion,confidence,
          type:value.includes("�")?"Caractère de remplacement":"Mauvais décodage UTF-8"};
        state.issues.push(issue);
        if(suggestion)state.selections.add(issue.key);
      }
      if(i%3000===2999||i===contacts.length-1){
        state.scanned=i+1;
        const label=document.querySelector("[data-repair-progress]");
        if(label)label.textContent="Analyse : "+state.scanned.toLocaleString("fr-FR")+" / "+state.scanTotal.toLocaleString("fr-FR");
        await new Promise(done=>setTimeout(done,0));
      }
    }
    state.groups=repairBuildGroups(state.issues);
    for(const group of state.groups)if(group.suggestion)state.groupSelections.add(group.key);
    state.message=state.issues.length+" champ(s) suspects répartis en "+state.groups.length+" groupes. Les corrections automatiques et les suggestions « À vérifier » sont présélectionnées ; seules les valeurs sans proposition nécessitent une saisie.";
  }catch(error){state.error=error.message||"Analyse impossible.";}
  finally{state.scanning=false;renderAdmin();}
}
function repairSafeText(value){return text(String(value??""));}
function renderEncodingRepair(){
  const s=encodingRepairState;
  if(!isAdmin())return '<section class="contact-io-workspace"><h3>Accès réservé aux administrateurs</h3></section>';
  const list=s.view==="groups"?repairGroupList():repairRelevantIssues(),perPage=30,maxPage=Math.max(0,Math.ceil(list.length/perPage)-1);
  s.page=Math.min(maxPage,s.page);
  const {selected,valid}=repairSelectedStats();
  const stats={automatic:s.issues.filter(i=>i.confidence==="automatic").length,review:s.issues.filter(i=>i.confidence==="review").length,unresolved:s.issues.filter(i=>i.confidence==="unresolved").length};
  const rows=s.view==="groups"?
    list.slice(s.page*perPage,(s.page+1)*perPage).map(group=>{
      const checked=s.groupSelections.has(group.key),value=repairGroupValue(group);
      return '<tr><td><input type="checkbox" data-repair-group-select="'+attr(group.key)+'" '+(checked?"checked":"")+' aria-label="Corriger toutes les occurrences de cette valeur" /></td>'+
        '<td><strong>'+repairSafeText(group.issues.length.toLocaleString("fr-FR"))+' fiches</strong><small>'+repairSafeText(group.field)+'</small><small>'+repairSafeText(group.samples.join(" · "))+'</small></td>'+
        '<td class="repair-original">'+repairSafeText(group.value)+'</td>'+
        '<td><input type="text" data-repair-group-value="'+attr(group.key)+'" value="'+attr(value)+'" placeholder="Correction pour toutes les fiches…" maxlength="300" aria-label="Correction collective" /></td>'+
        '<td>'+repairSafeText(group.confidence==="automatic"?"Automatique":group.confidence==="review"?"À vérifier":"Manuel requis")+'</td></tr>';
    }).join(""):
    list.slice(s.page*perPage,(s.page+1)*perPage).map(issue=>{
      const value=repairIssueValue(issue),checked=s.selections.has(issue.key);
      return '<tr><td><input type="checkbox" data-repair-select="'+attr(issue.key)+'" '+(checked?"checked":"")+' aria-label="Corriger ce champ" /></td>'+
        '<td><strong>'+repairSafeText(issue.name)+'</strong><small>'+repairSafeText(issue.field)+'</small></td>'+
        '<td class="repair-original">'+repairSafeText(issue.value)+'</td>'+
        '<td><input type="text" data-repair-value="'+attr(issue.key)+'" value="'+attr(value)+'" placeholder="Corriger manuellement…" maxlength="300" aria-label="Valeur corrigée" /></td>'+
        '<td>'+repairSafeText(issue.confidence==="automatic"?"Automatique":issue.confidence==="review"?"À vérifier":"Manuel requis")+'</td></tr>';
    }).join("");
  const stale=s.backupDone&&s.backupSignature!==repairSelectionSignature();
  return '<div class="contact-io-workspace encoding-repair"><header class="contact-io-workspace-head"><div><h3>Réparation de l’encodage</h3>'+
    '<p>Audit non destructif des fiches. Correction automatique uniquement des chaînes UTF-8 récupérables ; les caractères « � » doivent être vérifiés avant correction.</p></div></header>'+
    '<section class="bulk-contact-card"><h4>1. Diagnostiquer la base</h4><p>Les identifiants, emails, téléphones, mots-clés et liens entre fiches sont exclus de la réparation automatique. Les changements sont limités aux champs texte.</p>'+
    '<button type="button" class="primary-action" data-repair-scan '+(s.scanning||s.busy?"disabled":"")+'>'+(s.scanning?"Analyse en cours…":"Analyser les contacts")+'</button>'+
    '<p data-repair-progress role="status">'+(s.scanning?"Analyse : "+s.scanned+" / "+s.scanTotal:s.message)+'</p></section>'+
    (s.error?'<p class="bulk-contact-error" role="alert">'+repairSafeText(s.error)+'</p>':"")+
    (s.issues.length?'<section class="bulk-contact-card"><h4>2. Vérifier les propositions</h4>'+
    '<p>'+s.issues.length.toLocaleString("fr-FR")+' champs suspects · '+stats.automatic+' décodages automatiques · '+stats.review+' suggestions à valider · '+stats.unresolved+' sans correction sûre.</p>'+
    '<p>Les corrections automatiques et les suggestions « À vérifier » sont déjà cochées. Renseignez uniquement les valeurs sans proposition. Une correction de groupe s’applique à toutes ses occurrences. Avant de confirmer, contrôlez les propositions incertaines et décochez celles qui sont erronées.</p>'+
    '<div class="repair-view-choice"><label><input type="radio" name="repairView" value="groups" '+(s.view==="groups"?"checked":"")+' /> Par valeur identique ('+s.groups.length+' groupes)</label><label><input type="radio" name="repairView" value="individual" '+(s.view==="individual"?"checked":"")+' /> Fiche par fiche</label></div>'+
    '<div class="repair-toolbar"><label>Filtrer <select data-repair-mode><option value="all" '+(s.mode==="all"?"selected":"")+'>Tous</option><option value="automatic" '+(s.mode==="automatic"?"selected":"")+'>Décodage automatique</option><option value="manual" '+(s.mode==="manual"?"selected":"")+'>Révision manuelle</option><option value="selected" '+(s.mode==="selected"?"selected":"")+'>Sélectionnés</option></select></label>'+
    '<label>Rechercher <input data-repair-query value="'+attr(s.query)+'" placeholder="Nom, ville, valeur…" /></label></div>'+
    '<div class="repair-table-wrap"><table><thead><tr><th>Corriger</th><th>'+(s.view==="groups"?"Occurrences · champ":"Contact · champ")+'</th><th>Valeur actuelle</th><th>Proposition modifiable</th><th>Fiabilité</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="repair-pages"><button type="button" data-repair-page="-1" '+(!s.page?"disabled":"")+'>Précédent</button><span>Page '+(s.page+1)+' / '+(maxPage+1)+'</span><button type="button" data-repair-page="1" '+(s.page>=maxPage?"disabled":"")+'>Suivant</button></div>'+
    '</section><section class="bulk-contact-card"><h4>3. Sauvegarder avant toute modification</h4>'+
    '<p>Exportez une copie JSON complète des contacts AVANT de lancer la correction. Le fichier contient des données personnelles : conservez-le dans un emplacement sécurisé.</p>'+
    '<button class="secondary-action" type="button" data-repair-backup>Exporter la sauvegarde JSON</button>'+
    '<p><strong>'+selected+' champs sélectionnés</strong> · '+valid+' propositions applicables'+(stale?' · Sélection modifiée depuis la sauvegarde':"")+'</p>'+
    '<button type="button" class="primary-action" data-repair-apply '+(s.busy||s.scanning||!s.backupDone||stale||!valid?"disabled":"")+'>'+(s.busy?"Enregistrement…":"Appliquer les "+valid+" corrections vérifiées")+'</button>'+
    '<small>Chaque lot est enregistré sur le serveur uniquement si la valeur d’origine correspond toujours. Les opérations sont journalisées. Une erreur stoppe les lots suivants.</small></section>':"")+
    '</div>';
}
function repairSelectionSignature(){
  const s=encodingRepairState;
  if(s.view==="groups")return JSON.stringify({view:"groups",selections:[...s.groupSelections].sort().map(key=>[key,s.groupOverrides.get(key)||""])});
  return JSON.stringify({view:"individual",selections:[...s.selections].sort().map(key=>[key,s.overrides.get(key)||""])});
}
function repairGroupChanges(){
  const s=encodingRepairState;
  return s.groups.filter(g=>s.groupSelections.has(g.key)&&repairGroupValid(g))
    .map(g=>({field:g.field,from:g.value,to:repairGroupValue(g),expected:g.issues.length}));
}
function repairChanges(){
  return encodingRepairState.issues.filter(i=>encodingRepairState.selections.has(i.key)).map(i=>({id:i.id,field:i.field,from:i.value,to:repairIssueValue(i)}))
    .filter(item=>item.to&&item.to!==item.from&&!item.to.includes("�")&&!repairMojibakeSimple.test(item.to));
}
function repairExportBackup(){
  const state=encodingRepairState;
  const filename="sauvegarde-contacts-avant-reparation-"+new Date().toISOString().slice(0,19).replace(/:/g,"-")+".json";
  const data={generatedAt:new Date().toISOString(),contactCount:adminState.localContacts.length,localContacts:adminState.localContacts};
  downloadFile(filename,JSON.stringify(data),"application/json;charset=utf-8");
  state.backupDone=true;state.backupSignature=repairSelectionSignature();renderAdmin();
}
async function repairApplyChanges(){
  const state=encodingRepairState;
  if(state.busy||!state.backupDone||state.backupSignature!==repairSelectionSignature())return;
  const grouped=state.view==="groups";
  const changes=grouped?repairGroupChanges():repairChanges();
  const count=grouped?changes.reduce((n,g)=>n+g.expected,0):changes.length;
  if(!count)return;
  const asked=prompt("Vous allez modifier "+count+" champs de contacts. Après avoir sécurisé la sauvegarde, saisissez : REPARER "+count);
  if(asked!=="REPARER "+count)return;
  state.busy=true;state.error="";renderAdmin();
  let done=0;
  try{
    if(grouped){
      for(let i=0;i<changes.length;i+=15){
        const batch=changes.slice(i,i+15);
        const result=await adminApiRequest("POST",{operation:"reparation-encodage",target:"contacts",repairContactGroups:batch});
        const expected=batch.reduce((sum,item)=>sum+item.expected,0);
        if(result.repaired!==expected||result.verified!==true)throw new Error("La base n’a pas confirmé toutes les corrections du lot.");
        const map=new Map(batch.map(g=>[repairGroupKey(g.field,g.from),g]));
        for(const contact of adminState.localContacts){
          for(const field of [...new Set(batch.map(g=>g.field))]){
            const group=map.get(repairGroupKey(field,contact[field]));
            if(group)contact[field]=group.to;
          }
        }
        for(const group of batch)state.groupSelections.delete(repairGroupKey(group.field,group.from));
        done+=expected;
        state.message=done+" / "+count+" corrections enregistrées.";
        const progress=document.querySelector("[data-repair-progress]");if(progress)progress.textContent=state.message;
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }else{
      const lookup=new Map(adminState.localContacts.map(c=>[c.id,c]));
      for(let i=0;i<changes.length;i+=100){
        const batch=changes.slice(i,i+100);
        const result=await adminApiRequest("POST",{operation:"reparation-encodage",target:"contacts",repairContactFields:batch});
        if(result.repaired!==batch.length||result.verified!==true)throw new Error("Le serveur n’a pas confirmé toutes les corrections du lot.");
        for(const change of batch){
          const contact=lookup.get(change.id);
          if(contact)contact[change.field]=change.to;
          state.selections.delete(repairIssueKey(change.id,change.field));
        }
        done+=batch.length;
        state.message=done+" / "+count+" corrections enregistrées.";
        const progress=document.querySelector("[data-repair-progress]");if(progress)progress.textContent=state.message;
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    state.backupDone=false;state.issues=[];state.overrides.clear();resetContactLookupCaches();
    adminSyncStatus="synced";adminSyncMessage=done+" corrections d’encodage confirmées sur le serveur.";
    stateSyncChannel?.postMessage({type:"admin",version:adminStateVersion});
    showToast(adminSyncMessage);
  }catch(error){
    state.error="Réparation interrompue après "+done+" correction(s) enregistrée(s) : "+(error.message||"erreur inconnue")+". Relancez un diagnostic avant de reprendre.";
    state.backupDone=false;
    await loadAdminStateFromApi();
  }finally{state.busy=false;renderAdmin();}
}
if(typeof document!=="undefined"){
 document.addEventListener("click",async event=>{
   const trigger=event.target.closest("[data-repair-scan],[data-repair-backup],[data-repair-apply],[data-repair-page]");
   if(!trigger)return;
   if(trigger.matches("[data-repair-scan]"))await repairScanContacts();
   else if(trigger.matches("[data-repair-backup]"))repairExportBackup();
   else if(trigger.matches("[data-repair-apply]"))await repairApplyChanges();
   else if(trigger.matches("[data-repair-page]")){encodingRepairState.page=Math.max(0,encodingRepairState.page+Number(trigger.dataset.repairPage));renderAdmin();}
 });
 document.addEventListener("change",event=>{
   const t=event.target,s=encodingRepairState;
   if(t.matches('input[name="repairView"]')){s.view=t.value;s.page=0;s.backupDone=false;renderAdmin();return;}
   if(t.matches("[data-repair-group-select]")){if(t.checked)s.groupSelections.add(t.dataset.repairGroupSelect);else s.groupSelections.delete(t.dataset.repairGroupSelect);s.backupDone=false;renderAdmin();return;}
   if(t.matches("[data-repair-group-value]")){const key=t.dataset.repairGroupValue,value=t.value.trim();s.groupOverrides.set(key,value);if(value&&!value.includes("�"))s.groupSelections.add(key);else s.groupSelections.delete(key);s.backupDone=false;renderAdmin();return;}
   if(t.matches("[data-repair-select]")){if(t.checked)s.selections.add(t.dataset.repairSelect);else s.selections.delete(t.dataset.repairSelect);s.backupDone=false;renderAdmin();}
   if(t.matches("[data-repair-mode]")){s.mode=t.value;s.page=0;renderAdmin();}
   if(t.matches("[data-repair-value]")){const key=t.dataset.repairValue,value=t.value.trim();s.overrides.set(key,value);if(value&&!value.includes("�"))s.selections.add(key);else s.selections.delete(key);s.backupDone=false;renderAdmin();}
 });
 document.addEventListener("input",event=>{
   if(!event.target.matches("[data-repair-query]"))return;
   encodingRepairState.query=event.target.value;
   // Search is applied on blur/Enter to avoid repeatedly rebuilding the large table.
 });
 document.addEventListener("keydown",event=>{
   if(event.key==="Enter"&&event.target.matches("[data-repair-query]")){event.preventDefault();encodingRepairState.page=0;renderAdmin();}
 });
}
