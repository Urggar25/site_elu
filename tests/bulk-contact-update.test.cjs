// Run: node tests/bulk-contact-update.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const src = fs.readFileSync(path.join(__dirname,"../bulk-contact-update.js"),"utf8");
const fields=[
  {id:"phone",label:"Téléphone",type:"text"},
  {id:"email",label:"Mail",type:"text"},
  {id:"city",label:"Commune",type:"text"},
  {id:"birthDate",label:"Naissance",type:"date"},
  {id:"keywords",label:"Mots-clés",type:"multilist"}
];
const context={
  contactFields:()=>fields,
  contactDisplayName:contact=>contact.firstName+" "+contact.lastName,
  contactKeywordValues:contact=>[...(contact.keywords||[]),...(contact.tags||[])],
  isDeathKeyword:value=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()==="deces",
  parseContactImportValue:(raw,field)=>field.type==="text"?raw:raw,
  normalizeContactRecord:(contact,ids)=>{let id="CREATED_"+ids.size;while(ids.has(id))id+="_2";contact.id=id;ids.add(id);return contact;},
  document:undefined
};
vm.createContext(context);
vm.runInContext(src,context);
const first={id:"first",lastName:"DUPONT",firstName:"Jean",city:"Paris",birthDate:"1980-01-02",phone:"ancien",keywords:["maire"]};
const second={id:"second",lastName:"DUPONT",firstName:"Jean",city:"Paris",birthDate:"1990-01-02",phone:"ancien",keywords:["adjoint"]};
const evaluate=context.bulkEvaluateExcel;
const city=evaluate([["Dupont","Jean","Paris","0600000000"]],["match_lastName","match_firstName","match_city","phone"],"city",[first,second]);
assert.equal(city.items.length,0);
assert.equal(city.errors.ambiguous,1);
const birth=evaluate([["Dupont","Jean","02/01/1980","0600000000"]],["match_lastName","match_firstName","match_birthDate","phone"],"birth",[first,second]);
assert.equal(birth.items.length,1);
assert.equal(birth.items[0].id,first.id);
assert.equal(birth.items[0].changes.phone,"0600000000");
const duplicate=evaluate([["Dupont","Jean","02/01/1980","A"],["Dupont","Jean","02/01/1980","B"]],["match_lastName","match_firstName","match_birthDate","phone"],"birth",[first,second]);
assert.equal(duplicate.items.length,0,"Duplicate rows must not update a contact");
const blanks=evaluate([["Dupont","Jean","02/01/1980",""]],["match_lastName","match_firstName","match_birthDate","phone"],"birth",[first,second]);
assert.equal(blanks.items.length,0,"Empty cells must not clear existing data");
const unmatched=evaluate([["Unconnu","Jean","02/01/1980","x"]],["match_lastName","match_firstName","match_birthDate","phone"],"birth",[first,second]);
assert.equal(unmatched.errors.unmatched,1);
const tags=context.bulkApplyTags([first],["décès"],[]);
assert.deepEqual(Array.from(tags.items[0].changes.keywords),["décès"]);
assert.deepEqual(Array.from(tags.items[0].changes.tags),["décès"]);
const removed=context.bulkApplyTags([{...first,keywords:["décès"],tags:["décès"],deathDateApprox:"2022"}],[],["décès"]);
assert.deepEqual(Array.from(removed.items[0].changes.keywords),[]);
assert.equal(removed.items[0].changes.deathDateApprox,"");
const other=context.bulkApplyTags([first],["municipal"],["maire"]);
assert.deepEqual(Array.from(other.items[0].changes.keywords),["municipal"]);
const cityUpdate=evaluate([["Dupont","Jean","02/01/1980","Lyon"]],["match_lastName","match_firstName","match_birthDate","city"],"birth",[first,second]);
assert.equal(cityUpdate.items.length,1);
assert.equal(cityUpdate.items[0].changes.city,"Lyon");
const identityUpdate=evaluate([["Dupont","Jean","02/01/1980","Jeanne"]],["match_lastName","match_firstName","match_birthDate","firstName"],"birth",[first,second]);
assert.equal(identityUpdate.items[0].changes.firstName,"Jeanne");
assert.equal(context.bulkDate("45292"),"2024-01-01");
assert.equal(context.bulkDate("02/01/1980"),"1980-01-02");

const options={createMissing:true,allContacts:[first,second],policies:["ignore","ignore","ignore","overwrite","empty"]};
const unknown=evaluate([["Martin","Alice","Luxeuil-les-Bains","4 rue du brun","0601010101"]],["match_lastName","match_firstName","match_city","address_auto","phone"],"city",[],options);
assert.equal(unknown.creates.length,1);
assert.equal(unknown.creates[0].contact.firstName,"Alice");
assert.equal(unknown.creates[0].contact.city,"Luxeuil-les-Bains");
assert.equal(unknown.creates[0].contact.streetNumber,"4");
assert.equal(unknown.creates[0].contact.streetName,"rue du brun");
assert.equal(unknown.creates[0].contact.streetNameFull,"rue du brun");
assert.equal(unknown.creates[0].contact.phone,"0601010101");
const secondAddress=evaluate([["Martin","Alice","Luxeuil-les-Bains","5 allée du berneuil",""]],["match_lastName","match_firstName","match_city","address_auto","phone"],"city",[],options);
assert.equal(secondAddress.creates[0].contact.streetNumber,"5");
assert.equal(secondAddress.creates[0].contact.streetName,"allée du berneuil");
const outside=evaluate([["Dupont","Jean","Paris","x"]],["match_lastName","match_firstName","match_city","phone"],"city",[],options);
assert.equal(outside.creates.length,0,"An existing contact outside scope should not be recreated");
assert.equal(outside.errors.outsideScope,1);
const duplicateNew=evaluate([["Martin","Alice","Paris","x"],["Martin","Alice","Paris","y"]],["match_lastName","match_firstName","match_city","phone"],"city",[],options);
assert.equal(duplicateNew.creates.length,0);
assert.equal(duplicateNew.errors.duplicate,2);
const overwrite=evaluate([["Dupont","Jean","02/01/1980","nouveau"]],["match_lastName","match_firstName","match_birthDate","phone"],"birth",[first,second],{policies:["ignore","ignore","ignore","overwrite"]});
assert.equal(overwrite.items[0].changes.phone,"nouveau");
const fillIfEmpty=evaluate([["Dupont","Jean","02/01/1980","nouveau"]],["match_lastName","match_firstName","match_birthDate","phone"],"birth",[first,second],{policies:["ignore","ignore","ignore","empty"]});
assert.equal(fillIfEmpty.items.length,0);
const ignore=evaluate([["Dupont","Jean","02/01/1980","nouveau"]],["match_lastName","match_firstName","match_birthDate","phone"],"birth",[first,second],{policies:["ignore","ignore","ignore","ignore"],createMissing:true});
assert.equal(ignore.items.length,0);
assert.deepEqual(Array.from(context.bulkColumnPolicies(["match_firstName","phone"],["overwrite","empty"])),["ignore","empty"]);
assert.equal(context.bulkAddressParts("12 bis avenue de la Liberté").number,"12 bis");
assert.equal(context.bulkAddressParts("5 allée du berneuil").street,"allée du berneuil");


const keywordContext={
  ...context,
  adminState:{localContacts:[first,second]},
  contactKeywordValues:contact=>Array.from(new Set([...(contact.keywords||[]),...(contact.tags||[])]))
};
vm.createContext(keywordContext);
vm.runInContext(src,keywordContext);
const importLabels=keywordContext.bulkImportKeywordSelection(["Import novembre","Import novembre"],"nouveau, bénévole");
assert.equal(importLabels.length,3,"Les mots-clés importés doivent être dédupliqués");
const bulkRows=[["Dupont","Jean","02/01/1980","nouveau"],["Martin","Alice","03/04/1995","0600000000"]];
const bulkMap=["match_lastName","match_firstName","match_birthDate","phone"];
const candidate=keywordContext.bulkEvaluateExcel(bulkRows,bulkMap,"birth",[first,second],{createMissing:true,allContacts:[first,second]});
const enriched=keywordContext.bulkApplyImportKeywords(candidate,importLabels);
assert.equal(enriched.items.length,1);
assert.equal(enriched.creates.length,1);
assert.deepEqual(Array.from(enriched.items[0].changes.keywords),["maire","Import novembre","nouveau","bénévole"]);
assert.deepEqual(Array.from(enriched.creates[0].contact.keywords),["Import novembre","nouveau","bénévole"]);
assert.equal(enriched.creates[0].contact.lastName,"Martin");
const existingUnchanged=keywordContext.bulkEvaluateExcel([["Dupont","Jean","02/01/1980","ancien"]],bulkMap,"birth",[first,second],{createMissing:false,allowKeywords:true,allContacts:[first,second]});
const withKeyword=keywordContext.bulkApplyImportKeywords(existingUnchanged,["suivi"]);
assert.equal(withKeyword.items.length,1,"Une fiche inchangée doit recevoir un mot-clé choisi");
assert.equal(withKeyword.items[0].changes.keywords.includes("suivi"),true);
const deceased={...first,keywords:["décès"],tags:["décès"]};
const deceasedContext={...keywordContext,adminState:{localContacts:[deceased]}};
vm.createContext(deceasedContext);vm.runInContext(src,deceasedContext);
const deceasedPreview=deceasedContext.bulkEvaluateExcel([["Dupont","Jean","02/01/1980","ancien"]],bulkMap,"birth",[deceased],{createMissing:false,allowKeywords:true,allContacts:[deceased]});
const deceasedTagged=deceasedContext.bulkApplyImportKeywords(deceasedPreview,["suivi"]);
assert.equal(deceasedTagged.items.length,0,"Le mot-clé décès est exclusif");
console.log("Import Excel : mots-clés sur fiches créées, modifiées et inchangées OK");

console.log("Mise à jour de fiches : correspondances, créations, adresses et politiques OK");
