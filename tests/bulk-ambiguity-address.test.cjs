// Run: node tests/bulk-ambiguity-address.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../bulk-contact-update.js"),"utf8");
const context={
  document:{querySelector:()=>null,addEventListener:()=>{}},
  setTimeout,
  contactFields:()=>["streetNumber","streetName","streetNameFull","phone","firstName"].map(id=>({id,type:"text",label:id})),
  normalizeContactRecord:(contact,ids)=>{contact.id="new"+ids.size;ids.add(contact.id);return contact;},
  contactDisplayName:c=>c.firstName+" "+c.lastName,
  parseContactImportValue:value=>value,
  isDeathKeyword:()=>false
};
vm.createContext(context);vm.runInContext(source,context);
const a={id:"1",firstName:"Laurent",lastName:"BAILLEUL",city:"Vesoul",birthDate:"1970-01-01",streetNumber:"20",keywords:[]};
const b={id:"2",firstName:"Laurent",lastName:"BAILLEUL",city:"Vesoul",birthDate:"1980-01-01",streetNumber:"25",keywords:[]};
const c={id:"3",firstName:"Jean",lastName:"DURAND",city:"Vesoul",keywords:[]};
const contacts=[a,b,c];
const rows=[["BAILLEUL","Laurent","Vesoul","20 A Rue bidulle","123"],["DURAND","Jean","Vesoul","76 B RUE PRINCIPALE","456"]];
const mapping=["match_lastName","match_firstName","match_city","address_auto","phone"];
(async()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(context.bulkAddressParts("20 A"))),{number:"20 a",street:""});
  assert.deepEqual(JSON.parse(JSON.stringify(context.bulkAddressParts("20 A Rue bidulle"))),{number:"20 a",street:"Rue bidulle"});
  assert.deepEqual(JSON.parse(JSON.stringify(context.bulkAddressParts("76 B RUE DE DAMBENOIT"))),{number:"76 b",street:"RUE DE DAMBENOIT"});
  const unresolved=await context.bulkEvaluateExcelProgressive(rows,mapping,"city",contacts,{allContacts:contacts,createMissing:true});
  assert.equal(unresolved.errors.ambiguous,1);
  assert.equal(unresolved.ambiguous.length,1);
  assert.equal(unresolved.ambiguous[0].choices.length,2);
  assert.equal(unresolved.items.length,1);
  const resolved=await context.bulkEvaluateExcelProgressive(rows,mapping,"city",contacts,{allContacts:contacts,createMissing:true,resolutions:{2:"1"}});
  assert.equal(resolved.errors.ambiguous,0);
  assert.equal(resolved.items.length,2);
  assert.equal(resolved.items.find(x=>x.id==="1").changes.streetNumber,"20 a");
  assert.equal(resolved.items.find(x=>x.id==="1").changes.streetName,"Rue bidulle");
  const wrong=await context.bulkEvaluateExcelProgressive(rows,mapping,"city",contacts,{allContacts:contacts,createMissing:true,resolutions:{2:"fake"}});
  assert.equal(wrong.errors.ambiguous,1,"An unknown contact ID must not be accepted");
  const suffix=context.bulkEvaluateExcel([["DURAND","Jean","Vesoul","20","A"]],["match_lastName","match_firstName","match_city","streetNumber","streetName"],"city",contacts,{allContacts:contacts});
  assert.equal(suffix.items[0].changes.streetNumber,"20 a");
  assert.equal(suffix.items[0].changes.streetName,undefined);
  const emptyRows=await context.bulkEvaluateExcelProgressive([[],...rows],mapping,"city",contacts,{allContacts:contacts});
  assert.equal(emptyRows.items.length,1,"A blank row must not stop progressive scanning");
  console.log("Manual ambiguity selection and address suffixes: OK");
})().catch(err=>{console.error(err);process.exitCode=1;});