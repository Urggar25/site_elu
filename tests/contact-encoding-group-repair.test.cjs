// node tests/contact-encoding-group-repair.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {TextDecoder}=require("node:util");
const script=fs.readFileSync(path.join(__dirname,"../contact-encoding-repair.js"),"utf8");
const php=fs.readFileSync(path.join(__dirname,"../api/admin.php"),"utf8");
const contacts=[
 {id:"c1",firstName:"Jean",city:"HÉRICOURT"},
 {id:"c2",firstName:"Marie",city:"H�RICOURT"},
 {id:"c3",firstName:"Pierre",city:"H�RICOURT"},
 {id:"c4",firstName:"Alice",city:"Héricourt"},
 {id:"c5",firstName:"Julien",city:"FLEUREY-L�S-FAVERNEY"},
 {id:"c6",firstName:"Luc",city:"FLEUREY-LÈS-FAVERNEY"}
];
const api=new Function("document","TextDecoder","contactFields","adminState","contactDisplayName","text","attr","isAdmin",script+
 ";return {repairFieldValues,repairSuggestion,repairBuildGroups,repairGroupChanges,repairGroupKey,repairSelectedStats,repairSelectionSignature,encodingRepairState};")(
 undefined,TextDecoder,()=>[{id:"city",type:"text"}],{localContacts:contacts},c=>c.firstName,
 String,String,()=>true);
const dictionary=api.repairFieldValues(contacts,["city"]);
assert.equal(api.repairSuggestion("H�RICOURT",dictionary.get("city")),"HÉRICOURT");
assert.equal(api.repairSuggestion("FLEUREY-L�S-FAVERNEY",dictionary.get("city")),"FLEUREY-LÈS-FAVERNEY");
const issues=contacts.filter(c=>c.city.includes("�")).map(c=>({
 key:JSON.stringify([c.id,"city"]),id:c.id,field:"city",name:c.firstName,
 value:c.city,suggestion:api.repairSuggestion(c.city,dictionary.get("city")),confidence:"review"
}));
const groups=api.repairBuildGroups(issues);
assert.equal(groups.length,2,"Duplicated corrupt values should generate one repair row per distinct value");
const h=groups.find(g=>g.value==="H�RICOURT");
assert.equal(h.issues.length,2);
api.encodingRepairState.groups=groups;
api.encodingRepairState.groupSelections.add(h.key);
assert.deepEqual(api.repairSelectedStats(),{selected:2,valid:2});
assert.deepEqual(api.repairGroupChanges(),[{field:"city",from:"H�RICOURT",to:"HÉRICOURT",expected:2}]);
const signature=api.repairSelectionSignature();
api.encodingRepairState.groupOverrides.set(h.key,"Héricourt");
assert.notEqual(api.repairSelectionSignature(),signature,"Any change after backup invalidates confirmation");
assert.equal(api.repairGroupChanges()[0].to,"Héricourt");
assert.match(php,/function repair_admin_contact_groups\(/);
assert.match(php,/SELECT state_json FROM admin_state WHERE id = 1 FOR UPDATE/);
assert.match(php,/\$group\['expected'\]!==\$group\['actual'\]/);
assert.match(php,/\$db->rollBack\(\)/);
console.log("Grouped encoding repair: reference matching, one edit for many contacts, atomic endpoint safeguards OK");
