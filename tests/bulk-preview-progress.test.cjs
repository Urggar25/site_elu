// Run: node tests/bulk-preview-progress.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const src = fs.readFileSync(path.join(__dirname, "../bulk-contact-update.js"), "utf8");
const status = {textContent: "",hidden: true};
const context = {
  document: {querySelector: selector=>selector==="[data-bulk-preview-status]"?status:null,addEventListener(){}},
  contactFields: ()=>[{id:"phone",type:"text",label:"Téléphone"}],
  normalizeContactRecord:(c,ids)=>{let i=ids.size;while(ids.has("new"+i))i++;c.id="new"+i;ids.add(c.id);return c;},
  contactDisplayName:c=>c.firstName+" "+c.lastName,
  parseContactImportValue:value=>value,
  isDeathKeyword:value=>value==="décès",
  setTimeout
};
vm.createContext(context);
vm.runInContext(src,context);
(async ()=>{
  const contacts=Array.from({length:10200},(_,i)=>({id:"old"+i,firstName:"Jean",lastName:"DUPONT"+i,city:"Paris",phone:"",keywords:[]}));
  const rows=Array.from({length:10300},(_,i)=>["DUPONT"+i,"Jean","Paris","0600000000"]);
  const mapping=["match_lastName","match_firstName","match_city","phone"];
  const preview=await context.bulkEvaluateExcelProgressive(rows,mapping,"city",contacts,{createMissing:true,allContacts:contacts});
  assert.equal(preview.items.length,10200);
  assert.equal(preview.creates.length,100);
  assert.equal(preview.rejected.length,0);
  assert.match(status.textContent,/10300 lignes analysées/);
  assert.equal(status.hidden,false);
  console.log("Large preview: yielded progress and generated expected updates/creates.");
})().catch(error=>{console.error(error);process.exitCode=1;});
