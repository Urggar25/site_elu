// Regression tests for the list evaluator; run with: node tests/contact-lists.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../app.js"), "utf8");
const start = source.indexOf("function normalizeSavedContactSearches(");
const end = source.indexOf("\nfunction savedSearchExportPreview(", start);
assert(start >= 0 && end > start, "List evaluator must remain identifiable");
const data = [{id:"a",firstName:"Alice"},{id:"b",firstName:"Bob"},{id:"c",firstName:"Carole"},{id:"d",firstName:"David"}];
const byId = new Map(data.map(contact => [contact.id,contact]));
const entries = [
  {id:"A",name:"A",listType:"manual",includeIds:["a","b"]},
  {id:"B",name:"B",listType:"manual",includeIds:["b","c"]},
  {id:"union",sourceIds:["A","B"],mergeMode:"OR"},
  {id:"intersection",sourceIds:["A","B"],mergeMode:"AND"},
  {id:"difference",sourceIds:["A","B"],mergeMode:"EXCEPT"},
  {id:"hybrid",listType:"hybrid",baseId:"union",includeIds:["d"],excludeIds:["b"]},
  {id:"snapshot",isSnapshot:true,snapshotIds:["a","c"]},
  {id:"missing",sourceIds:["unknown","A"]},
  {id:"cycle1",sourceIds:["cycle2","A"]},
  {id:"cycle2",sourceIds:["cycle1","B"]}
];
const context = {
  adminState:{savedContactSearches:entries},
  contactById:id=>byId.get(id),
  filteredContacts:()=>data,
  normalizedContactKeywordIds:items=>Array.isArray(items)?items:[]
};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
const lists=context.normalizeSavedContactSearches(entries);
const find=id=>lists.find(list=>list.id===id);
const members=id=>Array.from(context.savedListPreview(find(id),lists).contacts,entry=>entry.id).sort().join(",");
assert.equal(members("union"),"a,b,c");
assert.equal(members("intersection"),"b");
assert.equal(members("difference"),"a");
assert.equal(members("hybrid"),"a,c,d");
assert.equal(members("snapshot"),"a,c");
assert.match(context.savedListPreview(find("missing"),lists).error,/source|existe/i);
assert.match(context.savedListPreview(find("cycle1"),lists).error,/circulaire/i);
assert.equal(context.savedListWouldCycle("A",["hybrid"],lists),true);
assert.equal(context.savedListWouldCycle("hybrid",["union"],lists),false);
assert.equal(context.savedListHasDependents("A",lists).length,4);
assert.equal(context.normalizeSavedContactSearches(Array.from({length:225},(_,i)=>({id:"item-"+i}))).length,225);
assert.equal(context.savedContactSearchLabel(find("hybrid")).includes("hybride"),true);
console.log("12 tests de listes de contacts : OK");
