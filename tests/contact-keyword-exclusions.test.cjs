// Regression tests: node tests/contact-keyword-exclusions.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
const slugify=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const normalizedContactKeywordIds=values=>[...new Set((Array.isArray(values)?values:[]).map(slugify))];
const contactKeywordValues=contact=>[...(contact.keywords||[]),...(contact.tags||[])];
const isolate=(from,to)=>{const start=app.indexOf(from);const end=app.indexOf(to,start);assert.ok(start>=0&&end>start,from+" missing");return app.slice(start,end);};
const matcher=new Function("normalizedContactKeywordIds","contactKeywordValues","slugify",isolate("function contactMatchesKeywords(","let contactKeywordSearchQuery")+";return contactMatchesKeywords")(normalizedContactKeywordIds,contactKeywordValues,slugify);
const records=[
 {keywords:["LE2022"]},
 {keywords:["LE2024"]},
 {keywords:["LE2022","LE2026"]},
 {keywords:["LE2024","LE2026"]},
 {keywords:["LE2026"]},
 {keywords:["LE2022","LE2024"]},
 {keywords:[]},
 {tags:["LE2024"]}
];
const matched=(positive,mode,negative)=>records.map((record,index)=>matcher(record,positive,mode,negative)?index:-1).filter(i=>i>=0);
assert.deepEqual(matched(["LE2022","LE2024"],"OR",["LE2026"]),[0,1,5,7],"Two positive keywords in OR combined with LE2026 exclusion");
assert.deepEqual(matched(["LE2022","LE2024"],"AND",["LE2026"]),[5],"AND requires both positive keywords");
assert.deepEqual(matched([],"OR",["LE2026"]),[0,1,5,6,7],"Negative-only searches work");
assert.deepEqual(matched([], "OR", []),[0,1,2,3,4,5,6,7],"No filter matches everyone");
assert.deepEqual(matched(["LE2022"],"OR",["LE2022"]),[],"Exclusion always wins");
const html=new Function("normalizedContactKeywordIds","contactKeywordChoices","attr","text","normalizeName","contactKeywordSearchQuery",isolate("function renderContactKeywordFilters(filters) {","function renderContactTagEditor(")+";return renderContactKeywordFilters")(
 normalizedContactKeywordIds,
 ()=>["LE2022","LE2024","LE2026"].map(label=>({id:slugify(label),label,count:3,color:"#708199"})),
 String,String,slugify,"LE"
)({keywordIds:["LE2022","LE2024"],keywordExcludeIds:["LE2026"],keywordMode:"OR"});
assert.match(html,/data-keyword-state="include"/);
assert.match(html,/data-keyword-state="exclude"/);
assert.match(html,/name="keywordIds"/);
assert.match(html,/name="keywordExcludeIds"/);
assert.match(app,/filters\.keywordExcludeIds = normalizedContactKeywordIds\(new FormData\(form\)\.getAll\("keywordExcludeIds"\)\)/);
assert.match(app,/keywordExcludeIds:filters\.keywordExcludeIds/);
assert.match(app,/filters\.includeDeceased\|\|!isContactDeceased\(contact\)/);
assert.match(app,/SUPPRIMER /);
console.log("Contact keyword inclusions/exclusions and bulk-deletion safeguards: OK");
