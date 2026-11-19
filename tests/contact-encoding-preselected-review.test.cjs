// node tests/contact-encoding-preselected-review.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {TextDecoder}=require("node:util");
const source=fs.readFileSync(path.join(__dirname,"../contact-encoding-repair.js"),"utf8");
const contacts=[
  {id:"reference",firstName:"Jean",city:"HÉRICOURT"},
  {id:"broken1",firstName:"Marie",city:"H�RICOURT"},
  {id:"broken2",firstName:"Luc",city:"H�RICOURT"},
  {id:"unknown",firstName:"Pierre",city:"F�OO"}
];
const app=new Function(
  "document","contactFields","adminState","contactDisplayName","renderAdmin","isAdmin","text","attr","TextDecoder",source+
  ";return {encodingRepairState,repairScanContacts,repairSelectedStats,repairGroupChanges};"
)(
  {querySelector:()=>null,addEventListener:()=>{}},
  ()=>[{id:"city",type:"text"}],
  {localContacts:contacts},
  c=>c.firstName,()=>{},()=>true,String,String,TextDecoder
);
(async()=>{
  await app.repairScanContacts();
  const state=app.encodingRepairState;
  const suggested=state.issues.filter(issue=>issue.confidence==="review");
  assert.equal(suggested.length,2);
  assert.ok(suggested.every(issue=>state.selections.has(issue.key)),"All reviewable suggestions must be preselected per contact");
  const missing=state.issues.find(issue=>issue.confidence==="unresolved");
  assert.ok(missing);
  assert.equal(state.selections.has(missing.key),false,"Unknown corrections must remain unchecked");
  const group=state.groups.find(g=>g.value==="H�RICOURT");
  assert.ok(group);
  assert.equal(state.groupSelections.has(group.key),true,"Reviewable suggestions must be preselected by group");
  assert.equal(state.groupSelections.has(state.groups.find(g=>g.value==="F�OO").key),false);
  assert.equal(app.repairSelectedStats().valid,2);
  state.groupSelections.delete(group.key);
  assert.equal(app.repairSelectedStats().valid,0,"Preselected suggestions can be deselected manually");
  console.log("Encoding repair: review suggestions preselected, unresolved values not selected.");
})().catch(error=>{console.error(error);process.exitCode=1;});
