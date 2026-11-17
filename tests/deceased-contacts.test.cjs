// Run with: node tests/deceased-contacts.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../app.js"), "utf8");
const names = ["isDeathKeyword","contactHasDeathKeyword","ensureDeathContactMetadata","synchronizeDeathKeyword","isContactDeceased"];
const functions = names.map(name => {
  const start = source.indexOf("function " + name + "(");
  assert(start >= 0, name + " must exist");
  const brace = source.indexOf("{", start);
  let depth = 0, end = brace;
  for (; end < source.length; end++) {
    if (source[end] === "{") depth++;
    if (source[end] === "}" && --depth === 0) { end++; break; }
  }
  return source.slice(start, end);
});
const ctx = {
  normalizeName: value => String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase(),
  contactKeywordValues: contact => [...(contact.keywords || []), ...(contact.tags || [])],
  Date
};
vm.createContext(ctx);
vm.runInContext(functions.join("\n"), ctx);
const contact = { keywords: ["maire", "associatif"], tags: ["maire"], deathDateApprox: "" };
assert.equal(ctx.isContactDeceased(contact), false);
ctx.ensureDeathContactMetadata(contact, "2026-11-01");
assert.deepEqual(Array.from(contact.keywords), ["décès"]);
assert.deepEqual(Array.from(contact.tags), ["décès"]);
assert.equal(ctx.isContactDeceased(contact), true);
contact.keywords = [];
contact.tags = [];
ctx.synchronizeDeathKeyword(contact);
assert.equal(ctx.isContactDeceased(contact), false);
assert.equal(contact.deathDateApprox, "");
contact.keywords = ["décès", "élu"];
ctx.synchronizeDeathKeyword(contact);
assert.deepEqual(Array.from(contact.keywords), ["décès"]);
console.log("Tests décès : statut, exclusivité, retrait et ancienne date : OK");
