// Run: node tests/contact-encoding-repair.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {TextDecoder}=require("node:util");
const source=fs.readFileSync(path.join(__dirname,"../contact-encoding-repair.js"),"utf8");
const contacts=[
 {id:"a",firstName:"Sébastien",city:"FLEUREY-LÈS-FAVERNEY"},
 {id:"b",firstName:"S�bastien",city:"FLEUREY-L�S-FAVERNEY"},
 {id:"c",firstName:"SÃ©bastien",city:"FLEUREY-LÃˆS-FAVERNEY"},
 {id:"d",firstName:"FranÃƒÂ§ois",city:"Vesoul"},
 {id:"e",firstName:"Normal",city:"Paris"}
];
const api=new Function("document","TextDecoder","contactFields","adminState","contactDisplayName",source+
  ";return {repairMojibake,repairSuggestion,repairFieldValues,repairSafeFields,repairMojibakePattern,repairIssueKey};")(
 undefined,TextDecoder,
 ()=>[{id:"firstName",type:"text"},{id:"city",type:"text"},{id:"email",type:"text"},{id:"id",type:"text"}],
 {localContacts:contacts},c=>c.firstName+" "+c.city
);
assert.equal(api.repairMojibake("SÃ©bastien"),"Sébastien");
assert.equal(api.repairMojibake("FranÃƒÂ§ois"),"François");
assert.equal(api.repairMojibake("FLEUREY-LÃˆS-FAVERNEY"),"FLEUREY-LÈS-FAVERNEY");
assert.equal(api.repairMojibake("S�bastien"),"","Lost replacement character cannot be reconstructed without a reference");
assert.equal(api.repairMojibake("Normal"),"");
assert.equal(api.repairMojibake("Âge"),"","Normal words are not altered");
const fields=api.repairSafeFields();
assert.equal(fields.includes("email"),false);
assert.equal(fields.includes("id"),false);
const dictionary=api.repairFieldValues(contacts,["firstName","city"]);
assert.equal(api.repairSuggestion("S�bastien",dictionary.get("firstName")),"Sébastien");
assert.equal(api.repairSuggestion("FLEUREY-L�S-FAVERNEY",dictionary.get("city")),"FLEUREY-LÈS-FAVERNEY");
assert.equal(api.repairSuggestion("X�bastien",dictionary.get("firstName")),"");
assert.equal(api.repairIssueKey("contact-a","city"),JSON.stringify(["contact-a","city"]));
console.log("Encoding repair: reversible UTF-8 correction, safe fields and manual suggestions OK");
