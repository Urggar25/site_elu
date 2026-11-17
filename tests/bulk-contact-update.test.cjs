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
console.log("Mise à jour de fiches : 12 vérifications OK");
