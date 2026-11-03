/* Module temporaire d'import des maires et adjoints. Isolé du code principal. */
(function () {
  "use strict";
  let source = null;
  let createMissing = true;
  let busy = false;
  let message = "";
  let report = null;

  const escape = (value) => String(value == null ? "" : value).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const key = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/['’]/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  const communeKey = (value) => key(String(value || "").replace(/\s*\(\s*\d{2,5}\s*\)\s*$/, ""));
  const fullNameKey = (first, last) => key(String(first || "") + " " + String(last || ""));
  const tagList = (person) => Array.isArray(person.keywords) ? person.keywords.slice() :
    String(person.keywords || "").split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  const hasTag = (person, name) => tagList(person).some((tag) => key(tag) === name);
  const addTag = (list, tag) => list.some((v) => key(v) === tag) ? list : [...list, tag];
  const removeTag = (list, tag) => list.filter((v) => key(v) !== tag);
  const isActive = () => typeof activeAdminSection !== "undefined" && activeAdminSection === "adjoint";

  function getElementText(element) {
    return [...element.getElementsByTagName("*")].filter((n) => n.localName === "t")
      .map((node) => node.textContent || "").join("");
  }
  function parseXml(xml, label) {
    const documentXml = new DOMParser().parseFromString(xml, "application/xml");
    if (documentXml.getElementsByTagName("parsererror").length)
      throw new Error("XML invalide dans " + label + ".");
    return documentXml;
  }
  async function readXlsx(file) {
    if (file.size > 12 * 1024 * 1024) throw new Error("Fichier trop volumineux (maximum : 12 Mo).");
    const entries = await readZipEntries(await file.arrayBuffer());
    const contents = new Map(entries.map((entry) => [entry.name, entry.data]));
    const decode = (path) => contents.has(path) ? new TextDecoder("utf-8").decode(contents.get(path)) : "";
    const workbook = decode("xl/workbook.xml");
    if (!workbook) throw new Error("Classeur Excel invalide : xl/workbook.xml manquant.");
    let shared = [];
    if (contents.has("xl/sharedStrings.xml")) {
      const xml = parseXml(decode("xl/sharedStrings.xml"), "sharedStrings.xml");
      shared = [...xml.getElementsByTagName("*")].filter((node) => node.localName === "si")
        .map((node) => getElementText(node));
    }
    const book = parseXml(workbook, "workbook.xml");
    const firstSheet = [...book.getElementsByTagName("*")].find((node) => node.localName === "sheet");
    if (!firstSheet) throw new Error("Le classeur ne contient aucune feuille.");
    const relationshipId = firstSheet.getAttribute("r:id") ||
      firstSheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const relXml = decode("xl/_rels/workbook.xml.rels");
    let sheetPath = "xl/worksheets/sheet1.xml";
    if (relXml && relationshipId) {
      const relationships = parseXml(relXml, "workbook.xml.rels");
      const match = [...relationships.getElementsByTagName("*")].find((node) =>
        node.localName === "Relationship" && node.getAttribute("Id") === relationshipId);
      if (match) {
        const target = match.getAttribute("Target") || "";
        sheetPath = target.startsWith("/") ? target.replace(/^\//, "") :
          target.startsWith("xl/") ? target : "xl/" + target;
        sheetPath = sheetPath.replace(/\/\.\//g, "/");
      }
    }
    let sheet = decode(sheetPath);
    if (!sheet) {
      const firstPath = [...contents.keys()].find((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p));
      if (firstPath) sheet = decode(firstPath);
    }
    if (!sheet) throw new Error("Première feuille Excel introuvable.");
    const documentXml = parseXml(sheet, "feuille Excel");
    const rows = [...documentXml.getElementsByTagName("*")].filter((node) => node.localName === "row");
    if (rows.length > 15000) throw new Error("Plus de 15 000 lignes : découpez le fichier.");
    return rows.map((row) => {
      const values = [];
      const cells = [...row.children].filter((node) => node.localName === "c");
      for (const cell of cells) {
        const reference = cell.getAttribute("r") || "";
        const letters = (reference.match(/^[A-Z]+/i) || [""])[0].toUpperCase();
        let index = 0;
        for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
        if (!index) index = values.length + 1;
        if (index > 100) continue;
        const type = cell.getAttribute("t");
        const inline = [...cell.children].find((n) => n.localName === "is");
        const raw = [...cell.children].find((n) => n.localName === "v")?.textContent || "";
        values[index - 1] = type === "inlineStr" ? getElementText(inline || cell) :
          type === "s" ? (shared[Number(raw)] || "") : raw;
      }
      return values;
    });
  }

  async function readRows(file) {
    if (!/\.(xlsx|csv)$/i.test(file.name)) throw new Error("Fichier .xlsx ou .csv uniquement. Pour un ancien .xls, enregistrez-le en .xlsx.");
    if (/\.xlsx$/i.test(file.name)) return readXlsx(file);
    if (file.size > 6 * 1024 * 1024) throw new Error("CSV trop volumineux (maximum : 6 Mo).");
    let csv = await file.text();
    csv = csv.replace(/^\uFEFF/, "");
    // Existing parser supports the French Excel semicolon CSV and quoted values.
    return parseCsv(csv);
  }

  function normalizeRows(rows) {
    const aliases = {
      town: ["commune", "circonscription", "ville", "municipalite", "municipalité"],
      role: ["fonction", "mandat", "qualite", "qualité"],
      last: ["nom", "nom de famille"],
      first: ["prenom", "prénom", "prenoms", "prénoms"]
    };
    const headerIndex = rows.findIndex((row, i) => i < 25 &&
      ["town", "role", "last", "first"].every((field) =>
        row.some((cell) => aliases[field].some((alias) => key(cell) === key(alias)))));
    if (headerIndex === -1) throw new Error("Colonnes requises introuvables : Circonscription/Commune, Fonction, NOM, Prénom.");
    const headers = rows[headerIndex].map(key);
    const index = Object.fromEntries(Object.entries(aliases).map(([field, names]) =>
      [field, headers.findIndex((h) => names.some((v) => key(v) === h))]));
    const dedup = new Set();
    const persons = [];
    const skipped = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      const commune = String(row[index.town] || "").trim();
      const lastName = String(row[index.last] || "").trim();
      const firstName = String(row[index.first] || "").trim();
      const functionLabel = key(row[index.role]);
      const role = /\bmaire\b/.test(functionLabel) ? "maire" :
        /\badjoint(?:e)?\b/.test(functionLabel) ? "adjoint" : "";
      if (!role) continue;
      if (!commune || !firstName || !lastName) {
        skipped.push("Ligne " + (i + 1) + " : commune, nom ou prénom manquant.");
        continue;
      }
      const townKey = communeKey(commune);
      const nameKey = fullNameKey(firstName, lastName);
      const dedupKey = townKey + "|" + nameKey + "|" + role;
      if (dedup.has(dedupKey)) continue;
      dedup.add(dedupKey);
      persons.push({ commune, townKey, firstName, lastName, nameKey, role, row: i + 1 });
    }
    if (!persons.length) throw new Error("Aucune ligne Maire/Adjoint exploitable dans ce fichier.");
    return { persons, skipped, fileName: "" };
  }

  function calculate() {
    if (!source) return null;
    const contacts = adminState.localContacts || [];
    const byTown = new Map();
    for (const contact of contacts) {
      const town = communeKey(contact.city);
      if (!town) continue;
      if (!byTown.has(town)) byTown.set(town, []);
      byTown.get(town).push(contact);
    }
    const towns = new Map();
    for (const person of source.persons) {
      if (!towns.has(person.townKey)) towns.set(person.townKey, { commune: person.commune, officials: [], mayors: new Set() });
      const item = towns.get(person.townKey);
      item.officials.push(person);
      if (person.role === "maire") item.mayors.add(person.nameKey);
    }
    const updated = new Map();
    const created = [];
    const conflicts = [];
    const warnings = [...source.skipped];
    let addedMaires = 0, addedAdjoints = 0, formerMaires = 0, notFound = 0, unchanged = 0;
    const usedIds = new Set(contacts.map((c) => c.id));
    const apply = (contact, newTags, newCategory) => {
      const previous = updated.get(contact.id) || contact;
      const oldTags = tagList(previous);
      const changed = JSON.stringify(oldTags) !== JSON.stringify(newTags) || previous.category !== newCategory;
      if (changed) updated.set(contact.id, { ...previous, keywords: newTags, category: newCategory, updatedAt: new Date().toISOString() });
      else unchanged++;
    };
    for (const town of towns.values()) {
      if (town.mayors.size > 1) {
        conflicts.push(town.commune + " : plusieurs maires distincts dans le fichier. Commune ignorée.");
        continue;
      }
      const local = byTown.get(communeKey(town.commune)) || [];
      const mayorName = town.mayors.size === 1 ? [...town.mayors][0] : "";
      // No mayor line means no assumption about who is the current mayor.
      if (mayorName) {
        for (const existing of local) {
          if (fullNameKey(existing.firstName, existing.lastName || existing.usageName) === mayorName) continue;
          if (!hasTag(existing, "maire") && key(existing.category) !== "maire") continue;
          const next = updated.get(existing.id) || existing;
          apply(next, removeTag(tagList(next), "maire"), key(next.category) === "maire" ? "elu local" : next.category);
          formerMaires++;
        }
      }
      for (const person of town.officials) {
        const matches = local.filter((contact) =>
          [contact.lastName, contact.usageName, contact.birthName].some((last) =>
            fullNameKey(contact.firstName, last) === person.nameKey));
        if (matches.length > 1) {
          conflicts.push(person.commune + " : plusieurs contacts correspondent à " + person.firstName + " " + person.lastName + ". Aucun changement.");
          continue;
        }
        if (!matches.length && !createMissing) { notFound++; continue; }
        if (!matches.length) {
          const entry = normalizeContactRecord({
            firstName: person.firstName, lastName: person.lastName,
            city: person.commune, category: person.role === "maire" ? "maire" : "elu local",
            keywords: [person.role]
          }, usedIds);
          created.push(entry);
          local.push(entry);
          if (person.role === "maire") addedMaires++;
          else addedAdjoints++;
          continue;
        }
        const existing = updated.get(matches[0].id) || matches[0];
        if (person.role === "maire") {
          if (!hasTag(existing, "maire")) addedMaires++;
          apply(existing, addTag(tagList(existing), "maire"), "maire");
        } else {
          if (!hasTag(existing, "adjoint")) addedAdjoints++;
          apply(existing, addTag(tagList(existing), "adjoint"), existing.category || "elu local");
        }
      }
    }
    return { updated: [...updated.values()], created, conflicts, warnings, towns: towns.size,
      addedMaires, addedAdjoints, formerMaires, notFound, unchanged,
      changed: updated.size + created.length };
  }

  function render() {
    const plan = source ? calculate() : null;
    const counts = plan ? `<div class="adjoint-stat-grid">
      <div><strong>${plan.towns}</strong><span>Communes du fichier</span></div>
      <div><strong>${plan.addedMaires}</strong><span>Maires à ajouter/taguer</span></div>
      <div><strong>${plan.formerMaires}</strong><span>Anciens maires à détaguer</span></div>
      <div><strong>${plan.addedAdjoints}</strong><span>Adjoints à taguer</span></div>
      <div><strong>${plan.created.length}</strong><span>Nouvelles fiches</span></div>
      <div><strong>${plan.updated.length}</strong><span>Fiches à actualiser</span></div>
    </div>` : "";
    return `<div class="adjoint-import-page">
      <section class="admin-panel"><div><h2>Adjoint · import temporaire</h2>
        <p>Importer le fichier Excel des élus communaux. L'opération met à jour les mots-clés « maire » et « adjoint » dans les contacts.</p>
        <p><strong>Important :</strong> dans le modèle fourni, la colonne « Circonscription » est interprétée comme la commune (ex. Abelcourt), et non comme une circonscription législative.</p>
      </div></section>
      <section class="admin-panel adjoint-upload">
        <label><strong>Fichier des maires et adjoints</strong>
          <input type="file" data-adjoint-file accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" ${busy ? "disabled" : ""} />
        </label>
        <small>Formats .xlsx et .csv ; colonnes : Circonscription ou Commune, Fonction, NOM, Prénom. Les lignes hors Maire/Adjoint sont ignorées.</small>
        <label class="adjoint-option"><input type="checkbox" data-adjoint-create ${createMissing ? "checked" : ""} ${busy ? "disabled" : ""} /> Créer les fiches absentes (nom, prénom et commune uniquement).</label>
        <p>Correspondance stricte par nom + prénom + commune. Les homonymes ambigus ne sont pas modifiés. Les autres mots-clés sont conservés.</p>
        ${busy ? '<p role="status"><strong>Traitement en cours…</strong></p>' : ""}
        ${message ? `<p role="status" class="adjoint-feedback">${escape(message)}</p>` : ""}
      </section>
      ${plan ? `<section class="admin-panel adjoint-preview">
        <div><h3>Prévisualisation : ${escape(source.fileName)}</h3>
          <p>${source.persons.length} lignes d'élus reconnues. ${plan.changed} fiche(s) à modifier ou créer. Aucun changement n'est effectué avant confirmation.</p></div>
        ${counts}
        <p>${plan.notFound} personne(s) absente(s) non créées ; ${plan.unchanged} élément(s) déjà à jour.</p>
        ${plan.conflicts.length || plan.warnings.length ? `<div class="adjoint-alert"><strong>${plan.conflicts.length} conflit(s) et ${plan.warnings.length} ligne(s) incomplète(s)</strong>
          <ul>${[...plan.conflicts, ...plan.warnings].slice(0, 25).map((warning) => `<li>${escape(warning)}</li>`).join("")}</ul>
          ${plan.conflicts.length + plan.warnings.length > 25 ? "<p>Liste limitée aux 25 premiers avertissements.</p>" : ""}</div>` : ""}
        <button type="button" class="primary-action" data-adjoint-apply ${busy || !plan.changed ? "disabled" : ""}>Confirmer et mettre à jour ${plan.changed} fiche(s)</button>
        <button type="button" class="secondary-action compact" data-adjoint-clear ${busy ? "disabled" : ""}>Annuler l'import</button>
      </section>` : ""}
      ${report ? `<section class="admin-panel"><h3>Dernier import</h3><p>${escape(report)}</p></section>` : ""}
    </div>`;
  }

  async function handleFile(file) {
    if (!file || busy) return;
    busy = true; message = ""; source = null; report = null;
    renderAdmin();
    try {
      const rows = await readRows(file);
      source = normalizeRows(rows);
      source.fileName = file.name;
      message = "Fichier lu. Vérifiez les chiffres et confirmez l'opération.";
    } catch (error) {
      console.error("Erreur import adjoint", error);
      message = error.message || "Impossible de lire le fichier.";
    } finally { busy = false; if (isActive()) renderAdmin(); }
  }

  function apply() {
    if (busy || !source || !isAdmin()) return;
    const plan = calculate();
    if (!plan || !plan.changed) return;
    const answer = confirm("Appliquer " + plan.updated.length + " modifications et créer " +
      plan.created.length + " fiches ? Cette action modifie votre base de contacts.");
    if (!answer) return;
    busy = true;
    const replacements = new Map(plan.updated.map((person) => [person.id, person]));
    adminState.localContacts = adminState.localContacts.map((person) => replacements.get(person.id) || person).concat(plan.created);
    report = plan.addedMaires + " maire(s) tagués, " + plan.formerMaires +
      " ancien(s) maire(s) détagués, " + plan.addedAdjoints +
      " adjoint(s) tagués, " + plan.created.length + " fiche(s) créées.";
    source = null;
    busy = false;
    saveAdminState("import", "contacts adjoint", report);
    showToast("Mise à jour des élus enregistrée. Vérifiez l'état de synchronisation.");
  }

  document.addEventListener("change", (event) => {
    if (!isActive()) return;
    if (event.target.matches("[data-adjoint-file]")) {
      handleFile(event.target.files?.[0]);
    } else if (event.target.matches("[data-adjoint-create]")) {
      createMissing = event.target.checked;
      renderAdmin();
    }
  });

  document.addEventListener("click", (event) => {
    if (!isActive()) return;
    if (event.target.closest("[data-adjoint-clear]")) {
      source = null; message = ""; report = null; renderAdmin();
    } else if (event.target.closest("[data-adjoint-apply]")) {
      apply();
    }
  });

  window.AdjointImporter = { render };
})();
