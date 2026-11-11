/* Historique : tableau de bord staff (UI uniquement, journal existant conservé). */
(() => {
  const viewState = { period: 30, search: "", sort: "volume", action: "all" };
  const dayMs = 86400000;
  const dateOf = (value) => {
    const date = Date.parse(value || "");
    return Number.isFinite(date) ? date : NaN;
  };
  const displayDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date inconnue" : date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  };
  const initials = (value) => String(value || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  const kindOf = (record) => {
    const value = [record.action, record.target].join(" ").toLowerCase();
    if (/supprim|delete|effac|archiv/.test(value)) return "delete";
    if (/cr[eé]|ajout|import|nouveau|insert/.test(value)) return "create";
    if (/modif|mise|update|edit|enregistr|sauv|change/.test(value)) return "update";
    return "other";
  };
  const kindLabels = { create: "Création / import", update: "Modification", delete: "Suppression / archivage", other: "Autre action" };
  const staffData = () => {
    const staff = new Map();
    for (const user of [...(state.users || []), ...(adminUsersLoaded ? adminUsers : [])]) {
      if (!user?.id || roleRank(user.role) < roleRank("moderator")) continue;
      staff.set(String(user.id), user);
    }
    const now = Date.now();
    const records = (adminState.activityLog || []).filter((entry) => {
      const date = dateOf(entry.createdAt);
      return Number.isFinite(date) && date <= now && staff.has(String(entry.userId || ""));
    }).sort((a, b) => dateOf(b.createdAt) - dateOf(a.createdAt));
    const members = [...staff.values()].map((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.login || user.email || "Membre du staff";
      const actions = records.filter((entry) => String(entry.userId) === String(user.id));
      return {
        user, name, actions,
        week: actions.filter((entry) => dateOf(entry.createdAt) >= now - 7 * dayMs).length,
        month: actions.filter((entry) => dateOf(entry.createdAt) >= now - 30 * dayMs).length
      };
    });
    return { now, members, records };
  };
  const context = () => {
    const data = staffData();
    const cutoff = data.now - viewState.period * dayMs;
    const query = viewState.search.trim().toLocaleLowerCase("fr");
    const members = data.members.filter((member) => !query || [member.name, roleLabel(member.user.role)].join(" ").toLocaleLowerCase("fr").includes(query));
    for (const member of members) {
      member.visible = member.actions.filter((entry) => dateOf(entry.createdAt) >= cutoff && (viewState.action === "all" || kindOf(entry) === viewState.action));
    }
    members.sort((a, b) => viewState.sort === "name" ? a.name.localeCompare(b.name, "fr") : viewState.sort === "recent" ? (dateOf(b.visible[0]?.createdAt) || 0) - (dateOf(a.visible[0]?.createdAt) || 0) : b.visible.length - a.visible.length || a.name.localeCompare(b.name, "fr"));
    return { ...data, members };
  };
  const entryHtml = (entry) => {
    const kind = kindOf(entry);
    return '<li class="history-entry">' +
      '<span class="history-entry-mark is-' + kind + '" aria-hidden="true"></span>' +
      '<div class="history-entry-content"><div class="history-entry-top"><strong>' + text(entry.action || "Action") + '</strong><time datetime="' + attr(entry.createdAt || "") + '">' + text(displayDate(entry.createdAt)) + '</time></div>' +
      '<p>' + text(entry.target || "Élément non précisé") + '</p>' +
      (entry.detail ? '<small>' + text(entry.detail) + '</small>' : '') + '</div></li>';
  };
  const sparkline = (records, now) => {
    const counts = Array.from({length: 7}, (_, i) => records.filter((entry) => {
      const diff = now - dateOf(entry.createdAt);
      return diff >= (6 - i) * dayMs && diff < (7 - i) * dayMs;
    }).length);
    const max = Math.max(1, ...counts);
    return '<div class="history-spark" aria-label="Répartition des actions sur sept jours">' + counts.map((count, index) =>
      '<span title="' + count + ' action(s)" style="--bar:' + Math.max(7, Math.round(count / max * 100)) + '%" aria-label="Jour ' + (index + 1) + ' : ' + count + ' action(s)"></span>').join("") + '</div>';
  };
  const notifications = () => {
    const alerts = assignedTaskNotifications();
    return '<section class="history-notices"><header><div><span class="history-eyebrow">À suivre</span><h3>Mes notifications</h3></div><span class="history-notice-count">' + alerts.length + ' en attente</span></header>' +
      (alerts.length ? '<div class="history-notice-list">' + alerts.map((alert) => '<button type="button" data-open-permanence="' + attr(alert.requestId) + '"><span class="history-alert-dot" aria-hidden="true">!</span><span><strong>' + text(alert.title) + '</strong><small>' + text(alert.message) + (alert.dueDate ? ' · Échéance ' + text(formatDate(alert.dueDate)) : '') + '</small></span><span aria-hidden="true">→</span></button>').join("") + '</div>' : '<p class="history-empty-notice">Aucune tâche liée à un dossier en attente.</p>') + '</section>';
  };
  renderActivity = function () {
    const data = context();
    const totalWeek = data.members.reduce((sum, member) => sum + member.week, 0);
    const totalMonth = data.members.reduce((sum, member) => sum + member.month, 0);
    const totalFiltered = data.members.reduce((sum, member) => sum + member.visible.length, 0);
    const active = data.members.filter((member) => member.visible.length > 0).length;
    const filteredRecords = data.members.flatMap((member) => member.visible);
    const currentWeek = filteredRecords.filter((record) => dateOf(record.createdAt) >= data.now - 7 * dayMs);
    return '<main class="history-dashboard">' +
      '<header class="history-hero"><div><span class="history-eyebrow">Pilotage de l’équipe</span><h1>Historique d’activité</h1><p>Suivez les actions enregistrées sur le site, par membre du staff.</p></div><button type="button" class="history-export" data-history-export aria-label="Exporter les actions filtrées en CSV">↓ Exporter CSV</button></header>' +
      '<div class="history-kpis"><article><span>Actions · 7 jours</span><strong>' + totalWeek.toLocaleString("fr-FR") + '</strong><small>Période glissante</small></article><article><span>Actions · 30 jours</span><strong>' + totalMonth.toLocaleString("fr-FR") + '</strong><small>Historique conservé</small></article><article><span>Actions filtrées</span><strong>' + totalFiltered.toLocaleString("fr-FR") + '</strong><small>Selon les filtres actifs</small></article><article><span>Membres actifs</span><strong>' + active + '<em> / ' + data.members.length + '</em></strong><small>Sur la période sélectionnée</small></article></div>' +
      '<section class="history-workspace"><div class="history-toolbar"><div class="history-toolbar-heading"><div><span class="history-eyebrow">Activité du staff</span><h2>Vue par collaborateur</h2></div><div class="history-period" role="group" aria-label="Période"><button data-history-period="7" aria-pressed="' + (viewState.period === 7) + '" class="' + (viewState.period === 7 ? 'is-active' : '') + '">7 jours</button><button data-history-period="30" aria-pressed="' + (viewState.period === 30) + '" class="' + (viewState.period === 30 ? 'is-active' : '') + '">30 jours</button></div></div>' +
      '<div class="history-filter-grid"><label class="history-search"><span>Rechercher un membre</span><input type="search" data-history-search placeholder="Nom, prénom ou rôle…" value="' + attr(viewState.search) + '" autocomplete="off" /></label><label><span>Type d’action</span><select data-history-action><option value="all">Toutes les actions</option>' + Object.entries(kindLabels).map(([key, label]) => '<option value="' + key + '"' + (viewState.action === key ? ' selected' : '') + '>' + label + '</option>').join("") + '</select></label><label><span>Trier par</span><select data-history-sort><option value="volume"' + (viewState.sort === "volume" ? ' selected' : '') + '>Plus actifs</option><option value="recent"' + (viewState.sort === "recent" ? ' selected' : '') + '>Activité récente</option><option value="name"' + (viewState.sort === "name" ? ' selected' : '') + '>Ordre alphabétique</option></select></label></div>' +
      '<div class="history-results-caption"><span>' + data.members.length + ' membre(s) affiché(s)</span><span>Les détails sont repliés par défaut</span></div></div>' +
      '<div class="history-members">' + (data.members.length ? data.members.map((member) => {
        const records = member.visible;
        const last = records[0];
        return '<details class="history-member"><summary><span class="history-avatar">' + text(initials(member.name)) + '</span><span class="history-member-identity"><strong>' + text(member.name) + '</strong><small>' + text(roleLabel(member.user.role)) + '</small></span><span class="history-member-count"><strong>' + records.length + '</strong><small>action(s) · ' + viewState.period + ' j</small></span>' + sparkline(member.actions.filter((entry) => dateOf(entry.createdAt) >= data.now - 7 * dayMs), data.now) + '<span class="history-expand" aria-hidden="true">⌄</span></summary><div class="history-member-body"><div class="history-member-body-heading"><strong>Journal des actions</strong><small>' + (last ? 'Dernière action : ' + text(displayDate(last.createdAt)) : 'Aucune activité sur cette période') + '</small></div>' + (records.length ? '<ol class="history-timeline">' + records.map(entryHtml).join("") + '</ol>' : '<p class="history-no-results">Aucune action correspondant aux filtres.</p>') + '</div></details>';
      }).join("") : '<div class="history-empty"><strong>Aucun membre trouvé</strong><p>Modifiez la recherche pour afficher d’autres collaborateurs.</p></div>') + '</div>' +
      '<p class="history-disclaimer">Les statistiques portent uniquement sur les actions tracées et encore conservées par le site (journal plafonné). Elles ne mesurent ni le temps de travail ni les tâches réalisées hors plateforme. Les catégories sont déduites du libellé des actions.</p></section>' +
      notifications() + '</main>';
  };
  const update = (focused) => {
    if (activeAdminSection !== "activity") return;
    const node = document.querySelector("#admin-view");
    if (!node) return;
    node.innerHTML = renderActivity();
    if (focused) {
      const field = node.querySelector("[data-history-" + focused + "]");
      if (field) {
        field.focus({preventScroll:true});
        if (focused === "search" && field.setSelectionRange) field.setSelectionRange(field.value.length, field.value.length);
      }
    }
  };
  let searchTimer = null;
  document.addEventListener("click", (event) => {
    const period = event.target.closest("[data-history-period]");
    if (period) {
      viewState.period = Number(period.dataset.historyPeriod) === 7 ? 7 : 30;
      update();
      return;
    }
    if (event.target.closest("[data-history-export]")) {
      const data = context();
      const rows = data.members.flatMap((member) => member.visible.map((entry) => [entry.createdAt, member.name, roleLabel(member.user.role), entry.action || "", entry.target || "", entry.detail || ""]));
      const csvSafe = (value) => {
        let string = String(value == null ? "" : value);
        if (/^[\s]*[=+\-@]/.test(string)) string = "'" + string;
        return '"' + string.replace(/"/g, '""') + '"';
      };
      const csv = [["Date", "Collaborateur", "Rôle", "Action", "Cible", "Détail"], ...rows].map((row) => row.map(csvSafe).join(";")).join("\r\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", csv], {type:"text/csv;charset=utf-8"}));
      const link = document.createElement("a");
      link.href = url;
      link.download = "historique-staff-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-history-action]")) { viewState.action = event.target.value; update("action"); }
    if (event.target.matches("[data-history-sort]")) { viewState.sort = event.target.value; update("sort"); }
  });
  document.addEventListener("input", (event) => {
    if (!event.target.matches("[data-history-search]")) return;
    viewState.search = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => update("search"), 180);
  });
})();
