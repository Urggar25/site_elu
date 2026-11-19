const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../bulk-contact-update.js"), "utf8");
const context = {
  document: undefined,
  parseCsv: value => value.trim().split(/\r?\n/).map(row => row.split(";"))
};
vm.createContext(context);
vm.runInContext(source, context);

(async () => {
  const csv = "NOM;PRENOM;COMMUNE\n" +
    Array.from({ length: 10025 }, (_, i) => "DUPONT" + i + ";Jean;Paris").join("\n");
  const largeFile = {
    name: "gros-fichier.csv",
    // Simulate a file exceeding the former 12 MB limit.
    size: 20 * 1024 * 1024,
    text: async () => csv
  };
  const result = await context.bulkReadExcel(largeFile);
  assert.equal(result.rows.length, 10025, "All rows must be retained past the old 10,000-row cap");
  assert.equal(result.rows[0][0], "DUPONT0");
  assert.equal(result.rows.at(-1)[0], "DUPONT10024");
  assert.doesNotMatch(source, /\.slice\(0,\s*10002\)/, "XLSX reading must not truncate rows");
  console.log("Large-file import: former 12 MB and 10,000-row caps removed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
