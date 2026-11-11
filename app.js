const STORAGE_KEY = "emeric-salmon-site-v3";
const SESSION_KEY = "emeric-salmon-current-user";
const ADMIN_STORAGE_KEY = "emeric-salmon-admin-v2";
const LEGACY_STORAGE_KEYS = ["emeric-sallmon-site-v3", "emeric-salmon-site-v2", "emeric-salmon-admin-v1"];
const ASSET_VERSION = "20261107-staff-activity-v1";
const API_BASE = "api";
const EVENT_PHOTO_FOLDER_ID = "photos-evenements";
const IS_LOCAL_MODE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) || window.location.protocol === "file:";
const ALLOW_LOCAL_DATA_FALLBACK = false;

const publicMenus = [
  ["accueil", "Accueil"],
  ["phototheque", "Photothèque"],
  ["newsletter", "Recevoir les informations"],
  ["support", "Support"]
];

const adminMenu = {
  home: ["dashboard", "Accueil", "check"],
  groups: [
    {
      id: "permanence",
      label: "Permanence",
      items: [
        ["contacts", "Contacts", "search"],
        ["institutions", "Institutions", "users"],
        ["saved-contact-searches", "Listes de contacts", "search"],
        ["trombinoscope", "Trombinoscope", "users"],
        ["calendar", "Calendrier", "calendar"],
        ["death", "Gestion des deces", "mail"],
        ["special-letters", "Courriers speciaux", "doc"],
        ["permanence", "Dossiers locaux", "star"],
        ["documents", "Nos documents", "file"]
      ]
    },
    {
      id: "site",
      label: "Site web",
      items: [
        ["homepage", "Page d'accueil", "doc"],
        ["content", "Actu et agenda", "doc"],
        ["photo-library", "Photothèque", "image"],
        ["support", "Support", "mail"]
      ]
    },
    {
      id: "campaign",
      label: "Campagne",
      items: [
        ["campaign-terrain", "Terrain", "map"],
        ["campaign-events", "Événements", "calendar"],
        ["mail-templates", "Modèles de mails", "mail"],
        ["mail-campaigns", "Envoi de mails", "mail"]
      ]
    },
    {
      id: "options",
      label: "Options",
      items: [
        ["contact-io", "Import/Export de contact", "contact"],
        ["contact-fields", "Champs contact", "settings"],
        ["keywords", "Mots cles", "settings"],
        ["adjoint", "Adjoint (temporaire)", "users"],
        ["institution-migration", "Réorganiser les mairies", "settings"],
        ["templates", "Modele de courriers", "doc"],
        ["social", "Reseaux", "settings"],
        ["mobile-menu", "Menu mobile", "settings"],
        ["map-settings", "Carte GeoJSON", "map"],
        ["addons", "Plugins", "settings"],
        ["users", "Utilisateurs", "users"],
        ["activity", "Historique", "chart"]
      ]
    }
  ]
};

const roles = ["user", "moderator", "collaborator", "admin", "founder", "super-admin"];
const priorities = ["normale", "importante", "urgente"];
const taskStatuses = ["a traiter", "en cours", "a relancer", "bloque", "termine", "archive"];
const taskTypes = ["appel", "courriel", "courrier", "rendez-vous", "recherche", "relance", "dossier", "note", "autre"];
const requestStatuses = ["nouveau", "en cours", "en attente", "traite", "archive"];
const permanenceStatuses = ["nouveau", "analyse", "en cours", "attente reponse", "resolu", "archive"];
const permanenceUrgencies = ["normal", "prioritaire", "critique"];
const templateCategories = ["accuse de reception", "demande de pieces complementaires", "reponse a une invitation", "reponse a une sollicitation citoyenne", "transmission a une administration", "relance", "refus poli", "courrier a un ministere", "courrier a une prefecture", "message institutionnel"];
const templateChannels = ["courriel", "courrier", "sms", "note interne"];
const contactCategories = ["maire", "elu local", "association", "entreprise", "institution", "presse", "administration", "securite civile", "agriculture", "sante", "autre"];
const contactFieldTypes = ["text", "textarea", "number", "date", "boolean", "list", "multilist"];
const relationOptions = ["pere", "mere", "conjoint", "conjointe", "fils", "fille", "frere", "soeur", "oncle", "tante", "grand-mere", "grand-pere", "petit-fils", "petite-fille", "neveu", "niece", "cousin", "cousine", "proche", "autre"];
const deathSortOptions = ["date", "az", "za"];
const themes = ["Sante", "Securite", "Travail", "Local", "Education", "Pouvoir d'achat", "Agriculture", "Ruralite", "Industrie", "Justice"];
const contentTypes = ["Amendement", "Question ecrite", "Question orale", "Proposition de loi", "Communique", "Intervention", "Visite", "Divers"];

cleanupLocalStorage(SESSION_KEY);
let currentUserId = ALLOW_LOCAL_DATA_FALLBACK ? safeGetLocalStorage(SESSION_KEY) || "" : "";
let state = loadState();
let adminState = loadAdminState();
let activePanel = "accueil";
let activeAdminSection = "dashboard";
let mailCampaignUI = { configured: false, senderEmail: "", history: [], preview: null, busy: false, message: "", activeId: "", templateId: "", searchId: "", consentConfirmed: false };
let adminNavExpanded = { permanence: true, site: false, campaign: true, options: false };
let activeSearchType = "all";
let selectedCommune = "";
let mapGradientEnabled = false;
let communesGeojson = null;
let mapZoom = 1;
let selectedContactId = "";
let contactMobileDetailOpen = false;
let selectedContactIds = new Set();
let selectedTrombinoscopeCategoryId = "";
let selectedTrombinoscopePersonId = "";
let selectedAllFilteredContacts = false;
let selectedAllFilteredContactsSignature = "";
let contactDeletionProgress = null;
let pendingContactImport = null;
let contactImportStatus = null;
let selectedPermanenceId = "";
let selectedDeathCaseId = "";
let selectedSpecialLetterId = "";
let selectedDocumentId = "";
let selectedDocumentFolderId = "all";
let selectedTeamFolderId = "";
let selectedLocalFolderId = "all";
let calendarView = "week";
let calendarCursor = new Date().toISOString().slice(0, 10);
let selectedCalendarEventId = "";
let selectedCalendarOccurrenceKey = "";
let calendarCtrlDrag = null;
let calendarSkipClickUntil = 0;
let focusCalendarBodyAfterRender = false;
let selectedCampaignFeatureIds = new Set();
let selectedCampaignFilters = new Set(["boitage"]);
let campaignSearchQuery = "";
let campaignGradientEnabled = false;
let campaignCountFilters = { minEnabled: false, min: 0, maxEnabled: false, max: 0 };
let campaignUnmatchedPage = 1;
let selectedPhotoFolderId = "all";
let photoLibraryPage = 1;
let photoLibrarySearchTimer = null;
let photoFilterExactCommune = false;
let photoAdminFilters = { commune: "", date: "", page: 1 };
let documentPdfObjectUrl = "";
let adminFilters = {};
let adminSyncStatus = "pending";
let adminSyncMessage = "Connexion a la base en attente.";
let adminApiLoadRequested = false;
let adminApiLoaded = false;
let adminUsers = [];
let adminUsersLoaded = false;
let adminUsersLoading = false;
let adminUsersLoadAttempted = false;
let contactByIdCache = null;
let contactSearchTextCache = new WeakMap();
let contactQuickSearchTextCache = new WeakMap();
let adminMutationSnapshot = null;
let publicStateVersion = "";
let adminStateVersion = "";
let publicStateSaveCount = 0;
let adminStateSaveCount = 0;
let adminSaveQueue = Promise.resolve();
const databaseLoadingTokens = new Map();
let stateSyncTimer = null;
let stateSyncInProgress = false;
const stateSyncChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel("emeric-salmon-state-sync") : null;
const contactPickerSearchTimers = new Map();

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const fullDayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function defaultState() {
  const now = new Date().toISOString();
  return {
    visits: 0,
    categories: themes.slice(0, 6),
    contentTypes,
    homepage: defaultHomepageContent(),
    socialLinks: { assembly: "", twitter: "", facebook: "", instagram: "", threads: "", tiktok: "" },
    users: [],
    victories: [],
    agenda: [],
    legislative: [],
    supportRequests: [],
    newsletterLeads: [],
    photoLibrary: { folders: [], photos: [] },
    terrainGeojson: null,
    terrainGeojsonFileName: "",
    sections: []
  };
}

function defaultHomepageContent() {
  return {
    browserTitle: "Emeric Salmon - Espace parlementaire",
    brandEyebrow: "Espace parlementaire",
    brandName: "Emeric Salmon",
    navHome: "Accueil",
    navNewsletter: "Recevoir les informations",
    navSupport: "Support",
    heroEyebrow: "Député de la 2e circonscription de la Haute-Saône",
    heroTitle: "À vos côtés, sur le terrain comme à l’Assemblée.",
    heroBody: "Emeric Salmon porte la voix des habitants de Haute-Saône, accompagne les projets locaux et défend les enjeux du territoire dans le travail parlementaire.",
    searchPlaceholder: "Rechercher une commune, une actualité...",
    searchButton: "Rechercher",
    portraitName: "Emeric Salmon",
    portraitSubtitle: "Haute-Saône",
    heroImage: "assets/emeric-salmon-portrait.jpg",
    heroImageAlt: "Portrait officiel d’Emeric Salmon",
    overviewEyebrow: "Découvrir le mandat",
    overviewTitle: "Un engagement suivi, à l’Assemblée et en Haute-Saône",
    overviewIntro: "Les accès essentiels et les chiffres du mandat réunis en un seul endroit.",
    victoriesLabel: "Victoires",
    victoriesMeta: "résultats obtenus",
    agendaLabel: "Rendez-vous circos",
    agendaMeta: "rendez-vous",
    legislativeLabel: "Travail législatif",
    legislativeMeta: "contenus",
    period30: "1 mois",
    period90: "3 mois",
    period365: "1 an",
    periodAll: "Depuis le début",
    footerLegal: "Mentions légales et confidentialité",
    footerSignature: "Emeric Salmon · Député de la Haute-Saône",
    adminAccess: "Administration"
  };
}

function homepageContent() {
  const home = { ...defaultHomepageContent(), ...(state.homepage || {}) };
  if (home.searchPlaceholder === "Rechercher une commune, un thème, une actualité...") home.searchPlaceholder = "Rechercher une commune, une actualité...";
  return home;
}

function defaultAdminState() {
  const now = new Date().toISOString();
  return {
    contactFields: defaultContactFields(),
    localContacts: [],
    institutions: [],
    savedContactSearches: [],
    mailTemplates: [],
    trombinoscopeCategories: [],
    trombinoscopePeople: [],
    contactKeywords: [
      { id: "institutionnel", label: "institutionnel", color: "#2d6fb6" },
      { id: "urgent", label: "urgent", color: "#b2303d" },
      { id: "deces", label: "décès", color: "#343a46" }
    ],
    citizenRequests: [],
    permanenceRequests: [],
    localFolders: [{ id: "local-folder-general", name: "Dossiers citoyens", parentId: "", createdAt: now, updatedAt: now }],
    permanenceKeywords: [{ id: "commune", label: "commune", color: "#2d6fb6" }],
    teamTasks: [],
    calendarEvents: [],
    calendarEventCategories: [],
    campaignEvents: [],
    teamFolders: [{ id: "team-folder-general", name: "Suivi general", description: "Dossiers et actions suivis par l'equipe.", createdAt: now, updatedAt: now }],
    templates: [],
    documents: [],
    documentFolders: defaultDocumentFolders(now),
    parliamentWork: [],
    addons: [
      { id: "contacts-import-export", name: "Import / export de contacts", description: "CSV, JSON et sauvegarde des contacts locaux.", enabled: true, locked: true },
      { id: "death-management", name: "Gestion des deces", description: "Dossiers de deces, proches, courriers Word et emails.", enabled: true, locked: true },
      { id: "database-sync", name: "Synchronisation base de donnees", description: "Sauvegarde de l'administration via api/admin.php lorsque l'API est disponible.", enabled: true, locked: true },
      { id: "editorial-workflow", name: "Validation editoriale", description: "Suivi des actualites et contenus a publier.", enabled: true, locked: false }
    ],
    deathCases: [],
    specialLetters: [],
    deathRelationOptions: relationOptions,
    deathLetterTemplate: "{{date_du_jour}}\n\n{{civilite_proche}} {{prenom_proche}} {{nom_proche}}\n{{adresse_proche}}\n\nObjet : condoleances suite au deces de {{prenom_defunt}} {{nom_defunt}}\n\n{{civilite_proche}},\n\nJ'ai appris avec tristesse le deces de {{prenom_defunt}} {{nom_defunt}}, survenu le {{date_deces}}.\n\nJe tiens a vous adresser mes sinceres condoleances, ainsi qu'a l'ensemble de votre famille et de vos proches.\n\nCordialement,\nEmeric Salmon",
    deathEmailTemplates: defaultDeathEmailTemplates(now),
    notifications: [],
    activityLog: [],
    campaign: { geojson: null, fileName: "", assignments: {}, importedAt: "" },
    photoLibrary: { folders: [], photos: [] },
    mobileAdminMenu: ["dashboard", "contacts", "trombinoscope", "calendar", "campaign-events", "permanence", "death", "special-letters", "documents", "mail-templates", "mail-campaigns", "homepage", "content", "photo-library", "campaign-terrain", "mobile-menu", "map-settings"]
  };
}

function defaultDocumentFolders(now = new Date().toISOString()) {
  return [
    { id: "folder-courriers", name: "Courriers", parentId: "", createdAt: now, updatedAt: now },
    { id: "folder-courriers-envoyes", name: "Courriers envoyes", parentId: "folder-courriers", createdAt: now, updatedAt: now },
    { id: "folder-courriers-recus", name: "Courriers recus", parentId: "folder-courriers", createdAt: now, updatedAt: now },
    { id: "folder-dossiers-locaux", name: "Dossiers locaux", parentId: "", createdAt: now, updatedAt: now },
    { id: "folder-transports", name: "Transports", parentId: "folder-dossiers-locaux", createdAt: now, updatedAt: now },
    { id: "folder-logement", name: "Logement", parentId: "folder-dossiers-locaux", createdAt: now, updatedAt: now },
    { id: "folder-administratif", name: "Administratif", parentId: "", createdAt: now, updatedAt: now }
  ];
}

function defaultDeathEmailTemplates(now = new Date().toISOString()) {
  return [{
    id: "death-template-default",
    title: "Modele Word de condoleances",
    fileName: "",
    fileData: "",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    variables: [],
    subject: "Condoleances suite au deces de {prenom_defunt} {nom_defunt}",
    body: `<p>{{civilite_proche}},</p><p>J'ai appris avec tristesse le deces de <strong>{{prenom_defunt}} {{nom_defunt}}</strong>, survenu le {{date_deces}}.</p><p>Je tiens a vous adresser mes sinceres condoleances, ainsi qu'a l'ensemble de votre famille et de vos proches.</p><p>Cordialement,<br>Emeric Salmon</p>`,
    createdAt: now,
    updatedAt: now
  }];
}

function defaultContactFields() {
  return [
    { id: "id", label: "Identifiant", type: "text", system: true },
    { id: "firstName", label: "Prenom", type: "text", system: true },
    { id: "lastName", label: "Nom", type: "text", system: true, required: true },
    { id: "usageName", label: "Nom d'usage", type: "text", system: true },
    { id: "birthName", label: "Nom de naissance", type: "text", system: true },
    { id: "email", label: "Email", type: "text", system: true },
    { id: "mobile", label: "Mobile", type: "text", system: true },
    { id: "phone", label: "Telephone", type: "text", system: true },
    { id: "city", label: "Ville", type: "text", system: true },
    { id: "postalCode", label: "Code postal", type: "text", system: true },
    { id: "streetNumber", label: "Numero", type: "text", system: true },
    { id: "streetName", label: "Rue", type: "text", system: true },
    { id: "streetNameFull", label: "Nom de rue", type: "text", system: true },
    { id: "category", label: "Categorie", type: "list", options: contactCategories, system: true },
    { id: "organization", label: "Organisation", type: "text", system: true },
    { id: "role", label: "Fonction", type: "text", system: true },
    { id: "profession", label: "Profession", type: "text", system: true },
    { id: "gender", label: "Genre", type: "text", system: true },
    { id: "birthDate", label: "Date naissance", type: "date", system: true },
    { id: "deathDateApprox", label: "Date deces", type: "text", system: true },
    { id: "emailCampaignStatus", label: "Statut de l'email pour les campagnes", type: "text", system: true },
    { id: "keywords", label: "Tags / Mots-cles", type: "text", system: true },
    { id: "notes", label: "Notes", type: "textarea", system: true }
  ];
}

function loadState() {
  if (!ALLOW_LOCAL_DATA_FALLBACK) return defaultState();
  try {
    return { ...defaultState(), ...(JSON.parse(safeGetLocalStorage(STORAGE_KEY) || "null") || {}) };
  } catch {
    return defaultState();
  }
}

function loadAdminState() {
  if (!ALLOW_LOCAL_DATA_FALLBACK) return normalizeAdminState(defaultAdminState());
  return normalizeAdminState(defaultAdminState());
}

function siteThemes() {
  return Array.isArray(state.categories) && state.categories.length ? state.categories : themes;
}

function siteContentTypes() {
  return Array.isArray(state.contentTypes) && state.contentTypes.length ? state.contentTypes : contentTypes;
}

function normalizeAdminState(value) {
  const usedContactIds = new Set();
  const contactIdMap = new Map();
  const contacts = Array.isArray(value.localContacts) ? value.localContacts.map((contact) => {
    const previousId = contact?.id || "";
    const normalized = normalizeContactRecord(contact, usedContactIds);
    if (previousId && previousId !== normalized.id) contactIdMap.set(previousId, normalized.id);
    return normalized;
  }) : [];
  const remapContactId = (id) => contactIdMap.get(id) || id;
  const permanenceRequests = normalizePermanence(value.permanenceRequests || []).map((item) => ({ ...item, contactId: remapContactId(item.contactId) }));
  const teamTasks = normalizeTasks(value.teamTasks || []).map((item) => ({ ...item, linkedContactId: remapContactId(item.linkedContactId) }));
  const calendarEvents = normalizeCalendarEvents(value.calendarEvents || []).map((item) => ({ ...item, contactIds: [...new Set(item.contactIds.map(remapContactId))], attendanceByDate: Object.fromEntries(Object.entries(item.attendanceByDate).map(([day, rows]) => [day, [...new Map(rows.map((row) => [remapContactId(row.contactId), { ...row, contactId: remapContactId(row.contactId) }])).values()]])) }));
  const deathCases = (Array.isArray(value.deathCases) ? value.deathCases : []).map((item) => ({
    ...item,
    id: item.id || crypto.randomUUID(),
    deceasedId: remapContactId(item.deceasedId),
    status: item.status || "ouvert",
    notes: item.notes || "",
    history: Array.isArray(item.history) ? item.history : [],
    relatives: (item.relatives || []).map((relative) => ({
      ...relative,
      id: relative.id || crypto.randomUUID(),
      contactId: remapContactId(relative.contactId),
      relation: relative.relation || "proche",
      sentAt: relative.sentAt || "",
      responseStatus: relative.responseStatus || "pending",
      respondedAt: relative.respondedAt || "",
      templateId: relative.templateId || ""
    }))
  }));
  const specialLetters = (Array.isArray(value.specialLetters) ? value.specialLetters : []).map((item) => ({
    ...item,
    id: item.id || crypto.randomUUID(),
    contactId: remapContactId(item.contactId),
    title: String(item.title || "").trim(),
    templateId: item.templateId || "",
    notes: item.notes || "",
    sentAt: item.sentAt || "",
    responseStatus: item.responseStatus || "pending",
    respondedAt: item.respondedAt || "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
  }));
  const legacyTemplate = String(value.deathLetterTemplate || "").trim();
  const deathEmailTemplates = normalizeDeathEmailTemplates(value.deathEmailTemplates, legacyTemplate);
  const documentFolders = normalizeDocumentFolders(value.documentFolders);
  const documents = normalizeDocuments(value.documents, documentFolders);
  const teamFolders = normalizeWorkFolders(value.teamFolders, "team-folder-general", "Suivi general");
  const localFolders = normalizeWorkFolders(value.localFolders, "local-folder-general", "Dossiers citoyens");
  const campaign = normalizeCampaign(value.campaign);
  const photoLibrary = normalizePhotoLibrary(value.photoLibrary);
  const trombinoscopeCategories = normalizeTrombinoscopeCategories(value.trombinoscopeCategories);
  const categoryIds = new Set(trombinoscopeCategories.map((category) => category.id));
  const trombinoscopePeople = normalizeTrombinoscopePeople(value.trombinoscopePeople, categoryIds).map((person) => ({
    ...person,
    linkedContactId: remapContactId(person.linkedContactId)
  }));
  return {
    ...defaultAdminState(),
    ...value,
    contactFields: normalizeContactFields(value.contactFields || []),
    localContacts: contacts,
    institutions: (Array.isArray(value.institutions) ? value.institutions : []).filter((entry) => entry && entry.id && entry.name).map((entry) => ({
      ...entry,
      mayorContactId: remapContactId(entry.mayorContactId || ""),
      legacyContactId: remapContactId(entry.legacyContactId || ""),
      deputyContactIds: [...new Set((Array.isArray(entry.deputyContactIds) ? entry.deputyContactIds : []).map(remapContactId))]
    })),
    savedContactSearches: normalizeSavedContactSearches(value.savedContactSearches),
    mailTemplates: normalizeMailTemplates(value.mailTemplates),
    trombinoscopeCategories,
    trombinoscopePeople,
    contactKeywords: normalizeKeywords(value.contactKeywords || []),
    permanenceRequests,
    teamTasks,
    calendarEvents,
    campaignEvents: normalizeCampaignMajorEvents(value.campaignEvents).map((event) => ({...event, participants: event.participants.map((participant) => ({...participant, contactId: remapContactId(participant.contactId)}))})),
    calendarEventCategories: normalizeCalendarEventCategories(value.calendarEventCategories),
    teamFolders,
    localFolders,
    templates: normalizeTemplates(value.templates || []),
    documents,
    documentFolders,
    addons: normalizeAddons(value.addons || []),
    deathCases,
    specialLetters,
    deathRelationOptions: normalizeDeathRelationOptions(value.deathRelationOptions),
    deathEmailTemplates,
    campaign,
    photoLibrary,
    mobileAdminMenu: normalizeMobileAdminMenu(value.mobileAdminMenu),
    activityLog: Array.isArray(value.activityLog) ? value.activityLog : []
  };
}

function normalizeTrombinoscopeCategories(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item && typeof item === "object").map((item) => ({
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "").trim().slice(0, 120),
    description: String(item.description || "").trim().slice(0, 600),
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString())
  })).filter((item) => item.name);
}

function normalizeTrombinoscopePeople(items, categoryIds = new Set()) {
  return (Array.isArray(items) ? items : []).filter((item) => item && typeof item === "object" && categoryIds.has(String(item.categoryId || ""))).map((item) => ({
    id: String(item.id || crypto.randomUUID()),
    categoryId: String(item.categoryId || ""),
    linkedContactId: String(item.linkedContactId || ""),
    firstName: String(item.firstName || "").trim().slice(0, 120),
    lastName: String(item.lastName || "").trim().slice(0, 120),
    role: String(item.role || "").trim().slice(0, 180),
    city: String(item.city || "").trim().slice(0, 120),
    email: String(item.email || "").trim().slice(0, 180),
    phone: String(item.phone || "").trim().slice(0, 80),
    notes: String(item.notes || "").trim().slice(0, 4000),
    photo: typeof item.photo === "string" && item.photo.startsWith("data:image/") ? item.photo : "",
    photoName: String(item.photoName || "").trim().slice(0, 255),
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString())
  })).filter((item) => item.firstName || item.lastName || item.linkedContactId);
}

function allAdminMenuItems() {
  return [adminMenu.home, ...adminMenu.groups.flatMap((group) => group.items)];
}

function normalizeMobileAdminMenu(value) {
  const allowed = new Set(allAdminMenuItems().map(([id]) => id));
  const fallback = defaultAdminState().mobileAdminMenu;
  const essentialItems = ["dashboard", "saved-contact-searches", "permanence", "death", "special-letters", "documents", "campaign-events"];
  return [...new Set([...essentialItems, ...(Array.isArray(value) ? value : fallback).map(String)].filter((id) => allowed.has(id)))];
}

function normalizePhotoLibrary(value) {
  const source = value && typeof value === "object" ? value : {};
  const sourceFolders = Array.isArray(source.folders) ? source.folders : [];
  const sourcePhotos = Array.isArray(source.photos) ? source.photos : [];
  const legacyEventFolderIds = new Set(sourceFolders.filter((folder) => /^event-/.test(String(folder?.id || ""))).map((folder) => String(folder.id)));
  const hasEventPhotos = sourcePhotos.some((photo) => photo?.src && (photo.eventId || legacyEventFolderIds.has(String(photo.folderId || ""))));
  const folders = sourceFolders.filter((folder) => !legacyEventFolderIds.has(String(folder?.id || ""))).map((folder) => ({
    id: String(folder?.id || crypto.randomUUID()),
    name: String(folder?.name || "Dossier sans nom").trim().slice(0, 120),
    createdAt: String(folder?.createdAt || new Date().toISOString()),
    updatedAt: String(folder?.updatedAt || folder?.createdAt || new Date().toISOString())
  }));
  if (hasEventPhotos && !folders.some((folder) => folder.id === EVENT_PHOTO_FOLDER_ID)) {
    folders.unshift({ id: EVENT_PHOTO_FOLDER_ID, name: "Photos des événements", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  const folderIds = new Set(folders.map((folder) => folder.id));
  const photos = sourcePhotos.filter((photo) => photo?.src && folderIds.has(photo.eventId || legacyEventFolderIds.has(String(photo.folderId || "")) ? EVENT_PHOTO_FOLDER_ID : String(photo.folderId || ""))).map((photo) => ({
    id: String(photo.id || crypto.randomUUID()), folderId: photo.eventId || legacyEventFolderIds.has(String(photo.folderId || "")) ? EVENT_PHOTO_FOLDER_ID : String(photo.folderId), src: String(photo.src),
    thumbnail: photo.thumbnail && photo.thumbnail !== photo.src ? String(photo.thumbnail) : "", fileName: String(photo.fileName || "photo"), alt: String(photo.alt || ""),
    commune: String(photo.commune || (photo.location === "Lieu non renseigné" ? "" : photo.location) || "").split(",")[0].trim().slice(0, 120),
    eventId: String(photo.eventId || ""),
    takenAt: /^\d{4}-\d{2}-\d{2}$/.test(String(photo.takenAt || "")) ? String(photo.takenAt) : "",
    latitude: Number.isFinite(Number(photo.latitude)) ? Number(photo.latitude) : null,
    longitude: Number.isFinite(Number(photo.longitude)) ? Number(photo.longitude) : null,
    createdAt: String(photo.createdAt || new Date().toISOString())
  }));
  return { folders, photos };
}

function normalizeCampaign(value) {
  const source = value && typeof value === "object" ? value : {};
  const assignments = {};
  Object.entries(source.assignments && typeof source.assignments === "object" ? source.assignments : {}).forEach(([id, filters]) => {
    const clean = [...new Set((Array.isArray(filters) ? filters : []).filter((filter) => campaignFilterIds().includes(filter)))];
    if (clean.length) assignments[String(id)] = clean;
  });
  return {
    geojson: source.geojson && typeof source.geojson === "object" ? source.geojson : null,
    fileName: String(source.fileName || "").slice(0, 240),
    assignments,
    importedAt: String(source.importedAt || "")
  };
}


function normalizeCalendarEventCategories(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).filter((item) => item && typeof item === "object").map((item) => ({
    id: String(item.id || ""),
    name: String(item.name || "").trim().slice(0, 80),
    color: /^#[0-9a-fA-F]{6}$/.test(String(item.color || "")) ? String(item.color) : "#3478c0"
  })).filter((item) => item.id && item.name && !seen.has(item.id) && seen.add(item.id)).slice(0, 100);
}
function calendarCategory(item = {}) {
  return (adminState.calendarEventCategories || []).find((category) => category.id === item.categoryId) || null;
}
function calendarCategoryTextColor(hex) {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const luminance = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.179 ? "#172b44" : "#ffffff";
}
function calendarCategoryStyle(item = {}) {
  const category = calendarCategory(item);
  return category ? `--calendar-category-color:${attr(category.color)};--calendar-category-text:${calendarCategoryTextColor(category.color)};` : "";
}
function calendarRecurrenceLabel(recurrence) {
  return { weekly: "Chaque semaine", monthly: "Chaque mois", yearly: "Chaque année" }[recurrence] || "Une fois";
}
function calendarOccurrenceDate(startKey, index, recurrence) {
  const parts = String(startKey).split("-").map(Number);
  const year = parts[0], month = parts[1], day = parts[2];
  if (recurrence === "weekly") return calendarDateKey(calendarAddDays(startKey, index * 7));
  if (recurrence === "monthly") {
    const total = year * 12 + month - 1 + index;
    const y = Math.floor(total / 12), m = total % 12;
    const maximum = new Date(y, m + 1, 0).getDate();
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(Math.min(day, maximum)).padStart(2, "0")}`;
  }
  if (recurrence === "yearly") {
    const y = year + index;
    const maximum = new Date(y, month, 0).getDate();
    return `${y}-${String(month).padStart(2, "0")}-${String(Math.min(day, maximum)).padStart(2, "0")}`;
  }
  return startKey;
}
function calendarEventOnDate(item, key) {
  const anchor = String(item.startAt || "").slice(0, 10);
  if (!anchor || key < anchor) return null;
  if (item.recurrenceUntil && key > item.recurrenceUntil) return null;
  const rule = item.recurrence || "none";
  let index = 0;
  if (rule === "none") {
    if (key !== anchor) return null;
  } else if (rule === "weekly") {
    const distance = Math.round((Date.parse(key + "T12:00:00Z") - Date.parse(anchor + "T12:00:00Z")) / 86400000);
    if (distance % 7 !== 0) return null;
    index = distance / 7;
  } else if (rule === "monthly") {
    const [ay, am] = anchor.split("-").map(Number);
    const [y, m] = key.split("-").map(Number);
    index = (y - ay) * 12 + (m - am);
    if (calendarOccurrenceDate(anchor, index, rule) !== key) return null;
  } else if (rule === "yearly") {
    index = Number(key.slice(0, 4)) - Number(anchor.slice(0, 4));
    if (calendarOccurrenceDate(anchor, index, rule) !== key) return null;
  } else return null;
  if (index < 0) return null;
  if (!index) return item;
  const startAt = key + String(item.startAt).slice(10);
  const originalStart = new Date(item.startAt);
  const originalEnd = new Date(item.endAt);
  const elapsedDays = Math.round((Date.UTC(originalEnd.getFullYear(), originalEnd.getMonth(), originalEnd.getDate()) - Date.UTC(originalStart.getFullYear(), originalStart.getMonth(), originalStart.getDate())) / 86400000);
  const endDate = calendarAddDays(key, elapsedDays);
  const endAt = calendarDateKey(endDate) + String(item.endAt).slice(10);
  return { ...item, startAt, endAt, occurrenceKey: key, seriesId: item.id };
}
function saveCalendarCategory(form) {
  const values = new FormData(form);
  const name = String(values.get("name") || "").trim().slice(0, 80);
  const color = String(values.get("colorHex") || "").trim().toUpperCase();
  if (!name || !/^#[0-9A-F]{6}$/.test(color)) { showToast("Indiquez une couleur au format #RRGGBB (6 chiffres hexadécimaux)."); return; }
  const items = normalizeCalendarEventCategories(adminState.calendarEventCategories);
  const editing = items.find((item) => item.id === form.dataset.calendarCategorySave);
  const id = editing?.id || crypto.randomUUID();
  adminState.calendarEventCategories = editing ? items.map((item) => item.id === id ? { id, name, color } : item) : [...items, { id, name, color }];
  adminFilters.calendarCategoryEdit = "";
  saveAdminState(editing ? "modification catégorie" : "création catégorie", "calendrier", name);
}
function deleteCalendarCategory(id) {
  const category = calendarCategory({ categoryId: id });
  if (!category || !confirm(`Supprimer la catégorie « ${category.name} » ? Les événements resteront dans l'agenda, sans catégorie.`)) return;
  adminState.calendarEventCategories = (adminState.calendarEventCategories || []).filter((item) => item.id !== id);
  adminState.calendarEvents = (adminState.calendarEvents || []).map((item) => item.categoryId === id ? { ...item, categoryId: "" } : item);
  adminFilters.calendarCategoryEdit = "";
  saveAdminState("suppression catégorie", "calendrier", category.name);
}
function renderCalendarCategoriesManager() {
  const categories = normalizeCalendarEventCategories(adminState.calendarEventCategories);
  const editing = categories.find((item) => item.id === adminFilters.calendarCategoryEdit);
  return `<section class="calendar-categories-manager">
    <header><h3>Catégories d'événements</h3><button type="button" class="secondary-action compact" data-calendar-categories-close>Fermer</button></header>
    <div class="calendar-categories-list">${categories.map((category) => `<div class="calendar-category-row">
      <span class="calendar-category-dot" style="background:${attr(category.color)}"></span>
      <strong>${text(category.name)}</strong>
      <button type="button" class="secondary-action compact" data-calendar-category-edit="${attr(category.id)}">Modifier</button>
      <button type="button" class="secondary-action compact danger" data-calendar-category-delete="${attr(category.id)}">Supprimer</button>
    </div>`).join("") || "<p>Aucune catégorie pour le moment.</p>"}</div>
    <form data-calendar-category-save="${attr(editing?.id || "new")}" class="calendar-category-form">
      <label>Nom de la catégorie <input name="name" required maxlength="80" value="${attr(editing?.name || "")}" placeholder="Ex. Permanences, réunions, visites..." /></label>
      <label>Couleur <input name="color" type="color" data-calendar-color-picker value="${attr(editing?.color || "#3478c0")}" /></label>
      <label>Code hexadécimal <input name="colorHex" data-calendar-color-hex type="text" spellcheck="false" required maxlength="7" pattern="#[0-9a-fA-F]{6}" value="${attr(editing?.color || "#3478c0")}" placeholder="#3478C0" aria-describedby="calendar-hex-help" /></label>
      <small id="calendar-hex-help">Choisis librement une couleur #RRGGBB, ou utilise le sélecteur.</small>
      <button type="submit" class="primary-action compact">${editing ? "Enregistrer" : "Ajouter la catégorie"}</button>
      ${editing ? '<button type="button" data-calendar-category-new class="secondary-action compact">Annuler</button>' : ""}
    </form>
  </section>`;
}


function normalizeCalendarAttendance(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [day, rows] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(rows)) continue;
    const seen = new Set();
    out[day] = rows.filter((r) => r && typeof r.contactId === "string" && r.contactId && !seen.has(r.contactId) && seen.add(r.contactId))
      .map((r) => ({ contactId: r.contactId, status: ["attended", "absent"].includes(r.status) ? r.status : "registered" }));
  }
  return out;
}
function calendarAttendanceDay(item) {
  const first = String(item.startAt || "").slice(0, 10);
  if (!item.recurrence || item.recurrence === "none") return first;
  const selected = selectedCalendarOccurrenceKey || first;
  return calendarEventOnDate(item, selected) ? selected : first;
}
function calendarAttendanceEntries(item, day = calendarAttendanceDay(item)) {
  return (item.attendanceByDate || {})[day] || [];
}
function calendarAttendanceStats(item, day = calendarAttendanceDay(item)) {
  const rows = calendarAttendanceEntries(item, day);
  const attended = rows.filter((row) => row.status === "attended").length;
  const absent = rows.filter((row) => row.status === "absent").length;
  return { registered: rows.length, attended, absent, pending: rows.length - attended - absent };
}
function renderCalendarAttendance(item) {
  if (!item.id) return '<section class="calendar-attendance-panel"><h4>Gestion des participants</h4><p>Enregistrez d’abord l’événement pour inscrire des participants.</p></section>';
  const day = calendarAttendanceDay(item), entries = calendarAttendanceEntries(item, day);
  const stat = calendarAttendanceStats(item, day);
  return `<section class="calendar-attendance-panel" data-calendar-attendance="${attr(item.id)}" data-attendance-day="${attr(day)}">
    <header><h4>Participants · ${text(formatDate(day))}</h4><button type="button" class="secondary-action compact" data-attendance-export>Exporter Excel (.xlsx)</button></header>
    <div class="calendar-attendance-stats">
      <div><strong>${stat.registered}</strong><small>Ont indiqué vouloir venir</small></div>
      <div><strong>${stat.attended}</strong><small>Sont venus</small></div>
      <div><strong>${stat.absent}</strong><small>Ne sont pas venus</small></div>
      <div><strong>${stat.pending}</strong><small>À confirmer</small></div>
    </div>
    <p class="calendar-attendance-explainer">Ajouter une personne signifie qu’elle a indiqué vouloir participer. Vous pourrez ensuite cocher sa présence ou son absence.</p>
    <label>Rechercher un contact à inscrire<input data-attendance-search type="search" autocomplete="off" placeholder="Nom, prénom, commune, téléphone…" /></label>
    <div class="calendar-attendance-results" data-attendance-results><small>Saisissez au moins deux caractères.</small></div>
    <div class="calendar-attendance-list">${entries.map((row) => {
      const contact = contactById(row.contactId);
      return `<div class="calendar-attendance-row">
        <button type="button" data-calendar-open-contact="${attr(row.contactId)}" class="calendar-attendance-contact">${text(contact ? contactDisplayName(contact) : "Contact indisponible")}</button>
        ${contact?.city ? `<small>${text(contact.city)}</small>` : ""}
        <div class="calendar-attendance-choice" role="group" aria-label="Présence de ${attr(contact ? contactDisplayName(contact) : "ce participant")}">
          <label><input type="checkbox" data-attendance-check="${attr(row.contactId)}" value="attended" ${row.status === "attended" ? "checked" : ""} /> Est venu</label>
          <label><input type="checkbox" data-attendance-check="${attr(row.contactId)}" value="absent" ${row.status === "absent" ? "checked" : ""} /> N'est pas venu</label>
        </div>
        <button type="button" class="secondary-action compact danger" data-attendance-remove="${attr(row.contactId)}">Retirer</button>
      </div>`;
    }).join("") || '<p class="calendar-attendance-empty">Aucun participant enregistré.</p>'}</div>
    ${item.recurrence && item.recurrence !== "none" ? '<small>Les inscriptions et présences sont gérées séparément pour chaque date de la série.</small>' : ""}
  </section>`;
}
function calendarAttendanceAction(eventId, day, contactId, action) {
  const item = (adminState.calendarEvents || []).find((entry) => entry.id === eventId);
  if (!item || !calendarEventOnDate(item, day)) return;
  const map = normalizeCalendarAttendance(item.attendanceByDate), rows = map[day] || [];
  if (action === "add") {
    if (!contactById(contactId) || rows.some((row) => row.contactId === contactId)) return;
    rows.push({ contactId, status: "registered" });
  } else if (action === "remove") {
    map[day] = rows.filter((row) => row.contactId !== contactId);
  } else if (["registered", "attended", "absent"].includes(action)) {
    const entry = rows.find((row) => row.contactId === contactId);
    if (!entry) return;
    entry.status = action;
  } else return;
  if (action !== "remove") map[day] = rows;
  item.attendanceByDate = map;
  item.updatedAt = new Date().toISOString();
  selectedCalendarEventId = eventId;
  selectedCalendarOccurrenceKey = day;
  saveAdminState("participants", "calendrier", item.title);
}
function searchCalendarAttendance(input) {
  const section = input.closest("[data-calendar-attendance]"), results = section?.querySelector("[data-attendance-results]");
  if (!section || !results) return;
  const query = input.value.trim();
  if (query.length < 2) { results.innerHTML = "<small>Saisissez au moins deux caractères.</small>"; return; }
  const item = (adminState.calendarEvents || []).find((entry) => entry.id === section.dataset.calendarAttendance);
  if (!item) return;
  const excluded = calendarAttendanceEntries(item, section.dataset.attendanceDay).map((row) => row.contactId);
  const matches = searchContacts(query, { limit: 12, excludeIds: excluded });
  results.innerHTML = matches.length ? matches.map((contact) => `<button type="button" data-attendance-add="${attr(contact.id)}"><strong>${text(contactDisplayName(contact))}</strong><small>${text([contact.city, contact.mobile, contact.email].filter(Boolean).join(" · "))}</small></button>`).join("") : "<small>Aucun contact disponible.</small>";
}


function participantXmlText(value) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function participantWorkbookBytes(rows) {
  // Generates a real, uncompressed OOXML .xlsx file without a third-party script or CDN.
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const sheet = xml + `<worksheet xmlns="${ns}"><cols>${[17, 22, 24, 23, 33, 20].map((width, i) => `<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>` +
    rows.map((row, index) => `<row r="${index + 1}">` + row.map((value, i) => `<c r="${letters[i]}${index + 1}" t="inlineStr"><is><t xml:space="preserve">${participantXmlText(value)}</t></is></c>`).join("") + "</row>").join("") + "</sheetData></worksheet>";
  const parts = [
    ["[Content_Types].xml", xml + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ["_rels/.rels", xml + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml", xml + `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Participants" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", xml + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ["xl/worksheets/sheet1.xml", sheet]
  ];
  const encoder = new TextEncoder();
  const files = parts.map(([name, contents]) => ({ name: encoder.encode(name), body: encoder.encode(contents) }));
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let bit = 0; bit < 8; bit++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c >>> 0; }
  const crc32 = (bytes) => { let crc = 0xFFFFFFFF; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0; };
  const localSize = files.reduce((sum, f) => sum + 30 + f.name.length + f.body.length, 0);
  const centralSize = files.reduce((sum, f) => sum + 46 + f.name.length, 0);
  const bytes = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(bytes.buffer);
  const u16 = (o, v) => view.setUint16(o, v, true);
  const u32 = (o, v) => view.setUint32(o, v >>> 0, true);
  let pos = 0;
  for (const f of files) {
    f.offset = pos;
    f.crc = crc32(f.body);
    u32(pos, 0x04034b50); u16(pos+4, 20); u16(pos+6, 0); u16(pos+8, 0); u32(pos+14, f.crc);
    u32(pos+18, f.body.length); u32(pos+22, f.body.length); u16(pos+26, f.name.length); u16(pos+28, 0);
    pos += 30; bytes.set(f.name, pos); pos += f.name.length; bytes.set(f.body, pos); pos += f.body.length;
  }
  const centralStart = pos;
  for (const f of files) {
    u32(pos, 0x02014b50); u16(pos+4, 20); u16(pos+6, 20); u16(pos+8, 0); u16(pos+10, 0);
    u32(pos+16, f.crc); u32(pos+20, f.body.length); u32(pos+24, f.body.length);
    u16(pos+28, f.name.length); u16(pos+30, 0); u16(pos+32, 0); u16(pos+34, 0);
    u16(pos+36, 0); u32(pos+38, 0); u32(pos+42, f.offset);
    pos += 46; bytes.set(f.name, pos); pos += f.name.length;
  }
  u32(pos, 0x06054b50); u16(pos+4, 0); u16(pos+6, 0); u16(pos+8, files.length);
  u16(pos+10, files.length); u32(pos+12, pos-centralStart); u32(pos+16, centralStart); u16(pos+20, 0);
  return bytes;
}
function exportCalendarAttendance(eventId, day) {
  const item = (adminState.calendarEvents || []).find((entry) => entry.id === eventId);
  if (!item || !calendarEventOnDate(item, day)) return;
  const headers = ["Prénom", "Nom", "Commune", "Téléphone", "Mail", "Présence"];
  const entries = calendarAttendanceEntries(item, day);
  const rows = entries.map(({ contactId, status }) => {
    const contact = contactById(contactId) || {};
    return [
      contact.firstName || "", contact.lastName || contact.usageName || "",
      contact.city || "", contact.mobile || contact.phone || "",
      contact.email || "", status === "attended" ? "Est venu" : status === "absent" ? "N'est pas venu" : "À confirmer"
    ];
  });
  const filename = "participants-" + slugify(item.title || "evenement") + "-" + day + ".xlsx";
  downloadFile(filename, participantWorkbookBytes([headers, ...rows]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  showToast(entries.length + " participant(s) exporté(s) vers Excel.");
}


function normalizeCampaignMajorEvents(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item && typeof item === "object" && item.id).map((item) => {
    const seen = new Set();
    return {
      id: String(item.id), title: String(item.title || "").slice(0, 180),
      startAt: String(item.startAt || "").slice(0, 16), endAt: String(item.endAt || "").slice(0, 16),
      location: String(item.location || "").slice(0, 240), description: String(item.description || "").slice(0, 12000),
      calendarEventId: String(item.calendarEventId || ""),
      participants: (Array.isArray(item.participants) ? item.participants : []).filter((entry) => {
        const id = String(entry?.contactId || "");
        if (!id || seen.has(id)) return false;
        seen.add(id); return true;
      }).map((entry) => ({contactId: String(entry.contactId), status: ["attended","absent"].includes(entry.status) ? entry.status : "registered"})),
      createdAt: String(item.createdAt || ""), updatedAt: String(item.updatedAt || "")
    };
  }).slice(0, 1000);
}
let selectedCampaignMajorEventId = "";
let campaignMajorEventSearchText = "";

function campaignMajorEventStats(item = {}) {
  const rows = item.participants || [];
  const attended = rows.filter((row) => row.status === "attended").length;
  const absent = rows.filter((row) => row.status === "absent").length;
  return {registered: rows.length, attended, absent, pending: rows.length - attended - absent};
}
function campaignMajorEventRecord(id) {
  return (adminState.campaignEvents || []).find((entry) => entry.id === id) || null;
}
function campaignMajorEventCalendarRecord(event) {
  return (adminState.calendarEvents || []).find((entry) => entry.id === event?.calendarEventId && entry.campaignEventId === event?.id) || null;
}
function renderCampaignMajorEventDetail(event) {
  if (!event) return '<section class="campaign-major-placeholder">Sélectionnez un événement ou créez-en un nouveau.</section>';
  const fresh = !event.id;
  const stats = campaignMajorEventStats(event);
  const linked = campaignMajorEventCalendarRecord(event);
  return `<section class="campaign-major-detail">
    <header><h3>${fresh ? "Créer un événement" : text(event.title)}</h3>${!fresh ? `<button class="secondary-action danger compact" type="button" data-campaign-major-delete="${attr(event.id)}">Supprimer</button>` : ""}</header>
    <form class="admin-form campaign-major-form" data-campaign-major-save="${attr(event.id || "new")}">
      <label>Nom de l'événement <input name="title" maxlength="180" required value="${attr(event.title || "")}" placeholder="Réunion publique, cérémonie, rencontre…" /></label>
      <div class="campaign-major-dates">
        <label>Début <input type="datetime-local" name="startAt" required value="${attr(event.startAt || "")}" /></label>
        <label>Fin <input type="datetime-local" name="endAt" required value="${attr(event.endAt || "")}" /></label>
      </div>
      <label>Lieu <input name="location" maxlength="240" value="${attr(event.location || "")}" /></label>
      <label>Description <textarea name="description" rows="4" maxlength="12000">${text(event.description || "")}</textarea></label>
      <button class="primary-action" type="submit">Enregistrer l'événement</button>
    </form>
    ${!fresh ? `<div class="campaign-major-calendar">
      <div><strong>Agenda (facultatif)</strong><p>${linked ? "Cet événement est lié à une entrée de l'agenda." : "Cet événement n'apparaît pas dans l'agenda."}</p></div>
      ${linked ? `<button class="secondary-action compact" type="button" data-campaign-major-open-calendar="${attr(event.id)}">Ouvrir dans l'agenda</button><button class="secondary-action compact" type="button" data-campaign-major-unlink-calendar="${attr(event.id)}">Retirer de l'agenda</button>` :
      `<button class="secondary-action compact" type="button" data-campaign-major-link-calendar="${attr(event.id)}">Ajouter à l'agenda</button>`}
    </div>
    <section class="campaign-major-attendance" data-campaign-major-attendance="${attr(event.id)}">
      <header><h3>Participants</h3><button class="secondary-action compact" type="button" data-campaign-major-export="${attr(event.id)}">Exporter Excel (.xlsx)</button></header>
      <div class="campaign-major-stats">
        <div><strong>${stats.registered}</strong><small>Ont indiqué vouloir venir</small></div>
        <div><strong>${stats.attended}</strong><small>Sont venus</small></div>
        <div><strong>${stats.absent}</strong><small>Ne sont pas venus</small></div>
        <div><strong>${stats.pending}</strong><small>En attente de confirmation</small></div>
      </div>
      <label>Inscrire un contact <input type="search" data-campaign-major-search autocomplete="off" placeholder="Rechercher par nom, prénom, commune, téléphone…" value="${attr(campaignMajorEventSearchText)}" /></label>
      <div class="campaign-major-search-results" data-campaign-major-results>${renderCampaignMajorContactResults(event, campaignMajorEventSearchText)}</div>
      <div class="campaign-major-participants">${(event.participants || []).map((row) => {
        const contact = contactById(row.contactId);
        return `<div class="campaign-major-participant">
          <button type="button" data-campaign-major-contact="${attr(row.contactId)}">${text(contact ? contactDisplayName(contact) : "Contact supprimé")}</button>
          <small>${text([contact?.city, contact?.mobile || contact?.phone, contact?.email].filter(Boolean).join(" · "))}</small>
          <label><input type="checkbox" data-campaign-major-status="${attr(row.contactId)}" value="attended" ${row.status === "attended" ? "checked" : ""}/> Est venu</label>
          <label><input type="checkbox" data-campaign-major-status="${attr(row.contactId)}" value="absent" ${row.status === "absent" ? "checked" : ""}/> N'est pas venu</label>
          <button type="button" class="secondary-action compact danger" data-campaign-major-remove="${attr(row.contactId)}">Retirer</button>
        </div>`;
      }).join("") || '<p>Aucun participant inscrit.</p>'}</div>
    </section>` : '<p>Enregistrez cet événement avant d’y ajouter des participants ou de le lier à l’agenda.</p>'}
  </section>`;
}
function renderCampaignMajorContactResults(event, query) {
  if (!query || query.trim().length < 2) return "<small>Saisissez au moins deux caractères.</small>";
  const excluded = (event.participants || []).map((row) => row.contactId);
  const matches = searchContacts(query, {limit: 12, excludeIds: excluded});
  return matches.map((contact) => `<button type="button" data-campaign-major-add="${attr(contact.id)}"><strong>${text(contactDisplayName(contact))}</strong><small>${text([contact.city, contact.mobile, contact.email].filter(Boolean).join(" · "))}</small></button>`).join("") || '<small>Aucun contact trouvé.</small>';
}
function renderCampaignMajorEvents() {
  const events = [...(adminState.campaignEvents || [])].sort((a,b) => String(b.startAt).localeCompare(String(a.startAt)));
  const selected = selectedCampaignMajorEventId === "new" ? {id:"",title:"",startAt:"",endAt:"",location:"",description:"",participants:[]} :
    campaignMajorEventRecord(selectedCampaignMajorEventId) || null;
  return `<div class="campaign-major-page">
    <header class="campaign-major-heading"><div><h2>Événements de campagne</h2><p>Inscriptions et émargements indépendants du calendrier.</p></div>
      <button class="primary-action" type="button" data-campaign-major-new>+ Créer un événement</button></header>
    <div class="campaign-major-columns">
      <section class="campaign-major-list">${events.map((event) => {
        const stats = campaignMajorEventStats(event);
        return `<button type="button" class="campaign-major-card ${selected?.id === event.id ? "is-active" : ""}" data-campaign-major-open="${attr(event.id)}"><strong>${text(event.title)}</strong>
          <small>${text(formatDate(event.startAt))} ${text(String(event.startAt).slice(11,16))} · ${text(event.location || "Lieu à préciser")}</small>
          <span>${stats.registered} inscrit(s) · ${stats.attended} venu(s)${campaignMajorEventCalendarRecord(event) ? " · 📅 Agenda" : ""}</span>
        </button>`;
      }).join("") || '<p>Aucun événement créé.</p>'}</section>
      ${renderCampaignMajorEventDetail(selected)}
    </div>
  </div>`;
}
function saveCampaignMajorEvent(form) {
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim().slice(0,180);
  const startAt = String(data.get("startAt") || ""), endAt = String(data.get("endAt") || "");
  const start = new Date(startAt), end = new Date(endAt);
  if (!title || !startAt || !endAt || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    showToast("Vérifiez le titre et les dates : la fin doit être après le début."); return;
  }
  const previous = campaignMajorEventRecord(form.dataset.campaignMajorSave);
  const now = new Date().toISOString();
  const item = {id:previous?.id || crypto.randomUUID(), title, startAt, endAt,
    location:String(data.get("location") || "").trim().slice(0,240), description:String(data.get("description") || "").slice(0,12000),
    calendarEventId: previous?.calendarEventId || "", participants:previous?.participants || [],
    createdAt:previous?.createdAt || now, updatedAt:now};
  adminState.campaignEvents = previous ? adminState.campaignEvents.map((entry) => entry.id === item.id ? item : entry) : [item, ...(adminState.campaignEvents || [])];
  const linked = campaignMajorEventCalendarRecord(item);
  if (linked) {
    linked.title = item.title; linked.startAt = item.startAt; linked.endAt = item.endAt;
    linked.location = item.location; linked.body = item.description; linked.updatedAt = now;
  }
  selectedCampaignMajorEventId = item.id;
  campaignMajorEventSearchText = "";
  saveAdminState(previous ? "modification" : "creation", "evenement majeur campagne", item.title);
}
function changeCampaignMajorParticipation(eventId, contactId, operation) {
  const item = campaignMajorEventRecord(eventId);
  if (!item) return;
  if (operation === "add") {
    if (!contactById(contactId) || item.participants.some((row) => row.contactId === contactId)) return;
    item.participants.push({contactId, status:"registered"});
  } else if (operation === "remove") {
    item.participants = item.participants.filter((row) => row.contactId !== contactId);
  } else if (["registered", "attended", "absent"].includes(operation)) {
    const row = item.participants.find((entry) => entry.contactId === contactId);
    if (!row) return;
    row.status = operation;
  } else return;
  item.updatedAt = new Date().toISOString();
  campaignMajorEventSearchText = "";
  saveAdminState("participants", "evenement majeur campagne", item.title);
}
function exportCampaignMajorParticipants(id) {
  const event = campaignMajorEventRecord(id);
  if (!event) return;
  const header = ["Prénom","Nom","Commune","Téléphone","Mail","Présence"];
  const rows = event.participants.map((row) => {
    const contact = contactById(row.contactId) || {};
    return [contact.firstName || "", contact.lastName || contact.usageName || "", contact.city || "",
      contact.mobile || contact.phone || "", contact.email || "", row.status === "attended" ? "Est venu" : row.status === "absent" ? "N'est pas venu" : "À confirmer"];
  });
  downloadFile("participants-campagne-"+slugify(event.title)+"-"+event.startAt.slice(0,10)+".xlsx",
    participantWorkbookBytes([header,...rows]),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  showToast(event.participants.length+" participant(s) exporté(s).");
}
function linkCampaignMajorCalendar(id) {
  const event = campaignMajorEventRecord(id);
  if (!event || campaignMajorEventCalendarRecord(event)) return;
  const now = new Date().toISOString(), calendarId = crypto.randomUUID();
  adminState.calendarEvents.unshift({
    id:calendarId, campaignEventId:event.id, title:event.title, startAt:event.startAt, endAt:event.endAt,
    location:event.location, body:event.description, color:"blue", categoryId:"", recurrence:"none", recurrenceUntil:"",
    contactIds:[], assignedUserIds:[], attendanceByDate:{},
    createdBy:currentUserId, createdByName:userNameById(currentUserId) || currentUser()?.login || "Équipe",
    createdAt:now,updatedAt:now
  });
  event.calendarEventId = calendarId;
  saveAdminState("liaison agenda", "evenement majeur campagne", event.title);
}
function unlinkCampaignMajorCalendar(id) {
  const event = campaignMajorEventRecord(id);
  const linked = campaignMajorEventCalendarRecord(event);
  if (!event || !linked || !confirm("Retirer cet événement de l'agenda ? La fiche de campagne et ses participants seront conservés.")) return;
  adminState.calendarEvents = adminState.calendarEvents.filter((entry) => entry.id !== linked.id);
  event.calendarEventId = "";
  saveAdminState("retrait agenda", "evenement majeur campagne", event.title);
}
function deleteCampaignMajorEvent(id) {
  const event = campaignMajorEventRecord(id);
  if (!event || !confirm("Supprimer définitivement « "+event.title+" » et toutes ses inscriptions ?")) return;
  const linked = campaignMajorEventCalendarRecord(event);
  if (linked) adminState.calendarEvents = adminState.calendarEvents.filter((entry) => entry.id !== linked.id);
  adminState.campaignEvents = adminState.campaignEvents.filter((entry) => entry.id !== id);
  selectedCampaignMajorEventId = "";
  saveAdminState("suppression", "evenement majeur campagne", event.title);
}

function normalizeCalendarEvents(items) {
  const now = new Date().toISOString();
  return (Array.isArray(items) ? items : []).map((item) => {
    const startAt = normalizeCalendarDateTime(item.startAt || item.start || now);
    let endAt = normalizeCalendarDateTime(item.endAt || item.end || startAt);
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      endAt = toLocalDateTimeValue(new Date(new Date(startAt).getTime() + 3600000));
    }
    return {
      ...item,
      id: item.id || crypto.randomUUID(),
      title: String(item.title || "Nouvel événement").trim().slice(0, 180),
      startAt,
      endAt,
      location: String(item.location || "").slice(0, 240),
      contactIds: [...new Set((Array.isArray(item.contactIds) ? item.contactIds : item.contactId ? [item.contactId] : []).filter((id) => typeof id === "string" && id.trim()).map(String))],
      assignedUserIds: [...new Set((Array.isArray(item.assignedUserIds) ? item.assignedUserIds : item.assignedTo ? [item.assignedTo] : []).filter((id) => typeof id === "string" && id.trim()).map(String))],
      attendanceByDate: normalizeCalendarAttendance(item.attendanceByDate),
      body: String(item.body || item.description || "").slice(0, 12000),
      createdBy: String(item.createdBy || ""),
      createdByName: String(item.createdByName || ""),
      color: ["blue", "red", "green", "purple"].includes(item.color) ? item.color : "blue",
      categoryId: String(item.categoryId || ""),
      recurrence: ["weekly", "monthly", "yearly"].includes(item.recurrence) ? item.recurrence : "none",
      recurrenceUntil: /^\d{4}-\d{2}-\d{2}$/.test(String(item.recurrenceUntil || "")) ? String(item.recurrenceUntil) : "",
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || item.createdAt || now
    };
  });
}

function normalizeWorkFolders(items, fallbackId, fallbackName) {
  const now = new Date().toISOString();
  const folders = (Array.isArray(items) ? items : []).map((item) => ({ id: item.id || crypto.randomUUID(), name: String(item.name || fallbackName).slice(0, 120), description: String(item.description || "").slice(0, 800), parentId: String(item.parentId || ""), createdAt: item.createdAt || now, updatedAt: item.updatedAt || now }));
  return folders.length ? folders : [{ id: fallbackId, name: fallbackName, description: "", parentId: "", createdAt: now, updatedAt: now }];
}

function normalizeDeathEmailTemplates(items, legacyTemplate = "") {
  const now = new Date().toISOString();
  const source = Array.isArray(items) && items.length ? items : defaultDeathEmailTemplates(now);
  const normalized = source.map((item) => ({
    id: item.id || crypto.randomUUID(),
    title: String(item.title || "Modele Word deces").trim(),
    description: String(item.description || "").trim(),
    scope: String(item.scope || "deces").trim(),
    fileName: String(item.fileName || "").trim(),
    fileData: sanitizeTemplateFileData(item.fileData),
    mimeType: String(item.mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document").trim(),
    variables: normalizeDeathTemplateVariables(item.variables),
    subject: String(item.subject || "Condoleances").trim(),
    body: String(item.body || "").trim() || textToHtmlParagraphs(legacyTemplate),
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now
  })).filter((item) => item.title);
  return normalized.length ? normalized : defaultDeathEmailTemplates(now);
}

function sanitizeTemplateFileData(value) {
  const fileData = String(value || "").trim();
  if (!fileData || fileData === "__KEEP_EXISTING_FILE_DATA__") return "";
  return fileData.startsWith("data:") ? fileData : "";
}

function normalizeDeathTemplateVariables(items) {
  const byTag = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const tag = String(item.tag || "").trim().replace(/^\{+|\}+$/g, "");
    if (!tag) return;
    byTag.set(tag, {
      tag,
      source: String(item.source || byTag.get(tag)?.source || "").trim(),
      fallback: String(item.fallback || ""),
      replacements: String(item.replacements || "")
    });
  });
  return [...byTag.values()];
}

function normalizeDocumentFolders(items) {
  const now = new Date().toISOString();
  const source = Array.isArray(items) && items.length ? items : defaultDocumentFolders(now);
  const folders = source.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: String(item.name || item.title || "Dossier").trim().slice(0, 120),
    parentId: String(item.parentId || "").trim(),
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now
  })).filter((item) => item.name);
  const ids = new Set(folders.map((item) => item.id));
  folders.forEach((folder) => {
    if (folder.parentId && !ids.has(folder.parentId)) folder.parentId = "";
    if (folder.parentId === folder.id) folder.parentId = "";
  });
  return folders;
}

function normalizeDocuments(items, folders = []) {
  const now = new Date().toISOString();
  const folderIds = new Set((folders || []).map((item) => item.id));
  return (Array.isArray(items) ? items : []).map((item) => {
    const title = String(item.title || item.name || item.fileName || "Document").trim().slice(0, 180);
    const pdfFile = item.pdfFile || (String(item.mimeType || "").includes("pdf") || String(item.fileName || "").toLowerCase().endsWith(".pdf") ? {
      fileName: item.fileName || `${title}.pdf`,
      fileData: sanitizeTemplateFileData(item.fileData),
      mimeType: item.mimeType || "application/pdf",
      size: Number(item.size || item.fileSize || 0),
      generated: false,
      updatedAt: item.updatedAt || now
    } : null);
    const wordFile = item.wordFile || (String(item.mimeType || "").includes("word") || String(item.fileName || "").toLowerCase().endsWith(".docx") ? {
      fileName: item.fileName || `${title}.docx`,
      fileData: sanitizeTemplateFileData(item.fileData),
      mimeType: item.mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: Number(item.size || item.fileSize || 0),
      updatedAt: item.updatedAt || now
    } : null);
    return {
      id: item.id || crypto.randomUUID(),
      title,
      folderId: folderIds.has(item.folderId) ? item.folderId : "",
      category: String(item.category || "").trim(),
      description: String(item.description || item.notes || "").trim(),
      pdfFile: normalizeStoredFile(pdfFile, "application/pdf"),
      wordFile: normalizeStoredFile(wordFile, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      version: String(item.version || "1.0").trim(),
      createdBy: item.createdBy || currentUserId || "",
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || item.createdAt || now
    };
  }).filter((item) => item.title && (item.pdfFile?.fileData || item.wordFile?.fileData));
}

function normalizeStoredFile(file, defaultMimeType) {
  if (!file || typeof file !== "object") return null;
  return {
    fileName: String(file.fileName || file.name || "document").trim(),
    fileData: sanitizeTemplateFileData(file.fileData || file.data || ""),
    mimeType: String(file.mimeType || file.type || defaultMimeType).trim(),
    size: Number(file.size || 0),
    generated: Boolean(file.generated),
    generatorVersion: String(file.generatorVersion || "").trim(),
    updatedAt: file.updatedAt || new Date().toISOString()
  };
}

function normalizeDeathRelationOptions(items) {
  const source = Array.isArray(items) && items.length ? items : relationOptions;
  return [...new Set(source.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeContactFields(items) {
  const defaults = defaultContactFields();
  const map = new Map(defaults.map((field, index) => [field.id, { ...field, order: index }]));
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const label = String(item.label || item.id || "").trim();
    const rawId = String(item.id || "").trim();
    const id = /^[A-Za-z][A-Za-z0-9_]*$/.test(rawId) ? rawId : slugify(rawId || label).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (!id || !label) return;
    const previous = map.get(id) || {};
    const type = contactFieldTypes.includes(item.type) ? item.type : previous.type || "text";
    const options = Array.isArray(item.options) ? item.options : String(item.options || "").split(/\r?\n|,/);
    map.set(id, {
      ...previous,
      id,
      label,
      type,
      options: options.map((option) => String(option).trim()).filter(Boolean),
      required: Boolean(item.required || previous.required),
      system: Boolean(previous.system || item.system),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : defaults.length + index
    });
  });
  return [...map.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function normalizeAddons(items) {
  const defaults = defaultAdminState().addons || [];
  const map = new Map(defaults.map((item) => [item.id, { ...item }]));
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item?.id) return;
    map.set(item.id, { ...(map.get(item.id) || {}), ...item, enabled: Boolean(item.enabled), locked: Boolean(item.locked) });
  });
  return [...map.values()];
}

function normalizeKeywords(items) {
  const map = new Map();
  items.forEach((item) => {
    const label = String(item.label || item || "").trim();
    if (!label) return;
    map.set(slugify(item.id || label), { id: slugify(item.id || label), label, color: /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color : "#2d6fb6" });
  });
  const deathKeyword = map.get("deces");
  map.set("deces", { id: "deces", label: "décès", color: deathKeyword?.color || "#343a46" });
  return [...map.values()];
}

function normalizePermanence(items) {
  const legacyStatus = { initiation: "nouveau", "a traiter": "nouveau", "en attente": "analyse", validee: "resolu", echec: "resolu", archivee: "archive" };
  return (Array.isArray(items) ? items : []).map((item) => {
    const status = legacyStatus[item.status] || item.status;
    return { ...item, id: item.id || crypto.randomUUID(), status: permanenceStatuses.includes(status) ? status : "nouveau", urgency: permanenceUrgencies.includes(item.urgency) ? item.urgency : "normal", comments: Array.isArray(item.comments) ? item.comments : [], pings: Array.isArray(item.pings) ? item.pings : [], attachments: Array.isArray(item.attachments) ? item.attachments : [] };
  });
}

function normalizeTasks(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({ ...item, id: item.id || crypto.randomUUID(), folderId: item.folderId || "team-folder-general", type: taskTypes.includes(item.type) ? item.type : "autre", status: taskStatuses.includes(item.status) ? item.status : "a traiter", priority: priorities.includes(item.priority) ? item.priority : "normale", checklist: Array.isArray(item.checklist) ? item.checklist : String(item.checklist || "").split(/\r?\n/).filter(Boolean), completedChecklist: Array.isArray(item.completedChecklist) ? item.completedChecklist : [], comments: Array.isArray(item.comments) ? item.comments : [], attachments: Array.isArray(item.attachments) ? item.attachments : [] }));
}

function normalizeTemplates(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({ ...item, id: item.id || crypto.randomUUID(), title: String(item.title || "Modele").slice(0, 180), category: templateCategories.includes(item.category) ? item.category : templateCategories[0], channel: templateChannels.includes(item.channel) ? item.channel : "courriel", subject: String(item.subject || "").slice(0, 180), body: String(item.body || "").slice(0, 12000), checklist: Array.isArray(item.checklist) ? item.checklist.join("\n") : String(item.checklist || "") })).filter((item) => item.title && item.body);
}

function saveState(keys = null) {
  if (ALLOW_LOCAL_DATA_FALLBACK) safeSetLocalStorage(STORAGE_KEY, JSON.stringify(state));
  persistPublicState(keys);
}

function expireCurrentSession(message = "Votre session a expire. Reconnectez-vous pour reprendre la ou vous en etiez.") {
  const hadSession = Boolean(currentUserId);
  currentUserId = "";
  localStorage.removeItem(SESSION_KEY);
  adminApiLoaded = false;
  adminApiLoadRequested = false;
  activePanel = "auth";
  renderAll();
  if (hadSession) {
    setFeedback("#login-feedback", message, "error");
    showToast(message);
  }
}

async function apiJson(path, payload = null) {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: payload ? "POST" : "GET",
    credentials: "include",
    headers: payload ? { "Content-Type": "application/json" } : {},
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `API indisponible (${response.status})`);
    if (response.status === 401 && currentUserId && !path.startsWith("auth.php?action=login")) {
      error.sessionExpired = true;
      expireCurrentSession();
    }
    throw error;
  }
  return data;
}

function setFeedback(target, message = "", type = "") {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function submittedForm(event) {
  return event.target.closest?.("form") || event.target;
}

function updateDatabaseLoadingScreen() {
  let screen = document.querySelector("#database-loading-screen");
  if (!screen) {
    screen = document.createElement("div");
    screen.id = "database-loading-screen";
    screen.setAttribute("role", "status");
    screen.setAttribute("aria-live", "polite");
    document.body.append(screen);
  }
  const loading = databaseLoadingTokens.size > 0;
  const message = [...databaseLoadingTokens.values()].at(-1) || "Chargement des données...";
  screen.innerHTML = `<div class="database-loading-card"><div class="database-loading-spinner" aria-hidden="true"></div><strong>Connexion à la base de données</strong><p>${text(message)}</p><small>Veuillez patienter quelques instants.</small></div>`;
  screen.classList.toggle("is-visible", loading);
  screen.setAttribute("aria-hidden", loading ? "false" : "true");
  if (loading) document.body.setAttribute("aria-busy", "true");
  else document.body.removeAttribute("aria-busy");
}

function beginDatabaseLoading(token, message) {
  databaseLoadingTokens.set(token, message);
  updateDatabaseLoadingScreen();
}

function endDatabaseLoading(token) {
  databaseLoadingTokens.delete(token);
  updateDatabaseLoadingScreen();
}

async function loadPublicStateFromApi(showLoading = false) {
  if (showLoading) beginDatabaseLoading("public-state", "Chargement du site et de votre session...");
  try {
    const hadSession = Boolean(currentUserId);
    const data = await apiJson("state.php");
    publicStateVersion = String(data.version || publicStateVersion);
    if (data.state) {
      state = { ...defaultState(), ...data.state };
      state.photoLibrary = normalizePhotoLibrary(state.photoLibrary);
      if (state.terrainGeojson?.features?.length) communesGeojson = state.terrainGeojson;
      if (data.user) {
        upsertUser(data.user);
        currentUserId = data.user.id;
        safeSetLocalStorage(SESSION_KEY, currentUserId);
        if (roleRank(data.user.role) >= roleRank("moderator") && Array.isArray(data.state.users) && data.state.users.length) {
          adminUsers = data.state.users;
          adminUsersLoaded = true;
          adminUsersLoadAttempted = true;
        }
      } else if (hadSession) {
        expireCurrentSession();
        return;
      }
      if (ALLOW_LOCAL_DATA_FALLBACK) safeSetLocalStorage(STORAGE_KEY, JSON.stringify(state));
      renderAll();
    }
  } catch (error) {
    if (!ALLOW_LOCAL_DATA_FALLBACK && !IS_LOCAL_MODE) {
      showToast(error.message || "Base de donnees indisponible.");
    }
  } finally {
    if (showLoading) endDatabaseLoading("public-state");
  }
}

async function persistPublicState(keys = null) {
  if (!canModerate()) return;
  publicStateSaveCount += 1;
  try {
    const uniqueKeys = Array.isArray(keys) ? [...new Set(keys)].filter((key) => Object.prototype.hasOwnProperty.call(state, key)) : null;
    const payload = uniqueKeys ? { changes: Object.fromEntries(uniqueKeys.map((key) => [key, state[key]])) } : { state };
    const data = await apiJson("state.php", payload);
    publicStateVersion = String(data.version || publicStateVersion);
    stateSyncChannel?.postMessage({ type: "public", version: publicStateVersion });
  } catch {
    showToast("Sauvegarde base impossible. Modification non enregistree.");
  } finally {
    publicStateSaveCount = Math.max(0, publicStateSaveCount - 1);
  }
}

function upsertUser(user) {
  if (!user?.id) return;
  const index = state.users.findIndex((item) => item.id === user.id);
  if (index >= 0) state.users[index] = { ...state.users[index], ...user };
  else state.users.unshift(user);
}

function saveAdminState(action = "mise a jour", target = "administration", detail = "") {
  const previousState = adminMutationSnapshot;
  adminMutationSnapshot = null;
  addActivity(action, target, detail);
  resetContactLookupCaches();
  persistAdminState(action, target, detail, previousState);
  renderAdmin();
}

async function wait(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function adminApiError(response, data, raw = "") {
  const isHtml = /<\s*(?:!doctype|html|head|body|style)\b/i.test(raw);
  const status = Number(response.status || 0);
  if ([502, 503, 504].includes(status)) {
    return new Error(`Serveur temporairement indisponible (${status}) après plusieurs tentatives.`);
  }
  const message = !isHtml && data?.error ? String(data.error).replace(/\s+/g, " ").trim().slice(0, 500) : "";
  return new Error(message || `API administration indisponible (${status || "erreur réseau"})`);
}

async function performAdminApiRequest(method = "GET", payload = null) {
  const bodyPayload = payload ? prepareAdminApiPayload(payload) : null;
  const body = bodyPayload ? JSON.stringify(bodyPayload) : undefined;
  const retryDelays = [0, 500, 1500];
  let lastError = null;
  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if (retryDelays[attempt]) await wait(retryDelays[attempt]);
    try {
      const response = await fetch(`${API_BASE}/admin.php`, {
        method,
        credentials: "include",
        headers: bodyPayload ? { "Content-Type": "application/json" } : {},
        body
      });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!response.ok || data.ok === false) {
        const error = adminApiError(response, data, raw);
        if (response.status === 401 && currentUserId) {
          error.sessionExpired = true;
          expireCurrentSession();
        }
        if (![502, 503, 504].includes(response.status) || attempt === retryDelays.length - 1) throw error;
        lastError = error;
        continue;
      }
      if (data.version) adminStateVersion = String(data.version);
      return data;
    } catch (error) {
      lastError = error;
      const isNetworkError = error instanceof TypeError;
      if (!isNetworkError || attempt === retryDelays.length - 1) throw error;
    }
  }
  throw lastError || new Error("API administration indisponible.");
}

function adminApiRequest(method = "GET", payload = null) {
  if (method !== "POST") return performAdminApiRequest(method, payload);
  const request = adminSaveQueue.then(() => performAdminApiRequest(method, payload));
  adminSaveQueue = request.catch(() => undefined);
  return request;
}

async function adminFileApiRequest(action, formData) {
  const response = await fetch(`${API_BASE}/admin.php?action=${encodeURIComponent(action)}`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { error: raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500) };
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `API administration indisponible (${response.status})`);
  }
  return data;
}

async function loadAdminUsersFromApi() {
  if (adminUsersLoading) return;
  adminUsersLoading = true;
  adminUsersLoadAttempted = true;
  try {
    const data = await apiJson("users.php?action=list");
    adminUsers = Array.isArray(data.users) ? data.users : [];
    adminUsers.forEach(upsertUser);
    adminUsersLoaded = true;
    if (ALLOW_LOCAL_DATA_FALLBACK) safeSetLocalStorage(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    adminUsersLoaded = false;
    showToast(error.message || "Chargement des utilisateurs impossible.");
  } finally {
    adminUsersLoading = false;
    if (activeAdminSection === "users") renderAdmin();
  }
}

async function synchronizeAdminNow() {
  await persistAdminState("synchronisation", "sync", "Synchronisation manuelle");
  if (activeAdminSection === "users") {
    adminUsersLoaded = false;
    adminUsersLoadAttempted = false;
    loadAdminUsersFromApi();
  }
}

function prepareAdminApiPayload(payload) {
  if (!payload?.state) return payload;
  return { ...payload, state: adminStateForApi(payload.state, payload.target) };
}

function adminStateForApi(stateValue, target = "") {
  const shouldSendContacts = ["contact", "contacts", "administration"].includes(String(target || "").toLowerCase());
  const outputState = { ...stateValue };
  if (!shouldSendContacts) outputState.localContacts = "__KEEP_EXISTING_LOCAL_CONTACTS__";
  return {
    ...outputState,
    deathEmailTemplates: (outputState.deathEmailTemplates || []).map((template) => {
      const output = { ...template };
      if (adminSyncStatus === "synced" && output.fileData && !output.fileDataDirty) output.fileData = "__KEEP_EXISTING_FILE_DATA__";
      delete output.fileDataDirty;
      return output;
    })
  };
}

function adminChangeKeysForTarget(target = "") {
  const normalized = normalizeName(target);
  if (["administration", "sync", "synchronisation"].includes(normalized)) return null;
  if (normalized.includes("evenement majeur campagne")) return ["campaignEvents", "calendarEvents"];
  if (normalized.includes("recherche contact enregistree")) return ["savedContactSearches"];
  if (normalized.includes("migration institution")) return ["localContacts", "institutions"];
  if (normalized.includes("institution")) return ["institutions", "localContacts"];
  if (normalized.includes("modele email")) return ["mailTemplates"];
  if (normalized.includes("trombinoscope")) return ["trombinoscopeCategories", "trombinoscopePeople"];
  if (normalized.includes("contact") && !normalized.includes("champ") && !normalized.includes("mot cle")) return ["localContacts", "contactKeywords", "savedContactSearches", "permanenceRequests", "teamTasks", "deathCases", "calendarEvents", "campaignEvents"];
  if (normalized.includes("champ contact")) return ["contactFields", "deletedContactFields"];
  if (normalized.includes("mot cle contact")) return ["contactKeywords"];
  if (normalized.includes("dossier deces")) return ["deathCases", "localContacts"];
  if (normalized.includes("relation deces")) return ["deathRelationOptions", "deathCases"];
  if (normalized.includes("courrier special")) return ["specialLetters"];
  if (normalized.includes("modele courrier") || normalized.includes("modele deces")) return ["deathEmailTemplates", "deathCases", "specialLetters"];
  if (normalized === "modele") return ["templates"];
  if (normalized.includes("dossier classement")) return ["localFolders", "permanenceRequests"];
  if (normalized.includes("permanence") || normalized.includes("dossier local")) return ["permanenceRequests", "teamTasks"];
  if (normalized.includes("dossier equipe")) return ["teamFolders", "teamTasks"];
  if (normalized.includes("tache")) return ["teamTasks"];
  if (normalized.includes("calendrier") || normalized.includes("evenement agenda")) return ["calendarEvents", "calendarEventCategories"];
  if (normalized.includes("dossier document")) return ["documentFolders", "documents"];
  if (normalized.includes("document")) return ["documents"];
  if (normalized.includes("support")) return ["citizenRequests"];
  if (normalized.includes("addon") || normalized.includes("plugin")) return ["addons"];
  if (normalized.includes("campagne") || normalized.includes("geojson") || normalized.includes("terrain")) return ["campaign"];
  if (normalized.includes("phototheque") || normalized.includes("photo")) return ["photoLibrary"];
  if (normalized.includes("menu mobile")) return ["mobileAdminMenu"];
  const directKey = Object.prototype.hasOwnProperty.call(adminState, target) ? target : "";
  return directKey ? [directKey] : [];
}

function adminChangesForApi(previousState, target = "") {
  const keys = adminChangeKeysForTarget(target);
  if (keys === null) return null;
  const changes = {};
  keys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(adminState, key)) return;
    if (!previousState || key === "localContacts" || JSON.stringify(previousState[key]) !== JSON.stringify(adminState[key])) changes[key] = adminState[key];
  });
  return changes;
}

async function loadAdminStateFromApi(showLoading = false) {
  if (showLoading) beginDatabaseLoading("admin-state", "Chargement de votre espace d’administration...");
  if (!adminUsersLoaded && !adminUsersLoading && !adminUsersLoadAttempted) loadAdminUsersFromApi();
  try {
    const data = await adminApiRequest("GET");
    if (data.state) {
      adminApiLoaded = true;
      adminStateVersion = String(data.version || adminStateVersion);
      const hasRemoteData = ["localContacts", "teamTasks", "permanenceRequests", "templates", "deathCases", "specialLetters", "addons", "activityLog"].some((key) => Array.isArray(data.state[key]) && data.state[key].length);
      if (!hasRemoteData) {
        adminSyncStatus = "synced";
        adminSyncMessage = "Base initialisee.";
        persistAdminState("initialisation", "administration", "Premier envoi vers la base");
        return;
      }
      adminState = normalizeAdminState(data.state);
      if (adminState.campaign?.geojson && JSON.stringify(state.terrainGeojson) !== JSON.stringify(adminState.campaign.geojson)) {
        state.terrainGeojson = adminState.campaign.geojson;
        state.terrainGeojsonFileName = adminState.campaign.fileName || "";
        communesGeojson = adminState.campaign.geojson;
        saveState();
      }
      resetContactLookupCaches();
      adminSyncStatus = "synced";
      adminSyncMessage = "Donnees chargees depuis la base.";
      renderAdmin();
    }
  } catch (error) {
    adminApiLoaded = false;
    adminSyncStatus = "error";
    adminSyncMessage = `${error.message || "Base indisponible"} - base obligatoire, administration bloquee.`;
    renderAdmin();
  } finally {
    if (showLoading) endDatabaseLoading("admin-state");
  }
}

async function persistAdminState(operation = "mise a jour", target = "administration", detail = "", previousState = null) {
  adminStateSaveCount += 1;
  adminSyncStatus = "saving";
  adminSyncMessage = "Sauvegarde en cours...";
  renderAdmin();
  try {
    const changes = adminChangesForApi(previousState, target);
    const data = await adminApiRequest("POST", changes === null ? { operation, target, detail, state: adminState } : { operation, target, detail, changes });
    if (data.state) {
      adminState = normalizeAdminState(data.state);
      resetContactLookupCaches();
    }
    adminSyncStatus = "synced";
    adminSyncMessage = "Donnees sauvegardees en base.";
    stateSyncChannel?.postMessage({ type: "admin", version: adminStateVersion });
    renderAdmin();
  } catch (error) {
    if (!error.sessionExpired) {
      if (previousState) adminState = normalizeAdminState(previousState);
      else loadAdminStateFromApi();
    }
    resetContactLookupCaches();
    adminSyncStatus = "error";
    adminSyncMessage = `${error.message || "Sauvegarde base impossible"} - modification annulee, base obligatoire.`;
    renderAdmin();
    if (!error.sessionExpired) showToast(adminSyncMessage);
  } finally {
    adminStateSaveCount = Math.max(0, adminStateSaveCount - 1);
  }
}

async function saveAdminStateToDatabaseOnly(operation = "mise a jour", target = "administration", detail = "", previousState = null) {
  adminStateSaveCount += 1;
  adminSyncStatus = "saving";
  adminSyncMessage = "Sauvegarde en cours...";
  renderAdmin();
  previousState = previousState || adminMutationSnapshot || null;
  adminMutationSnapshot = null;
  addActivity(operation, target, detail);
  resetContactLookupCaches();
  try {
    const changes = adminChangesForApi(previousState, target);
    const data = await adminApiRequest("POST", changes === null ? { operation, target, detail, state: adminState } : { operation, target, detail, changes });
    if (data.state) adminState = normalizeAdminState(data.state);
    resetContactLookupCaches();
    adminSyncStatus = "synced";
    adminSyncMessage = "Donnees sauvegardees en base.";
    stateSyncChannel?.postMessage({ type: "admin", version: adminStateVersion });
    renderAdmin();
    return true;
  } catch (error) {
    if (!error.sessionExpired) {
      if (previousState) adminState = normalizeAdminState(previousState);
      else loadAdminStateFromApi();
    }
    resetContactLookupCaches();
    adminSyncStatus = "error";
    adminSyncMessage = `${error.message || "Sauvegarde base impossible"} - modification annulee, base obligatoire.`;
    renderAdmin();
    if (!error.sessionExpired) showToast(adminSyncMessage);
    return false;
  } finally {
    adminStateSaveCount = Math.max(0, adminStateSaveCount - 1);
  }
}

async function saveAdminEntityUpdates(entityUpdates, operation = "mise a jour", target = "administration", detail = "", previousState = null) {
  adminStateSaveCount += 1;
  adminSyncStatus = "saving";
  adminSyncMessage = "Sauvegarde en cours...";
  renderAdmin();
  previousState = previousState || cloneAdminState();
  addActivity(operation, target, detail);
  resetContactLookupCaches();
  try {
    await adminApiRequest("POST", { operation, target, detail, entityUpdates });
    adminSyncStatus = "synced";
    adminSyncMessage = "Donnees sauvegardees en base.";
    stateSyncChannel?.postMessage({ type: "admin", version: adminStateVersion });
    renderAdmin();
    return true;
  } catch (error) {
    if (!error.sessionExpired) adminState = normalizeAdminState(previousState);
    resetContactLookupCaches();
    adminSyncStatus = "error";
    adminSyncMessage = `${error.message || "Sauvegarde base impossible"} - modification annulee, base obligatoire.`;
    renderAdmin();
    if (!error.sessionExpired) showToast(adminSyncMessage);
    return false;
  } finally {
    adminStateSaveCount = Math.max(0, adminStateSaveCount - 1);
  }
}

function adminEntityUpdate(collection, value, options = {}) {
  return { collection, id: value?.id || "", value, lookupId: options.lookupId || value?.id || "", insertIfMissing: Boolean(options.insertIfMissing) };
}

function addActivity(action, target, detail = "") {
  const user = currentUser();
  adminState.activityLog = adminState.activityLog || [];
  adminState.activityLog.unshift({ id: crypto.randomUUID(), userId: user?.id || "", userName: userNameById(user?.id || "") || "Systeme", action, target, detail, createdAt: new Date().toISOString() });
  adminState.activityLog = adminState.activityLog.slice(0, 600);
}

function text(value = "") {
  return escapeHtml(value);
}

function attr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    cleanupLocalStorage(key);
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      console.warn(`Stockage local indisponible pour ${key}.`, error);
      return false;
    }
  }
}

function safeGetLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return "";
  }
}

function cleanupLocalStorage(currentKey = "") {
  LEGACY_STORAGE_KEYS.forEach((key) => {
    if (key !== currentKey) {
      try { localStorage.removeItem(key); } catch {}
    }
  });
  if (currentKey !== STORAGE_KEY && !ALLOW_LOCAL_DATA_FALLBACK) {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  try { localStorage.removeItem(ADMIN_STORAGE_KEY); } catch {}
}

function safeHtml(value = "") {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  template.content.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => [...node.attributes].forEach((attribute) => {
    if (attribute.name.startsWith("on")) node.removeAttribute(attribute.name);
    if (["href", "src"].includes(attribute.name) && !isSafeUrl(attribute.value)) node.removeAttribute(attribute.name);
  }));
  return template.innerHTML;
}

function isSafeUrl(value = "") {
  if (!value) return true;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:", "mailto:", "tel:", "data:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function slugify(value = "") {
  return String(value).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function normalizeName(value = "") {
  const raw = String(value || "").trim();
  return raw ? slugify(raw).replace(/-/g, " ") : "";
}

function currentUser() {
  return state.users.find((user) => user.id === currentUserId) || null;
}

function roleRank(role = "user") {
  return { visitor: 0, user: 0, moderator: 10, collaborator: 20, admin: 30, founder: 40, "super-admin": 40 }[role] || 0;
}

function canModerate() {
  return roleRank(currentUser()?.role) >= roleRank("moderator");
}

function isAdmin() {
  return roleRank(currentUser()?.role) >= roleRank("admin");
}

function roleLabel(role = "user") {
  return { user: "Utilisateur", moderator: "Moderateur", collaborator: "Collaborateur", admin: "Administrateur", founder: "Fondateur", "super-admin": "Super-admin" }[role] || role;
}

function userNameById(id = "") {
  const user = state.users.find((item) => item.id === id);
  return user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.login : "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : dayFormatter.format(date);
}

function formatFullDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : fullDayFormatter.format(date);
}

function resetContactLookupCaches() {
  contactByIdCache = null;
  contactSearchTextCache = new WeakMap();
  contactQuickSearchTextCache = new WeakMap();
}

function contactById(id = "") {
  if (!id) return null;
  if (!contactByIdCache) contactByIdCache = new Map((adminState.localContacts || []).map((contact) => [contact.id, contact]));
  return contactByIdCache.get(id) || null;
}

function contactDisplayName(contact = {}) {
  return [contact.firstName, contact.lastName || contact.usageName].filter(Boolean).join(" ") || contact.id || "Contact";
}

function contactDisplayNameWithBirthName(contact = {}) {
  const displayName = contactDisplayName(contact);
  const birthName = String(contact.birthName || "").trim();
  return birthName ? `${displayName} (${birthName})` : displayName;
}

function contactIdentityValue(contact = {}, keys = []) {
  return keys.map((key) => String(contact[key] || "").trim()).find(Boolean) || "";
}

function normalizeContactDatePart(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "00_00_0000";
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[3].padStart(2, "0")}_${iso[2].padStart(2, "0")}_${iso[1].padStart(4, "0")}`;
  const fr = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (fr) return `${fr[1].padStart(2, "0")}_${fr[2].padStart(2, "0")}_${fr[3].length === 2 ? `19${fr[3]}` : fr[3].padStart(4, "0")}`;
  return "00_00_0000";
}

function normalizeContactDateValue(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1].padStart(4, "0")}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const fr = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!fr) return raw;
  const year = fr[3].length === 2 ? `19${fr[3]}` : fr[3].padStart(4, "0");
  return `${year}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
}

function contactBaseId(contact = {}) {
  const lastName = contactIdentityValue(contact, ["usageName", "lastName", "nomDusage", "nom", "birthName", "nomDeNaissance"]);
  const firstName = contactIdentityValue(contact, ["firstName", "prenom"]);
  const date = contactIdentityValue(contact, ["birthDate", "dateNaissance", "dateDeNaissance"]);
  return [lastName || "nom", firstName || "prenom", normalizeContactDatePart(date)]
    .join("_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

function synchronizeContactIdentity(contact = {}) {
  const firstName = contactIdentityValue(contact, ["firstName", "prenom"]);
  const lastName = contactIdentityValue(contact, ["lastName", "nom", "usageName", "nomDusage", "birthName", "nomDeNaissance"]);
  const usageName = contactIdentityValue(contact, ["usageName", "nomDusage", "lastName", "nom"]);
  const birthName = contactIdentityValue(contact, ["birthName", "nomDeNaissance"]);
  const birthDate = contactIdentityValue(contact, ["birthDate", "dateNaissance", "dateDeNaissance"]);
  if (firstName) {
    contact.firstName = firstName;
    if ("prenom" in contact) contact.prenom = firstName;
  }
  if (lastName) {
    contact.lastName = lastName;
    if ("nom" in contact) contact.nom = lastName;
  }
  if (usageName || lastName) {
    contact.usageName = usageName || lastName;
    if ("nomDusage" in contact) contact.nomDusage = contact.usageName;
  }
  if (birthName) {
    contact.birthName = birthName;
    if ("nomDeNaissance" in contact) contact.nomDeNaissance = contact.birthName;
  }
  if (birthDate) {
    const normalizedBirthDate = normalizeContactDateValue(birthDate);
    contact.birthDate = normalizedBirthDate;
    if ("dateNaissance" in contact) contact.dateNaissance = normalizedBirthDate;
    if ("dateDeNaissance" in contact) contact.dateDeNaissance = normalizedBirthDate;
  }
  if (!contact.category) contact.category = "autre";
  contact.keywords = Array.isArray(contact.keywords)
    ? contact.keywords.map(String).map((item) => item.trim()).filter(Boolean)
    : String(contact.keywords || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  return contact;
}

function normalizeContactRecord(contact = {}, usedIds = new Set()) {
  const normalized = synchronizeContactIdentity({ keywords: [], comments: [], ...contact });
  const baseId = contactBaseId(normalized);
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }
  normalized.id = id;
  usedIds.add(id);
  return normalized;
}

function assignUniqueContactId(contact = {}, currentId = "") {
  const usedIds = new Set(adminState.localContacts.map((item) => item.id).filter((id) => id && id !== currentId));
  const baseId = contactBaseId(contact);
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }
  contact.id = id;
  return id;
}

function contactSearchText(contact = {}) {
  const cached = contactSearchTextCache.get(contact);
  const signature = [
    contact.id,
    contact.updatedAt,
    contact.firstName,
    contact.lastName,
    contact.usageName,
    contact.birthName,
    contact.email,
    contact.mobile,
    contact.phone,
    contact.city,
    contact.postalCode,
    contact.category,
    contact.organization,
    contact.role,
    Array.isArray(contact.keywords) ? contact.keywords.join(",") : contact.keywords,
    Object.keys(contact).length
  ].join("|");
  if (cached?.signature === signature) return cached.value;
  const value = normalizeName([
    contact.id,
    contact.firstName,
    contact.lastName,
    contact.usageName,
    contact.birthName,
    contact.email,
    contact.mobile,
    contact.phone,
    contact.city,
    contact.postalCode,
    contact.category,
    contact.organization,
    contact.role,
    ...(Array.isArray(contact.keywords) ? contact.keywords : String(contact.keywords || "").split(/[,;]/)),
    Object.values(contact).join(" ")
  ].join(" "));
  contactSearchTextCache.set(contact, { signature, value });
  return value;
}

function contactQuickSearchText(contact = {}) {
  const cached = contactQuickSearchTextCache.get(contact);
  const signature = [
    contact.id,
    contact.updatedAt,
    contact.firstName,
    contact.lastName,
    contact.usageName,
    contact.birthName,
    contact.email,
    contact.mobile,
    contact.phone,
    contact.city,
    contact.postalCode,
    contact.organization,
    contact.role,
    Array.isArray(contact.keywords) ? contact.keywords.join(",") : contact.keywords
  ].join("|");
  if (cached?.signature === signature) return cached.value;
  const value = normalizeName([
    contact.id,
    contact.firstName,
    contact.lastName,
    contact.usageName,
    contact.birthName,
    contact.email,
    contact.mobile,
    contact.phone,
    contact.city,
    contact.postalCode,
    contact.organization,
    contact.role,
    ...(Array.isArray(contact.keywords) ? contact.keywords : String(contact.keywords || "").split(/[,;]/))
  ].join(" "));
  contactQuickSearchTextCache.set(contact, { signature, value });
  return value;
}

function searchContacts(query = "", { limit = 25, excludeIds = [] } = {}) {
  const normalizedQuery = normalizeName(query);
  if (normalizedQuery.length < 2) return [];
  const excluded = new Set(excludeIds.filter(Boolean));
  const matches = [];
  const maxCandidates = Math.max(limit * 4, limit);
  for (const contact of adminState.localContacts || []) {
    if (excluded.has(contact.id)) continue;
    if (!contactQuickSearchText(contact).includes(normalizedQuery)) continue;
    matches.push(contact);
    if (matches.length >= maxCandidates) break;
  }
  return matches
    .sort((a, b) => contactDisplayName(a).localeCompare(contactDisplayName(b), "fr", { sensitivity: "base" }))
    .slice(0, limit);
}

function contactFieldSearchText(contact = {}, field = "") {
  if (field === "firstName") return normalizeName(contact.firstName || "");
  if (field === "name") return normalizeName([contact.lastName, contact.usageName, contact.birthName].join(" "));
  if (field === "city") return normalizeName([contact.city, contact.postalCode].join(" "));
  return contactQuickSearchText(contact);
}

function searchContactsByFields(filters = {}, { limit = 25, excludeIds = [] } = {}) {
  const activeFilters = Object.entries(filters)
    .map(([field, value]) => [field, normalizeName(value)])
    .filter(([, value]) => value.length >= 2);
  if (!activeFilters.length) return [];
  const excluded = new Set(excludeIds.filter(Boolean));
  const matches = [];
  const maxCandidates = Math.max(limit * 4, limit);
  for (const contact of adminState.localContacts || []) {
    if (excluded.has(contact.id)) continue;
    if (!activeFilters.every(([field, value]) => contactFieldSearchText(contact, field).includes(value))) continue;
    matches.push(contact);
    if (matches.length >= maxCandidates) break;
  }
  return matches
    .sort((a, b) => contactDisplayName(a).localeCompare(contactDisplayName(b), "fr", { sensitivity: "base" }))
    .slice(0, limit);
}

function contactSearchLine(contact = {}) {
  const age = contactAge(contact);
  const nameNote = contact.usageName && contact.birthName && normalizeName(contact.usageName) !== normalizeName(contact.birthName) ? `naissance ${contact.birthName}` : "";
  const cityLine = [contact.postalCode, contact.city].filter(Boolean).join(" ");
  const ageLine = age === null ? "" : `${age} ans`;
  return [nameNote, cityLine, ageLine, contact.email, contact.mobile || contact.phone].filter(Boolean).join(" - ");
}

function contactAddress(contact = {}) {
  return [[contact.streetNumber, contact.streetName].filter(Boolean).join(" "), [contact.postalCode, contact.city].filter(Boolean).join(" "), contact.country].filter(Boolean).join("\n");
}

function textToHtmlParagraphs(value = "") {
  const paragraphs = String(value || "").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return paragraphs.map((part) => `<p>${text(part).replace(/\n/g, "<br>")}</p>`).join("") || "<p></p>";
}

function htmlToPlainText(value = "") {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(value || "");
  wrapper.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  wrapper.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6").forEach((node) => node.append(document.createTextNode("\n")));
  return wrapper.textContent.replace(/\n{3,}/g, "\n\n").trim();
}

function ageFromBirthDate(date) {
  if (!date) return NaN;
  const birth = new Date(`${date}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function renderAll() {
  renderHomepageContent();
  renderNav();
  renderAccountBar();
  renderFooterSocialLinks();
  renderCounts();
  renderSearchFilters();
  renderSearchResults();
  renderMandateDashboard();
  renderVictories();
  renderAgenda();
  renderLegislative();
  renderPhotoLibrary();
  renderNewsletter();
  renderSupport();
  renderProfile();
  renderAdmin();
  renderCommuneDatalist();
  setActivePanel(activePanel);
}

function renderNav() {
  const nav = document.querySelector("#main-nav");
  if (!nav) return;
  const home = homepageContent();
  const labels = { accueil: home.navHome, newsletter: home.navNewsletter, support: home.navSupport };
  const items = [...publicMenus];
  const user = currentUser();
  if (user) items.push(["profile", "Mon profil"]);
  const mobileAccountAction = user
    ? `<button class="nav-link mobile-account-link" type="button" data-mobile-logout>Quitter</button>`
    : `<button class="nav-link mobile-account-link ${activePanel === "auth" ? "is-active" : ""}" type="button" data-panel-target="auth">Connexion</button>`;
  nav.innerHTML = items.map(([id, label]) => `<button class="nav-link ${activePanel === id ? "is-active" : ""}" type="button" data-panel-target="${attr(id)}">${text(labels[id] || label)}</button>`).join("") + mobileAccountAction;
}

function renderHomepageContent() {
  const home = homepageContent();
  document.title = home.browserTitle || defaultHomepageContent().browserTitle;
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
  document.querySelectorAll("[data-home-text]").forEach((element) => {
    const key = element.dataset.homeText;
    if (key in home) element.textContent = home[key];
  });
  document.querySelectorAll("[data-home-placeholder]").forEach((element) => {
    const key = element.dataset.homePlaceholder;
    if (key in home) element.placeholder = home[key];
  });
  const portrait = document.querySelector("#homepage-portrait");
  if (portrait) {
    const frame = portrait.closest(".hero-portrait");
    portrait.onload = () => frame?.classList.remove("is-image-missing");
    portrait.onerror = () => frame?.classList.add("is-image-missing");
    portrait.src = home.heroImage || defaultHomepageContent().heroImage;
    portrait.alt = home.heroImageAlt || defaultHomepageContent().heroImageAlt;
    if (portrait.complete && !portrait.naturalWidth) frame?.classList.add("is-image-missing");
  }
}

function renderFooterSocialLinks() {
  const target = document.querySelector("#footer-social-links");
  if (!target) return;
  const configured = state.socialLinks || {};
  const links = [
    ["facebook", configured.facebook || "https://www.facebook.com/emeric.salmonoff", "f", "Facebook"],
    ["instagram", configured.instagram || "https://www.instagram.com/emeric.salmon", "◎", "Instagram"],
    ["twitter", configured.twitter || "https://twitter.com/@EmericSalmon", "X", "X"],
    ["assembly", configured.assembly || "https://www.assemblee-nationale.fr/dyn/deputes/PA794954", "AN", "Assemblée nationale"]
  ];
  target.innerHTML = links.map(([network, url, shortLabel, label]) => `<a class="social-button social-${attr(network)}" href="${attr(url)}" target="_blank" rel="noopener noreferrer" aria-label="${attr(label)}" title="${attr(label)}">${text(shortLabel)}</a>`).join("");
}

function renderAccountBar() {
  const target = document.querySelector("#account-bar");
  if (!target) return;
  const user = currentUser();
  target.innerHTML = user ? `<span>${text(userNameById(user.id))}</span><button class="secondary-action compact" type="button" id="logout-button">Quitter</button>` : `<button class="secondary-action compact" type="button" data-panel-target="auth">Connexion</button>`;
}

function setActivePanel(panel) {
  if (panel === "admin" && !canModerate()) panel = "auth";
  activePanel = panel;
  document.body.classList.toggle("admin-mode", panel === "admin" && canModerate());
  document.body.classList.toggle("home-mode", panel === "accueil");
  document.querySelectorAll(".tab-panel").forEach((element) => element.classList.toggle("is-active", element.dataset.panel === panel));
  renderNav();
  if (panel === "admin" && canModerate() && !adminApiLoadRequested) {
    adminApiLoadRequested = true;
    adminApiLoaded = false;
    adminSyncStatus = "pending";
    loadAdminStateFromApi(true);
  }
}

function renderCounts() {
  setText("#victory-count", state.victories.length);
  setText("#agenda-count", state.agenda.length);
  setText("#law-count", state.legislative.length);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function allContentItems() {
  return [
    ...state.victories.map((item) => ({ kind: "victory", label: "Victoire", item, body: item.summary })),
    ...state.agenda.map((item) => ({ kind: "event", label: "Agenda", item, body: item.description })),
    ...state.legislative.map((item) => ({ kind: "law", label: "Parlementaire", item, body: item.summary }))
  ];
}

function renderSearchFilters() {
  const target = document.querySelector("#search-type-filters");
  if (!target) return;
  const types = [["all", "Tout"], ["victory", "Victoires"], ["event", "Agenda"], ["law", "Parlementaire"]];
  target.innerHTML = types.map(([id, label]) => `<button class="secondary-action compact ${activeSearchType === id ? "is-active" : ""}" type="button" data-search-type="${attr(id)}">${text(label)}</button>`).join("");
}

function renderSearchResults() {
  const target = document.querySelector("#search-results");
  if (!target) return;
  const photoKeys = availableEventPhotoKeys();
  const q = normalizeName(document.querySelector("#search-panel-input")?.value || document.querySelector("#global-search")?.value || "");
  const items = allContentItems().filter((entry) => activeSearchType === "all" || entry.kind === activeSearchType).filter((entry) => !q || normalizeName([entry.item.title, entry.body, entry.item.commune].join(" ")).includes(q)).slice(0, 40);
  target.innerHTML = items.map(({ kind, label, item, body }) => `<article class="search-result"><span>${text(label)} - ${text(formatDate(item.date))}</span><h3>${text(item.title)}</h3>${body ? `<p>${text(body)}</p>` : ""}${kind === "event" ? eventPhotosButton(item, photoKeys) : ""}</article>`).join("") || `<p class="empty-state">Aucun resultat.</p>`;
}

function renderMandateDashboard() {
  const target = document.querySelector("#mandate-dashboard");
  if (!target) return;
  const period = document.querySelector("#mandate-period")?.value || "365";
  const cutoff = period === "all" ? null : new Date(Date.now() - Number(period) * 86400000);
  const inPeriod = (item) => {
    if (!cutoff) return true;
    const date = new Date(`${item.date || ""}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date >= cutoff;
  };
  const victories = state.victories.filter(inPeriod).length;
  const agenda = state.agenda.filter(inPeriod).length;
  const legislative = state.legislative.filter(inPeriod).length;
  const home = homepageContent();
  target.innerHTML = `<div class="mandate-cards">
    <article><strong>${victories}</strong><span>${text(home.victoriesLabel)}</span></article>
    <article><strong>${agenda}</strong><span>${text(home.agendaLabel)}</span></article>
    <article><strong>${legislative}</strong><span>${text(home.legislativeLabel)}</span></article>
  </div>`;
}

function renderVictories() {
  const target = document.querySelector("#victory-timeline");
  const yearFilter = document.querySelector("#victory-year-filter");
  if (!target) return;
  fillYearSelect(yearFilter, state.victories);
  const year = yearFilter?.value || "";
  const items = state.victories.filter((item) => !year || String(item.date).startsWith(year)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  target.innerHTML = items.map((item) => `<article class="timeline-item"><time>${text(formatDate(item.date))}</time><h3>${text(item.title)}</h3>${item.summary ? `<p>${text(item.summary)}</p>` : ""}</article>`).join("") || `<p class="empty-state">Aucune victoire publiée.</p>`;
}

function fillYearSelect(select, items) {
  if (!select) return;
  const current = select.value;
  const years = [...new Set(items.map((item) => String(item.date || "").slice(0, 4)).filter(Boolean))].sort().reverse();
  select.innerHTML = `<option value="">Toutes les annees</option>${years.map((year) => `<option value="${attr(year)}" ${current === year ? "selected" : ""}>${text(year)}</option>`).join("")}`;
}

function renderAgenda() {
  const target = document.querySelector("#agenda-groups");
  const yearFilter = document.querySelector("#agenda-year-filter");
  if (!target) return;
  fillYearSelect(yearFilter, state.agenda);
  const year = yearFilter?.value || "";
  const items = state.agenda.filter((item) => (!year || String(item.date).startsWith(year)) && (!selectedCommune || normalizeName(item.commune) === normalizeName(selectedCommune))).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const countLabel = `${items.length} événement${items.length > 1 ? "s" : ""} affiché${items.length > 1 ? "s" : ""}${selectedCommune ? ` à ${selectedCommune}` : " · toutes les communes"}${year ? ` · ${year}` : ""}`;
  setText("#agenda-event-count", countLabel);
  const photoKeys = availableEventPhotoKeys();
  const groups = groupBy(items, (item) => {
    const date = new Date(`${item.date}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "Sans date" : monthFormatter.format(date);
  });
  target.innerHTML = Object.entries(groups).map(([month, events]) => `<section class="agenda-month"><h3>${text(month)}</h3>${events.map((item) => `<article class="event-row"><time>${text(formatDate(item.date))}</time><div><h4>${text(item.title)}</h4>${item.commune ? `<p>${text(item.commune)}</p>` : ""}${item.description ? `<p>${text(item.description)}</p>` : ""}${eventPhotosButton(item, photoKeys)}</div></article>`).join("")}</section>`).join("") || `<p class="empty-state">Aucun evenement.</p>`;
  renderCommunePanel(items, photoKeys);
  renderMap();
}

function renderCommunePanel(items, photoKeys) {
  setText("#selected-commune-title", selectedCommune || "Toutes les communes");
  const target = document.querySelector("#selected-commune-posts");
  if (target) target.innerHTML = items.slice(0, 8).map((item) => `<article><strong>${text(item.title)}</strong><p>${text(formatDate(item.date))} - ${text(item.commune || "")}</p>${eventPhotosButton(item, photoKeys)}</article>`).join("") || `<p class="empty-state">Aucun post pour cette commune.</p>`;
}

async function loadCommunesMap() {
  if (state.terrainGeojson?.features?.length) {
    communesGeojson = state.terrainGeojson;
    renderCommuneDatalist();
    renderMap();
    return;
  }
  try {
    const response = await fetch(`assets/communes-70-haute-saone.geojson?v=${ASSET_VERSION}`, { cache: "no-store" });
    communesGeojson = await response.json();
  } catch {
    communesGeojson = null;
  }
  renderCommuneDatalist();
  renderMap();
}

function communeNames() {
  const fromMap = communesGeojson?.features?.map((feature) => feature.properties?.nom).filter(Boolean) || [];
  const fromAgenda = state.agenda.map((item) => item.commune).filter(Boolean);
  return [...new Set([...fromMap, ...fromAgenda])].sort((a, b) => a.localeCompare(b, "fr"));
}

function renderCommuneDatalist() {
  document.querySelectorAll("[data-communes-datalist]").forEach((target) => {
    target.innerHTML = communeNames().map((commune) => `<option value="${attr(commune)}"></option>`).join("");
  });
}

function renderMap() {
  const target = document.querySelector("#haute-saone-map");
  if (!target) return;
  const year = document.querySelector("#agenda-year-filter")?.value || "";
  const mapItems = state.agenda.filter((item) => !year || String(item.date).startsWith(year));
  const mode = document.querySelector("#map-gradient-toggle");
  if (mode) mode.checked = mapGradientEnabled;
  setText("#map-color-description", mapGradientEnabled ? "Du rouge clair au bleu foncé, la couleur indique la fréquence des événements locaux." : "Bleu : au moins un événement. Rouge clair : aucun événement.");
  const communes = [...new Set(mapItems.map((item) => item.commune).filter(Boolean))];
  if (!communesGeojson?.features?.length) {
    target.innerHTML = `<div class="map-fallback" style="transform:scale(${mapZoom})">${communes.map((commune, index) => `<button type="button" class="map-pin ${normalizeName(commune) === normalizeName(selectedCommune) ? "is-active" : ""}" style="left:${15 + (index * 19) % 70}%;top:${20 + (index * 23) % 60}%" data-commune="${attr(commune)}">${text(commune)}</button>`).join("") || `<p class="empty-state">Carte des communes indisponible.</p>`}</div>`;
    return;
  }
  const bounds = geoBounds(communesGeojson.features);
  const width = 1000;
  const height = 780;
  const postCounts = new Map();
  mapItems.forEach((item) => {
    const key = normalizeName(item.commune || "");
    if (key) postCounts.set(key, (postCounts.get(key) || 0) + 1);
  });
  const maxPosts = Math.max(1, ...postCounts.values());
  const heatColor = (count) => {
    const ratio = Math.max(0, Math.min(1, count / maxPosts));
    const start = [248, 211, 211], end = [18, 57, 102];
    return `rgb(${start.map((channel, index) => Math.round(channel + (end[index] - channel) * ratio)).join(",")})`;
  };
  const paths = communesGeojson.features.map((feature) => {
    const name = feature.properties?.nom || "";
    const key = normalizeName(name);
    const count = postCounts.get(key) || 0;
    const selected = normalizeName(selectedCommune) === key;
    const color = mapGradientEnabled ? heatColor(count) : count > 0 ? "#2d6fb6" : "#f8d3d3";
    return `<path class="commune-shape heatmap-shape ${selected ? "is-selected" : ""}" style="fill:${attr(color)}" d="${attr(geoPath(feature.geometry, bounds, width, height))}" data-commune="${attr(name)}"><title>${text(name)} · ${count} événement(s)</title></path>`;
  }).join("");
  const legend = mapGradientEnabled ? `<span>Jamais</span><i class="heatmap-gradient"></i><span>Souvent</span>` : `<span><i class="map-legend-swatch is-unvisited"></i> Aucun événement</span><span><i class="map-legend-swatch is-visited"></i> Avec événement</span>`;
  target.innerHTML = `<div class="public-heatmap-legend">${legend}</div><svg viewBox="0 0 ${width} ${height}" style="transform:scale(${mapZoom})" role="img" aria-label="Carte de fréquentation des communes de Haute-Saône"><g>${paths}</g></svg>`;
}

function geoCoordinates(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates.flat(1);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}

function geoBounds(features) {
  const points = features.flatMap((feature) => geoCoordinates(feature.geometry));
  const lons = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  return { minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
}

function projectPoint(point, bounds, width, height) {
  const padding = 28;
  const x = padding + ((point[0] - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (width - padding * 2);
  const y = padding + ((bounds.maxLat - point[1]) / (bounds.maxLat - bounds.minLat || 1)) * (height - padding * 2);
  return [x, y];
}

function ringPath(ring, bounds, width, height) {
  return ring.map((point, index) => {
    const [x, y] = projectPoint(point, bounds, width, height);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function geoPath(geometry, bounds, width, height) {
  if (geometry?.type === "Polygon") return geometry.coordinates.map((ring) => ringPath(ring, bounds, width, height)).join(" ");
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.flatMap((polygon) => polygon.map((ring) => ringPath(ring, bounds, width, height))).join(" ");
  return "";
}

function geoCentroid(geometry, bounds, width, height) {
  const points = geoCoordinates(geometry);
  const lon = points.reduce((sum, point) => sum + point[0], 0) / (points.length || 1);
  const lat = points.reduce((sum, point) => sum + point[1], 0) / (points.length || 1);
  return projectPoint([lon, lat], bounds, width, height);
}

function renderLegislative() {
  const items = state.legislative;
  const target = document.querySelector("#law-grid");
  if (target) target.innerHTML = items.map((item) => `<article class="content-card"><p class="meta">${text(formatDate(item.date))}</p><h3>${text(item.title)}</h3>${item.summary ? `<p>${text(item.summary)}</p>` : ""}</article>`).join("") || `<p class="empty-state">Aucun contenu.</p>`;
  const overview = document.querySelector("#parliament-overview");
  if (overview) overview.innerHTML = `<div class="mandate-cards"><article><strong>${items.length}</strong><span>contenus affiches</span></article></div>`;
}

function fillSelect(select, values, selected = "", emptyLabel = "") {
  if (!select) return;
  select.innerHTML = values.map((value, index) => `<option value="${attr(value)}" ${selected === value ? "selected" : ""}>${text(index === 0 && emptyLabel ? emptyLabel : value)}</option>`).join("");
}

function renderTags(tags = []) {
  return tags?.length ? `<div class="tag-row">${tags.map((tag) => `<span class="tag">${text(tag)}</span>`).join("")}</div>` : "";
}

function isDeathKeyword(value = "") {
  return normalizeName(value) === "deces";
}

function contactHasDeathKeyword(contact = {}) {
  return (contact.keywords || []).some(isDeathKeyword);
}

function ensureDeathContactMetadata(contact, deathDate = "") {
  if (!contact) return;
  const keywords = Array.isArray(contact.keywords) ? contact.keywords : String(contact.keywords || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  contact.keywords = keywords.some(isDeathKeyword) ? keywords : [...keywords, "décès"];
  contact.deathDateApprox = deathDate || contact.deathDateApprox || "décès";
  contact.updatedAt = new Date().toISOString();
}

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function renderNewsletter() {
  const form = document.querySelector("#newsletter-form");
  const gate = document.querySelector("#newsletter-auth-gate");
  if (!form || !gate) return;
  const user = currentUser();
  gate.innerHTML = user ? "" : `<div class="auth-required"><h3>Compte requis</h3><p>Connectez-vous pour enregistrer vos preferences.</p><button class="primary-action" type="button" data-panel-target="auth">Connexion</button></div>`;
  form.classList.toggle("is-hidden", !user);
  const cats = document.querySelector("#newsletter-categories");
  if (cats) cats.innerHTML = siteThemes().map((theme) => `<label><input type="checkbox" name="categories" value="${attr(theme)}" ${(user?.categories || []).includes(theme) ? "checked" : ""} />${text(theme)}</label>`).join("");
}

function renderSupport() {
  const form = document.querySelector("#support-form");
  const gate = document.querySelector("#support-auth-gate");
  if (!form || !gate) return;
  const user = currentUser();
  gate.innerHTML = user ? "" : `<div class="auth-required"><h3>Compte requis</h3><p>Connectez-vous pour contacter l'equipe.</p><button class="primary-action" type="button" data-panel-target="auth">Connexion</button></div>`;
  form.classList.toggle("is-hidden", !user);
}

function renderProfile() {
  const user = currentUser();
  const form = document.querySelector("#profile-form");
  if (!user || !form) return;
  ["lastName", "firstName", "city", "email", "phone"].forEach((name) => { if (form.elements[name]) form.elements[name].value = user[name] || ""; });
  const cats = document.querySelector("#profile-categories");
  if (cats) cats.innerHTML = siteThemes().map((theme) => `<label><input type="checkbox" name="categories" value="${attr(theme)}" ${(user.categories || []).includes(theme) ? "checked" : ""} />${text(theme)}</label>`).join("");
  const requests = document.querySelector("#profile-request-list");
  if (requests) requests.innerHTML = state.supportRequests.filter((item) => item.userId === user.id).map((item) => `<article class="request-card"><h4>${text(item.title)}</h4><p>${text(item.message)}</p><span>${text(item.status)}</span></article>`).join("") || `<p class="empty-state">Aucune proposition.</p>`;
  const privacy = document.querySelector("#profile-privacy-panel");
  if (privacy) privacy.innerHTML = `<div class="data-panel"><h3>Compte</h3><p>${text(user.email)}</p></div>`;
}

function renderAdmin() {
  const shell = document.querySelector("#admin-shell");
  if (!shell || !canModerate()) return;
  if (documentPdfObjectUrl) {
    URL.revokeObjectURL(documentPdfObjectUrl);
    documentPdfObjectUrl = "";
  }
  const unread = adminApiLoaded ? assignedTaskNotifications().length : 0;
  const mobileItems = new Set(normalizeMobileAdminMenu(adminState.mobileAdminMenu));
  const renderNavItem = ([id, label, icon]) => `<button type="button" data-admin-section="${attr(id)}" data-admin-icon="${attr(icon)}" class="${activeAdminSection === id ? "is-active" : ""} ${mobileItems.has(id) ? "" : "is-mobile-hidden"}"><span class="admin-nav-label">${text(label)}</span>${id === "activity" && unread ? `<span class="admin-nav-count">${unread}</span>` : ""}</button>`;
  const navGroups = adminMenu.groups.map((group) => {
    const expanded = adminNavExpanded[group.id] !== false;
    return `<div class="admin-nav-group ${expanded ? "is-expanded" : "is-collapsed"}">
      <button class="admin-nav-heading" type="button" data-admin-nav-toggle="${attr(group.id)}" aria-expanded="${expanded ? "true" : "false"}"><span>${text(group.label)}</span></button>
      <div class="admin-nav-items">${group.items.map(renderNavItem).join("")}</div>
    </div>`;
  }).join("");
  shell.innerHTML = `<aside class="admin-sidebar">
    <div class="admin-brand"><span class="brand-assembly" aria-hidden="true"></span><div><strong>Permanence</strong><small>Assemblee nationale</small></div></div>
    <nav>
      <div class="admin-nav-group admin-nav-home">${renderNavItem(adminMenu.home)}</div>
      ${navGroups}
    </nav>
    <button class="secondary-action" type="button" id="leave-admin">Quitter</button>
  </aside>
  <section class="admin-workbench">
    <header class="admin-topbar">
      <button class="admin-notifications-tab ${activeAdminSection === "activity" ? "is-active" : ""}" type="button" data-admin-section="activity"><strong>Notifications</strong>${unread ? `<span>${unread}</span>` : ""}</button>
    </header>
    <div id="admin-view">${renderAdminView()}</div>
  </section>`;
  mountDocumentPdfPreview();
  if (activeAdminSection === "saved-contact-searches") {
    hydrateSavedContactStats(document.querySelector("#admin-view .saved-contact-searches"));
    refreshSavedListBuilder(document.querySelector("[data-saved-list-builder]"));
  }
  if (focusCalendarBodyAfterRender) {
    focusCalendarBodyAfterRender = false;
    requestAnimationFrame(() => document.querySelector("[data-calendar-body]")?.focus());
  }
}

function renderAdminView() {
  if (!adminApiLoaded) return renderAdminDatabaseRequired();
  if (activeAdminSection === "dashboard") return renderDashboard();
  if (activeAdminSection === "team") return renderTeam();
  if (activeAdminSection === "permanence") return renderPermanence();
  if (activeAdminSection === "trombinoscope") return renderTrombinoscope();
  if (activeAdminSection === "templates") return renderTemplates();
  if (activeAdminSection === "mail-templates") return renderMailTemplates();
  if (activeAdminSection === "mail-campaigns") return renderMailCampaigns();
  if (activeAdminSection === "contacts") return renderContacts();
  if (activeAdminSection === "institutions") return window.InstitutionManager?.renderDirectory() || '<section class="admin-panel">Module Institutions indisponible. Actualisez la page.</section>';
  if (activeAdminSection === "institution-migration") return window.InstitutionManager?.renderMigration() || '<section class="admin-panel">Module de migration indisponible. Actualisez la page.</section>';
  if (activeAdminSection === "saved-contact-searches") return renderSavedContactSearchesPage();
  if (activeAdminSection === "calendar") return renderCalendar();
  if (activeAdminSection === "contact-io") return renderContactImportExport();
  if (activeAdminSection === "contact-fields") return renderContactFieldsAdmin();
  if (activeAdminSection === "death") return renderDeath();
  if (activeAdminSection === "special-letters") return renderSpecialLetters();
  if (activeAdminSection === "content") return renderContentAdmin();
  if (activeAdminSection === "homepage") return renderHomepageAdmin();
  if (activeAdminSection === "campaign-terrain") return renderCampaignTerrain();
  if (activeAdminSection === "campaign-events") return renderCampaignMajorEvents();
  if (activeAdminSection === "photo-library") return renderPhotoLibraryAdmin();
  if (activeAdminSection === "keywords") return renderKeywordsAdmin();
  if (activeAdminSection === "adjoint") return window.AdjointImporter?.render() || '<section class="admin-panel"><h2>Module adjoint indisponible</h2><p>Actualisez la page.</p></section>';
  if (activeAdminSection === "social") return renderSocialAdmin();
  if (activeAdminSection === "mobile-menu") return renderMobileMenuSettings();
  if (activeAdminSection === "map-settings") return renderMapSettings();
  if (activeAdminSection === "support") return renderSupportAdmin();
  if (activeAdminSection === "news") return renderContentAdmin();
  if (activeAdminSection === "documents") return renderDocumentsAdmin();
  if (activeAdminSection === "parliament") return renderSimpleCollection("parliamentWork", "Ajouter un travail", ["title", "type", "theme", "status"]);
  if (activeAdminSection === "addons") return renderAddons();
  if (activeAdminSection === "users") return renderUsers();
  if (activeAdminSection === "activity") return renderActivity();
  if (activeAdminSection === "search") return renderInternalSearch();
  return "";
}

function renderAdminDatabaseRequired() {
  return `<section class="admin-db-required">
    <div>
      <h2>Base de donnees requise</h2>
      <p>${text(adminSyncMessage || "Les donnees d'administration ne sont pas chargees depuis la base.")}</p>
      <p>Aucune donnee du navigateur n'est utilisee pour les contacts, dossiers locaux, dossiers deces, documents ou reglages.</p>
    </div>
    <button class="primary-action" type="button" data-admin-retry-db>Reessayer la connexion</button>
  </section>`;
}

function metric(label, value, section) {
  return `<button class="admin-metric" type="button" data-admin-section="${attr(section)}"><span>${text(value)}</span><p>${text(label)}</p></button>`;
}

function renderDashboard() {
  const actionableTasks = permanenceUpcomingTasks();
  const activeRequests = adminState.permanenceRequests.filter((item) => !["resolu", "archive"].includes(item.status));
  const late = actionableTasks.filter(isTaskLate);
  const urgent = activeRequests.filter((item) => item.urgency === "critique" || item.urgency === "prioritaire");
  const dueToday = actionableTasks.filter((task) => task.dueDate === new Date().toISOString().slice(0, 10));
  const selectedRequest = activeRequests.find((item) => item.id === selectedPermanenceId) || urgent[0] || activeRequests[0] || null;
  const selectedContact = contactById(selectedRequest?.contactId) || null;
  return `<div class="admin-dashboard-shell ${selectedRequest ? "" : "without-inspector"}">
    <main class="admin-dashboard-main">
      <section class="admin-kpi-grid">
        ${renderDashboardKpi("A traiter", actionableTasks.filter((task) => task.status === "a traiter").length, `${late.length} en retard`, "permanence", "danger")}
        ${renderDashboardKpi("En cours", actionableTasks.filter((task) => task.status === "en cours").length, `${actionableTasks.length} tâche(s) ouverte(s)`, "permanence", "blue")}
        ${renderDashboardKpi("A relancer", actionableTasks.filter((task) => task.status === "a relancer").length, `${urgent.length} dossier(s) prioritaire(s)`, "permanence", "orange")}
        ${renderDashboardKpi("Total à faire", actionableTasks.length, actionableTasks.length ? "Toutes les tâches actives" : "Aucune tâche en attente", "permanence", "green")}
        <article class="admin-priority-card"><h3>Priorites du jour</h3><p><span class="dot danger"></span>${urgent.length} dossier(s) urgent(s)</p><p><span class="dot blue"></span>${dueToday.length} échéance(s) aujourd'hui</p><p><span class="dot navy"></span>${late.length} tâche(s) en retard</p></article>
      </section>
      ${renderDashboardBoard(actionableTasks)}
      ${actionableTasks.length ? `<section class="admin-bottom-grid">${renderTeamLoad(actionableTasks)}</section>` : ""}
    </main>
    ${selectedRequest ? `<aside class="admin-inspector">
      <div class="secure-badge"><strong>Systeme securise</strong><span>Donnees enregistrees en base</span></div>
      ${renderSelectedRequestPanel(selectedRequest, selectedContact)}
    </aside>` : ""}
  </div>`;
}

function renderDashboardKpi(label, value, detail, section, tone) {
  return `<button class="admin-kpi-card tone-${attr(tone)}" type="button" data-admin-section="${attr(section)}"><div><strong>${text(label)}</strong><span>${text(value)}</span><small>${text(detail)}</small></div><i aria-hidden="true"></i></button>`;
}

function renderDashboardBoard(tasks) {
  const columns = [
    ["a traiter", "A traiter"],
    ["en cours", "En cours"],
    ["a relancer", "A relancer"]
  ];
  if (!tasks.length) {
    return `<section class="admin-task-overview dashboard-empty-state"><div><strong>Aucune tâche à accomplir</strong><p>Le tableau de bord est à jour avec les dossiers locaux.</p><button class="primary-action compact" type="button" data-admin-section="permanence">Voir les dossiers locaux</button></div></section>`;
  }
  return `<section class="admin-task-overview">${columns.map(([status, label]) => {
    const items = tasks.filter((task) => task.status === status).slice(0, 5);
    return `<article class="admin-task-lane status-${attr(slugify(status))}"><header><h3>${text(label)} <span>(${tasks.filter((task) => task.status === status).length})</span></h3><button type="button" data-admin-section="permanence" aria-label="Ouvrir les dossiers">...</button></header>${items.map(renderDashboardTaskRow).join("") || empty("Aucune tache.")}<button class="lane-link" type="button" data-admin-section="permanence">Voir les dossiers locaux</button></article>`;
  }).join("")}</section>`;
}

function renderDashboardTaskRow(task) {
  const date = task.dueDate ? formatDate(task.dueDate) : "Sans echeance";
  return `<button class="dashboard-task-row priority-${attr(task.priority)} ${isTaskLate(task) ? "is-late" : ""}" type="button" data-open-permanence="${attr(task.linkedRequestId || "")}"><strong>${text(task.title)}</strong><span>${text(userNameById(task.assignedTo) || task.type)}</span><time>${text(date)}</time></button>`;
}

function renderSelectedRequestPanel(request, contact) {
  if (!request) return `<section class="selected-contact-card">${empty("Aucun dossier selectionne.")}</section>`;
  const initials = contact ? `${(contact.firstName || "").slice(0, 1)}${(contact.lastName || "").slice(0, 1)}` : "DS";
  return `<section class="selected-contact-card">
    <header><div><h3>Dossier selectionne</h3><span>1 sur ${text(adminState.permanenceRequests.length || 1)}</span></div><button type="button" data-admin-section="permanence" aria-label="Fermer">×</button></header>
    <div class="selected-contact-identity"><span>${text(initials || "DS")}</span><div><strong>${text(contact ? contactDisplayName(contact) : request.title)}</strong><p>Email ${text(contact?.email || "non renseigne")}</p><p>Telephone ${text(contact?.mobile || contact?.phone || "non renseigne")}</p></div><button type="button" data-admin-section="permanence">${text(request.status || "A traiter")}</button></div>
    <nav><button class="is-active" type="button">Resume</button><button type="button" data-admin-section="permanence">Dossier</button><button type="button" data-admin-section="activity">Historique</button><button type="button" data-admin-section="documents">Pieces</button><button type="button" data-admin-section="templates">Notes</button></nav>
    <div class="selected-contact-body">
      <h4>Objet de la demande</h4><p>${text(request.title)}</p>
      <h4>Description</h4><p>${text(request.description || "Description a completer.")}</p>
      <dl>
        <div><dt>Recu le</dt><dd>${text(formatDate(request.createdAt || new Date().toISOString()))}</dd></div>
        <div><dt>Canal</dt><dd>${text(request.channel || request.source || "Non renseigne")}</dd></div>
        <div><dt>Priorite</dt><dd><span class="status-chip urgency-${attr(request.urgency)}">${text(request.urgency)}</span></dd></div>
        <div><dt>Assigne a</dt><dd>${text(userNameById(request.assignedTo) || "Non assigne")}</dd></div>
        <div><dt>Echeance</dt><dd>${text(request.dueDate ? formatDate(request.dueDate) : "A definir")}</dd></div>
        <div><dt>Dossier lie</dt><dd>${text(request.category || "Aucun")}</dd></div>
      </dl>
    </div>
    <footer><button class="secondary-action" type="button" data-admin-section="permanence">Modifier</button><button class="primary-action" type="button" data-task-from-permanence="${attr(request.id)}">Passer en cours</button></footer>
  </section>`;
}

function renderTeamLoad(tasks = permanenceUpcomingTasks()) {
  const members = (adminUsersLoaded ? adminUsers : state.users).filter((user) => roleRank(user.role) >= 10);
  const totalOpenTasks = tasks.length;
  const rows = members.map((user) => {
    const open = tasks.filter((task) => task.assignedTo === user.id);
    const load = totalOpenTasks ? Math.round((open.length / totalOpenTasks) * 100) : 0;
    return `<tr><td><span class="mini-avatar">${text((user.firstName || "A").slice(0, 1))}${text((user.lastName || "D").slice(0, 1))}</span>${text(userNameById(user.id))}</td><td>${open.filter((task) => task.status === "a traiter").length}</td><td>${open.filter((task) => task.status === "en cours").length}</td><td>${open.filter((task) => task.status === "a relancer").length}</td><td><span class="loadbar"><i style="width:${load}%;--bar:#0b5bd3"></i></span>${load}%</td></tr>`;
  }).join("");
  return `<section class="admin-panel team-load-panel"><h3>Charge de travail de l'equipe</h3><table><thead><tr><th>Membre</th><th>A traiter</th><th>En cours</th><th>A relancer</th><th>Charge</th></tr></thead><tbody>${rows || `<tr><td colspan="5">Aucun membre.</td></tr>`}</tbody></table></section>`;
}

function renderTasks() {
  const folders = adminState.teamFolders || [];
  const selected = folders.find((folder) => folder.id === selectedTeamFolderId);
  if (selected) return renderTeamFolderPage(selected);
  return `<div class="work-folder-library"><header class="work-folder-header"><div><h2>Dossiers d'equipe</h2><p>Un espace de travail par dossier, avec responsables, echeances et historique.</p></div><form data-team-folder-create><input name="name" required placeholder="Nom du nouveau dossier" /><button class="primary-action compact" type="submit">Creer un dossier</button></form></header><section class="work-folder-grid">${folders.map((folder) => {
    const tasks = adminState.teamTasks.filter((task) => task.folderId === folder.id);
    return `<article class="work-folder-card"><button type="button" data-open-team-folder="${attr(folder.id)}"><span class="work-folder-icon">${localIcon("file")}</span><strong>${text(folder.name)}</strong><p>${text(folder.description || "Aucune description")}</p><small>${tasks.filter((task) => task.status !== "termine").length} ouverte(s) · ${tasks.length} au total</small></button><div><button type="button" data-team-folder-rename="${attr(folder.id)}">Renommer</button><button type="button" class="danger" data-team-folder-delete="${attr(folder.id)}">Supprimer</button></div></article>`;
  }).join("") || empty("Creez votre premier dossier d'equipe.")}</section></div>`;
}

function renderTeamFolderPage(folder) {
  const tasks = adminState.teamTasks.filter((task) => task.folderId === folder.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return `<div class="team-folder-page"><header class="work-folder-header"><div><button class="back-link" type="button" data-close-team-folder>← Tous les dossiers</button><h2>${text(folder.name)}</h2><p>${text(folder.description || "Organisez ici toutes les actions liees a ce dossier.")}</p></div><form data-team-folder-update="${attr(folder.id)}"><input name="name" value="${attr(folder.name)}" required /><input name="description" value="${attr(folder.description || "")}" placeholder="Description du dossier" /><button class="secondary-action compact">Enregistrer</button></form></header>
    <form class="timeline-task-create" data-task-create><input type="hidden" name="folderId" value="${attr(folder.id)}" /><input name="title" required placeholder="Titre de la nouvelle tache" /><textarea name="description" placeholder="Description"></textarea><select name="assignedTo"><option value="">Non assigne</option>${userOptions("")}</select><input name="dueDate" type="date" /><input name="linkedContactId" placeholder="Identifiant citoyen (optionnel)" /><button class="primary-action" type="submit">Ajouter la tache</button></form>
    <section class="task-timeline">${tasks.map(renderTimelineTask).join("") || empty("Aucune tache dans ce dossier.")}</section></div>`;
}

function taskIsUrgent(task) {
  if (!task.dueDate || task.status === "termine") return false;
  const days = (new Date(`${task.dueDate}T23:59:59`) - new Date()) / 86400000;
  return days >= 0 && days < 7;
}

function renderTimelineTask(task) {
  const mine = task.assignedTo === currentUserId;
  const done = task.status === "termine";
  return `<article class="timeline-task ${mine ? "is-mine" : ""} ${done ? "is-done" : ""}"><i aria-hidden="true"></i><form data-task-update="${attr(task.id)}"><header><label class="task-complete"><input type="checkbox" data-team-task-toggle="${attr(task.id)}" ${done ? "checked" : ""} /><span></span></label><div><input class="timeline-title" name="title" value="${attr(task.title)}" required /><small>${text(task.createdAt ? formatDate(task.createdAt.slice(0, 10)) : "")}</small></div>${taskIsUrgent(task) ? `<mark class="urgent-flag">! Urgent</mark>` : ""}</header><textarea name="description" placeholder="Description de la tache">${text(task.description || "")}</textarea><div class="timeline-fields"><label>Attribue a<select name="assignedTo"><option value="">Non assigne</option>${userOptions(task.assignedTo)}</select></label><label>Echeance<input name="dueDate" type="date" value="${attr(task.dueDate || "")}" /></label><label>Citoyen<select name="linkedContactId"><option value="">Aucun</option>${adminState.localContacts.map((contact) => `<option value="${attr(contact.id)}" ${contact.id === task.linkedContactId ? "selected" : ""}>${text(contactDisplayName(contact))}</option>`).join("")}</select></label></div><input type="hidden" name="folderId" value="${attr(task.folderId)}" /><input type="hidden" name="status" value="${attr(task.status)}" /><input type="hidden" name="type" value="${attr(task.type)}" /><input type="hidden" name="priority" value="${attr(task.priority)}" /><input type="hidden" name="linkedRequestId" value="${attr(task.linkedRequestId || "")}" /><label class="task-files">Fichiers<input type="file" multiple data-task-files="${attr(task.id)}" /></label><div class="task-file-list">${(task.attachments || []).map((file) => `<span>${localIcon("file")} ${text(file.name)} <button type="button" data-task-file-delete="${attr(task.id)}" data-file-id="${attr(file.id)}">×</button></span>`).join("")}</div><footer><span>${text(userNameById(task.assignedTo) || "Non assigne")}</span><button class="secondary-action compact" type="submit">Enregistrer</button></footer></form></article>`;
}

function renderTaskCard(task) {
  const checked = new Set(task.completedChecklist || []);
  return `<article class="task-card priority-${attr(task.priority)} ${isTaskLate(task) ? "is-late" : ""}"><form data-task-update="${attr(task.id)}">
    <div class="task-card-head"><div><strong>${text(task.title)}</strong><p>${text(task.type)} - ${text(task.priority)} - ${text(task.dueDate ? formatDate(task.dueDate) : "sans echeance")}</p></div><select name="status">${options(taskStatuses, task.status)}</select></div>
    <div class="task-card-grid"><label>Responsable<select name="assignedTo"><option value="">Non assigne</option>${userOptions(task.assignedTo)}</select></label><label>Echeance<input name="dueDate" type="date" value="${attr(task.dueDate || "")}" /></label><label>Priorite<select name="priority">${options(priorities, task.priority)}</select></label></div>
    <input name="title" type="hidden" value="${attr(task.title)}" /><input name="type" type="hidden" value="${attr(task.type)}" /><input name="linkedContactId" type="hidden" value="${attr(task.linkedContactId || "")}" /><input name="linkedRequestId" type="hidden" value="${attr(task.linkedRequestId || "")}" />
    <textarea name="description">${text(task.description || "")}</textarea>
    <div class="task-checklist">${(task.checklist || []).map((item) => `<label><input name="completedChecklist" value="${attr(item)}" type="checkbox" ${checked.has(item) ? "checked" : ""} />${text(item)}</label>`).join("")}</div>
    <label>Checklist<textarea name="checklist">${text((task.checklist || []).join("\n"))}</textarea></label>
    <label>Commentaire<textarea name="newComment"></textarea></label>
    <div class="form-actions"><button class="secondary-action compact" type="submit">Enregistrer</button><button class="secondary-action compact" type="button" data-task-status="${attr(task.id)}" data-status="termine">Terminer</button>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-admin-item="teamTasks" data-id="${attr(task.id)}">Supprimer</button>` : ""}</div>
  </form></article>`;
}

function renderTeam() {
  const users = state.users.filter((user) => roleRank(user.role) >= 10);
  return `<div class="team-center"><section class="admin-panel team-overview"><div><h3>Pilotage equipe</h3><p>Charge, retards et responsabilites.</p></div><div class="team-kpis">${metric("Taches ouvertes", adminState.teamTasks.filter((task) => !["termine", "archive"].includes(task.status)).length, "permanence")}${metric("Non assignees", adminState.teamTasks.filter((task) => !task.assignedTo).length, "permanence")}</div></section><section class="team-grid">${users.map(renderTeamCard).join("")}</section></div>`;
}

function renderTeamCard(user) {
  const tasks = adminState.teamTasks.filter((task) => task.assignedTo === user.id);
  const open = tasks.filter((task) => !["termine", "archive"].includes(task.status));
  return `<article class="team-card"><header><div><strong>${text(userNameById(user.id))}</strong><p>${text(roleLabel(user.role))} - ${text(user.email || "")}</p></div><span>${open.length} ouvertes</span></header><div class="team-load"><div><strong>${open.filter(isTaskLate).length}</strong><span>retard</span></div><div><strong>${tasks.filter((task) => task.status === "termine").length}</strong><span>terminees</span></div><div><strong>${open.filter((task) => task.priority === "urgente").length}</strong><span>urgentes</span></div></div><div class="team-next">${open.slice(0, 4).map((task) => `<button type="button" data-open-permanence="${attr(task.linkedRequestId || "")}"><strong>${text(task.title)}</strong><span>${text(task.dueDate ? formatDate(task.dueDate) : "Sans echeance")}</span></button>`).join("") || empty("Aucune tache ouverte.")}</div></article>`;
}

function renderPermanence() {
  const filters = adminFilters.permanence || {};
  const view = filters.view === "list" ? "list" : "board";
  const items = filteredPermanenceRequests();
  const selected = selectedPermanenceId === "__new" ? null : adminState.permanenceRequests.find((item) => item.id === selectedPermanenceId) || items[0] || adminState.permanenceRequests[0] || null;
  if (selectedPermanenceId && selectedPermanenceId !== "__new" && selected) return renderPermanenceCasePage(selected);
  if (selectedPermanenceId === "__new") return renderPermanenceCreatePage(filters.newStatus || "nouveau");
  const open = adminState.permanenceRequests.filter((item) => item.status !== "archive");
  const waiting = open.filter((item) => ["analyse", "attente reponse"].includes(item.status));
  const activeTasks = adminState.teamTasks.filter((task) => task.linkedRequestId && !["termine", "archive"].includes(task.status));
  const dueSoon = permanenceUpcomingTasks();
  return `<div class="local-dossiers-app">
    <header class="local-dossiers-head">
      <div><h2>Gestion des dossiers locaux</h2><p>Suivez, assignez et traitez les demandes des citoyens.</p><small class="admin-sync-note">${text(adminSyncMessage)}</small></div>
      <div class="local-dossiers-actions">
        <button class="secondary-action compact" type="button" data-permanence-filters>${localIcon("filter")} Filtres</button>
        <button class="primary-action compact" type="button" data-permanence-new>${localIcon("plus")} Creer un nouveau dossier</button>
      </div>
    </header>
    ${filters.filtersOpen ? renderPermanenceFilters(filters) : ""}
    <section class="local-kpi-grid">
      ${localKpi("file", open.length, "Dossiers ouverts", `${open.filter((item) => item.assignedTo === currentUserId).length} ce mois-ci`, "blue")}
      ${localKpi("clock", waiting.length, "En attente", `Urgents : ${open.filter((item) => item.urgency !== "normal").length}`, "orange")}
      ${localKpi("check", open.filter((item) => item.status === "en cours").length, "En cours", "Taches actives", "green")}
      ${localKpi("reply", open.filter((item) => item.status === "attente reponse").length, "En attente reponse", "Administration", "purple")}
      ${localKpi("archive", adminState.permanenceRequests.filter((item) => item.status === "archive").length, "Dossiers archives", "Au total", "slate")}
    </section>
    <div class="local-dossiers-layout">
      <main class="local-dossiers-main">
        ${renderLocalFolderExplorer(items)}
        ${renderPermanenceUpcomingTasks(dueSoon)}
      </main>
    </div>
  </div>`;
}

function renderPermanenceCreatePage(status = "nouveau") {
  return `<div class="local-case-page"><nav class="death-breadcrumb"><button type="button" data-permanence-back-list>Dossiers locaux</button><span>›</span><strong>Nouveau dossier</strong></nav><header class="local-case-page-head"><div><h2>Creer un dossier local</h2><p>Centralisez la demande, les personnes, les taches et les documents dans un espace unique.</p></div><button class="secondary-action compact" type="button" data-permanence-back-list>Retour a la liste</button></header><section class="local-case-main-card local-create-full">${renderPermanenceForm(status)}</section></div>`;
}

function renderPermanenceCasePage(item) {
  const contact = contactById(item.contactId);
  const tasks = permanenceTasks(item.id).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const status = permanenceStatusMeta(item.status);
  const tab = adminFilters.permanenceTab || "tasks";
  const completed = tasks.filter((task) => task.status === "termine").length;
  return `<div class="local-case-page">
    <nav class="death-breadcrumb"><button type="button" data-permanence-back-list>Dossiers locaux</button><span>›</span><strong>${text(item.title || "Dossier")}</strong></nav>
    <header class="local-case-page-head"><div><div class="local-case-title-line"><h2>${text(item.title || "Dossier local")}</h2><mark class="local-status ${attr(status.className)}">${text(status.shortLabel)}</mark></div><p>${text(item.category || "Sans categorie")} · ${text(contact?.city || "Commune non renseignee")} · Cree le ${text(item.createdAt ? formatDate(item.createdAt.slice(0, 10)) : "-")}</p></div><div class="form-actions">${contact ? `<button class="secondary-action compact" type="button" data-open-contact="${attr(contact.id)}">Voir la fiche citoyen</button>` : ""}<button class="secondary-action compact" type="button" data-permanence-back-list>Retour a la liste</button></div></header>
    <section class="local-case-summary"><article><span>Responsable</span><strong>${text(userNameById(item.assignedTo) || "Non assigne")}</strong></article><article><span>Echeance du dossier</span><strong>${text(item.dueDate ? formatDate(item.dueDate) : "Non definie")}</strong></article><article><span>Progression</span><strong>${completed}/${tasks.length} tache(s)</strong></article><article><span>Documents</span><strong>${(item.attachments || []).length}</strong></article></section>
    <nav class="local-case-tabs">${[["tasks", `Taches (${tasks.length})`],["info","Informations"],["documents",`Documents (${(item.attachments || []).length})`],["history","Historique"]].map(([id,label]) => `<button type="button" data-permanence-tab="${id}" class="${tab === id ? "is-active" : ""}">${text(label)}</button>`).join("")}</nav>
    <div class="local-case-page-grid"><main class="local-case-main-card">
      ${tab === "tasks" ? renderPermanenceTaskWorkspace(item, tasks) : ""}
      ${tab === "info" ? renderPermanenceInfoPanel(item) : ""}
      ${tab === "documents" ? renderPermanenceDocumentWorkspace(item) : ""}
      ${tab === "history" ? renderPermanenceHistoryWorkspace(item, tasks) : ""}
    </main><aside class="local-case-side">
      <section><h3>Citoyen lie</h3>${contact ? `<div class="local-case-contact"><em>${text(contactInitials(contact))}</em><div><strong>${text(contactDisplayName(contact))}</strong><span>${text(contact.email || contact.mobile || contact.phone || "Coordonnees non renseignees")}</span></div></div>` : `<p>Aucun citoyen lie.</p>`}</section>
      <section><h3>Description</h3><p>${text(item.description || "Aucune description renseignee.")}</p></section>
      <section><h3>Actions</h3><button type="button" data-permanence-tab="info">Modifier le dossier</button><button type="button" data-permanence-tab="documents">Ajouter des documents</button><button type="button" data-permanence-archive="${attr(item.id)}">Archiver le dossier</button>${isAdmin() ? `<button class="danger" type="button" data-permanence-delete="${attr(item.id)}">Supprimer le dossier</button>` : ""}</section>
    </aside></div>
  </div>`;
}

function renderPermanenceTaskWorkspace(item, tasks) {
  return `<section class="local-task-workspace"><div class="local-section-title"><div><h3>Suivi des taches</h3><p>Les taches les plus recentes apparaissent en premier. Une tache terminee reste visible dans l'historique.</p></div></div>
    <form class="local-task-create-full" data-permanence-task-create="${attr(item.id)}"><div class="local-task-create-heading"><strong>Ajouter une tache</strong><span>Definissez clairement l'action attendue et son responsable.</span></div><label>Titre de la tache<input name="title" required placeholder="Ex. Relancer la prefecture" /></label><label class="wide">Description<textarea name="description" placeholder="Contexte, resultat attendu, informations utiles..."></textarea></label><label>Attribuer a<select name="assignedTo"><option value="">Non assigne</option>${userOptions(item.assignedTo || "")}</select></label><label>Echeance<input name="dueDate" type="date" /></label><label>Priorite<select name="priority">${options(priorities, item.urgency === "critique" ? "urgente" : "normale")}</select></label><button class="primary-action" type="submit">Ajouter la tache</button></form>
    <div class="local-task-timeline">${tasks.map(renderPermanenceTaskCard).join("") || empty("Aucune tache. Utilisez le formulaire ci-dessus pour commencer le suivi.")}</div></section>`;
}

function renderPermanenceTaskCard(task) {
  const done = task.status === "termine";
  const mine = task.assignedTo === currentUserId;
  return `<article class="local-task-detail-card ${done ? "is-done" : ""} ${mine ? "is-mine" : ""}"><span class="local-task-dot"></span><form data-task-update="${attr(task.id)}"><header><label class="local-task-check"><input type="checkbox" data-permanence-task-toggle="${attr(task.id)}" ${done ? "checked" : ""} /><span></span></label><div><input name="title" value="${attr(task.title)}" required /><small>Ajoutee le ${text(task.createdAt ? formatDate(task.createdAt.slice(0, 10)) : "-")} · ${text(userNameById(task.assignedTo) || "Non assigne")}</small></div>${taskIsUrgent(task) ? `<mark class="urgent-flag">! Urgent</mark>` : ""}</header><textarea name="description" placeholder="Description de la tache">${text(task.description || "")}</textarea><div class="local-task-detail-fields"><label>Responsable<select name="assignedTo"><option value="">Non assigne</option>${userOptions(task.assignedTo)}</select></label><label>Echeance<input name="dueDate" type="date" value="${attr(task.dueDate || "")}" /></label><label>Priorite<select name="priority">${options(priorities, task.priority)}</select></label><label>Statut<select name="status">${options(taskStatuses, task.status)}</select></label></div><input type="hidden" name="type" value="${attr(task.type || "dossier")}" /><input type="hidden" name="folderId" value="${attr(task.folderId || "team-folder-general")}" /><input type="hidden" name="linkedContactId" value="${attr(task.linkedContactId || "")}" /><input type="hidden" name="linkedRequestId" value="${attr(task.linkedRequestId || "")}" /><div class="local-task-files"><label>${localIcon("file")} Joindre des fichiers<input type="file" multiple data-task-files="${attr(task.id)}" /></label><div>${(task.attachments || []).map((file) => `<span>${localIcon("file")}<strong>${text(file.name)}</strong>${file.fileData ? `<button class="file-download" type="button" data-task-file-download="${attr(task.id)}" data-file-id="${attr(file.id)}">Telecharger</button>` : ""}<button type="button" data-task-file-delete="${attr(task.id)}" data-file-id="${attr(file.id)}" aria-label="Supprimer">×</button></span>`).join("") || `<small>Aucun fichier joint a cette tache.</small>`}</div></div><footer><button class="secondary-action compact" type="submit">Enregistrer les modifications</button><button class="secondary-action compact danger" type="button" data-permanence-task-delete="${attr(task.id)}">Supprimer</button></footer></form></article>`;
}

function renderLocalFolderExplorer(items) {
  const folders = adminState.localFolders || [];
  const current = selectedLocalFolderId === "all" ? null : folders.find((folder) => folder.id === selectedLocalFolderId);
  const childFolders = folders.filter((folder) => (folder.parentId || "") === (current?.id || ""));
  const visibleItems = items.filter((item) => current ? item.localFolderId === current.id : !item.localFolderId);
  const breadcrumb = current ? `<button type="button" data-local-folder-open="all">Dossiers locaux</button><span>/</span><strong>${text(current.name)}</strong>` : `<strong>Dossiers locaux</strong>`;
  return `<section class="local-folder-explorer"><header><nav>${breadcrumb}</nav><form data-local-folder-create><input type="hidden" name="parentId" value="${attr(current?.id || "")}" /><input name="name" required placeholder="Nouveau dossier de classement" /><button class="secondary-action compact">Creer</button></form></header><div class="local-folder-tiles">${childFolders.map((folder) => `<article><button type="button" data-local-folder-open="${attr(folder.id)}">${localIcon("file")}<strong>${text(folder.name)}</strong><small>${adminState.permanenceRequests.filter((item) => item.localFolderId === folder.id).length} dossier(s)</small></button><footer><button type="button" data-local-folder-rename="${attr(folder.id)}">Renommer</button><button class="danger" type="button" data-local-folder-delete="${attr(folder.id)}">Supprimer</button></footer></article>`).join("")}</div><div class="local-case-list">${visibleItems.map(renderPermanenceCard).join("") || empty("Aucun dossier citoyen dans cet emplacement.")}</div></section>`;
}

function renderPermanenceCard(item) {
  const contact = contactById(item.contactId);
  const tasks = permanenceTasks(item.id);
  const done = tasks.filter((task) => task.status === "termine").length;
  const status = permanenceStatusMeta(item.status);
  return `<button class="local-dossier-card urgency-${attr(item.urgency)} ${selectedPermanenceId === item.id ? "is-active" : ""}" type="button" data-open-permanence="${attr(item.id)}">
    <strong>${text(item.title || "Dossier sans titre")}</strong>
    <span>${text(contact?.city || item.category || "Commune non renseignee")}</span>
    <div><em class="local-avatar">${text(userInitials(item.assignedTo || contact?.id || ""))}</em><time>${text(item.dueDate ? formatDate(item.dueDate) : item.createdAt ? formatDate(item.createdAt.slice(0, 10)) : "")}</time></div>
    <footer><mark class="local-status ${attr(status.className)}">${text(status.shortLabel)}</mark>${tasks.length ? `<small>${localIcon("task")} ${done}/${tasks.length}</small>` : ""}</footer>
  </button>`;
}

function renderPermanenceForm(status = "nouveau") {
  return `<section class="local-detail-panel">
    <header><div><span>Nouveau dossier</span><h3>Creer un dossier local</h3></div><button type="button" class="icon-action" data-permanence-close-new aria-label="Fermer">${localIcon("x")}</button></header>
    <form class="admin-form embedded-form local-detail-form" data-permanence-create>
      <input type="hidden" name="status" value="${attr(status)}" />
      <input type="hidden" name="localFolderId" value="${attr(selectedLocalFolderId === "all" ? "" : selectedLocalFolderId)}" />
      <label>Titre<input name="title" required placeholder="Ex. Probleme de transport scolaire" /></label>
      <div class="form-grid"><label>Categorie<input name="category" placeholder="Transport, voirie, logement..." /></label><label>Priorite<select name="urgency">${options(permanenceUrgencies, "normal")}</select></label></div>
      ${renderContactSearchPicker({ key: "permanence-create", name: "contactId", label: "Citoyen ou contact", placeholder: "Nom, prenom ou commune" })}
      <div class="form-grid"><label>Assigne a<select name="assignedTo"><option value="">Non assigne</option>${userOptions("")}</select></label><label>Echeance<input name="dueDate" type="date" /></label></div>
      <label>Description<textarea name="description" placeholder="Resumez la demande, les interlocuteurs et le resultat attendu."></textarea></label>
      <button class="primary-action" type="submit">Creer en base</button>
    </form>
  </section>`;
}

function renderPermanenceDetail(item) {
  const contact = contactById(item.contactId);
  const linkedTasks = adminState.teamTasks.filter((task) => task.linkedRequestId === item.id);
  const status = permanenceStatusMeta(item.status);
  const tab = adminFilters.permanenceTab || "tasks";
  return `<section class="local-detail-panel">
    <header>
      <div><span>Dossier #${text(String(item.id).slice(0, 8))}</span><h3>${text(item.title || "Dossier local")}</h3><p>${text(contact?.city || item.category || "Commune non renseignee")}</p></div>
      <mark class="local-status ${attr(status.className)}">${text(status.shortLabel)}</mark>
      <button type="button" class="icon-action" data-permanence-close-detail aria-label="Fermer">${localIcon("x")}</button>
    </header>
    <section class="local-citizen-card">
      <em>${text(contactInitials(contact || {}))}</em>
      <div><strong>${text(contact ? contactDisplayName(contact) : "Aucun contact lie")}</strong><span>${text([contact?.email, contact?.mobile || contact?.phone].filter(Boolean).join(" / ") || "Coordonnees non renseignees")}</span></div>
      ${contact ? `<button class="secondary-action compact" type="button" data-open-contact="${attr(contact.id)}">Voir la fiche</button>` : ""}
    </section>
    <p class="local-detail-description">${text(item.description || "Aucune description renseignee.")}</p>
    <nav class="local-detail-tabs">
      ${["tasks", "info", "documents", "history"].map((id) => `<button type="button" data-permanence-tab="${attr(id)}" class="${tab === id ? "is-active" : ""}">${text({ tasks: `Taches (${linkedTasks.length})`, info: "Informations", documents: `Documents (${(item.attachments || []).length})`, history: "Historique" }[id])}</button>`).join("")}
    </nav>
    ${tab === "tasks" ? renderPermanenceTaskPanel(item, linkedTasks) : ""}
    ${tab === "info" ? renderPermanenceInfoPanel(item) : ""}
    ${tab === "documents" ? renderPermanenceDocumentPanel(item) : ""}
    ${tab === "history" ? renderPermanenceHistoryPanel(item) : ""}
    <footer class="local-detail-actions">
      <button class="secondary-action" type="button" data-permanence-tab="info">${localIcon("edit")} Modifier</button>
      <button class="secondary-action" type="button" data-permanence-archive="${attr(item.id)}">${localIcon("archive")} Archiver</button>
      ${isAdmin() ? `<button class="secondary-action danger" type="button" data-permanence-delete="${attr(item.id)}">${localIcon("trash")} Supprimer</button>` : ""}
    </footer>
  </section>`;
}

function renderPermanenceFilters(filters) {
  return `<form class="local-filter-panel" data-admin-filter="permanence">
    <input type="hidden" name="filtersOpen" value="1" />
    <input type="hidden" name="view" value="${attr(filters.view || "board")}" />
    <label>Recherche<input name="q" value="${attr(filters.q || "")}" placeholder="Titre, commune, description..." /></label>
    <label>Statut<select name="status"><option value="">Tous les statuts</option>${options(permanenceStatuses, filters.status)}</select></label>
    <label>Priorite<select name="urgency"><option value="">Toutes les priorites</option>${options(permanenceUrgencies, filters.urgency)}</select></label>
    <label>Assigne a<select name="assignedTo"><option value="">Toute l'equipe</option>${userOptions(filters.assignedTo || "")}</select></label>
    <button class="primary-action compact" type="submit">Appliquer</button>
    <button class="secondary-action compact" type="button" data-permanence-clear-filters>Reinitialiser</button>
  </form>`;
}

function renderPermanenceBoard(items) {
  const columns = ["nouveau", "analyse", "en cours", "attente reponse", "resolu"];
  return `<section class="local-kanban">${columns.map((status) => {
    const meta = permanenceStatusMeta(status);
    const columnItems = items.filter((item) => item.status === status);
    return `<article class="local-kanban-column tone-${attr(meta.tone)}">
      <header><h3>${text(meta.label)}</h3><span>${columnItems.length}</span><button type="button" data-permanence-new-status="${attr(status)}" aria-label="Ajouter un dossier">${localIcon("plus")}</button></header>
      <div class="local-kanban-cards">${columnItems.map(renderPermanenceCard).join("") || empty("Aucun dossier.")}</div>
      <button class="local-add-card" type="button" data-permanence-new-status="${attr(status)}">${localIcon("plus")} Ajouter une carte</button>
    </article>`;
  }).join("")}</section>`;
}

function renderPermanenceList(items) {
  return `<section class="local-list-view">
    <table><thead><tr><th>Dossier</th><th>Citoyen</th><th>Statut</th><th>Priorite</th><th>Assigne a</th><th>Echeance</th></tr></thead>
    <tbody>${items.map((item) => {
      const contact = contactById(item.contactId);
      const status = permanenceStatusMeta(item.status);
      return `<tr data-open-permanence="${attr(item.id)}"><td><strong>${text(item.title)}</strong><span>${text(item.category || "")}</span></td><td>${text(contact ? contactDisplayName(contact) : "Aucun contact")}</td><td><mark class="local-status ${attr(status.className)}">${text(status.shortLabel)}</mark></td><td>${text(permanenceUrgencyLabel(item.urgency))}</td><td>${text(userNameById(item.assignedTo) || "Non assigne")}</td><td>${text(item.dueDate ? formatDate(item.dueDate) : "-")}</td></tr>`;
    }).join("") || `<tr><td colspan="6">${empty("Aucun dossier.")}</td></tr>`}</tbody></table>
  </section>`;
}

function renderPermanenceTaskPanel(item, tasks) {
  return `<section class="local-detail-tab is-tasks">
    <div class="local-task-list">${tasks.map((task) => `<article class="local-task-row">
      <label><input type="checkbox" data-permanence-task-toggle="${attr(task.id)}" ${task.status === "termine" ? "checked" : ""} /> <span>${text(task.title)}</span></label>
      <em class="local-avatar">${text(userInitials(task.assignedTo))}</em>
      <time>${text(task.dueDate ? formatDate(task.dueDate) : "Sans echeance")}</time>
      <button type="button" class="icon-action" data-permanence-task-delete="${attr(task.id)}" aria-label="Supprimer la tache">${localIcon("more")}</button>
    </article>`).join("") || empty("Aucune tache liee.")}</div>
    <form class="local-add-task" data-permanence-task-create="${attr(item.id)}">
      <input name="title" required placeholder="Nouvelle tache" />
      <select name="assignedTo"><option value="">Non assigne</option>${userOptions(item.assignedTo || "")}</select>
      <input name="dueDate" type="date" />
      <button class="secondary-action compact" type="submit">${localIcon("plus")} Ajouter une tache</button>
    </form>
  </section>`;
}

function renderPermanenceInfoPanel(item) {
  return `<form class="admin-form embedded-form local-detail-form" data-permanence-update="${attr(item.id)}">
    <label>Titre<input name="title" required value="${attr(item.title || "")}" /></label>
    <div class="form-grid"><label>Categorie<input name="category" value="${attr(item.category || "")}" /></label><label>Statut<select name="status">${options(permanenceStatuses, item.status)}</select></label></div>
    ${renderContactSearchPicker({ key: `permanence-${item.id}`, name: "contactId", selected: item.contactId, label: "Citoyen ou contact", placeholder: "Nom, prenom ou commune" })}
    <div class="form-grid"><label>Dossier de classement<select name="localFolderId"><option value="">Racine</option>${(adminState.localFolders || []).map((folder) => `<option value="${attr(folder.id)}" ${folder.id === item.localFolderId ? "selected" : ""}>${text(folder.name)}</option>`).join("")}</select></label><label>Priorite<select name="urgency">${options(permanenceUrgencies, item.urgency)}</select></label><label>Assigne a<select name="assignedTo"><option value="">Non assigne</option>${userOptions(item.assignedTo || "")}</select></label><label>Echeance<input name="dueDate" type="date" value="${attr(item.dueDate || "")}" /></label></div>
    <label>Description<textarea name="description">${text(item.description || "")}</textarea></label>
    <button class="primary-action" type="submit">Enregistrer en base</button>
  </form>`;
}

function renderPermanenceDocumentPanel(item) {
  const docs = item.attachments || [];
  return `<section class="local-detail-tab">
    <div class="local-document-list">${docs.map((doc) => `<article><div>${localIcon("file")}<strong>${text(doc.name || doc.title || "Document")}</strong><span>${text(doc.type || "piece jointe")}</span></div><button class="icon-action" type="button" data-permanence-document-delete="${attr(item.id)}" data-document-id="${attr(doc.id)}" aria-label="Supprimer">${localIcon("trash")}</button></article>`).join("") || empty("Aucun document.")}</div>
    <form class="local-add-document" data-permanence-document-add="${attr(item.id)}">
      <input name="name" required placeholder="Nom du document" />
      <input name="type" placeholder="Type" />
      <input name="url" placeholder="Lien ou reference" />
      <button class="secondary-action compact" type="submit">${localIcon("plus")} Ajouter</button>
    </form>
  </section>`;
}

function renderPermanenceDocumentWorkspace(item) {
  const docs = item.attachments || [];
  return `<section class="local-document-workspace"><div class="local-section-title"><div><h3>Documents du dossier</h3><p>Ajoutez les courriers, justificatifs, reponses et pieces utiles au suivi general.</p></div></div><label class="local-document-drop">${localIcon("file")}<strong>Ajouter un ou plusieurs fichiers</strong><span>Selectionnez les documents depuis votre ordinateur.</span><input type="file" multiple data-permanence-files="${attr(item.id)}" /></label><div class="local-document-grid">${docs.map((doc) => `<article><span>${localIcon("file")}</span><div><strong>${text(doc.name || "Document")}</strong><small>${text(doc.type || "Fichier")} · ${text(doc.createdAt ? formatDate(doc.createdAt.slice(0,10)) : "")}</small></div>${doc.fileData ? `<button type="button" data-permanence-document-download="${attr(item.id)}" data-document-id="${attr(doc.id)}">Ouvrir</button>` : ""}<button class="danger" type="button" data-permanence-document-delete="${attr(item.id)}" data-document-id="${attr(doc.id)}">Supprimer</button></article>`).join("") || empty("Aucun document dans ce dossier.")}</div></section>`;
}

function renderPermanenceHistoryWorkspace(item, tasks) {
  const events = [
    ...(item.comments || []).map((entry) => ({ ...entry, kind: "Note ajoutee" })),
    ...tasks.map((task) => ({ id: `task-${task.id}`, authorName: userNameById(task.assignedTo) || "Equipe", body: `${task.status === "termine" ? "Tache terminee" : "Tache creee"} : ${task.title}`, createdAt: task.updatedAt || task.createdAt, kind: "Tache" }))
  ].sort((a,b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return `<section class="local-history-workspace"><div class="local-section-title"><div><h3>Historique du dossier</h3><p>Conservez une trace chronologique des notes, taches et decisions.</p></div></div><form class="local-history-note-form" data-permanence-comment-add="${attr(item.id)}"><label>Ajouter une note a l'historique<textarea name="comment" required placeholder="Compte rendu d'appel, decision, information recue..."></textarea></label><button class="primary-action" type="submit">Ajouter la note</button></form><div class="local-history-timeline">${events.map((entry) => `<article><i></i><div><header><strong>${text(entry.kind || "Activite")}</strong><time>${text((entry.createdAt || "").slice(0,16).replace("T"," "))}</time></header><p>${text(entry.body || "")}</p><small>${text(entry.authorName || "Equipe")}</small></div></article>`).join("") || empty("Aucun evenement dans l'historique.")}</div></section>`;
}

function renderPermanenceHistoryPanel(item) {
  const comments = item.comments || [];
  return `<section class="local-detail-tab">
    <form class="local-add-comment" data-permanence-comment-add="${attr(item.id)}"><textarea name="comment" required placeholder="Ajouter une note au dossier"></textarea><button class="secondary-action compact" type="submit">Ajouter la note</button></form>
    <div class="local-history-list">${comments.map((comment) => `<article><strong>${text(comment.authorName || "Equipe")}</strong><time>${text((comment.createdAt || "").slice(0, 16).replace("T", " "))}</time><p>${text(comment.body || "")}</p></article>`).join("") || empty("Aucune note.")}</div>
  </section>`;
}

function renderPermanenceUpcomingTasks(tasks) {
  return `<section class="local-upcoming-tasks">
    <header><h3>Taches a venir <span>(${tasks.length})</span></h3><button type="button" data-admin-section="permanence" aria-label="Voir les dossiers">${localIcon("x")}</button></header>
    <table><thead><tr><th>Tache</th><th>Dossier lie</th><th>Assigne a</th><th>Echeance</th><th>Priorite</th><th>Statut</th></tr></thead>
    <tbody>${tasks.slice(0, 6).map((task) => {
      const request = adminState.permanenceRequests.find((item) => item.id === task.linkedRequestId);
      return `<tr class="${task.assignedTo === currentUserId ? "is-mine" : ""} ${isTaskLate(task) ? "is-late" : ""}"><td><label><input type="checkbox" data-permanence-task-toggle="${attr(task.id)}" ${task.status === "termine" ? "checked" : ""} /> ${text(task.title)}</label></td><td><button type="button" data-open-permanence="${attr(request?.id || "")}">${text(request?.title || "-")}</button></td><td><em class="local-avatar">${text(userInitials(task.assignedTo))}</em> ${text(userNameById(task.assignedTo) || "Non assigne")}</td><td>${text(task.dueDate ? formatDate(task.dueDate) : "Sans echeance")}</td><td><mark class="local-priority priority-${attr(task.priority)}">${text(taskPriorityLabel(task.priority))}</mark></td><td><mark class="local-status status-${attr(slugify(task.status))}">${text(task.status)}</mark></td></tr>`;
    }).join("") || `<tr><td colspan="6">${empty("Aucune tache a venir.")}</td></tr>`}</tbody></table>
    <button class="local-table-link" type="button" data-admin-section="permanence">Voir tous les dossiers</button>
  </section>`;
}

function filteredPermanenceRequests() {
  const filters = adminFilters.permanence || {};
  const q = normalizeName(filters.q || "");
  return adminState.permanenceRequests.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (!filters.status && item.status === "archive") return false;
    if (filters.urgency && item.urgency !== filters.urgency) return false;
    if (filters.assignedTo && item.assignedTo !== filters.assignedTo) return false;
    if (!q) return true;
    const contact = contactById(item.contactId);
    return normalizeName([item.title, item.category, item.description, contact ? contactDisplayName(contact) : "", contact?.city || ""].join(" ")).includes(q);
  });
}

function permanenceTasks(requestId) {
  return adminState.teamTasks.filter((task) => task.linkedRequestId === requestId);
}

function permanenceUpcomingTasks() {
  const activeRequestIds = new Set(adminState.permanenceRequests.filter((item) => !["resolu", "archive"].includes(item.status)).map((item) => item.id));
  return adminState.teamTasks.filter((task) => activeRequestIds.has(task.linkedRequestId) && !["termine", "archive"].includes(task.status)).sort((a, b) => {
    const byDeadline = String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"));
    if (byDeadline) return byDeadline;
    const priorityRank = { urgente: 0, importante: 1, normale: 2 };
    return (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
  });
}

function permanenceStatusMeta(status) {
  return {
    nouveau: { label: "Nouveaux dossiers", shortLabel: "Nouveau", tone: "red", className: "status-new" },
    analyse: { label: "En attente d'analyse", shortLabel: "Analyse", tone: "amber", className: "status-analysis" },
    "en cours": { label: "En cours", shortLabel: "En cours", tone: "blue", className: "status-progress" },
    "attente reponse": { label: "En attente reponse", shortLabel: "En attente", tone: "purple", className: "status-waiting" },
    resolu: { label: "Resolus", shortLabel: "Resolu", tone: "green", className: "status-done" },
    archive: { label: "Archives", shortLabel: "Archive", tone: "slate", className: "status-archive" }
  }[status] || { label: status || "Statut", shortLabel: status || "-", tone: "slate", className: "status-archive" };
}

function permanenceUrgencyLabel(value) {
  return { normal: "Normale", prioritaire: "Haute", critique: "Urgente" }[value] || value || "Normale";
}

function taskPriorityLabel(value) {
  return { normale: "Normale", importante: "Moyenne", urgente: "Haute" }[value] || value || "Normale";
}

function userInitials(id = "") {
  const user = state.users.find((item) => item.id === id);
  if (!user) return "JD";
  return `${String(user.firstName || user.login || "J").slice(0, 1)}${String(user.lastName || "").slice(0, 1) || "D"}`.toUpperCase();
}

function localKpi(icon, value, label, detail, tone) {
  return `<article class="local-kpi tone-${attr(tone)}"><span>${localIcon(icon)}</span><div><strong>${text(value)}</strong><p>${text(label)}</p><small>${text(detail)}</small></div></article>`;
}

function localIcon(name) {
  const icons = {
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 5-6"/></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M15 9h-4.5a3 3 0 0 0 0 6H16"/><path d="m12 6-3 3 3 3"/></svg>',
    archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v4H4z"/><path d="M6 11v8h12v-8"/><path d="M10 15h4"/></svg>',
    filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14l-5 6v5l-4 2v-7z"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h10M9 12h10M9 17h10"/><path d="M5 7h.01M5 12h.01M5 17h.01"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    task: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"/><path d="m8 12 2 2 5-5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h4L19 9l-4-4L5 15z"/><path d="m13 7 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7l1-3h4l1 3"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6h.01M12 12h.01M12 18h.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>'
  };
  return icons[name] || icons.file;
}


function normalizeMailTemplates(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item && typeof item === "object" && item.id).map((item) => ({
    id: String(item.id), title: String(item.title || "").slice(0, 150),
    subject: String(item.subject || "").slice(0, 250),
    body: String(item.body || "").slice(0, 20000),
    createdAt: String(item.createdAt || ""), updatedAt: String(item.updatedAt || "")
  }));
}
function renderMailTemplates() {
  const items = normalizeMailTemplates(adminState.mailTemplates);
  const selected = items.find((item) => item.id === adminFilters.mailTemplateId) || null;
  return `<section class="mail-workspace">
    <header class="mail-workspace-header"><div><h2>Modèles de mails</h2><p>Rédigez des messages réutilisables pour vos contacts.</p></div>
    <button class="primary-action" type="button" data-mail-template-new>+ Nouveau modèle</button></header>
    <p class="mail-helper">Variables disponibles : <code>{{prenom}}</code>, <code>{{nom}}</code>, <code>{{commune}}</code>. Chaque destinataire reçoit un mail individuel.</p>
    <div class="mail-columns"><div class="mail-template-list">
      ${items.map((item) => `<button type="button" class="mail-template-row ${selected?.id === item.id ? "is-active" : ""}" data-mail-template-select="${attr(item.id)}"><strong>${text(item.title)}</strong><small>${text(item.subject)}</small></button>`).join("") || empty("Aucun modèle enregistré.")}
    </div>
    <form class="admin-form mail-editor" data-mail-template-save="${attr(selected?.id || "new")}">
      <h3>${selected ? "Modifier le modèle" : "Créer un modèle"}</h3>
      <label>Nom du modèle<input name="title" required maxlength="150" value="${attr(selected?.title || "")}" placeholder="Ex. Invitation réunion publique" /></label>
      <label>Objet de l'email<input name="subject" required maxlength="250" value="${attr(selected?.subject || "")}" /></label>
      <label>Contenu du mail<textarea name="body" required rows="13" maxlength="20000" placeholder="Bonjour {{prenom}}, ...">${text(selected?.body || "")}</textarea></label>
      <div class="mail-editor-actions"><button class="primary-action" type="submit">Enregistrer le modèle</button>
      ${selected ? `<button class="secondary-action danger" type="button" data-mail-template-delete="${attr(selected.id)}">Supprimer</button>` : ""}</div>
    </form></div>
  </section>`;
}
function saveMailTemplate(form) {
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  const subject = String(data.get("subject") || "").trim();
  const body = String(data.get("body") || "").trim();
  if (!title || !subject || !body) { showToast("Renseignez le nom, l'objet et le contenu."); return; }
  const previous = normalizeMailTemplates(adminState.mailTemplates);
  const existing = previous.find((entry) => entry.id === form.dataset.mailTemplateSave);
  const now = new Date().toISOString();
  const item = {
    id: existing?.id || crypto.randomUUID(), title: title.slice(0, 150), subject: subject.slice(0, 250),
    body: body.slice(0, 20000), createdAt: existing?.createdAt || now, updatedAt: now
  };
  adminState.mailTemplates = existing ? previous.map((entry) => entry.id === existing.id ? item : entry) : [item, ...previous];
  adminFilters.mailTemplateId = item.id;
  saveAdminState(existing ? "modification" : "creation", "modele email", item.title);
  showToast("Modèle enregistré.");
}
function deleteMailTemplate(id) {
  const item = (adminState.mailTemplates || []).find((entry) => entry.id === id);
  if (!item || !confirm(`Supprimer le modèle « ${item.title} » ?`)) return;
  adminState.mailTemplates = adminState.mailTemplates.filter((entry) => entry.id !== id);
  adminFilters.mailTemplateId = "";
  saveAdminState("suppression", "modele email", item.title);
}
async function mailCampaignRequest(action, payload = null) {
  return apiJson(`mail_campaigns.php?action=${encodeURIComponent(action)}`, payload);
}
async function loadMailCampaignOverview() {
  try {
    const [status, history] = await Promise.all([mailCampaignRequest("status"), mailCampaignRequest("history")]);
    mailCampaignUI.configured = Boolean(status.configured);
    mailCampaignUI.senderEmail = status.senderEmail || "";
    mailCampaignUI.senderName = status.senderName || "";
    mailCampaignUI.history = history.campaigns || [];
    mailCampaignUI.message = "";
  } catch (error) { mailCampaignUI.message = error.message; }
  if (activeAdminSection === "mail-campaigns") renderAdmin();
}
function mailCampaignSelection() {
  const form = document.querySelector("[data-mail-campaign-form]");
  if (!form) return null;
  const values = new FormData(form);
  return { searchId: String(values.get("searchId") || ""), templateId: String(values.get("templateId") || ""), consentConfirmed: values.get("consentConfirmed") === "1" };
}
function mailSearchUsesUnsupportedRules(item) {
  if(item.sourceIds?.length||item.isSnapshot||["manual","hybrid"].includes(item.listType))return true;
  const filters=item.filters||{};
  if(filters.fieldJoinMode==="OR"||filters.activityKind||normalizeContactExtraRules(filters.extraRules).length)return true;
  return Object.entries(filters).some(([key,val])=>key.startsWith("op_")&&!["contains",""].includes(val));
}
function renderMailCampaigns() {
  const templates = normalizeMailTemplates(adminState.mailTemplates);
  const searches = normalizeSavedContactSearches(adminState.savedContactSearches);
  const preview = mailCampaignUI.preview;
  return `<section class="mail-workspace">
    <header class="mail-workspace-header"><div><h2>Envoi de mails</h2><p>Envoyez un modèle aux contacts d'une recherche enregistrée.</p></div>
    <button class="secondary-action" type="button" data-mail-refresh>Rafraîchir</button></header>
    <div class="mail-sender-state ${mailCampaignUI.configured ? "is-ready" : "is-missing"}">
      <strong>Expéditeur : ${text(mailCampaignUI.senderEmail || "Non configuré")}</strong>
      <p>${mailCampaignUI.configured ? "Connexion au prestataire configurée côté serveur." : "Pour activer l'envoi, renseignez BREVO_API_KEY et CAMPAIGN_FROM_EMAIL dans api/db.php sur votre hébergement. L'adresse doit être vérifiée auprès de Brevo."}</p>
    </div>
    <form class="admin-form mail-campaign-form" data-mail-campaign-form>
      <label>Liste de contacts (recherche enregistrée)
        <select name="searchId" required><option value="">Choisir une liste…</option>
        ${searches.filter(item=>!mailSearchUsesUnsupportedRules(item)).map((item) => `<option value="${attr(item.id)}" ${mailCampaignUI.searchId === item.id ? "selected" : ""}>${text(item.name)}</option>`).join("")}</select>
      </label>
      <label>Modèle de mail
        <select name="templateId" required><option value="">Choisir un modèle…</option>
        ${templates.map((item) => `<option value="${attr(item.id)}" ${mailCampaignUI.templateId === item.id ? "selected" : ""}>${text(item.title)}</option>`).join("")}</select>
      </label>
      <div class="mail-campaign-actions">
        <button class="secondary-action" type="button" data-mail-preview ${mailCampaignUI.busy ? "disabled" : ""}>Prévisualiser les destinataires</button>
        <button class="secondary-action" type="button" data-admin-section="mail-templates">Gérer les modèles</button>
        <button class="secondary-action" type="button" data-admin-section="contacts">Gérer les recherches</button>
      </div>
      ${preview ? `<div class="mail-preview"><h3>${Number(preview.total || 0)} destinataire(s) éligible(s)</h3>
        <p>La sélection exclut les contacts sans consentement explicite, les adresses invalides, les doublons et les désinscrits.</p>
        <p>Aperçu : ${(preview.sample || []).map((item) => text(item.email)).join(" · ") || "Aucun destinataire éligible."}</p>
      </div>` : ""}
      <label class="mail-consent-check"><input type="checkbox" name="consentConfirmed" value="1" ${mailCampaignUI.consentConfirmed ? "checked" : ""} />
      Je confirme que ces personnes ont accepté de recevoir ces communications et que leur utilisation respecte les règles applicables.</label>
      <button class="primary-action" type="button" data-mail-send ${mailCampaignUI.busy || !mailCampaignUI.configured || !preview?.total ? "disabled" : ""}>Créer et envoyer la campagne</button>
      <p class="mail-helper">Maximum 250 destinataires par envoi. Statut de contact obligatoire : « oui », « inscrit », « opt-in » ou « consentement ». Désinscription automatique insérée dans chaque message. L'envoi peut être repris si la page se ferme.</p>
    </form>
    ${mailCampaignUI.message ? `<p class="mail-action-message" role="status">${text(mailCampaignUI.message)}</p>` : ""}
    <section class="mail-campaign-history"><h3>Historique des campagnes</h3>
      ${mailCampaignUI.history.map((item) => `<div class="mail-history-item"><div><strong>${text(item.title)}</strong><small>${text(formatDate(item.created_at))} · ${text(item.sender_email)} · ${Number(item.sent || 0)} envoyé(s), ${Number(item.failed || 0)} échec(s), ${Number(item.pending || 0)} en attente</small></div>
        ${Number(item.pending || 0) > 0 && item.status !== "cancelled" ? `<button class="secondary-action compact" type="button" data-mail-resume="${attr(item.id)}" ${mailCampaignUI.busy ? "disabled" : ""}>Reprendre l'envoi</button>` : ""}
      </div>`).join("") || empty("Aucune campagne.")}
    </section>
  </section>`;
}
async function previewMailCampaign() {
  const values = mailCampaignSelection();
  if (!values?.searchId || !values?.templateId) { showToast("Sélectionnez une liste et un modèle."); return; }
  mailCampaignUI.busy = true; mailCampaignUI.message = "Calcul des destinataires…"; renderAdmin();
  try {
    mailCampaignUI.preview = await mailCampaignRequest("preview", values);
    mailCampaignUI.searchId = values.searchId;
    mailCampaignUI.templateId = values.templateId;
    mailCampaignUI.consentConfirmed = values.consentConfirmed;
    mailCampaignUI.message = "Aperçu actualisé depuis la base.";
  } catch (error) { mailCampaignUI.preview = null; mailCampaignUI.message = error.message; }
  finally { mailCampaignUI.busy = false; renderAdmin(); }
}
async function dispatchMailCampaign(id) {
  mailCampaignUI.busy = true;
  try {
    for (let step = 0; step < 60; step += 1) {
      const response = await mailCampaignRequest("dispatch", { id });
      const item = response.campaign || {};
      mailCampaignUI.message = `Campagne : ${Number(item.sent || 0)} envoyé(s), ${Number(item.failed || 0)} échec(s), ${Number(item.pending || 0)} en attente.`;
      if (!Number(item.pending || 0)) break;
    }
    const history = await mailCampaignRequest("history");
    mailCampaignUI.history = history.campaigns || [];
  } catch (error) { mailCampaignUI.message = `Envoi interrompu : ${error.message}. Utilisez « Reprendre l'envoi » pour poursuivre.`; }
  finally { mailCampaignUI.busy = false; renderAdmin(); }
}
async function sendMailCampaign() {
  const values = mailCampaignSelection();
  if (!values?.searchId || !values?.templateId || !values.consentConfirmed) { showToast("Choisissez la liste, le modèle et confirmez le consentement."); return; }
  if (!mailCampaignUI.preview || mailCampaignUI.searchId !== values.searchId || mailCampaignUI.templateId !== values.templateId) { showToast("Actualisez l'aperçu avant l'envoi."); return; }
  if (!confirm(`Confirmer l'envoi individuel à ${mailCampaignUI.preview.total} destinataire(s) éligible(s) ?`)) return;
  mailCampaignUI.busy = true; mailCampaignUI.message = "Préparation de la campagne…"; renderAdmin();
  try {
    const result = await mailCampaignRequest("prepare", values);
    mailCampaignUI.preview = null;
    mailCampaignUI.activeId = result.campaign.id;
    await dispatchMailCampaign(result.campaign.id);
  } catch (error) { mailCampaignUI.message = error.message; mailCampaignUI.busy = false; renderAdmin(); }
}

function renderTemplates() {
  const filter = adminFilters.templates || {};
  const normalizedQuery = normalizeName(filter.q || "");
  const templates = adminState.deathEmailTemplates.filter((item) => !normalizedQuery || normalizeName([item.title, item.description, item.fileName, item.scope, deathTemplateVariableCount(item)].join(" ")).includes(normalizedQuery));
  const specialCount = adminState.deathEmailTemplates.filter((item) => item.scope === "special").length;
  return `<div class="word-template-manager">
    <section class="word-template-hero">
      <div><h2>Gestion des modeles Word</h2><p>Creez et gerez vos modeles de courriers personnalises et leurs variables.</p></div>
      <button class="primary-action word-template-add" type="button" data-word-template-create-toggle>${wordIcon("plus")} Ajouter un nouveau modele</button>
    </section>
    <section class="death-kpis">
      <article><span class="death-kpi-icon blue">${wordIcon("mail")}</span><strong>${adminState.deathEmailTemplates.filter((item) => (item.scope || "deces") === "deces").length}</strong><p>Modeles deces<br><small>Avec defunt et proche</small></p></article>
      <article><span class="death-kpi-icon green">${wordIcon("doc")}</span><strong>${specialCount}</strong><p>Modeles speciaux<br><small>Un seul destinataire</small></p></article>
    </section>
    <form class="word-template-toolbar" data-admin-filter="templates">
      <label class="word-search">${wordIcon("search")}<input name="q" value="${attr(filter.q || "")}" placeholder="Rechercher un modele..." /></label>
      <button class="secondary-action word-filter" type="submit">${wordIcon("filter")} Filtres</button>
    </form>
    ${adminFilters.wordTemplateCreateOpen ? renderWordTemplateForm() : ""}
    <section class="word-template-table-card">
      <h3>Liste des modeles</h3>
      <div class="word-template-table">
        <div class="word-template-table-head"><span>Nom du modele</span><span>Description</span><span>Variables</span><span>Derniere modification</span><span>Actions</span></div>
        ${templates.map(renderWordTemplateRow).join("") || `<div class="word-template-empty">${empty("Aucun modele Word.")}</div>`}
      </div>
    </section>
  </div>`;
}

function renderWordTemplateRow(template) {
  const editOpen = adminFilters.wordTemplateEdit === template.id;
  return `<article class="word-template-row-wrap">
    <div class="word-template-row">
      <div class="word-template-name"><span class="word-template-avatar tone-${attr(wordTemplateTone(template))}">${wordIcon(wordTemplateIconName(template))}</span><strong>${text(template.title)}</strong></div>
      <p>${text(template.description || wordTemplateDefaultDescription(template))}</p>
      <span class="word-variable-pill">${deathTemplateVariableCount(template)} variables</span>
      <p>${text(template.updatedAt ? formatDate(template.updatedAt.slice(0, 10)) : "-")}<br><small>par ${text(userNameById(currentUserId) || "Fondateur Site")}</small></p>
      <div class="word-template-actions"><button class="icon-action" type="button" data-word-template-edit="${attr(template.id)}" aria-label="Modifier">${wordIcon("edit")}</button><button class="icon-action" type="button" data-duplicate-death-template="${attr(template.id)}" aria-label="Dupliquer">${wordIcon("copy")}</button>${isAdmin() ? `<button class="icon-action danger" type="button" data-delete-death-template="${attr(template.id)}" aria-label="Supprimer">${wordIcon("trash")}</button>` : ""}</div>
    </div>
    ${editOpen ? renderWordTemplateForm(template) : ""}
  </article>`;
}

function renderWordTemplateForm(template = null) {
  const isUpdate = Boolean(template);
  const variables = template?.variables || [];
  return `<form class="word-template-form" data-death-template-${isUpdate ? `update="${attr(template.id)}"` : "create"} enctype="multipart/form-data">
    <div class="word-template-form-head"><div><h3>${isUpdate ? "Modifier le modele Word" : "Ajouter un modele Word"}</h3><p>Le fichier Word doit contenir des balises textuelles avec accolades simples, par exemple {nom_defunt} ou {destinataire_nom}.</p></div>${isUpdate ? `<button class="secondary-action compact" type="button" data-word-template-edit="">Fermer</button>` : ""}</div>
    <div class="word-template-form-grid">
      <label>Nom du modele<input name="title" value="${attr(template?.title || "")}" required /></label>
      <label>Description<input name="description" value="${attr(template?.description || "")}" placeholder="Ex. Courrier de condoleances classique" /></label>
      <label>Type de modele<select name="scope"><option value="deces" ${(template?.scope || "deces") === "deces" ? "selected" : ""}>Courrier deces</option><option value="special" ${template?.scope === "special" ? "selected" : ""}>Courrier special</option><option value="general" ${template?.scope === "general" ? "selected" : ""}>Courrier general</option></select></label>
      <label>${isUpdate ? "Remplacer le fichier Word" : "Fichier Word modele"}<input name="templateFile" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" ${isUpdate ? "" : "required"} /></label>
    </div>
    <div class="word-variable-editor">
      <div class="word-variable-editor-head"><strong>Variables du modele</strong><span>${normalizeDeathTemplateVariables(variables).length} configurees</span></div>
      <div class="death-variable-table">
        <div class="death-variable-head"><span>Balise</span><span>Valeur source</span><span>Texte si vide</span><span>Remplacements conditionnels</span></div>
        ${renderDeathVariableRows(variables)}
      </div>
      <button class="secondary-action compact word-variable-add" type="button" data-word-variable-add>Ajouter une balise</button>
    </div>
    <div class="word-template-form-actions"><button class="primary-action compact" type="submit">${isUpdate ? "Enregistrer le modele" : "Ajouter le modele"}</button>${isUpdate ? "" : `<button class="secondary-action compact" type="button" data-word-template-create-toggle>Annuler</button>`}</div>
  </form>`;
}

function deathTemplateVariableCount(template = {}) {
  return normalizeDeathTemplateVariables(template.variables).filter((variable) => variable.tag).length;
}

function wordTemplateDefaultDescription(template = {}) {
  if (template.scope === "special") return "Courrier personnalise pour un destinataire unique";
  if (template.scope === "general") return "Modele Word general";
  return "Courrier personnalise lie a un dossier de deces";
}

function wordTemplateTone(template = {}) {
  const index = Math.abs(slugify(template.id || template.title).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 5;
  return ["blue", "purple", "green", "orange", "pink"][index];
}

function wordTemplateIconName(template = {}) {
  if (normalizeName(template.title).includes("remerciement")) return "users";
  if (normalizeName(template.title).includes("information")) return "doc";
  if (normalizeName(template.title).includes("annonce")) return "send";
  if (normalizeName(template.title).includes("don")) return "heart";
  return "mail";
}

function wordIcon(name) {
  const icons = {
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16l-6 7v5l-4 2v-7z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13 7 4 4"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M8 10v9h8v-9"/><path d="M10 11v6M14 11v6"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14v10H5z"/><path d="m5 8 7 5 7-5"/></svg>`,
    users: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 19c1-4 11-4 12 0"/><path d="M14 18c1-2 5-2 7 0"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h8l3 3v13H7z"/><path d="M15 4v4h4"/><path d="M10 12h5M10 16h5"/></svg>`,
    send: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 5l-7 16-2-7z"/><path d="m11 14 4-4"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4-8-9c-.8-4 4-6 8-2 4-4 8-2 8 2-1 5-8 9-8 9z"/></svg>`
  };
  return icons[name] || icons.doc;
}

function renderTemplateRow(item) {
  return `<article class="admin-row template-row"><div><strong>${text(item.title)}</strong><p>${text(item.channel)} - ${text(item.category)} - ${text(item.subject || "")}</p></div><form data-template-update="${attr(item.id)}"><div class="form-grid"><label>Titre<input name="title" value="${attr(item.title)}" /></label><label>Canal<select name="channel">${options(templateChannels, item.channel)}</select></label><label>Categorie<select name="category">${options(templateCategories, item.category)}</select></label><label>Objet<input name="subject" value="${attr(item.subject)}" /></label></div><label>Corps<textarea name="body">${text(item.body)}</textarea></label><label>Checklist<textarea name="checklist">${text(item.checklist)}</textarea></label><div class="form-actions"><button class="secondary-action compact" type="submit">Modifier</button><button class="secondary-action compact" type="button" data-template-copy-preview="${attr(item.id)}">Copier genere</button><button class="secondary-action compact" type="button" data-template-download="${attr(item.id)}">Word</button>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-admin-item="templates" data-id="${attr(item.id)}">Supprimer</button>` : ""}</div></form></article>`;
}

function renderTemplatePreview(item) {
  const generated = generatedTemplate(item.id);
  return `<article class="generated-template-preview"><span>${text(item.channel)} - ${text(item.category)}</span><h4>${text(generated.subject)}</h4>${generated.body.split(/\n{2,}/).map((p) => `<p>${text(p).replace(/\n/g, "<br>")}</p>`).join("")}<h5>Checklist</h5><ul>${generated.checklist.split(/\r?\n/).filter(Boolean).map((line) => `<li>${text(line)}</li>`).join("") || "<li>Aucune checklist.</li>"}</ul></article>`;
}

function renderTemplateContextForm() {
  const context = adminFilters.templateContext || {};
  return `<form class="template-context-form">
    ${renderContactSearchPicker({ key: "template-context-contact", name: "contactId", selected: context.contactId, label: "Contact source", placeholder: "Nom, prenom ou commune" })}
    <label>Dossier source<select name="requestId" data-template-context><option value="">Aucun dossier</option>${adminState.permanenceRequests.map((request) => `<option value="${attr(request.id)}" ${context.requestId === request.id ? "selected" : ""}>${text(request.title)}</option>`).join("")}</select></label>
  </form>`;
}

function fillTemplate(value = "", data = templateContextData()) {
  return String(value).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => data[key] ?? "");
}

function templateContextData() {
  const context = adminFilters.templateContext || {};
  const request = adminState.permanenceRequests.find((item) => item.id === context.requestId) || {};
  const contact = contactById(context.contactId) || contactById(request.contactId) || adminState.localContacts[0] || {};
  return { prenom: contact.firstName || "Jean", nom: contact.lastName || "Durand", commune: contact.city || "Vesoul", sujet: request.title || request.category || "votre dossier", date: formatDate(new Date().toISOString().slice(0, 10)), responsable: userNameById(request.assignedTo || currentUserId) || "L'equipe", adresse: contactAddress(contact), telephone: contact.mobile || contact.phone || "", email: contact.email || "", priorite: request.urgency || "normale", statut: request.status || "en cours", prochaine_action: "nous revenons vers vous apres verification des elements" };
}

function generatedTemplate(id) {
  const item = adminState.templates.find((template) => template.id === id);
  if (!item) return { subject: "", body: "", checklist: "" };
  const data = templateContextData();
  return { subject: fillTemplate(item.subject || item.title, data), body: fillTemplate(item.body, data), checklist: fillTemplate(item.checklist || "", data) };
}

function contactFields() {
  const deleted = new Set(Array.isArray(adminState.deletedContactFields) ? adminState.deletedContactFields : []);
  return normalizeContactFields(adminState.contactFields || []).filter((field) => !deleted.has(field.id));
}

function contactFieldOptions(selected = "") {
  return `<option value="">Ignorer cette colonne</option>${contactFields().map((field) => `<option value="${attr(field.id)}" ${selected === field.id ? "selected" : ""}>${text(field.label)} (${text(field.type)})</option>`).join("")}`;
}

function contactFilterKey(field) {
  return `field_${field.id}`;
}


// Unified keyword index: administrative catalogue and historical contact tags.
function contactKeywordValues(contact = {}) {
  const primary = contact.keywords;
  const legacy = contact.tags;
  const unpack = raw => Array.isArray(raw) ? raw : String(raw || "").split(/[,;]/);
  const values = [...unpack(primary), ...unpack(legacy)];
  return values.map(value => typeof value === "object" && value !== null
    ? String(value.label || value.name || value.id || "").trim()
    : String(value ?? "").trim()).filter(Boolean);
}
function normalizedContactKeywordIds(values) {
  const items = Array.isArray(values) ? values : typeof values === "string" ? values.split(/[,;]/) : [];
  return [...new Set(items.map(value => slugify(value)).filter(value => value !== "item"))].slice(0,100);
}
function contactKeywordChoices() {
  const choices = new Map();
  const counts = new Map();
  normalizeKeywords(adminState.contactKeywords || []).forEach(word => {
    const id = slugify(word.id || word.label);
    if(id !== "item")choices.set(id,{id,label:word.label,color:word.color,legacy:false});
  });
  (adminState.localContacts || []).filter(contact=>contact.entityType!=="institution").forEach(contact=>{
    const seen=new Set();
    contactKeywordValues(contact).forEach(label=>{
      const id=slugify(label);
      if(id==="item")return;
      if(!choices.has(id))choices.set(id,{id,label,color:"#708199",legacy:true});
      if(!seen.has(id)){counts.set(id,(counts.get(id)||0)+1);seen.add(id);}
    });
  });
  return [...choices.values()].map(item=>({...item,count:counts.get(item.id)||0}))
    .sort((a,b)=>a.label.localeCompare(b.label,"fr",{sensitivity:"base"}));
}
function contactMatchesKeywords(contact, keywordIds = [], keywordMode = "OR") {
  const wanted = normalizedContactKeywordIds(keywordIds);
  if(!wanted.length)return true;
  const actual=new Set(contactKeywordValues(contact).map(value=>slugify(value)));
  return keywordMode==="AND"?wanted.every(id=>actual.has(id)):wanted.some(id=>actual.has(id));
}
function renderContactKeywordFilters(filters) {
  const selected=new Set(normalizedContactKeywordIds(filters.keywordIds));
  const options=contactKeywordChoices();
  return `<section class="contact-keyword-search contact-keyword-picker" aria-label="Filtrer par mots-clés">
    <div class="contact-keyword-top"><div><h3>Mots-clés <span class="contact-keyword-count">${selected.size?selected.size+" sélectionné(s)":""}</span></h3><p>Choisissez un ou plusieurs mots-clés pour affiner les résultats.</p></div><span class="contact-keyword-total">${options.length} disponibles</span></div>
    <div class="contact-keyword-searchbar">
      <label for="contact-keyword-query">Rechercher un mot-clé<input id="contact-keyword-query" type="search" data-contact-keyword-query placeholder="Chercher parmi les mots-clés…" autocomplete="off" /></label>
      <div class="contact-keyword-mode" role="group" aria-label="Combinaison des mots-clés">
        <label><input type="radio" name="keywordMode" value="OR" ${filters.keywordMode!=="AND"?"checked":""}/><span>OU</span></label>
        <label><input type="radio" name="keywordMode" value="AND" ${filters.keywordMode==="AND"?"checked":""}/><span>ET</span></label>
      </div>
    </div>
    <div class="contact-keyword-selected" data-contact-keyword-selected>${[...selected].map(id=>{
      const word=options.find(item=>item.id===id)||{id,label:id,color:"#708199"};
      return `<label class="contact-keyword-pill" style="--keyword-color:${attr(word.color)}"><input type="checkbox" name="keywordIds" value="${attr(word.id)}" checked /><span>${text(word.label)}</span><span aria-hidden="true">×</span></label>`;
    }).join("")||'<span class="contact-keyword-placeholder">Aucun mot-clé sélectionné</span>'}</div>
    <div class="contact-keyword-results" data-contact-keyword-results>
    ${options.filter(word=>!selected.has(word.id)).map((word,i)=>`<label class="contact-keyword-option" data-contact-keyword-option data-keyword-search="${attr(normalizeName(word.label))}" ${i>=8?"hidden":""}>
      <input type="checkbox" name="keywordIds" value="${attr(word.id)}" />
      <span class="contact-keyword-swatch" style="background:${attr(word.color)}"></span>
      <span class="contact-keyword-label">${text(word.label)}</span><small>${word.count}</small>
    </label>`).join("")}
    <p class="contact-keyword-no-match" data-contact-keyword-no-match hidden>Aucun résultat dans les mots-clés.</p></div>
    <div class="contact-keyword-footer">
      <button type="button" class="contact-keyword-expand" data-contact-keyword-expand ${options.length-selected.size<=8?"hidden":""}>Afficher tous les mots-clés ↓</button>
      <button type="button" class="contact-keyword-new-toggle" data-contact-keyword-create aria-label="Créer le mot-clé saisi">+ Créer le mot-clé recherché</button>
    </div>
  </section>`;
}
function renderContactTagEditor(contact={}) {
  const choices=contactKeywordChoices();
  const values=contactKeywordValues(contact);
  const selected=new Set(values.map(slugify));
  const chosen=values.filter((value,i)=>selected.has(slugify(value))&&values.findIndex(v=>slugify(v)===slugify(value))===i);
  return `<section class="contact-tag-editor" data-contact-tag-editor>
    <div class="contact-tag-header"><strong>Mots-clés du contact</strong><small>Ajoutez ou retirez des mots-clés en un clic.</small></div>
    <input type="hidden" name="keywords" data-contact-tag-value value="${attr(chosen.join(", "))}" />
    <div class="contact-tag-selected" data-contact-tag-selected>${chosen.map(label=>{
      const word=choices.find(w=>w.id===slugify(label));
      return `<button type="button" class="contact-tag-selected-pill" data-contact-tag-remove="${attr(slugify(label))}" style="--keyword-color:${attr(word?.color||"#708199")}" aria-label="Retirer ${attr(label)}">${text(word?.label||label)} <span aria-hidden="true">×</span></button>`;
    }).join("")||'<span class="contact-tag-empty">Aucun mot-clé associé</span>'}</div>
    <div class="contact-tag-search"><input type="search" data-contact-tag-query placeholder="Rechercher ou créer un mot-clé…" aria-label="Rechercher un mot-clé existant" autocomplete="off" /><button type="button" data-contact-tag-add-new class="secondary-action compact">+ Créer</button></div>
    <div class="contact-tag-suggestions" data-contact-tag-suggestions>
      ${choices.filter(word=>!selected.has(word.id)).map((word,i)=>`<button type="button" class="contact-tag-option" data-contact-tag-add="${attr(word.id)}" data-tag-search="${attr(normalizeName(word.label))}" ${i>=8?"hidden":""}><i style="background:${attr(word.color)}"></i>${text(word.label)}</button>`).join("")}
      <span class="contact-tag-no-match" data-contact-tag-no-match hidden>Aucun mot-clé trouvé. Utilisez « Créer ».</span>
    </div><button type="button" class="contact-tag-expand" data-contact-tag-expand ${choices.length-selected.size<=8?"hidden":""}>Voir tous les mots-clés ↓</button>
    <p class="contact-tag-help">Les changements sur cette fiche sont enregistrés avec le bouton « Enregistrer ».</p>
  </section>`;
}

function normalizeContactExtraRules(items) {
  const fields=new Set(["firstName","lastName","city"]);
  const ops=new Set(["contains","not_contains","equals","not_equals","starts_with","empty","not_empty"]);
  return (Array.isArray(items)?items:[]).slice(0,30).filter(r=>r&&fields.has(r.field)).map(r=>({field:r.field,op:ops.has(r.op)?r.op:"contains",value:String(r.value??"").trim().slice(0,180)})).filter(r=>r.value||["empty","not_empty"].includes(r.op));
}
function contactExtraRulesFromForm(form) {
  const data=new FormData(form),fields=data.getAll("extraRuleField"),ops=data.getAll("extraRuleOp"),values=data.getAll("extraRuleValue");
  return normalizeContactExtraRules(fields.map((field,i)=>({field,op:ops[i],value:values[i]})));
}
function renderContactExtraRule(rule) {
  const select=(name,choices,value)=>'<select name="'+name+'">'+choices.map(pair=>'<option value="'+pair[0]+'"'+(pair[0]===value?' selected':'')+'>'+pair[1]+'</option>').join("")+'</select>';
  return '<div class="contact-rule-field" data-contact-extra-rule><div class="contact-rule-controls">'+select("extraRuleField",[["firstName","Prénom"],["lastName","Nom"],["city","Commune"]],rule.field)+select("extraRuleOp",[["contains","Contient"],["not_contains","Ne contient pas"],["equals","Est égal à"],["not_equals","Est différent de"],["starts_with","Commence par"],["empty","Est vide"],["not_empty","Est renseigné"]],rule.op)+'<input name="extraRuleValue" aria-label="Valeur du critère" value="'+attr(rule.value||"")+'" placeholder="Valeur"><button type="button" class="contact-criterion-remove" data-contact-remove-extra-rule>×</button></div></div>';
}
function addContactExtraRule(form,id) {
  const list=form?.querySelector("[data-contact-criteria-list]");
  if(!list||list.querySelectorAll("[data-contact-extra-rule]").length>=30)return;
  list.insertAdjacentHTML("afterbegin",renderContactExtraRule({field:id,op:"contains",value:""}));
  list.querySelector("[data-contact-extra-rule] input")?.focus();
}
function contactRuleMatch(contact,field,raw,op) {
  const values=Array.isArray(contact[field.id])?contact[field.id]:[contact[field.id]];
  const strings=values.map(v=>normalizeName(v??""));
  const has=values.some(v=>v!==null&&v!==undefined&&String(v).trim()!=="");
  if(op==="empty")return !has;
  if(op==="not_empty")return has;
  const expected=normalizeName(raw??"");
  if(!expected)return true;
  if(op==="before"||op==="after"){
    const left=Date.parse(String(contact[field.id]||"").slice(0,10)),right=Date.parse(String(raw).slice(0,10));
    return Number.isFinite(left)&&Number.isFinite(right)&&(op==="before"?left<right:left>right);
  }
  if(op==="not_contains")return !strings.some(v=>v.includes(expected));
  if(op==="equals")return strings.some(v=>v===expected);
  if(op==="not_equals")return !strings.some(v=>v===expected);
  if(op==="starts_with")return strings.some(v=>v.startsWith(expected));
  return contactMatchesDynamicFilter(contact,field,raw);
}

function contactLinkedActivity(contact,kind) {
  const id=contact.id;
  if(kind==="campaign"||kind==="attendance"||kind==="absence")return (adminState.campaignEvents||[]).some(ev=>(ev.participants||[]).some(p=>p.contactId===id&&(kind==="campaign"||(kind==="attendance"?p.status==="attended":p.status==="absent"))));
  if(kind==="calendar")return (adminState.calendarEvents||[]).some(ev=>(ev.contactIds||[]).includes(id));
  if(kind==="task")return (adminState.teamTasks||[]).some(t=>t.linkedContactId===id);
  if(kind==="permanence")return (adminState.permanenceRequests||[]).some(p=>p.contactId===id);
  return true;
}

function renderContactOperator(field,filters) {
  const op=filters.ops?.[field.id]||"contains",choices=[["contains","Contient"],["not_contains","Ne contient pas"],["equals","Est égal à"],["not_equals","Est différent de"],["starts_with","Commence par"],["empty","Est vide"],["not_empty","Est renseigné"]];
  if(field.type==="date")choices.push(["before","Avant"],["after","Après"]);
  return '<select name="op_'+attr(field.id)+'" aria-label="Opérateur '+attr(field.label)+'">'+choices.map(([v,label])=>'<option value="'+attr(v)+'"'+(op===v?' selected':'')+'>'+text(label)+'</option>').join("")+'</select>';
}

function renderContactAdvancedFilters(filters) {
  const select=(name,key,choices,value)=>'<label>'+text(name)+'<select name="'+attr(key)+'">'+choices.map(([v,label])=>'<option value="'+attr(v)+'"'+(v===value?' selected':'')+'>'+text(label)+'</option>').join("")+'</select></label>';
  return '<fieldset class="contact-advanced-filters"><legend>Conditions avancées</legend><div class="contact-filter-grid">'+
  select("Combiner les champs","fieldJoinMode",[["AND","Tous (ET)"],["OR","Au moins un (OU)"]],filters.fieldJoinMode||"AND")+
  select("Activité liée","activityKind",[["","Toutes"],["campaign","Inscrit à un événement"],["attendance","Présent à un événement"],["absence","Absent à un événement"],["calendar","Lié au calendrier"],["task","Lié à une tâche"],["permanence","Lié à une permanence"]],filters.activityKind||"")+
  select("Trier","sortBy",[["","Par défaut"],["lastName","Nom"],["firstName","Prénom"],["city","Commune"],["createdAt","Date de création"],["updatedAt","Date de modification"]],filters.sortBy||"")+
  select("Ordre","sortOrder",[["asc","Croissant"],["desc","Décroissant"]],filters.sortOrder||"asc")+'</div></fieldset>';
}

function contactSearchFilters() {
  const filters = adminFilters.contacts || {};
  const perPage = [10, 25, 100, 1000].includes(Number(filters.perPage)) ? Number(filters.perPage) : 100;
  const page = Math.max(1, Number(filters.page || 1));
  const fields = {};
  contactFields().filter((field) => field.id !== "id").forEach((field) => {
    const value = String(filters[contactFilterKey(field)] || "").trim();
    if (value || ["empty","not_empty"].includes(filters["op_"+field.id])) fields[field.id] = value;
  });
  return {q:String(filters.q||""),page,perPage,fields,extraRules:normalizeContactExtraRules(filters.extraRules),ops:Object.fromEntries(contactFields().map(f=>[f.id,String(filters["op_"+f.id]||"contains")])),fieldJoinMode:filters.fieldJoinMode==="OR"?"OR":"AND",activityKind:String(filters.activityKind||""),sortBy:String(filters.sortBy||""),sortOrder:filters.sortOrder==="desc"?"desc":"asc",keywordIds:normalizedContactKeywordIds(filters.keywordIds),keywordMode:filters.keywordMode==="AND"?"AND":"OR"};
}


function normalizeSavedContactSearches(items) {
  if (!Array.isArray(items)) return [];
  const ids = new Set();
  return items.filter((item) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  }).map((item) => ({
    id: item.id,
    name: String(item.name || "Recherche sans nom").trim().slice(0, 120),
    filters: { ...Object.fromEntries(Object.entries(item.filters && typeof item.filters === "object" ? item.filters : {}).filter(([key, val]) => (["q","perPage","fieldJoinMode","activityKind","sortBy","sortOrder"].includes(key) || ((key.startsWith("field_")||key.startsWith("op_"))&&key.length<100)) && (typeof val === "string" || typeof val === "number")).map(([key, val]) => [key, String(val).slice(0, 500)])), keywordIds: normalizedContactKeywordIds(item.filters?.keywordIds), keywordMode: item.filters?.keywordMode === "AND" ? "AND" : "OR",extraRules:normalizeContactExtraRules(item.filters?.extraRules) },
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
    createdBy: String(item.createdBy || ""),
    sourceIds: Array.isArray(item.sourceIds) ? [...new Set(item.sourceIds.filter((id) => typeof id === "string" && id !== item.id))].slice(0, 100) : [],
    mergeMode: ["OR","AND","EXCEPT"].includes(item.mergeMode) ? item.mergeMode : "OR",
    isSnapshot: item.isSnapshot === true,
    snapshotIds: Array.isArray(item.snapshotIds) ? [...new Set(item.snapshotIds.filter(id=>typeof id==="string"))] : [],
    favorite: item.favorite === true,
    listType: ["manual","hybrid"].includes(item.listType) ? item.listType : "dynamic",
    baseId: typeof item.baseId === "string" ? item.baseId : "",
    includeIds: Array.isArray(item.includeIds) ? [...new Set(item.includeIds.filter(id=>typeof id==="string"))] : [],
    excludeIds: Array.isArray(item.excludeIds) ? [...new Set(item.excludeIds.filter(id=>typeof id==="string"))] : []
  }));
}

function savedContactSearchFilters(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const allowed = new Set(contactFields().map((field) => contactFilterKey(field)));
  const filters = {};
  for (const [key, value] of Object.entries(values)) {
    if ((allowed.has(key)&&(String(value).trim()||["empty","not_empty"].includes(values["op_"+key.slice(6)])))||(key.startsWith("op_")&&allowed.has("field_"+key.slice(3)))||["fieldJoinMode","activityKind","sortBy","sortOrder"].includes(key)) filters[key]=String(value).trim();
  }
  if (String(values.q || "").trim()) filters.q = String(values.q).trim();
  filters.perPage = String([10, 25, 100, 1000].includes(Number(values.perPage)) ? Number(values.perPage) : 100);
  filters.keywordIds = normalizedContactKeywordIds(new FormData(form).getAll("keywordIds"));
  filters.keywordMode = values.keywordMode === "AND" ? "AND" : "OR";
  filters.extraRules=contactExtraRulesFromForm(form);
  return filters;
}

function savedContactSearchLabel(item) {
  if (item.listType === "manual") return "Liste manuelle";
  if (item.listType === "hybrid") return "Liste hybride · base + ajouts − exclusions";
  if (item.isSnapshot) return "Liste figée (" + item.snapshotIds.length + " contacts)";
  if (item.sourceIds?.length) return (item.mergeMode==="AND"?"Intersection de ":item.mergeMode==="EXCEPT"?"Différence entre ":"Fusion de ")+item.sourceIds.length+" recherches";
  const filters = item.filters || {};
  const n = Object.keys(filters).filter((key) => key.startsWith("field_") || key === "q").length + normalizeContactExtraRules(filters.extraRules).length + (normalizedContactKeywordIds(filters.keywordIds).length ? 1 : 0);
  return n + " critère" + (n > 1 ? "s" : "");
}
function savedListDependencies(item) {
  if (!item) return [];
  if(item.listType==="hybrid")return item.baseId?[item.baseId]:[];
  return item.sourceIds||[];
}
// Centralized evaluation: used by lists, previews and exports.
function evaluateSavedList(item, searches=normalizeSavedContactSearches(adminState.savedContactSearches), memo=new Map(), visiting=new Set()) {
  if(!item)throw new Error("Une liste source n'existe plus.");
  if(memo.has(item.id))return memo.get(item.id);
  if(visiting.has(item.id))throw new Error("Dépendance circulaire entre les listes.");
  const next=new Set(visiting);next.add(item.id);
  const lookup=new Map(searches.map(entry=>[entry.id,entry]));
  const get=id=>evaluateSavedList(lookup.get(id),searches,memo,next);
  const resolve=ids=>ids.map(id=>contactById(id)).filter(c=>c&&c.entityType!=="institution");
  let result;
  if(item.listType==="manual")result=resolve(item.includeIds);
  else if(item.listType==="hybrid"){
    if(!item.baseId)throw new Error("Cette liste hybride n'a pas de source.");
    const excluded=new Set(item.excludeIds);
    result=[...new Map([...get(item.baseId),...resolve(item.includeIds)].filter(c=>!excluded.has(c.id)).map(c=>[c.id,c])).values()];
  }else if(item.isSnapshot)result=resolve(item.snapshotIds);
  else if(item.sourceIds?.length){
    const lists=item.sourceIds.map(get);
    if(item.mergeMode==="AND"){
      const rest=lists.slice(1).map(list=>new Set(list.map(c=>c.id)));
      result=(lists[0]||[]).filter(c=>rest.every(set=>set.has(c.id)));
    }else if(item.mergeMode==="EXCEPT"){
      const remove=new Set(lists.slice(1).flat().map(c=>c.id));
      result=(lists[0]||[]).filter(c=>!remove.has(c.id));
    }else result=[...new Map(lists.flat().map(c=>[c.id,c])).values()];
  }else{
    const filters=item.filters||{};
    result=filteredContacts({
      q:filters.q||"",
      fields:Object.fromEntries(Object.entries(filters).filter(([key])=>key.startsWith("field_")).map(([key,value])=>[key.slice(6),value])),
      keywordIds:filters.keywordIds,keywordMode:filters.keywordMode,extraRules:filters.extraRules,
      ops:Object.fromEntries(Object.entries(filters).filter(([key])=>key.startsWith("op_")).map(([key,value])=>[key.slice(3),value])),
      fieldJoinMode:filters.fieldJoinMode,activityKind:filters.activityKind,sortBy:filters.sortBy,sortOrder:filters.sortOrder
    });
  }
  memo.set(item.id,result);
  return result;
}
function savedSearchContacts(item, searches=normalizeSavedContactSearches(adminState.savedContactSearches)) {
  try{return evaluateSavedList(item,searches);}
  catch(error){console.warn("Liste de contacts invalide :",error);return [];}
}
function savedListHasDependents(id,searches) {
  return searches.filter(entry=>savedListDependencies(entry).includes(id));
}
function savedListWouldCycle(id, sources, searches) {
  const graph=new Map(searches.map(item=>[item.id,savedListDependencies(item)]));
  graph.set(id,sources);
  const visit=(node,stack=new Set())=>{
    if(stack.has(node))return true;
    const children=graph.get(node)||[];
    const next=new Set(stack);next.add(node);
    return children.some(child=>visit(child,next));
  };
  return visit(id);
}
function savedListPreview(item,searches) {
  try {return {contacts:evaluateSavedList(item,searches),error:""};}
  catch(error){return {contacts:[],error:error.message||"Liste invalide"};}
}

function savedSearchExportPreview(contacts) {
  // Deduplicate identities first, then households/addresses. Never modify the actual contact database.
  const uniquePeople = new Map();
  for (const contact of contacts) {
    const name = normalizeName([contact.firstName, contact.lastName || contact.usageName].join(" "));
    const birth = String(contact.birthDate || "").slice(0, 10);
    const email = normalizeName(contact.email || "");
    const phone = String(contact.mobile || contact.phone || "").replace(/[^0-9]/g, "");
    const identity = (name && birth ? "birth:" + name + ":" + birth :
      name && email ? "mail:" + name + ":" + email :
      name && phone ? "phone:" + name + ":" + phone : "id:" + contact.id);
    if (!uniquePeople.has(identity)) uniquePeople.set(identity, contact);
  }
  const groups = new Map();
  for (const contact of uniquePeople.values()) {
    const number = String(contact.streetNumber || "").trim();
    const street = String(contact.streetNameFull || contact.streetName || "").trim();
    const zip = String(contact.postalCode || "").trim();
    const city = String(contact.city || "").trim();
    // Incomplete address: do not incorrectly merge different households.
    const addressKey = street && (zip || city) ?
      [number, street, zip, city].map(normalizeName).join("|") : "unknown:" + contact.id;
    if (!groups.has(addressKey)) groups.set(addressKey, []);
    groups.get(addressKey).push(contact);
  }
  const rows = [...groups.values()].map((group) => {
    const first = group[0];
    const unique = (field) => [...new Set(group.map(field).map((v) => String(v || "").trim()).filter(Boolean))].join(" ; ");
    return [
      unique((c) => c.firstName), unique((c) => c.lastName || c.usageName),
      [first.streetNumber, first.streetNameFull || first.streetName].filter(Boolean).join(" ").trim(),
      first.postalCode || "", first.city || "",
      unique((c) => c.mobile || c.phone), unique((c) => c.email)
    ];
  });
  return {
    rows, uniquePeople: uniquePeople.size,
    personDuplicates: contacts.length - uniquePeople.size,
    addressDuplicates: uniquePeople.size - rows.length,
    totalAvoided: contacts.length - rows.length
  };
}

function exportSavedContactSearch(id) {
  const searches = normalizeSavedContactSearches(adminState.savedContactSearches);
  const item = searches.find((entry) => entry.id === id);
  if (!item) return;
  const validated=savedListPreview(item,searches);
  if(validated.error){showToast(validated.error);return;}
  const contacts=validated.contacts;
  const result = savedSearchExportPreview(contacts);
  const sourceOccurrences = (entry, visited = new Set()) => {
    if (visited.has(entry.id)) return [];
    const next = new Set(visited);
    next.add(entry.id);
    return entry.sourceIds?.length
      ? entry.sourceIds.flatMap((id) => {
          const source = searches.find((item) => item.id === id);
          return source ? sourceOccurrences(source, next) : [];
        })
      : savedSearchContacts(entry, searches);
  };
  const overlaps = item.sourceIds?.length && item.mergeMode === "OR" ? Math.max(0, sourceOccurrences(item).length - contacts.length) : 0;
  const rows = [["Prénom", "Nom", "Adresse", "Code postal", "Commune", "Téléphone", "Mail"], ...result.rows];
  downloadFile("recherche-" + slugify(item.name) + ".xlsx", participantWorkbookBytes(rows),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  showToast(result.rows.length + " adresses exportées · " + (result.totalAvoided + overlaps) + " doublon(s) évité(s), dont " + overlaps + " répétitions entre recherches.");
}

function freezeSavedContactSearch(id) {
  const list=normalizeSavedContactSearches(adminState.savedContactSearches);
  const src=list.find(item=>item.id===id);
  if(!src)return;
  const preview=savedListPreview(src,list);
  if(preview.error){showToast(preview.error);return;}
  const ids=preview.contacts.map(c=>c.id);
  const name=(src.name+" — figée").slice(0,120),now=new Date().toISOString();
  adminState.savedContactSearches=[{id:crypto.randomUUID(),name,isSnapshot:true,snapshotIds:ids,filters:{},createdAt:now,updatedAt:now,createdBy:currentUserId},...list];
  saveAdminState("creation","recherche contact enregistree",name);
  showToast(ids.length+" contacts figés dans une nouvelle liste.");
}
function favoriteSavedContactSearch(id) {
  const list=normalizeSavedContactSearches(adminState.savedContactSearches);
  adminState.savedContactSearches=list.map(item=>item.id===id?{...item,favorite:!item.favorite}:item);
  saveAdminState("modification","recherche contact enregistree","favori");
}
function exportSavedContactPeople(id) {
  const list=normalizeSavedContactSearches(adminState.savedContactSearches),item=list.find(e=>e.id===id);
  if(!item)return;
  const validated=savedListPreview(item,list);
  if(validated.error){showToast(validated.error);return;}
  const contacts=validated.contacts,headers=contactFields().map(f=>f.id);
  const rows=[headers,...contacts.map(c=>headers.map(key=>Array.isArray(c[key])?c[key].join(", "):c[key]??""))];
  downloadFile("personnes-"+slugify(item.name)+".xlsx",participantWorkbookBytes(rows),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  showToast(contacts.length+" personnes exportées, une ligne par fiche.");
}
function mergeSavedContactSearches() {
  const root=document.querySelector(".saved-search-combine");
  const searches=normalizeSavedContactSearches(adminState.savedContactSearches);
  const checked=[...root?.querySelectorAll("[data-saved-search-merge]:checked")||[]].map(input=>input.value);
  const ids=[...new Set(checked)].filter(id=>searches.some(item=>item.id===id));
  if(ids.length<2){showToast("Sélectionnez au moins deux listes.");return;}
  const mode=root?.querySelector("[data-saved-search-mode]")?.value||"OR";
  const primary=root?.querySelector("[data-saved-primary]")?.value||ids[0];
  if(mode==="EXCEPT"&&!ids.includes(primary)){showToast("Choisissez une liste principale parmi les listes sélectionnées.");return;}
  const sources=mode==="EXCEPT"?[primary,...ids.filter(id=>id!==primary)]:ids;
  savedListEditorId="";
  activeAdminSection="saved-contact-searches";
  renderAdmin();
  const form=document.querySelector("[data-saved-list-builder]");
  if(form){
    form.elements.listType.value="merge";
    form.elements.mergeMode.value=mode;
    form.elements.baseId.value=sources[0];
    form.querySelectorAll('[name="sourceIds"]').forEach(input=>{input.checked=sources.slice(1).includes(input.value);});
    refreshSavedListBuilder(form);
    form.scrollIntoView({block:"start",behavior:"smooth"});
  }
}
let savedListEditorId="";
function savedListBuilderOptions(searches, selectedId="") {
  return '<option value="">Choisir une liste…</option>'+searches.map(item=>'<option value="'+attr(item.id)+'"'+(item.id===selectedId?' selected':'')+'>'+text(item.name)+'</option>').join("");
}
function renderSavedListBuilder(searches) {
  const edit=searches.find(item=>item.id===savedListEditorId);
  const type=edit?.listType==="manual"?"manual":edit?.listType==="hybrid"?"hybrid":edit?.sourceIds?.length?"merge":"manual";
  const primary=edit?.listType==="hybrid"?edit.baseId:edit?.sourceIds?.[0]||"";
  const otherSources=edit?.sourceIds?.slice(1)||[];
  const available=searches.filter(item=>item.id!==edit?.id);
  const selected=(ids,kind)=>ids.map(id=>{
    const c=contactById(id);
    return c?'<span class="saved-list-member" data-list-member="'+attr(id)+'" data-list-kind="'+attr(kind)+'"><input type="hidden" name="'+attr(kind)+'Ids" value="'+attr(id)+'" /><span>'+text(contactDisplayName(c))+'</span><button type="button" data-list-remove-member aria-label="Retirer '+attr(contactDisplayName(c))+'">×</button></span>':"";
  }).join("");
  return `<section class="saved-list-builder-panel"><header><div><h3>${edit?"Modifier la liste":"Créer une liste spéciale"}</h3><p>Prévisualisez les membres avant d’enregistrer. Les contacts de la base ne sont jamais modifiés.</p></div>${edit?'<button type="button" class="secondary-action compact" data-list-cancel-edit>Annuler</button>':""}</header>
    <form data-saved-list-builder>
      <input type="hidden" name="editId" value="${attr(edit?.id||"")}" />
      <div class="saved-list-builder-grid">
        <label>Nom de la liste<input name="name" required maxlength="120" value="${attr(edit?.name||"")}" placeholder="Ex. Élus à inviter" /></label>
        <label>Type de liste<select name="listType">
          <option value="manual" ${type==="manual"?"selected":""}>Manuelle — membres choisis</option>
          <option value="hybrid" ${type==="hybrid"?"selected":""}>Hybride — base dynamique + exceptions</option>
          <option value="merge" ${type==="merge"?"selected":""}>Combinaison — OU / ET / SAUF</option>
        </select></label>
      </div>
      <div class="saved-list-base" data-list-base><label>Liste de départ<select name="baseId">${savedListBuilderOptions(available,primary)}</select></label></div>
      <div class="saved-list-merge" data-list-merge>
        <label>Opération<select name="mergeMode"><option value="OR" ${edit?.mergeMode!=="AND"&&edit?.mergeMode!=="EXCEPT"?"selected":""}>OU — réunir les contacts</option><option value="AND" ${edit?.mergeMode==="AND"?"selected":""}>ET — contacts en commun</option><option value="EXCEPT" ${edit?.mergeMode==="EXCEPT"?"selected":""}>SAUF — partir de la liste de départ et exclure les autres</option></select></label>
        <fieldset><legend>Autres listes</legend><div class="saved-list-source-options">${available.map(item=>'<label><input type="checkbox" name="sourceIds" value="'+attr(item.id)+'"'+(otherSources.includes(item.id)?' checked':'')+' /><span>'+text(item.name)+'</span></label>').join("")||"<small>Aucune autre liste disponible.</small>"}</div></fieldset>
      </div>
      <div class="saved-list-manual" data-list-manual>
        <div class="saved-list-exceptions" data-list-include><strong>Contacts ajoutés manuellement</strong><div class="saved-list-members" data-list-member-container="include">${selected(edit?.includeIds||[],"include")}</div><label>Rechercher un contact<input data-list-contact-query="include" type="search" autocomplete="off" placeholder="Nom, commune, téléphone…" /></label><div class="saved-list-contact-results" data-list-contact-results="include"></div></div>
        <div class="saved-list-exceptions" data-list-exclude><strong>Exclusions manuelles</strong><div class="saved-list-members" data-list-member-container="exclude">${selected(edit?.excludeIds||[],"exclude")}</div><label>Rechercher une personne à exclure<input data-list-contact-query="exclude" type="search" autocomplete="off" placeholder="Nom, commune…" /></label><div class="saved-list-contact-results" data-list-contact-results="exclude"></div></div>
      </div>
      <div class="saved-list-preview" data-list-preview role="status" aria-live="polite">Définissez vos critères pour prévisualiser la liste.</div>
      <div class="saved-list-builder-actions"><button type="button" class="secondary-action compact" data-list-refresh-preview>Actualiser l'aperçu</button><button class="primary-action compact" type="submit">${edit?"Enregistrer les modifications":"Créer la liste"}</button></div>
    </form>
  </section>`;
}
function savedListFromBuilder(form) {
  const d=new FormData(form);
  const type=String(d.get("listType")||"manual");
  const editId=String(d.get("editId")||"");
  const now=new Date().toISOString();
  const searches=normalizeSavedContactSearches(adminState.savedContactSearches);
  const old=searches.find(item=>item.id===editId);
  const mode=String(d.get("mergeMode")||"OR");
  const base=String(d.get("baseId")||"");
  const others=[...new Set(d.getAll("sourceIds").map(String))].filter(id=>id!==base);
  const item={
    id:old?.id||crypto.randomUUID(),name:String(d.get("name")||"").trim().slice(0,120),
    listType:type==="hybrid"?"hybrid":type==="merge"?"dynamic":"manual",
    filters:{},baseId:type==="hybrid"?base:"",sourceIds:type==="merge"?[base,...others].filter(Boolean):[],
    mergeMode:["OR","AND","EXCEPT"].includes(mode)?mode:"OR",
    includeIds:type==="manual"||type==="hybrid"?[...new Set(d.getAll("includeIds").map(String))]:[],
    excludeIds:type==="hybrid"?[...new Set(d.getAll("excludeIds").map(String))]:[],
    createdAt:old?.createdAt||now,updatedAt:now,createdBy:old?.createdBy||currentUserId,favorite:old?.favorite||false
  };
  const deps=savedListDependencies(item);
  if(!item.name)return {error:"Saisissez un nom.",item,searches};
  if(type==="merge"&&item.sourceIds.length<2)return {error:"Choisissez une liste de départ et au moins une autre liste.",item,searches};
  if(type==="hybrid"&&!base)return {error:"Choisissez une liste de départ.",item,searches};
  if(deps.some(id=>!searches.some(entry=>entry.id===id)))return {error:"Une liste source est introuvable.",item,searches};
  if(savedListWouldCycle(item.id,deps,searches))return {error:"Cette modification créerait une dépendance circulaire.",item,searches};
  const preview=savedListPreview(item,[...searches.filter(entry=>entry.id!==item.id),item]);
  return {...preview,item,searches};
}
function refreshSavedListBuilder(form) {
  if(!form)return;
  const type=form.elements.listType.value;
  form.querySelector("[data-list-base]").hidden=type==="manual";
  form.querySelector("[data-list-merge]").hidden=type!=="merge";
  form.querySelector("[data-list-manual]").hidden=type==="merge";
  form.querySelector("[data-list-exclude]").hidden=type!=="hybrid";
  const result=savedListFromBuilder(form);
  const el=form.querySelector("[data-list-preview]");
  if(el)el.textContent=result.error?"⚠ "+result.error:result.contacts.length+" contact(s) dans cette liste · "+result.contacts.slice(0,5).map(contactDisplayName).join(" · ")+(result.contacts.length>5?"…":"");
  return result;
}
function updateSavedListContactSuggestions(input) {
  const form=input.closest("[data-saved-list-builder]");
  const kind=input.dataset.listContactQuery;
  const q=normalizeName(input.value);
  const root=form?.querySelector('[data-list-contact-results="'+kind+'"]');
  if(!root)return;
  if(!q){root.innerHTML="";return;}
  const current=new Set([...form.querySelectorAll('[name="'+kind+'Ids"]')].map(el=>el.value));
  const matches=adminState.localContacts.filter(c=>c.entityType!=="institution"&&!current.has(c.id)&&contactSearchText(c).includes(q)).slice(0,12);
  root.innerHTML=matches.map(c=>'<button type="button" data-list-add-member="'+attr(c.id)+'" data-list-kind="'+kind+'">'+text(contactDisplayName(c))+' <small>'+text(c.city||"")+'</small></button>').join("")||"<small>Aucun contact trouvé.</small>";
}
function addSavedListMember(form,id,kind) {
  const contact=contactById(id);
  if(!contact||contact.entityType==="institution")return;
  const container=form.querySelector('[data-list-member-container="'+kind+'"]');
  if(!container||container.querySelector('[data-list-member="'+CSS.escape(id)+'"]'))return;
  const chip=document.createElement("span");chip.className="saved-list-member";chip.dataset.listMember=id;chip.dataset.listKind=kind;
  chip.innerHTML='<input type="hidden" name="'+kind+'Ids" value="'+attr(id)+'" /><span>'+text(contactDisplayName(contact))+'</span><button type="button" data-list-remove-member aria-label="Retirer '+attr(contactDisplayName(contact))+'">×</button>';
  container.append(chip);
  const input=form.querySelector('[data-list-contact-query="'+kind+'"]');
  if(input){input.value="";updateSavedListContactSuggestions(input);}
  refreshSavedListBuilder(form);
}
function saveSpecialContactList(form) {
  const result=savedListFromBuilder(form);
  if(result.error){showToast(result.error);return;}
  const existing=result.searches.find(x=>x.id===result.item.id);
  adminState.savedContactSearches=existing?result.searches.map(item=>item.id===existing.id?result.item:item):[result.item,...result.searches];
  savedListEditorId="";
  adminFilters.activeSavedContactSearchId=result.item.id;
  saveAdminState(existing?"modification":"creation","recherche contact enregistree",result.item.name);
  showToast("Liste enregistrée : "+result.contacts.length+" contact(s).");
}
function addContactToSavedList(contactId,listId) {
  const searches=normalizeSavedContactSearches(adminState.savedContactSearches),list=searches.find(item=>item.id===listId);
  const contact=contactById(contactId);
  if(!list||!contact||!["manual","hybrid"].includes(list.listType))return;
  if(list.includeIds?.includes(contactId)&&!list.excludeIds?.includes(contactId)){showToast("Ce contact figure déjà dans cette liste.");return;}
  const ids=new Set(list.includeIds||[]);ids.add(contactId);
  adminState.savedContactSearches=searches.map(item=>item.id===listId?{...item,includeIds:[...ids],excludeIds:(item.excludeIds||[]).filter(id=>id!==contactId),updatedAt:new Date().toISOString()}:item);
  saveAdminState("modification","recherche contact enregistree","Ajout de "+contactDisplayName(contact)+" à "+list.name);
  showToast("Contact ajouté à « "+list.name+" ».");
}

function renderSavedContactSearches({ standalone = false } = {}) {
  const allSearches = normalizeSavedContactSearches(adminState.savedContactSearches).sort((a,b)=>Number(b.favorite)-Number(a.favorite));
  const searches = standalone ? allSearches : allSearches.slice(0,8);
  const current = adminFilters.activeSavedContactSearchId || "";
  return `<section class="saved-contact-searches" aria-label="Recherche sauvegardée">
    <div class="saved-contact-searches-heading">
      <div><h3>Mes listes de contacts</h3><p>${standalone?"Recherches dynamiques, listes manuelles et hybrides.":"Retrouvez vos favoris et listes récentes."}</p></div>
      ${standalone ? `<button class="secondary-action compact" type="button" data-admin-section="contacts">Créer une recherche dynamique</button>` : `<button class="primary-action compact" type="button" data-contact-save-search>Enregistrer cette recherche</button>`}
    </div>
    ${standalone&&searches.length?`<label class="saved-list-filter-label">Retrouver une liste<input type="search" data-saved-list-filter placeholder="Rechercher par nom ou type…" autocomplete="off" /></label>`:""}
    ${searches.length ? `<div class="saved-contact-searches-list">${searches.map((item) => {
      return `<div class="saved-contact-search-item ${current === item.id ? "is-active" : ""}" data-list-search-row data-list-search-text="${attr(normalizeName(item.name+" "+savedContactSearchLabel(item)))}">
         <button type="button" class="saved-contact-search-load" data-contact-load-search="${attr(item.id)}" title="Afficher la recherche">
           <strong>${text(item.name)}</strong><small>${text(savedContactSearchLabel(item))}${savedListHasDependents(item.id,allSearches).length?` · utilisée par ${savedListHasDependents(item.id,allSearches).length} liste(s)`:""}</small><small data-saved-contact-stats="${attr(item.id)}">Calcul des résultats…</small>
         </button>
         <button type="button" class="saved-search-favorite" data-contact-favorite-search="${attr(item.id)}" title="${item.favorite?"Retirer des favoris":"Ajouter aux favoris"}" aria-label="${item.favorite?"Retirer des favoris":"Ajouter aux favoris"}">${item.favorite?"★":"☆"}</button>
         <details class="saved-search-more"><summary aria-label="Actions sur ${attr(item.name)}" title="Plus d’actions">⋯</summary>
           <div class="saved-search-actions" role="group" aria-label="Actions sur ${attr(item.name)}">
             <button type="button" data-contact-export-search="${attr(item.id)}">Exporter par adresse</button>
             <button type="button" data-contact-export-people="${attr(item.id)}">Exporter par personne</button>
             <button type="button" data-contact-freeze-search="${attr(item.id)}">Figer la liste</button>
             <button type="button" data-list-rename="${attr(item.id)}">Renommer</button>
             <button type="button" data-list-duplicate="${attr(item.id)}">Dupliquer</button>
             ${item.isSnapshot||item.listType==="dynamic"&&!item.sourceIds?.length?'':`<button type="button" data-list-edit="${attr(item.id)}">Modifier la liste</button>`}
             ${!item.sourceIds?.length&&!item.isSnapshot&&item.listType==="dynamic"?`<button type="button" data-contact-update-search="${attr(item.id)}">Actualiser les critères</button>`:""}
             <button type="button" class="danger" data-contact-delete-search="${attr(item.id)}">Supprimer la recherche</button>
           </div>
         </details>
       </div>`;
    }).join("")}</div>${!standalone && allSearches.length>8?`<button type="button" class="secondary-action compact" data-admin-section="saved-contact-searches">Voir les ${allSearches.length} listes</button>`:""}` : '<p class="saved-contact-search-empty">Aucune recherche enregistrée.</p>'}
  </section>`;
}

// Statistics are progressively hydrated after the list is visible.
// This deliberately avoids touching persistent state, filtering logic or app initialization.
function hydrateSavedContactStats(root) {
  if (!root) return;
  const elements = [...root.querySelectorAll("[data-saved-contact-stats]")];
  if (!elements.length) return;
  const memo=new Map();
  const searches = normalizeSavedContactSearches(adminState.savedContactSearches);
  const lookup = new Map(searches.map((item) => [item.id, item]));
  let index = 0;
  const processNext = () => {
    if (!root.isConnected) return;
    while (index < elements.length) {
      const node = elements[index++];
      if (!node.isConnected) continue;
      const item = lookup.get(node.dataset.savedContactStats);
      if (!item) continue;
      try {
        const contacts = evaluateSavedList(item, searches, memo);
        const summary = savedSearchExportPreview(contacts);
        const sources = item.sourceIds?.map((id) => lookup.get(id)).filter(Boolean) || [];
        const overlapCount = Math.max(0, sources.reduce((count, source) => count + evaluateSavedList(source, searches, memo).length, 0) - contacts.length);
        node.textContent = savedContactSearchLabel(item) + " · " + contacts.length +
          " contacts · " + summary.rows.length + " adresses · " + (summary.totalAvoided + overlapCount) +
          " doublon(s) évité(s) (" + overlapCount + " entre recherches, " +
          summary.personDuplicates + " personnes, " + summary.addressDuplicates + " adresses)";
      } catch (error) {
        console.error("Statistiques de recherche sauvegardée :", error);
        node.textContent = "⚠ "+(error.message||"Liste invalide")+" — vérifiez ses sources.";
      }
      break;
    }
    if (index < elements.length) setTimeout(processNext, 24);
  };
  setTimeout(processNext, 0);
}

function renderSavedContactSearchesPage() {
  const searches=normalizeSavedContactSearches(adminState.savedContactSearches);
  return `<div class="contacts-admin contact-search-page saved-list-workspace">
    <header class="contact-search-head"><div><h2>Mes listes de contacts</h2><p>Créez des listes manuelles, hybrides ou des combinaisons de recherches existantes.</p></div></header>
    ${renderSavedListBuilder(searches)}
    ${renderSavedContactSearches({standalone:true})}
  </div>`;
}

function saveContactSearch(form, existingId = "") {
  const current = normalizeSavedContactSearches(adminState.savedContactSearches);
  const existing = current.find((item) => item.id === existingId);
  if (existingId && !existing) return;
  const proposedName = existing ? existing.name : "";
  const name = existing ? existing.name : prompt("Nom de cette recherche :", proposedName);
  if (name === null) return;
  const cleanName = String(name).trim().slice(0, 120);
  if (!cleanName) { showToast("Saisissez un nom pour cette recherche."); return; }
  const now = new Date().toISOString();
  const item = {
    id: existing?.id || crypto.randomUUID(),
    name: cleanName,
    filters: savedContactSearchFilters(form),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    createdBy: existing?.createdBy || currentUserId,
    favorite: existing?.favorite || false
  };
  adminState.savedContactSearches = existing ? current.map((entry) => entry.id === existing.id ? item : entry) : [item, ...current];
  adminFilters.activeSavedContactSearchId = item.id;
  saveAdminState(existing ? "modification" : "creation", "recherche contact enregistree", item.name);
  showToast(existing ? "Critères enregistrés mis à jour." : "Recherche enregistrée.");
}

function loadContactSearch(id) {
  contactMobileDetailOpen=false;
  const item = normalizeSavedContactSearches(adminState.savedContactSearches).find((entry) => entry.id === id);
  if (!item) return;
  // Une recherche enregistrée reste dynamique : la sélection précédente ne doit pas contaminer la nouvelle liste.
  clearContactSelection();
  adminFilters.contacts = (item.sourceIds?.length||item.isSnapshot||["manual","hybrid"].includes(item.listType)) ? { perPage: 100, page: 1 } : { ...item.filters, page: 1 };
  adminFilters.activeSavedContactSearchId = item.id;
  activeAdminSection = "contacts";
  renderAdmin();
}

function deleteContactSearch(id) {
  const item = normalizeSavedContactSearches(adminState.savedContactSearches).find((entry) => entry.id === id);
  if (!item || !confirm(`Supprimer la recherche « ${item.name} » ? Les contacts ne seront pas supprimés.`)) return;
  // Prevent deletion of a source used by any composite or hybrid list.
  const dependents = savedListHasDependents(id,normalizeSavedContactSearches(adminState.savedContactSearches));
  if (dependents.length) { showToast("Cette recherche est utilisée par une fusion : supprimez d’abord la fusion."); return; }
  adminState.savedContactSearches = adminState.savedContactSearches.filter((entry) => entry.id !== id);
  if (adminFilters.activeSavedContactSearchId === id) adminFilters.activeSavedContactSearchId = "";
  saveAdminState("suppression", "recherche contact enregistree", item.name);
}

function contactFiltersSignature(filters = contactSearchFilters()) {
  return JSON.stringify({ activeSearch: adminFilters.activeSavedContactSearchId || "", q: filters.q || "", fields: filters.fields || {}, extraRules:normalizeContactExtraRules(filters.extraRules), ops:filters.ops||{}, activityKind:filters.activityKind||"",fieldJoinMode:filters.fieldJoinMode||"AND", keywordIds: normalizedContactKeywordIds(filters.keywordIds).sort(), keywordMode: filters.keywordMode === "AND" ? "AND" : "OR" });
}

function contactAge(contact = {}) {
  const birthDate = String(contact.birthDate || "").trim();
  if (!birthDate) return null;
  const date = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const birthdayPassed = today.getMonth() > date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

function contactMatchesDynamicFilter(contact = {}, field, rawValue = "") {
  const value = String(rawValue || "").trim();
  if (!value) return true;
  if (field.id === "birthDate" && /^\d+\s*-\s*\d+$/.test(value)) {
    const [min, max] = value.split("-").map((part) => Number(part.trim()));
    const age = contactAge(contact);
    return age !== null && age >= Math.min(min, max) && age <= Math.max(min, max);
  }
  if (field.id === "birthDate" && /^\d+$/.test(value)) return contactAge(contact) === Number(value);
  if (field.type === "boolean") return value === "all" || Boolean(contact[field.id]) === (value === "true");
  if (Array.isArray(contact[field.id])) return contact[field.id].some((item) => normalizeName(item).includes(normalizeName(value)));
  return normalizeName(contact[field.id] ?? "").includes(normalizeName(value));
}

function contactMatchesFilters(contact, filters, fieldsById) {
  const query=filters.q?normalizeName(filters.q):"";
  if(query&&!contactSearchText(contact).includes(query))return false;
  if(!contactMatchesKeywords(contact,filters.keywordIds,filters.keywordMode))return false;
  if(filters.activityKind&&!contactLinkedActivity(contact,filters.activityKind))return false;
  const tests=Object.entries(filters.fields||{}).map(([id,val])=>{const field=fieldsById.get(id);return !field||contactRuleMatch(contact,field,val,filters.ops?.[id]||"contains");});
  normalizeContactExtraRules(filters.extraRules).forEach(rule=>{const field=fieldsById.get(rule.field);if(field)tests.push(contactRuleMatch(contact,field,rule.value,rule.op));});
  return filters.fieldJoinMode==="OR"?(!tests.length||tests.some(Boolean)):tests.every(Boolean);
}

function filteredContacts(filters = contactSearchFilters()) {
  if (arguments.length === 0 && adminFilters.activeSavedContactSearchId) {
    const searches = normalizeSavedContactSearches(adminState.savedContactSearches);
    const active = searches.find((item) => item.id === adminFilters.activeSavedContactSearchId);
    if (active?.sourceIds?.length||active?.isSnapshot||["manual","hybrid"].includes(active?.listType)) return savedSearchContacts(active, searches);
  }
  const fieldsById = new Map(contactFields().map((field) => [field.id, field]));
  const results=adminState.localContacts.filter(c=>c.entityType!=="institution"&&contactMatchesFilters(c,filters,fieldsById));
  if(filters.sortBy){const key=filters.sortBy,d=filters.sortOrder==="desc"?-1:1;results.sort((a,b)=>d*String(a[key]||"").localeCompare(String(b[key]||""),"fr",{sensitivity:"base",numeric:true}));}
  return results;
}

function isAllFilteredContactSelectionActive(filters = contactSearchFilters()) {
  return selectedAllFilteredContacts && selectedAllFilteredContactsSignature === contactFiltersSignature(filters);
}

function isContactSelected(contact, filters = contactSearchFilters()) {
  return isAllFilteredContactSelectionActive(filters) || selectedContactIds.has(contact.id);
}

function clearContactSelection() {
  selectedContactIds = new Set();
  selectedAllFilteredContacts = false;
  selectedAllFilteredContactsSignature = "";
}

function renderContactDynamicFilter(field, value = "") {
  const name = attr(contactFilterKey(field));
  const label = text(field.label);
  if (field.type === "boolean") return `<label>${label}<select name="${name}"><option value="">Tous</option><option value="true" ${value === "true" ? "selected" : ""}>Oui</option><option value="false" ${value === "false" ? "selected" : ""}>Non</option></select></label>`;
  if (field.type === "list") return `<label>${label}<select name="${name}"><option value="">Tous</option>${(field.options || []).map((option) => `<option value="${attr(option)}" ${value === option ? "selected" : ""}>${text(option)}</option>`).join("")}</select></label>`;
  const placeholder = field.id === "birthDate" ? "Age ex: 5 ou 20-30" : field.type === "multilist" ? "Mot-cle ou option" : field.type === "date" ? "Date ou texte" : field.label;
  return `<label>${label}<input name="${name}" value="${attr(value)}" placeholder="${attr(placeholder)}" /></label>`;
}


function contactFilterChips(filters) {
  const chips=[];
  if(filters.q?.trim()) chips.push({key:"q",label:"Texte : "+filters.q.trim()});
  const labels=new Map(contactFields().map(field=>[field.id,field.label]));
  const operatorLabels={contains:"contient",not_contains:"ne contient pas",equals:"égal à",not_equals:"différent de",starts_with:"commence par",empty:"est vide",not_empty:"est renseigné",before:"avant",after:"après"};
  Object.entries(filters.fields||{}).forEach(([id,value])=>{
    const op=filters.ops?.[id]||"contains";
    chips.push({key:"field_"+id,label:(labels.get(id)||id)+" "+(operatorLabels[op]||"contient")+(["empty","not_empty"].includes(op)?"":" «"+value+"»")});
  });
  normalizeContactExtraRules(filters.extraRules).forEach((rule,i)=>chips.push({key:"extraRule_"+i,label:(labels.get(rule.field)||rule.field)+" : "+rule.value}));
  if(filters.keywordIds?.length) chips.push({key:"keywordIds",label:filters.keywordIds.length+" mot(s)-clé(s) ("+filters.keywordMode+")"});
  if(filters.activityKind)chips.push({key:"activityKind",label:"Activité : "+filters.activityKind});
  if(filters.fieldJoinMode==="OR")chips.push({key:"fieldJoinMode",label:"Champs : OU"});
  if(filters.sortBy)chips.push({key:"sortBy",label:"Tri : "+filters.sortBy});
  return chips;
}
function renderContactFilterChips(filters) {
  const chips=contactFilterChips(filters);
  if(!chips.length)return '<p class="contact-filter-empty">Aucun filtre actif. Tous les contacts sont affichés.</p>';
  return '<div class="contact-active-filters" aria-label="Critères actifs"><span class="contact-chip-heading">Filtres appliqués</span>'+chips.map(chip=>
    '<button type="button" class="contact-filter-chip" data-contact-remove-filter="'+attr(chip.key)+'" title="Retirer ce filtre">'+text(chip.label)+' <span aria-hidden="true">×</span></button>'
  ).join("")+'<button type="button" class="contact-filter-clear" data-contact-reset-filters>Tout effacer</button></div>';
}

function renderContactDynamicFilters(filters) {
  const primaryFields=new Set(["firstName","lastName","city"]);
  const fields=contactFields().filter(field=>field.id!=="id"&&field.id!=="keywords"&&!primaryFields.has(field.id));
  const primaryChoices=contactFields().filter(field=>primaryFields.has(field.id));
  const activeFields=new Set(Object.keys(filters.fields||{}));
  const count=contactFilterChips(filters).length;
  const hasAdvanced=(normalizeContactExtraRules(filters.extraRules).length>0||filters.keywordIds.length>0||filters.activityKind||filters.fieldJoinMode==="OR"||["firstName","lastName","city"].some(id=>filters.ops?.[id]&&filters.ops[id]!=="contains")||[...activeFields].some(id=>!primaryFields.has(id)));
  return `<details class="contact-filter-section contact-dynamic-search" ${hasAdvanced?'open':''}>
    <summary><strong>Recherche avancée</strong><small>${hasAdvanced?count+" paramètre(s) actif(s)":"Ajouter des critères si nécessaire"}</small></summary>
    <div class="contact-advanced-workspace">
      <p class="contact-guidance">Choisissez uniquement les critères utiles. Les champs non ajoutés ne gênent pas votre recherche.</p>
      <div class="contact-primary-operators"><span>Type de correspondance pour les champs rapides</span>${["firstName","lastName","city"].map(id=>`<label>${text(id==="firstName"?"Prénom":id==="lastName"?"Nom":"Commune")}${renderContactOperator({id,label:id,type:"text"},filters)}</label>`).join("")}</div>
      ${renderContactAdvancedFilters(filters)}
      <div class="contact-criteria-heading"><strong>Critères supplémentaires</strong><label class="contact-add-field">Ajouter un critère <select data-contact-add-field aria-label="Choisir un critère à ajouter"><option value="">Choisir un champ…</option>${[...primaryChoices,...fields].map(field=>`<option value="${attr(field.id)}">${text(field.label)}</option>`).join("")}</select></label><button class="secondary-action compact" type="button" data-contact-add-field-apply>Ajouter</button></div>
      <div class="contact-filter-grid contact-criteria-list" data-contact-criteria-list>${normalizeContactExtraRules(filters.extraRules).map(renderContactExtraRule).join("")}${fields.map(field=>`<div class="contact-rule-field" data-contact-field-row="${attr(field.id)}" ${activeFields.has(field.id)?"":"hidden"}><div class="contact-rule-controls">${renderContactOperator(field,filters)}${renderContactDynamicFilter(field,filters.fields[field.id]||"")}<button type="button" class="contact-criterion-remove" data-contact-hide-field="${attr(field.id)}" aria-label="Retirer ${attr(field.label)}" title="Retirer ce critère">×</button></div></div>`).join("")}</div>
      <div class="contact-filter-actions"><button class="primary-action compact" type="submit">Appliquer les critères</button><button class="secondary-action compact" type="button" data-contact-reset-filters>Réinitialiser</button></div>
    </div>
  </details>`;
}

function renderContactPagination(filters, total) {
  const pageCount = Math.max(1, Math.ceil(total / filters.perPage));
  const page = Math.min(filters.page, pageCount);
  const start = total ? (page - 1) * filters.perPage + 1 : 0;
  const end = Math.min(total, page * filters.perPage);
  return `<div class="contact-pagination-controls">
    <input type="hidden" name="page" value="${attr(page)}" />
    <label>Par page<select name="perPage">${[10, 25, 100, 1000].map((value) => `<option value="${value}" ${filters.perPage === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    <span>${start}-${end} sur ${total}</span>
    <button class="secondary-action compact" type="submit" name="page" value="${Math.max(1, page - 1)}" ${page <= 1 ? "disabled" : ""}>Precedent</button>
    <button class="secondary-action compact" type="submit" name="page" value="${Math.min(pageCount, page + 1)}" ${page >= pageCount ? "disabled" : ""}>Suivant</button>
  </div>`;
}

function renderContactInput(field, contact = {}) {
  const value = contact[field.id];
  const name = attr(field.id);
  const required = field.required ? "required" : "";
  const fieldValue = Array.isArray(value) ? value.join(", ") : value;
  if (field.id === "keywords") return renderContactTagEditor(contact);
  if (field.type === "textarea") return `<label>${text(field.label)}<textarea name="${name}" ${required}>${text(value || "")}</textarea></label>`;
  if (field.type === "date") return `<label>${text(field.label)}<input name="${name}" type="date" value="${attr(value || "")}" ${required} /></label>`;
  if (field.type === "number") return `<label>${text(field.label)}<input name="${name}" type="number" value="${attr(value || "")}" ${required} /></label>`;
  if (field.type === "boolean") return `<label class="check-line"><input name="${name}" type="checkbox" value="1" ${value ? "checked" : ""} /> ${text(field.label)}</label>`;
  if (field.type === "list") return `<label>${text(field.label)}<select name="${name}" ${required}><option value="">Non renseigne</option>${(field.options || []).map((option) => `<option value="${attr(option)}" ${String(value || "") === option ? "selected" : ""}>${text(option)}</option>`).join("")}</select></label>`;
  if (field.type === "multilist") {
    const selected = new Set(Array.isArray(value) ? value : String(value || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean));
    return `<fieldset class="contact-fieldset"><legend>${text(field.label)}</legend>${(field.options || []).map((option) => `<label><input type="checkbox" name="${name}" value="${attr(option)}" ${selected.has(option) ? "checked" : ""} />${text(option)}</label>`).join("") || `<small>Aucune option.</small>`}</fieldset>`;
  }
  return `<label>${text(field.label)}<input name="${name}" value="${attr(fieldValue || "")}" ${required} /></label>`;
}

function toLocalDateTimeValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeCalendarDateTime(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return raw.slice(0, 16);
  return toLocalDateTimeValue(raw || new Date());
}

function calendarDate(value) {
  const raw = value instanceof Date ? new Date(value.getTime()) : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(raw.getTime()) ? new Date() : raw;
}

function calendarDateKey(value) {
  const date = calendarDate(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function calendarAddDays(value, days) {
  const date = calendarDate(value);
  date.setDate(date.getDate() + days);
  return date;
}

function calendarStartOfWeek(value) {
  const date = calendarDate(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

function calendarVisibleDays() {
  if (calendarView === "day") return [calendarDate(calendarCursor)];
  if (calendarView === "month") {
    const first = calendarDate(calendarCursor);
    first.setDate(1);
    const start = calendarStartOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => calendarAddDays(start, index));
  }
  const start = calendarStartOfWeek(calendarCursor);
  return Array.from({ length: 7 }, (_, index) => calendarAddDays(start, index));
}

function calendarRangeLabel(days = calendarVisibleDays()) {
  if (calendarView === "month") return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(calendarDate(calendarCursor));
  const format = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  if (days.length === 1) return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(days[0]);
  return `${format.format(days[0])} – ${format.format(days[days.length - 1])}`;
}

function calendarEventCreator(item = {}) {
  return userNameById(item.createdBy) || item.createdByName || "Compte inconnu";
}

function calendarEventsForDate(date) {
  const key = calendarDateKey(date);
  return (adminState.calendarEvents || []).map((item) => calendarEventOnDate(item, key)).filter(Boolean).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
}

function calendarTimeLabel(value) {
  return String(value || "").slice(11, 16).replace(":", "h");
}

function calendarEventContactTooltip(item) {
  return calendarLinkedContactIds(item).map((id) => {
    const contact = contactById(id);
    if (!contact) return "";
    return [contactDisplayName(contact), contact.mobile, contact.phone, contact.email].filter(Boolean).join(" · ");
  }).filter(Boolean).join(" | ");
}


function calendarTeamMemberName(member = {}) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || String(member.login || member.id || "Compte");
}
function calendarTeamMembers() {
  const users = new Map();
  for (const member of [...(state.users || []), ...(adminUsersLoaded ? adminUsers : [])]) {
    if (member?.id && roleRank(member.role || "user") >= roleRank("moderator")) users.set(String(member.id), member);
  }
  const me = currentUser();
  if (me?.id && roleRank(me.role || "user") >= roleRank("moderator")) users.set(String(me.id), me);
  return [...users.values()].sort((a, b) => calendarTeamMemberName(a).localeCompare(calendarTeamMemberName(b), "fr"));
}
function calendarAssignedToMe(item = {}) {
  return Boolean(currentUserId && (item.assignedUserIds || []).includes(currentUserId));
}
function calendarAssignmentText(item = {}) {
  const members = calendarTeamMembers();
  return (item.assignedUserIds || []).map((id) => calendarTeamMemberName(members.find((m) => m.id === id) || { id })).join(", ");
}
function calendarOccurrenceSource(id, occurrenceKey = "") {
  const original = (adminState.calendarEvents || []).find((item) => item.id === id);
  return original ? calendarEventOnDate(original, occurrenceKey || String(original.startAt).slice(0, 10)) : null;
}
function calendarCopyEvent(sourceId, occurrenceKey, target) {
  const source = calendarOccurrenceSource(sourceId, occurrenceKey);
  if (!source) return false;
  const start = new Date(source.startAt), end = new Date(source.endAt), next = new Date(target);
  const duration = end.getTime() - start.getTime();
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(next.getTime())) return false;
  const now = new Date().toISOString();
  const copy = {
    ...source, id: crypto.randomUUID(), startAt: toLocalDateTimeValue(next),
    endAt: toLocalDateTimeValue(new Date(next.getTime() + duration)),
    recurrence: "none", recurrenceUntil: "", attendanceByDate: {}, campaignEventId: "", createdBy: currentUserId,
    createdByName: userNameById(currentUserId) || currentUser()?.login || "Compte de l'équipe",
    createdAt: now, updatedAt: now
  };
  delete copy.occurrenceKey;
  delete copy.seriesId;
  adminState.calendarEvents = [copy, ...(adminState.calendarEvents || [])];
  selectedCalendarEventId = copy.id;
  selectedCalendarOccurrenceKey = String(copy.startAt).slice(0, 10);
  calendarCursor = selectedCalendarOccurrenceKey;
  saveAdminState("duplication", "calendrier", copy.title);
  showToast("Événement dupliqué (copie indépendante de la récurrence).");
  return true;
}
function calendarPointDropDate(clientX, clientY, grabOffset = 0) {
  const column = document.elementFromPoint(clientX, clientY)?.closest(".calendar-day-column[data-calendar-date]");
  if (!column || !column.closest(".calendar-grid-shell")) return "";
  const rect = column.getBoundingClientRect();
  const offset = clientY - rect.top;
  if (offset < 0 || offset >= rect.height) return "";
  // Pointer position refers to where the event was grabbed, not its top-left corner.
  // Preserve that grab offset, otherwise each copy is shifted by e.g. 15 minutes.
  const eventTop = offset - Math.max(0, grabOffset);
  const minute = Math.max(7 * 60, Math.min(19 * 60 + 45, 7 * 60 + Math.round(eventTop / 15) * 15));
  return column.dataset.calendarDate + "T" + String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
}
function calendarDragCleanup() {
  document.querySelectorAll(".calendar-drop-target").forEach((node) => node.classList.remove("calendar-drop-target"));
  document.querySelectorAll(".calendar-drag-source").forEach((node) => node.classList.remove("calendar-drag-source"));
  document.querySelector("#calendar-copy-drag-label")?.remove();
  calendarCtrlDrag = null;
}

function renderCalendarTimedEvent(item) {
  const start = new Date(item.startAt);
  const end = new Date(item.endAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const duration = Math.max(30, (end.getTime() - start.getTime()) / 60000);
  const top = Math.max(0, startMinutes - 7 * 60);
  const height = Math.max(30, Math.min(duration, 13 * 60 - top));
  return `<button class="calendar-event tone-${attr(item.color)} ${selectedCalendarEventId === item.id ? "is-selected" : ""} ${calendarCategory(item) ? "is-categorized" : ""}" style="--event-top:${top}px;--event-height:${height}px;${calendarCategoryStyle(item)}" type="button" data-calendar-event="${attr(item.id)}" data-calendar-occurrence="${attr(item.occurrenceKey || String(item.startAt).slice(0, 10))}" title="${attr([`${calendarTimeLabel(item.startAt)} – ${calendarTimeLabel(item.endAt)}`, calendarEventContactTooltip(item)].filter(Boolean).join(" · "))}">
    <strong>${text(item.title)}</strong>
    ${calendarAssignedToMe(item) ? `<span class="calendar-my-assignment" title="Cet événement vous est attribué">★ À moi</span>` : item.assignedUserIds?.length ? `<small class="calendar-assigned-count" title="${attr(calendarAssignmentText(item))}">👥 ${item.assignedUserIds.length}</small>` : ""}
    ${item.recurrence && item.recurrence !== "none" ? `<small>↻ ${text(calendarRecurrenceLabel(item.recurrence))}</small>` : ""}
    <small>Ajouté par ${text(calendarEventCreator(item))}</small>

    ${(item.contactIds || []).length ? `<small class="calendar-contact-count">👤 ${(item.contactIds || []).length} contact(s)</small>` : ""}
  </button>`;
}

function renderCalendarTimeGrid(days) {
  const hours = Array.from({ length: 14 }, (_, index) => index + 7);
  const today = calendarDateKey(new Date());
  return `<section class="calendar-grid-shell" style="--calendar-days:${days.length}">
    <div class="calendar-day-head calendar-time-head"></div>
    ${days.map((day) => `<div class="calendar-day-head ${calendarDateKey(day) === today ? "is-today" : ""}"><span>${text(new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day))}</span><strong>${text(day.getDate())}</strong></div>`).join("")}
    <div class="calendar-hours">${hours.map((hour) => `<span style="--hour-index:${hour - 7}">${String(hour).padStart(2, "0")}:00</span>`).join("")}</div>
    ${days.map((day) => {
      const key = calendarDateKey(day);
      const now = new Date();
      const currentTop = now.getHours() * 60 + now.getMinutes() - 7 * 60;
      return `<div class="calendar-day-column ${key === today ? "is-today" : ""}" data-calendar-date="${key}">
        ${hours.slice(0, -1).map((hour) => `<button class="calendar-slot" style="--slot-top:${(hour - 7) * 60}px" type="button" data-calendar-slot="${key}T${String(hour).padStart(2, "0")}:00" aria-label="Ajouter un événement le ${key} à ${hour} heures"></button>`).join("")}
        ${key === today && currentTop >= 0 && currentTop <= 780 ? `<span class="calendar-now-line" style="--now-top:${currentTop}px"></span>` : ""}
        ${calendarEventsForDate(day).map(renderCalendarTimedEvent).join("")}
      </div>`;
    }).join("")}
  </section>`;
}

function renderCalendarMonth(days) {
  const cursorMonth = calendarDate(calendarCursor).getMonth();
  const today = calendarDateKey(new Date());
  const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return `<section class="calendar-month-grid">
    ${weekdays.map((day) => `<strong class="calendar-month-weekday">${day}</strong>`).join("")}
    ${days.map((day) => {
      const key = calendarDateKey(day);
      const events = calendarEventsForDate(day);
      return `<article class="calendar-month-day ${day.getMonth() !== cursorMonth ? "is-outside" : ""} ${key === today ? "is-today" : ""}">
        <button class="calendar-month-number" type="button" data-calendar-slot="${key}T09:00">${day.getDate()}</button>
        <div>${events.slice(0, 3).map((item) => `<button class="calendar-month-event tone-${attr(item.color)} ${calendarCategory(item) ? "is-categorized" : ""}" style="${calendarCategoryStyle(item)}" type="button" data-calendar-event="${attr(item.id)}" data-calendar-occurrence="${attr(item.occurrenceKey || String(item.startAt).slice(0, 10))}" title="${attr([`${calendarTimeLabel(item.startAt)} – ${calendarTimeLabel(item.endAt)}`, calendarEventContactTooltip(item)].filter(Boolean).join(" · "))}">${calendarAssignedToMe(item) ? "★ " : ""}${item.recurrence && item.recurrence !== "none" ? "↻ " : ""}${text(item.title)}${!calendarAssignedToMe(item) && item.assignedUserIds?.length ? ` · 👥 ${item.assignedUserIds.length}` : ""}${item.contactIds?.length ? ` · 👤 ${item.contactIds.length}` : ""}</button>`).join("")}${events.length > 3 ? `<small>+ ${events.length - 3} autre(s)</small>` : ""}</div>
      </article>`;
    }).join("")}
  </section>`;
}

function calendarDraftEvent() {
  const startAt = normalizeCalendarDateTime(adminFilters.calendarDraftStart || `${calendarCursor}T09:00`);
  return {
    id: "",
    title: "",
    startAt,
    endAt: toLocalDateTimeValue(new Date(new Date(startAt).getTime() + 3600000)),
    location: "",
    body: "",
    color: "blue",
    assignedUserIds: [],
    categoryId: "",
    recurrence: "none",
    recurrenceUntil: "",
    createdBy: currentUserId,
    createdByName: userNameById(currentUserId) || currentUser()?.login || "Compte de l'équipe"
  };
}


function calendarLinkedContactIds(item = {}) {
  return [...new Set((item.contactIds || []).filter((id) => contactById(id)))];
}
function calendarContactChannels(contact = {}) {
  const contacts = [
    ["Portable", String(contact.mobile || "").trim()],
    ["Téléphone", String(contact.phone || "").trim()]
  ];
  const seenPhones = new Set();
  const phones = contacts.filter(([, value]) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 6 || seenPhones.has(digits)) return false;
    seenPhones.add(digits);
    return true;
  }).map(([label, value]) => {
    const number = value.replace(/[^\d+]/g, "");
    return `<a class="calendar-contact-channel" href="tel:${attr(number)}" title="Appeler ${attr(contactDisplayName(contact))}">${text(label)} : ${text(value)}</a>`;
  });
  const email = String(contact.email || "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    phones.push(`<a class="calendar-contact-channel" href="mailto:${attr(email)}" title="Écrire à ${attr(contactDisplayName(contact))}">${text(email)}</a>`);
  }
  return phones.join("");
}

function calendarLinkedContactMarkup(ids) {
  return ids.map((id) => {
    const contact = contactById(id);
    if (!contact) return "";
    const channels = calendarContactChannels(contact);
    return `<div class="calendar-contact-chip">
      <div class="calendar-contact-info">
        <button type="button" class="calendar-contact-open" data-calendar-open-contact="${attr(id)}" title="Ouvrir la fiche contact">${text(contactDisplayName(contact))}${contact.city ? ` · ${text(contact.city)}` : ""}</button>
        ${channels ? `<div class="calendar-contact-channels">${channels}</div>` : ""}
      </div>
      <input type="hidden" name="contactIds" value="${attr(id)}" />
      <button type="button" class="calendar-contact-unlink" data-calendar-unlink-contact="${attr(id)}" aria-label="Retirer ${attr(contactDisplayName(contact))} de cet événement">×</button>
    </div>`;
  }).join("");
}
function updateCalendarContactSearch(form) {
  const input = form?.querySelector("[data-calendar-contact-query]");
  const results = form?.querySelector("[data-calendar-contact-results]");
  if (!input || !results) return;
  const selected = [...form.querySelectorAll('[name="contactIds"]')].map((element) => element.value);
  const matches = searchContacts(input.value, { limit: 12, excludeIds: selected });
  results.innerHTML = input.value.trim().length < 2 ? '<small>Saisissez au moins deux caractères pour rechercher un contact.</small>' :
    matches.length ? matches.map((contact) => `<button type="button" data-calendar-add-contact="${attr(contact.id)}" class="calendar-contact-result"><strong>${text(contactDisplayName(contact))}</strong><small>${text([contact.city, contact.email, contact.organization].filter(Boolean).join(" · "))}</small></button>`).join("") :
    '<small>Aucun contact correspondant.</small>';
}
function renderCalendarEditor(item) {
  const isNew = !item.id;
  return `<aside class="calendar-editor" aria-label="${isNew ? "Nouvel événement" : "Modifier l’événement"}">
    <header><div><h3>${isNew ? "Nouvel événement" : "Modifier l’événement"}</h3><p>${isNew ? "Choisissez librement la plage horaire." : "Cliquez sur un événement pour consulter ses contacts et ses détails."}</p></div><button type="button" data-calendar-close aria-label="Fermer">${localIcon("x")}</button></header>
    ${item.campaignEventId && campaignMajorEventRecord(item.campaignEventId) ? `<div class="campaign-major-agenda-backlink"><button class="secondary-action compact" type="button" data-campaign-major-back="${attr(item.campaignEventId)}">Ouvrir la fiche événement de campagne</button></div>` : ""}
    <form data-calendar-save="${attr(item.id || "new")}">
      ${calendarLinkedContactIds(item).length ? `<p class="calendar-contact-summary">${calendarLinkedContactIds(item).length} contact(s) associé(s) — téléphone et email affichés ci-dessous.</p>` : ""}
      <fieldset class="calendar-contact-fieldset"><legend>Contacts associés</legend><p class="calendar-contact-help">Liez plusieurs contacts à cet événement. Cliquez sur un nom pour ouvrir sa fiche.</p>
        <div class="calendar-contact-chips" data-calendar-contact-chips>${calendarLinkedContactMarkup(calendarLinkedContactIds(item))}</div>
        <label>Rechercher un contact<input data-calendar-contact-query type="search" autocomplete="off" placeholder="Nom, prénom, commune, organisation..." /></label>
        <div class="calendar-contact-results" data-calendar-contact-results><small>Saisissez au moins deux caractères pour rechercher un contact.</small></div>
      </fieldset>
      <label>Titre <span>*</span><input name="title" value="${attr(item.title)}" required maxlength="180" placeholder="Titre de l’événement" /></label>
      <div class="calendar-editor-range"><label>Début <span>*</span><input name="startAt" type="datetime-local" value="${attr(item.startAt)}" required /></label><label>Fin <span>*</span><input name="endAt" type="datetime-local" value="${attr(item.endAt)}" required /></label></div>
      <label>Lieu<input name="location" value="${attr(item.location)}" maxlength="240" placeholder="Lieu ou adresse" /></label>
      <label>Description<textarea name="body" data-calendar-body rows="9" placeholder="Ajoutez ici les informations utiles…">${text(item.body)}</textarea></label>
      <fieldset class="calendar-assignees"><legend>Attribuer aux membres de l'équipe</legend>
        <p>Les membres responsables verront l'indicateur ★ À moi dans l'agenda.</p>
        <div class="calendar-assignees-list">
          ${calendarTeamMembers().map((member) => `<label class="calendar-assignee-option"><input type="checkbox" name="assignedUserIds" value="${attr(member.id)}" ${(item.assignedUserIds || []).includes(member.id) ? "checked" : ""} /><span>${text(calendarTeamMemberName(member))}</span></label>`).join("") || "<small>Aucun membre d'équipe disponible.</small>"}
          ${(item.assignedUserIds || []).filter((id) => !calendarTeamMembers().some((member) => member.id === id)).map((id) => `<label class="calendar-assignee-option"><input type="checkbox" name="assignedUserIds" value="${attr(id)}" checked /><span>Compte ${text(id)} (indisponible)</span></label>`).join("")}
        </div>
      </fieldset>
      <label>Catégorie<select name="categoryId"><option value="">Sans catégorie</option>${(adminState.calendarEventCategories || []).map((category) => `<option value="${attr(category.id)}" ${item.categoryId === category.id ? "selected" : ""}>${text(category.name)}</option>`).join("")}</select></label>
      <label>Répétition<select name="recurrence" data-calendar-recurrence>
        ${[["none", "Ne pas répéter"], ["weekly", "Chaque semaine"], ["monthly", "Chaque mois"], ["yearly", "Chaque année"]].map(([id, name]) => `<option value="${id}" ${(item.recurrence || "none") === id ? "selected" : ""}>${name}</option>`).join("")}
      </select></label>
      <label class="calendar-recurrence-until" ${!item.recurrence || item.recurrence === "none" ? 'hidden' : ""}>Répéter jusqu'au (facultatif)<input type="date" name="recurrenceUntil" value="${attr(item.recurrenceUntil || "")}" /></label>
      ${!isNew && item.recurrence && item.recurrence !== "none" ? '<p class="calendar-series-note">Les changements et la suppression concernent toute la série. Les répétitions sont calculées automatiquement à partir de la première date.</p>' : ""}
      ${!item.categoryId ? `<label>Couleur (sans catégorie)<select name="color"><option value="blue" ${item.color === "blue" ? "selected" : ""}>Bleu</option><option value="red" ${item.color === "red" ? "selected" : ""}>Rouge</option><option value="green" ${item.color === "green" ? "selected" : ""}>Vert</option><option value="purple" ${item.color === "purple" ? "selected" : ""}>Violet</option></select></label>` : `<input type="hidden" name="color" value="${attr(item.color)}" />`}

      <label>Ajouté par<input value="${attr(calendarEventCreator(item))}" readonly /></label>
      <button class="primary-action" type="submit">${isNew ? "Ajouter l’événement" : "Enregistrer"}</button>
      ${!isNew ? `<button class="secondary-action" type="button" data-calendar-duplicate="${attr(item.id)}">Dupliquer cet événement</button>` : ""}
      ${!isNew && isAdmin() ? `<button class="secondary-action danger" type="button" data-calendar-delete="${attr(item.id)}">${localIcon("trash")} Supprimer</button>` : ""}
    </form>
  </aside>`;
}


function downloadCalendarAgendaPdf(startKey, endKey) {
  const valid = /^\d{4}-\d{2}-\d{2}$/;
  if (!valid.test(startKey) || !valid.test(endKey) || calendarDateKey(startKey) !== startKey || calendarDateKey(endKey) !== endKey || startKey > endKey) {
    showToast("Choisissez une période valide pour l'export PDF."); return;
  }
  const days = Math.round((calendarDate(endKey) - calendarDate(startKey)) / 86400000) + 1;
  if (days > 366) { showToast("La période ne peut pas dépasser 366 jours."); return; }
  const displayDate = (key) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(calendarDate(key));
  const lines = [];
  let eventCount = 0;
  for (let index = 0; index < days; index++) {
    const date = calendarAddDays(startKey, index);
    const events = calendarEventsForDate(date);
    if (!events.length) continue;
    lines.push({ kind: "day", value: displayDate(calendarDateKey(date)) });
    events.forEach((item) => {
      eventCount++;
      const hour = calendarTimeLabel(item.startAt);
      const end = calendarTimeLabel(item.endAt);
      const title = String(item.title || item.name || "Événement");
      lines.push({ kind: "event", value: (hour ? hour + (end ? " - " + end : "") + "  |  " : "") + title });
      const place = String(item.location || item.place || "").trim();
      if (place) lines.push({ kind: "detail", value: "Lieu : " + place });
      const description = String(item.description || "").replace(/\s+/g, " ").trim();
      if (description) lines.push({ kind: "detail", value: description.slice(0, 500) });
    });
  }
  if (!eventCount) lines.push({ kind: "detail", value: "Aucun événement dans cette période." });
  // Small self-contained PDF writer: direct download, no CDN or print dialog.
  // WinAnsiEncoding supports French accents; characters outside Windows-1252 are replaced.
  const cp1252 = { 8364:128, 8218:130, 402:131, 8222:132, 8230:133, 8224:134, 8225:135, 710:136, 8240:137, 352:138, 8249:139, 338:140, 381:142, 8216:145, 8217:146, 8220:147, 8221:148, 8226:149, 8211:150, 8212:151, 732:152, 8482:153, 353:154, 8250:155, 339:156, 382:158, 376:159 };
  const encoded = (value) => {
    let result = "";
    for (const char of String(value)) {
      const point = char.codePointAt(0);
      const byte = point <= 255 ? point : cp1252[point];
      result += byte === undefined || byte < 32 && byte !== 32 ? "?" : String.fromCharCode(byte);
    }
    return result.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  };
  const wrap = (value, width) => {
    const words = String(value).split(/\s+/);
    const out = [];
    let line = "";
    for (const word of words) {
      if ((line + " " + word).trim().length > width && line) { out.push(line); line = ""; }
      if (word.length > width) {
        if (line) { out.push(line); line = ""; }
        for (let n = 0; n < word.length; n += width) out.push(word.slice(n, n + width));
      } else line = (line + " " + word).trim();
    }
    if (line) out.push(line);
    return out;
  };
  const pageStreams = [];
  let drawing = [], y = 745, pageNumber = 1;
  const write = (value, size = 10, bold = false, indent = 0) => {
    for (const line of wrap(value, size >= 13 ? 70 : 95)) {
      const needed = size >= 13 ? 22 : 15;
      if (y < 58) { finishPage(); }
      drawing.push("BT /F" + (bold ? "2" : "1") + " " + size + " Tf 1 0 0 1 " + (42 + indent) + " " + y + " Tm (" + encoded(line) + ") Tj ET");
      y -= needed;
    }
  };
  const finishPage = () => {
    drawing.push("BT /F1 9 Tf 1 0 0 1 42 34 Tm (" + encoded("Agenda - Page " + pageNumber) + ") Tj ET");
    pageStreams.push(drawing.join("\n")); drawing = []; y = 745; pageNumber++;
  };
  write("Agenda partagé", 19, true);
  write("Du " + displayDate(startKey) + " au " + displayDate(endKey), 11);
  write(eventCount + " événement(s) - " + days + " jour(s)", 10);
  y -= 12;
  for (const line of lines) {
    if (line.kind === "day") { y -= 9; write(line.value, 13, true); }
    else if (line.kind === "event") write(line.value, 10, true, 8);
    else write(line.value, 9, false, 17);
  }
  finishPage();
  const objects = [null, "<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
  const pageIds = [];
  for (const content of pageStreams) {
    const pageId = objects.length;
    const streamId = pageId + 1;
    pageIds.push(pageId + " 0 R");
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents " + streamId + " 0 R >>");
    objects.push("<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");
  }
  objects[2] = "<< /Type /Pages /Kids [" + pageIds.join(" ") + "] /Count " + pageIds.length + " >>";
  let pdf = "%PDF-1.4\n%âãÏÓ\n", offsets = [0];
  objects.forEach((object, index) => {
    if (!index) return;
    offsets[index] = pdf.length;
    pdf += index + " 0 obj\n" + object + "\nendobj\n";
  });
  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let i = 1; i < objects.length; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  const bytes = Uint8Array.from(pdf, (char) => char.charCodeAt(0));
  downloadFile("agenda-" + startKey + "-au-" + endKey + ".pdf", bytes, "application/pdf");
  showToast(eventCount + " événement(s) exporté(s) en PDF.");
}

function renderCalendar() {
  const days = calendarVisibleDays();
  const selected = selectedCalendarEventId === "__new" ? calendarDraftEvent() : (adminState.calendarEvents || []).find((item) => item.id === selectedCalendarEventId);
  return `<div class="calendar-page ${selected ? "has-editor" : ""}">
    <main class="calendar-main">
      <header class="calendar-toolbar">
        <div><h2>Calendrier</h2><p>Agenda partagé de l’équipe</p></div>
        <p class="calendar-copy-hint">Ctrl + glisser un événement vers un autre créneau pour le dupliquer (ou utilisez le bouton Dupliquer).</p>
        <div class="calendar-toolbar-actions"><button class="secondary-action" type="button" data-calendar-today>Aujourd’hui</button><button class="calendar-arrow" type="button" data-calendar-move="prev" aria-label="Période précédente">‹</button><button class="calendar-arrow" type="button" data-calendar-move="next" aria-label="Période suivante">›</button><strong>${text(calendarRangeLabel(days))}</strong></div>
        <button class="secondary-action calendar-manage-categories" type="button" data-calendar-categories-toggle>Catégories</button>
        <form class="calendar-pdf-export" data-calendar-pdf-form aria-label="Exporter l’agenda PDF">
          <label>Du <input name="from" type="date" required value="${calendarDateKey(days[0])}" /></label>
          <label>Au <input name="to" type="date" required value="${calendarDateKey(days[days.length - 1])}" /></label>
          <button type="submit" class="secondary-action compact">Télécharger PDF</button>
        </form>
        <button class="primary-action calendar-new" type="button" data-calendar-new>${localIcon("plus")} Nouvel événement</button>
        <nav class="calendar-view-switch" aria-label="Vue du calendrier">${[["day", "Jour"], ["week", "Semaine"], ["month", "Mois"]].map(([value, label]) => `<button type="button" data-calendar-view="${value}" class="${calendarView === value ? "is-active" : ""}">${label}</button>`).join("")}</nav>
      </header>
      ${adminFilters.calendarCategoriesOpen ? renderCalendarCategoriesManager() : ""}
      ${(adminState.calendarEventCategories || []).length ? `<div class="calendar-category-legend" aria-label="Catégories">${(adminState.calendarEventCategories || []).map((category) => `<span><i style="background:${attr(category.color)}"></i>${text(category.name)}</span>`).join("")}</div>` : ""}
      ${calendarView === "month" ? renderCalendarMonth(days) : renderCalendarTimeGrid(days)}
    </main>
    ${selected ? renderCalendarEditor(selected) : ""}
  </div>`;
}

function saveCalendarEvent(form) {
  const data = new FormData(form);
  const startAt = normalizeCalendarDateTime(data.get("startAt"));
  const endAt = normalizeCalendarDateTime(data.get("endAt"));
  if (!startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    showToast("L'heure de fin doit être postérieure à l'heure de début.");
    return;
  }
  const id = form.dataset.calendarSave === "new" ? crypto.randomUUID() : form.dataset.calendarSave;
  const previous = (adminState.calendarEvents || []).find((item) => item.id === id);
  const now = new Date().toISOString();
  const item = {
    id,
    title: String(data.get("title") || "").trim().slice(0, 180),
    startAt,
    endAt,
    location: String(data.get("location") || "").trim().slice(0, 240),
    body: String(data.get("body") || "").slice(0, 12000),
    color: data.get("color") || "blue",
    categoryId: (adminState.calendarEventCategories || []).some((category) => category.id === data.get("categoryId")) ? String(data.get("categoryId")) : "",
    recurrence: ["weekly", "monthly", "yearly"].includes(data.get("recurrence")) ? data.get("recurrence") : "none",
    recurrenceUntil: ["weekly", "monthly", "yearly"].includes(data.get("recurrence")) ? String(data.get("recurrenceUntil") || "") : "",
    contactIds: [...new Set(data.getAll("contactIds").map(String).filter((id) => contactById(id)))],
    assignedUserIds: [...new Set(data.getAll("assignedUserIds").map(String).filter(Boolean))].filter((id) => calendarTeamMembers().some((member) => member.id === id) || (previous?.assignedUserIds || []).includes(id)),
    campaignEventId: previous?.campaignEventId || "",
    attendanceByDate: previous?.attendanceByDate || {},
    createdBy: previous?.createdBy || currentUserId,
    createdByName: previous?.createdByName || userNameById(currentUserId) || currentUser()?.login || "Compte de l'équipe",
    createdAt: previous?.createdAt || now,
    updatedAt: now
  };
  if (item.recurrence !== "none" && item.recurrenceUntil && item.recurrenceUntil < startAt.slice(0, 10)) {
    showToast("La date de fin de répétition doit être postérieure ou égale au début.");
    return;
  }
  adminState.calendarEvents = previous ? adminState.calendarEvents.map((entry) => entry.id === id ? item : entry) : [item, ...(adminState.calendarEvents || [])];
  const campaignMajor = (adminState.campaignEvents || []).find((entry) => entry.id === item.campaignEventId && entry.calendarEventId === item.id);
  if (campaignMajor) { campaignMajor.title = item.title; campaignMajor.startAt = item.startAt; campaignMajor.endAt = item.endAt; campaignMajor.location = item.location; campaignMajor.description = item.body; campaignMajor.updatedAt = now; }
  selectedCalendarEventId = id;
  calendarCursor = startAt.slice(0, 10);
  delete adminFilters.calendarDraftStart;
  saveAdminState(previous ? "modification" : "creation", item.campaignEventId ? "evenement majeur campagne" : "calendrier", item.title);
}

function deleteCalendarEvent(id) {
  const item = (adminState.calendarEvents || []).find((entry) => entry.id === id);
  if (!item) return;
  adminState.calendarEvents = adminState.calendarEvents.filter((entry) => entry.id !== id);
  const campaignMajor = (adminState.campaignEvents || []).find((entry) => entry.id === item.campaignEventId && entry.calendarEventId === id);
  if (campaignMajor) campaignMajor.calendarEventId = "";
  selectedCalendarEventId = "";
  saveAdminState("suppression", campaignMajor ? "evenement majeur campagne" : "calendrier", item.title);
}

function trombinoscopeCategoryById(id) {
  return (adminState.trombinoscopeCategories || []).find((category) => category.id === id) || null;
}

function trombinoscopePersonById(id) {
  return (adminState.trombinoscopePeople || []).find((person) => person.id === id) || null;
}

function trombinoscopePersonView(person = {}) {
  const contact = contactById(person.linkedContactId) || {};
  const fallback = (key) => String(person[key] || contact[key] || "").trim();
  return {
    ...person,
    firstName: fallback("firstName"),
    lastName: fallback("lastName"),
    city: fallback("city"),
    email: fallback("email"),
    phone: String(person.phone || contact.mobile || contact.phone || "").trim(),
    role: String(person.role || contact.role || contact.profession || "").trim()
  };
}

function trombinoscopePersonName(person = {}) {
  const view = trombinoscopePersonView(person);
  return [view.firstName, view.lastName].filter(Boolean).join(" ") || "Personne sans nom";
}

function trombinoscopeInitials(person = {}) {
  const view = trombinoscopePersonView(person);
  return `${String(view.firstName || "").charAt(0)}${String(view.lastName || "").charAt(0)}`.toUpperCase() || "?";
}

function renderTrombinoscope() {
  const category = trombinoscopeCategoryById(selectedTrombinoscopeCategoryId);
  return category ? renderTrombinoscopeCategoryPage(category) : renderTrombinoscopeFolders();
}

function renderTrombinoscopeFolders() {
  const categories = [...(adminState.trombinoscopeCategories || [])].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  const editing = adminFilters.trombinoscopeCategoryEdit === "__new";
  return `<div class="trombinoscope-admin">
    <header class="trombinoscope-page-head">
      <div><h2>Trombinoscope</h2><p>Organisez les personnes par catégorie, puis ouvrez un dossier pour afficher les portraits.</p></div>
      <button class="primary-action" type="button" data-trombi-category-new>${localIcon("plus")} Nouvelle catégorie</button>
    </header>
    ${editing ? renderTrombinoscopeCategoryForm() : ""}
    <section class="trombinoscope-folder-grid">
      ${categories.map((category) => {
        const count = adminState.trombinoscopePeople.filter((person) => person.categoryId === category.id).length;
        return `<article class="trombinoscope-folder">
          <button type="button" class="trombinoscope-folder-open" data-trombi-category-open="${attr(category.id)}">
            <span class="trombinoscope-folder-icon" aria-hidden="true">${localIcon("file")}</span>
            <span><strong>${text(category.name)}</strong><small>${count} personne${count > 1 ? "s" : ""}</small></span>
          </button>
          ${category.description ? `<p>${text(category.description)}</p>` : ""}
          <footer><button type="button" data-trombi-category-edit="${attr(category.id)}">Modifier</button><button class="danger" type="button" data-trombi-category-delete="${attr(category.id)}">Supprimer</button></footer>
        </article>`;
      }).join("") || `<div class="trombinoscope-empty"><span>${localIcon("users")}</span><h3>Aucune catégorie</h3><p>Créez votre premier dossier pour commencer le trombinoscope.</p><button class="primary-action" type="button" data-trombi-category-new>Créer une catégorie</button></div>`}
    </section>
  </div>`;
}

function renderTrombinoscopeCategoryForm(category = null) {
  return `<form class="trombinoscope-category-form admin-form" data-trombi-category-save="${attr(category?.id || "new")}">
    <div><h3>${category ? "Modifier la catégorie" : "Nouvelle catégorie"}</h3><p>Le dossier sera vide tant que vous n’y ajoutez aucune personne.</p></div>
    <div class="form-grid"><label>Nom de la catégorie<input name="name" required maxlength="120" value="${attr(category?.name || "")}" /></label><label>Description<textarea name="description" maxlength="600">${text(category?.description || "")}</textarea></label></div>
    <div class="form-actions"><button class="primary-action compact" type="submit">${category ? "Enregistrer" : "Créer la catégorie"}</button><button class="secondary-action compact" type="button" data-trombi-category-cancel>Annuler</button></div>
  </form>`;
}

function renderTrombinoscopeCategoryPage(category) {
  const people = [...adminState.trombinoscopePeople].filter((person) => person.categoryId === category.id).sort((a, b) => trombinoscopePersonName(a).localeCompare(trombinoscopePersonName(b), "fr", { sensitivity: "base" }));
  const person = selectedTrombinoscopePersonId && selectedTrombinoscopePersonId !== "__new" ? trombinoscopePersonById(selectedTrombinoscopePersonId) : null;
  const personEditorOpen = selectedTrombinoscopePersonId === "__new" || Boolean(person);
  const categoryEditorOpen = adminFilters.trombinoscopeCategoryEdit === category.id;
  return `<div class="trombinoscope-admin trombinoscope-category-page">
    <nav class="trombinoscope-breadcrumb"><button type="button" data-trombi-back> Trombinoscope</button><span>›</span><strong>${text(category.name)}</strong></nav>
    <header class="trombinoscope-page-head">
      <div><h2>${text(category.name)}</h2><p>${text(category.description || `${people.length} personne${people.length > 1 ? "s" : ""} dans cette catégorie.`)}</p></div>
      <div class="trombinoscope-head-actions"><button class="secondary-action" type="button" data-trombi-category-edit="${attr(category.id)}">Modifier la catégorie</button><button class="primary-action" type="button" data-trombi-person-new>${localIcon("plus")} Ajouter une personne</button></div>
    </header>
    ${categoryEditorOpen ? renderTrombinoscopeCategoryForm(category) : ""}
    ${personEditorOpen ? renderTrombinoscopePersonForm(person, category) : ""}
    <section class="trombinoscope-grid" aria-label="Personnes de la catégorie ${attr(category.name)}">
      ${people.map(renderTrombinoscopePersonCard).join("") || `<div class="trombinoscope-empty"><span>${localIcon("users")}</span><h3>Aucune personne dans ce dossier</h3><p>Ajoutez une personne, puis associez-la si besoin à une fiche contact existante.</p><button class="primary-action" type="button" data-trombi-person-new>Ajouter une personne</button></div>`}
    </section>
  </div>`;
}

function renderTrombinoscopePersonCard(person) {
  const view = trombinoscopePersonView(person);
  const linked = contactById(person.linkedContactId);
  return `<article class="trombinoscope-person-card">
    <div class="trombinoscope-portrait">${person.photo ? `<img src="${attr(person.photo)}" alt="Portrait de ${attr(trombinoscopePersonName(person))}" />` : `<span>${text(trombinoscopeInitials(person))}</span>`}</div>
    <div class="trombinoscope-person-copy"><h3>${text(trombinoscopePersonName(person))}</h3>${view.role ? `<p>${text(view.role)}</p>` : ""}${view.city ? `<small>${text(view.city)}</small>` : ""}${linked ? `<em>Lié à la fiche contact</em>` : ""}</div>
    <footer><button type="button" data-trombi-person-edit="${attr(person.id)}">Modifier</button><button class="danger" type="button" data-trombi-person-delete="${attr(person.id)}">Supprimer</button></footer>
  </article>`;
}

function renderTrombinoscopePersonForm(person, category) {
  const value = person ? trombinoscopePersonView(person) : {};
  const linked = contactById(person?.linkedContactId);
  return `<form class="trombinoscope-person-form admin-form" data-trombi-person-save="${attr(person?.id || "new")}">
    <input type="hidden" name="categoryId" value="${attr(category.id)}" />
    <input type="hidden" name="linkedContactId" value="${attr(person?.linkedContactId || "")}" />
    <header><div><h3>${person ? "Modifier la personne" : "Ajouter une personne"}</h3><p>Les informations du trombinoscope peuvent être complétées par une fiche contact existante.</p></div><button type="button" data-trombi-person-cancel aria-label="Fermer">×</button></header>
    <div class="trombinoscope-person-editor">
      <section class="trombinoscope-photo-editor">
        <div class="trombinoscope-photo-preview" data-trombi-photo-preview>${person?.photo ? `<img src="${attr(person.photo)}" alt="Aperçu du portrait" />` : `<span>${text(person ? trombinoscopeInitials(person) : "+")}</span>`}</div>
        <label class="secondary-action compact">Choisir une photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-trombi-photo-input /></label>
        <small>JPG, PNG ou WebP · 8 Mo maximum</small>
        ${person?.photo ? `<label class="trombinoscope-remove-photo"><input type="checkbox" name="removePhoto" /> Supprimer la photo actuelle</label>` : ""}
      </section>
      <section class="trombinoscope-person-fields">
        <div class="form-grid"><label>Prénom<input name="firstName" maxlength="120" value="${attr(value.firstName || "")}" /></label><label>Nom<input name="lastName" maxlength="120" value="${attr(value.lastName || "")}" /></label><label>Fonction<input name="role" maxlength="180" value="${attr(value.role || "")}" /></label><label>Commune<input name="city" maxlength="120" value="${attr(value.city || "")}" /></label><label>Email<input name="email" type="email" maxlength="180" value="${attr(value.email || "")}" /></label><label>Téléphone<input name="phone" maxlength="80" value="${attr(value.phone || "")}" /></label></div>
        <label>Notes<textarea name="notes" maxlength="4000">${text(person?.notes || "")}</textarea></label>
      </section>
    </div>
    <section class="trombinoscope-contact-linker" data-trombi-contact-linker>
      <div><h4>Lier à un habitant de la fiche contacts</h4><p>Recherchez séparément par prénom, nom ou commune.</p></div>
      <div class="trombinoscope-contact-search"><label>Prénom<input type="search" data-trombi-contact-search="firstName" autocomplete="off" /></label><label>Nom<input type="search" data-trombi-contact-search="lastName" autocomplete="off" /></label><label>Commune<input type="search" data-trombi-contact-search="city" autocomplete="off" /></label></div>
      <div class="trombinoscope-linked-contact" data-trombi-linked-contact>${linked ? renderTrombinoscopeLinkedContact(linked) : `<p>Aucune fiche contact liée.</p>`}</div>
      <div class="trombinoscope-contact-results" data-trombi-contact-results><p>Saisissez au moins un critère pour rechercher une fiche.</p></div>
    </section>
    <div class="form-actions"><button class="primary-action" type="submit">Enregistrer la personne</button><button class="secondary-action" type="button" data-trombi-person-cancel>Annuler</button></div>
  </form>`;
}

function renderTrombinoscopeLinkedContact(contact) {
  return `<article><span>${text(contactInitials(contact))}</span><div><strong>${text(contactDisplayName(contact))}</strong><small>${text(contact.city || "Commune non renseignée")}</small></div><button type="button" data-trombi-contact-unlink>Délier</button></article>`;
}

function renderTrombinoscopeContactResults(contacts, selectedId = "") {
  if (!contacts.length) return `<p>Aucune fiche contact ne correspond à cette recherche.</p>`;
  return contacts.map((contact) => `<button type="button" data-trombi-contact-link="${attr(contact.id)}" class="${selectedId === contact.id ? "is-selected" : ""}"><span>${text(contactInitials(contact))}</span><span><strong>${text(contactDisplayName(contact))}</strong><small>${text(contact.city || "Commune non renseignée")}</small></span><em>${selectedId === contact.id ? "Lié" : "Choisir"}</em></button>`).join("");
}

function refreshTrombinoscopeContactSearch(root) {
  if (!root) return;
  const fields = Object.fromEntries([...root.querySelectorAll("[data-trombi-contact-search]")].map((input) => [input.dataset.trombiContactSearch, normalizeName(input.value)]));
  const hasQuery = Object.values(fields).some(Boolean);
  const target = root.querySelector("[data-trombi-contact-results]");
  if (!target) return;
  if (!hasQuery) { target.innerHTML = `<p>Saisissez au moins un critère pour rechercher une fiche.</p>`; return; }
  const contacts = adminState.localContacts.filter((contact) => Object.entries(fields).every(([field, value]) => !value || normalizeName(contact[field] || "").includes(value))).slice(0, 30);
  const selectedId = root.closest("form")?.elements.linkedContactId?.value || "";
  target.innerHTML = renderTrombinoscopeContactResults(contacts, selectedId);
}

function saveTrombinoscopeCategory(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return;
  const id = form.dataset.trombiCategorySave;
  const previous = trombinoscopeCategoryById(id);
  const now = new Date().toISOString();
  const category = { id: previous?.id || crypto.randomUUID(), name: name.slice(0, 120), description: String(data.get("description") || "").trim().slice(0, 600), createdAt: previous?.createdAt || now, updatedAt: now };
  adminState.trombinoscopeCategories = previous ? adminState.trombinoscopeCategories.map((item) => item.id === previous.id ? category : item) : [...adminState.trombinoscopeCategories, category];
  adminFilters.trombinoscopeCategoryEdit = "";
  selectedTrombinoscopeCategoryId = category.id;
  saveAdminState(previous ? "modification" : "creation", "trombinoscope", category.name);
}

async function trombinoscopePhotoToDataUrl(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Sélectionnez un fichier image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("La photo ne doit pas dépasser 8 Mo.");
  const source = await fileToDataUrl(file);
  const image = await new Promise((resolve, reject) => {
    const preview = new Image();
    preview.onload = () => resolve(preview);
    preview.onerror = () => reject(new Error("Cette image ne peut pas être lue."));
    preview.src = source;
  });
  const maxSide = 720;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.86);
}

async function saveTrombinoscopePerson(form) {
  const data = new FormData(form);
  const id = form.dataset.trombiPersonSave;
  const previous = trombinoscopePersonById(id);
  const contact = contactById(data.get("linkedContactId"));
  const firstName = String(data.get("firstName") || contact?.firstName || "").trim();
  const lastName = String(data.get("lastName") || contact?.lastName || "").trim();
  if (!firstName && !lastName) { showToast("Renseignez au moins un prénom ou un nom."); return; }
  const photoFile = data.get("photo");
  let photo = data.get("removePhoto") ? "" : previous?.photo || "";
  let photoName = data.get("removePhoto") ? "" : previous?.photoName || "";
  if (photoFile?.name) { photo = await trombinoscopePhotoToDataUrl(photoFile); photoName = photoFile.name.slice(0, 255); }
  const now = new Date().toISOString();
  const person = {
    id: previous?.id || crypto.randomUUID(),
    categoryId: String(data.get("categoryId") || ""),
    linkedContactId: String(data.get("linkedContactId") || ""),
    firstName: firstName.slice(0, 120),
    lastName: lastName.slice(0, 120),
    role: String(data.get("role") || "").trim().slice(0, 180),
    city: String(data.get("city") || contact?.city || "").trim().slice(0, 120),
    email: String(data.get("email") || contact?.email || "").trim().slice(0, 180),
    phone: String(data.get("phone") || contact?.mobile || contact?.phone || "").trim().slice(0, 80),
    notes: String(data.get("notes") || "").trim().slice(0, 4000),
    photo,
    photoName,
    createdAt: previous?.createdAt || now,
    updatedAt: now
  };
  adminState.trombinoscopePeople = previous ? adminState.trombinoscopePeople.map((item) => item.id === previous.id ? person : item) : [...adminState.trombinoscopePeople, person];
  selectedTrombinoscopePersonId = "";
  saveAdminState(previous ? "modification personne" : "ajout personne", "trombinoscope", trombinoscopePersonName(person));
}

function deleteTrombinoscopeCategory(id) {
  const category = trombinoscopeCategoryById(id);
  if (!category) return;
  adminState.trombinoscopeCategories = adminState.trombinoscopeCategories.filter((item) => item.id !== id);
  adminState.trombinoscopePeople = adminState.trombinoscopePeople.filter((person) => person.categoryId !== id);
  selectedTrombinoscopeCategoryId = "";
  selectedTrombinoscopePersonId = "";
  saveAdminState("suppression catégorie", "trombinoscope", category.name);
}

function deleteTrombinoscopePerson(id) {
  const person = trombinoscopePersonById(id);
  if (!person) return;
  adminState.trombinoscopePeople = adminState.trombinoscopePeople.filter((item) => item.id !== id);
  selectedTrombinoscopePersonId = "";
  saveAdminState("suppression personne", "trombinoscope", trombinoscopePersonName(person));
}

function renderContacts() {
  const filters = contactSearchFilters();
  const contacts = filteredContacts();
  const allFilteredSelected = isAllFilteredContactSelectionActive(filters);
  const pageCount = Math.max(1, Math.ceil(contacts.length / filters.perPage));
  const page = Math.min(filters.page, pageCount);
  const pageContacts = contacts.slice((page - 1) * filters.perPage, page * filters.perPage);
  const selected = contacts.find(contact=>contact.id===selectedContactId) || contacts[0];
  if (selected) selectedContactId = selected.id;
  const selectedCount = allFilteredSelected ? contacts.length : selectedContactIds.size;
  const selectedInResults = allFilteredSelected ? contacts.length : contacts.filter((contact) => selectedContactIds.has(contact.id)).length;
  const activeList = normalizeSavedContactSearches(adminState.savedContactSearches).find(item=>item.id===adminFilters.activeSavedContactSearchId);
  const activeListError = activeList?savedListPreview(activeList,normalizeSavedContactSearches(adminState.savedContactSearches)).error:"";
  return `<div class="contacts-admin contact-search-page">
    ${contactDeletionProgress ? renderContactDeletionProgress() : ""}
    ${activeListError?`<section class="saved-list-error" role="alert">⚠ Liste indisponible : ${text(activeListError)}. Vérifiez les listes sources dans « Listes de contacts ».</section>`:""}
    <section class="contact-search-panel">
      <header class="contact-search-head">
        <div><h2>Contacts</h2><p>${contacts.length} résultat(s) sur ${adminState.localContacts.filter((item) => item.entityType !== "institution").length} personne(s)</p></div>
        <button class="secondary-action compact" type="button" data-admin-section="contact-io">Import / export</button>
      </header>
      <form class="contact-search-primary-actions" data-admin-filter="contacts">
        <div class="contact-universal-search"><label for="contact-query-input">Recherche dans tous les champs</label><div class="contact-universal-input"><input id="contact-query-input" name="q" type="search" autocomplete="off" value="${attr(filters.q||"")}" placeholder="Nom, prénom, organisation, téléphone, mot-clé…"/><button class="primary-action" type="submit">Rechercher</button></div></div>
        <div class="contact-search-main">
          <label class="contact-search-field"><span>Prénom</span><input name="field_firstName" value="${attr(filters.fields.firstName || "")}" placeholder="Prénom" autocomplete="off" /></label>
          <label class="contact-search-field"><span>Nom</span><input name="field_lastName" value="${attr(filters.fields.lastName || "")}" placeholder="Nom" autocomplete="off" /></label>
          <label class="contact-search-field"><span>Commune</span><input name="field_city" value="${attr(filters.fields.city || "")}" placeholder="Commune" autocomplete="off" /></label>
          <span class="contact-quick-help">Affinez par prénom, nom ou commune.</span>
        </div>
        
        ${renderContactKeywordFilters(filters)}
        ${renderContactDynamicFilters(filters)}
        ${renderContactFilterChips(filters)}
        ${renderContactPagination({ ...filters, page }, contacts.length)}
      </form>
      <div class="contact-search-quick-actions">${adminFilters.activeSavedContactSearchId?`<span class="contact-current-search">Recherche enregistrée active</span>`:""}<button type="button" class="secondary-action compact" data-contact-save-search>Enregistrer la recherche</button><button type="button" class="secondary-action compact" data-admin-section="saved-contact-searches">Gérer mes listes</button></div>
      <div class="contact-saved-popover-wrap">
        <button type="button" class="secondary-action compact contact-saved-toggle" data-contact-saved-toggle aria-expanded="false" aria-controls="contact-saved-popover">Recherches sauvegardées (${normalizeSavedContactSearches(adminState.savedContactSearches).length}) ▾</button>
        <div id="contact-saved-popover" class="contact-saved-popover" hidden></div>
      </div>
    </section>
    <div class="admin-split contact-split ${contactMobileDetailOpen?"mobile-detail-open":""}">
      <section class="admin-list contact-result-list">
        <div class="contact-selection-toolbar">
          <strong>${selectedCount} contact(s) sélectionné(s)</strong>
          <button class="secondary-action compact" type="button" data-contact-select-page>Sélectionner cette page</button>
          <button class="secondary-action compact" type="button" data-contact-select-filtered>Sélectionner les ${contacts.length} résultats</button>
          <button class="secondary-action compact" type="button" data-contact-clear-selection>Vider</button>
          <button class="secondary-action compact" type="button" data-contact-list-from-selection ${selectedCount?"":"disabled"}>Créer une liste avec la sélection</button>
          ${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-selected-contacts ${selectedCount ? "" : "disabled"}>Supprimer la sélection</button>` : ""}
          <small>${selectedInResults} selectionne(s) dans les resultats filtres</small>
        </div>
        ${pageContacts.map((contact) => `<article class="contact-result-row ${selected?.id === contact.id ? "is-active" : ""}">
          <label class="contact-result-check"><input type="checkbox" data-contact-select="${attr(contact.id)}" ${isContactSelected(contact, filters) ? "checked" : ""} aria-label="Sélectionner ${attr(contactDisplayName(contact))}" /></label>
          <button class="contact-result-card" type="button" data-open-contact="${attr(contact.id)}"><span class="contact-result-avatar" aria-hidden="true">${text(`${contact.firstName || ""} ${contact.lastName || contact.usageName || ""}`.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?")}</span><span class="contact-result-copy"><strong>${text(contactDisplayName(contact))}</strong><span>${text([contact.email, contact.mobile || contact.phone, contact.city].filter(Boolean).join(" · "))}</span><em>${text(contact.usageName && contact.birthName && contact.usageName !== contact.birthName ? `Usage ${contact.usageName} · naissance ${contact.birthName}` : contact.category || "autre")}</em></span></button>
        </article>`).join("") || empty("Aucun contact.")}
      </section>
      <section class="admin-detail contact-sticky-detail"><button type="button" class="contact-mobile-back secondary-action compact" data-contact-mobile-back>← Retour aux résultats</button>${selected ? renderContactForm(selected) : empty("Aucun contact.")}</section>
    </div>
  </div>`;
}

function renderContactDeletionProgress() {
  const progress = contactDeletionProgress || {};
  const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0));
  return `<section class="contact-delete-progress" role="status" aria-live="polite">
    <div class="contact-delete-ring" style="--progress:${percent * 3.6}deg"><span>${percent}%</span></div>
    <div>
      <h3>Suppression en cours</h3>
      <p>${text(progress.deleted || 0)} / ${text(progress.total || 0)} ${text(progress.label || "contacts")} supprime(s)</p>
    </div>
  </section>`;
}

function updateContactDeletionProgressDom() {
  const progress = contactDeletionProgress;
  if (!progress) return;
  const root = document.querySelector(".contact-delete-progress");
  if (!root) return;
  const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0));
  const ring = root.querySelector(".contact-delete-ring");
  const percentText = root.querySelector(".contact-delete-ring span");
  const detail = root.querySelector("p");
  if (ring) ring.style.setProperty("--progress", `${percent * 3.6}deg`);
  if (percentText) percentText.textContent = `${percent}%`;
  if (detail) detail.textContent = `${progress.deleted || 0} / ${progress.total || 0} ${progress.label || "contacts"} supprime(s)`;
}

function renderContactImportExport() {
  return `<div class="contacts-admin contact-io-page">
    <section class="contact-io-hero">
      <h2>Import / export de contacts</h2>
      <p>Importez, exportez ou creez de nouvelles fiches de contact.</p>
    </section>
    ${contactImportStatus ? renderContactImportLoading() : ""}
    ${pendingContactImport ? renderContactImportMapping() : ""}
    <div class="contact-io-tabs" aria-label="Outils contact">
      <button class="is-active" type="button">Importation</button>
      <button type="button">Exportation</button>
      <button type="button">Creation de contact</button>
    </div>
    <div class="contact-io-grid">
      <section class="contact-io-card">
        <h3>Importer des contacts</h3>
        <p>Importez vos contacts depuis un fichier CSV ou JSON.</p>
        <label class="contact-dropzone">
          <span aria-hidden="true">+</span>
          <strong>Glissez-deposez votre fichier ici</strong>
          <small>ou</small>
          <b>Parcourir un fichier</b>
          <input type="file" data-contact-import="csv" accept=".csv,text/csv" />
        </label>
        <small>Formats acceptes : .csv</small>
        <label class="import-button compact contact-json-import">Importer un JSON<input type="file" data-contact-import="json" accept=".json,application/json" /></label>
        <div class="contact-io-options">
          <label><input type="checkbox" checked disabled /> Mettre a jour les contacts existants</label>
          <label><input type="checkbox" checked disabled /> Ignorer les doublons</label>
          <label><input type="checkbox" checked disabled /> Ajouter les tags / mots-cles</label>
        </div>
      </section>
      <section class="contact-io-card">
        <h3>Exporter des contacts</h3>
        <p>Choisissez les contacts a exporter et le format souhaite.</p>
        <div class="contact-io-choice"><label><input type="radio" name="contactExportScope" value="all" checked /> Tous les contacts</label><small>Exporter l'ensemble de vos contacts.</small></div>
        <div class="contact-io-choice"><label><input type="radio" name="contactExportScope" value="filtered" /> Contacts filtres</label><small>Export selon les filtres appliques.</small></div>
        <div class="contact-io-choice"><label><input type="radio" name="contactExportScope" value="selected" /> Contacts selectionnes</label><small>Export uniquement les contacts selectionnes.</small></div>
        <label>Format d'export<select><option>CSV (separateur point-virgule)</option><option>JSON</option></select></label>
        <div class="contact-admin-actions"><button class="primary-action" type="button" data-contact-export="csv">Exporter les contacts</button><button class="secondary-action" type="button" data-contact-export="json">Exporter JSON</button></div>
      </section>
      <section class="contact-io-card">
        <h3>Creer une fiche de contact</h3>
        <p>Ajoutez manuellement un nouveau contact a votre base.</p>
        <form class="contact-create-card" data-contact-create>
          <div class="contact-create-avatar" aria-hidden="true"></div>
          <div class="contact-create-grid">
            <label>Civilite<select name="title"><option>M.</option><option>Mme</option></select></label>
            <label>Prenom *<input name="firstName" placeholder="Ex. Jean" required /></label>
            <label>Nom *<input name="lastName" placeholder="Ex. Durand" required /></label>
            <label>Email<input name="email" type="email" placeholder="exemple@email.com" /></label>
            <label>Telephone<input name="mobile" placeholder="06 12 34 56 78" /></label>
            <label>Adresse<input name="streetName" placeholder="Adresse postale complete" /></label>
            <label>Code postal<input name="postalCode" placeholder="Ex. 75001" /></label>
            <label>Ville<input name="city" placeholder="Ex. Paris" /></label>
            <label>Pays<input name="country" value="France" /></label>
            <label>Tags / Mots-cles<input name="keywords" placeholder="Rechercher ou ajouter un mot-cle..." /></label>
            <label>Notes<textarea name="notes" placeholder="Informations complementaires..."></textarea></label>
          </div>
          <button class="primary-action" type="submit">Enregistrer le contact</button>
        </form>
      </section>
    </div>
  </div>`;
}

function renderContactImportLoading() {
  const status = contactImportStatus || {};
  return `<section class="contact-import-loading" role="status" aria-live="polite">
    <div class="contact-import-spinner" aria-hidden="true"></div>
    <div>
      <h3>${text(status.title || "Import des contacts en cours")}</h3>
      <p>${text(status.message || "Le fichier est envoye puis traite par la base. Vous pouvez patienter une ou deux minutes pour un tres gros fichier.")}</p>
    </div>
  </section>`;
}

function renderContactForm(contact) {
  const editableLists=normalizeSavedContactSearches(adminState.savedContactSearches).filter(item=>["manual","hybrid"].includes(item.listType));
  const listAccess=editableLists.length?`<div class="contact-add-to-list"><label>Ajouter à une liste<select data-contact-add-list><option value="">Choisir une liste…</option>${editableLists.map(item=>`<option value="${attr(item.id)}">${text(item.name)}</option>`).join("")}</select></label><button type="button" class="secondary-action compact" data-contact-add-to-list="${attr(contact.id)}">Ajouter</button></div>`:"";
  const localCases = adminState.permanenceRequests.filter((item) => item.contactId === contact.id);
  const links = localCases.map((item) => `<button type="button" data-open-contact-local-case="${attr(item.id)}">Dossier local · ${text(item.title)}</button>`).join("");
  const calendarLinks = (adminState.calendarEvents || []).filter((item) => item.contactIds?.includes(contact.id)).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt))).map((item) => `<button type="button" data-open-contact-calendar-event="${attr(item.id)}">📅 ${text(formatDate(item.startAt))} · ${text(calendarTimeLabel(item.startAt))} — ${text(item.title)}</button>`).join("");
  const campaignLinks = (adminState.campaignEvents || []).filter((item) => item.participants?.some((participant) => participant.contactId === contact.id)).map((item) => `<button type="button" data-open-contact-campaign-event="${attr(item.id)}">🎟 ${text(formatDate(item.startAt))} — ${text(item.title)}</button>`).join("");
  return `<form class="admin-form contact-detail-form" data-contact-update="${attr(contact.id)}"><div class="admin-detail-head"><div><h3>${text(contactDisplayName(contact))}</h3><p>${text(contact.id)}</p></div>${isContactDeceased(contact) ? `<span class="status-chip death-chip">Deces</span>` : ""}</div>${links ? `<section class="contact-linked-folders"><strong>Dossiers et taches lies</strong>${links}</section>` : ""}${calendarLinks ? `<section class="contact-linked-folders contact-linked-calendar"><strong>Événements de l’agenda liés</strong>${calendarLinks}</section>` : ""}${campaignLinks ? `<section class="contact-linked-folders"><strong>Événements de campagne (participant)</strong>${campaignLinks}</section>` : ""}${contact.institutionId ? `<div class="contact-institution-link"><strong>Institution associée :</strong> <button type="button" data-admin-section="institutions">Voir les institutions</button></div>` : ""}${listAccess}<div class="contact-form-grid">${contactFields().filter((field) => field.id !== "id").map((field) => renderContactInput(field, contact)).join("")}</div><div class="form-actions"><button class="primary-action" type="submit">Enregistrer</button><button class="secondary-action" type="button" data-contact-mark-death="${attr(contact.id)}">Marquer deces</button>${isAdmin() ? `<button class="secondary-action danger" type="button" data-delete-contact="${attr(contact.id)}">Supprimer le contact</button>` : ""}</div></form>`;
}

function renderContactImportMapping() {
  const sampleRows = pendingContactImport.rows.slice(0, 3);
  const rowLabel = pendingContactImport.previewOnly ? `${pendingContactImport.rows.length} ligne(s) d'apercu` : `${pendingContactImport.rows.length} ligne(s) detectee(s)`;
  return `<form class="contact-import-panel" data-contact-import-map>
    <div class="contact-search-head">
      <div><h3>Faire correspondre les colonnes</h3><p>${text(pendingContactImport.fileName)} - ${text(rowLabel)}.</p></div>
      <div class="contact-admin-actions"><button class="secondary-action compact" type="button" data-contact-import-cancel>Annuler</button><button class="primary-action compact" type="submit">Importer les contacts</button></div>
    </div>
    <div class="contact-csv-mapping">
      <div class="contact-csv-map-grid">${pendingContactImport.headers.map((header, index) => `<label>${text(header || `Colonne ${index + 1}`)}<select name="column-${index}">${contactFieldOptions(pendingContactImport.mapping[index] || "")}</select><small>${sampleRows.map((row) => row[index]).filter(Boolean).slice(0, 2).map(text).join(" / ") || "Aucun apercu"}</small></label>`).join("")}</div>
    </div>
  </form>`;
}

function renderContactFieldsAdmin() {
  return `<div class="contacts-admin">
    <section class="admin-panel contact-admin-toolbar"><div><h3>Categories d'informations</h3><p>Ajoutez, modifiez ou retirez les champs disponibles sur les fiches contact et dans l'import CSV.</p><small class="admin-sync-note">${text(adminSyncMessage)}</small></div></section>
    <form class="admin-form contact-field-create" data-contact-field-create>
      <h3>Nouveau champ</h3>
      <div class="contact-form-grid">
        <label>Libelle<input name="label" required placeholder="Ex. Mandat municipal" /></label>
        <label>Type<select name="type">${options(contactFieldTypes)}</select></label>
        <label>Options<textarea name="options" placeholder="Une option par ligne pour liste / multiliste"></textarea></label>
        <label class="check-line"><input name="required" type="checkbox" value="1" /> Obligatoire</label>
      </div>
      <button class="primary-action compact" type="submit">Ajouter le champ</button>
    </form>
    <section class="admin-table contact-field-list">${contactFields().map((field) => `<article class="admin-row contact-field-row">
      <div><strong>${text(field.label)}</strong><p>${text(field.id)} - ${text(field.type)}${field.system ? " - systeme" : ""}</p></div>
      <form data-contact-field-update="${attr(field.id)}">
        <div class="contact-form-grid">
          <label>Libelle<input name="label" value="${attr(field.label)}" ${field.system ? "" : "required"} /></label>
          <label>Type<select name="type" ${field.system ? "" : ""}>${options(contactFieldTypes, field.type)}</select></label>
          <label>Options<textarea name="options">${text((field.options || []).join("\n"))}</textarea></label>
          <label class="check-line"><input name="required" type="checkbox" value="1" ${field.required ? "checked" : ""} /> Obligatoire</label>
        </div>
        <div class="form-actions"><button class="secondary-action compact" type="submit">Modifier</button>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-contact-field="${attr(field.id)}">Supprimer</button>` : ""}</div>
      </form>
    </article>`).join("")}</section>
  </div>`;
}

function renderDeath() {
  const selected = adminState.deathCases.find((item) => item.id === selectedDeathCaseId);
  return selected ? renderDeathCasePage(selected) : renderDeathList();
}

function deathCaseName(item = {}) {
  return contactDisplayName(contactById(item.deceasedId) || {});
}

function deathCaseRelatives(item = {}) {
  return Array.isArray(item.relatives) ? item.relatives : [];
}

function deathRelationOptions() {
  return normalizeDeathRelationOptions(adminState.deathRelationOptions);
}

function deathCaseSearchText(item = {}) {
  const deceased = contactById(item.deceasedId) || {};
  return normalizeName([deathCaseName(item), deceased.birthName, deceased.usageName, item.deathDate, item.deathPlace, item.notes].join(" "));
}

function deathListFilters() {
  const filters = adminFilters.death || {};
  return {
    q: String(filters.q || ""),
    sort: deathSortOptions.includes(filters.sort) ? filters.sort : "date",
    page: Math.max(1, Number(filters.page || 1)),
    perPage: 25
  };
}

function filteredDeathCases() {
  const filters = deathListFilters();
  const q = normalizeName(filters.q);
  return [...adminState.deathCases]
    .filter((item) => !q || deathCaseSearchText(item).includes(q))
    .sort((a, b) => {
      if (filters.sort === "az") return deathCaseName(a).localeCompare(deathCaseName(b), "fr", { sensitivity: "base" });
      if (filters.sort === "za") return deathCaseName(b).localeCompare(deathCaseName(a), "fr", { sensitivity: "base" });
      return String(b.deathDate || b.createdAt || "").localeCompare(String(a.deathDate || a.createdAt || ""));
    });
}

function renderDeathPagination(filters, total) {
  const pageCount = Math.max(1, Math.ceil(total / filters.perPage));
  const page = Math.min(filters.page, pageCount);
  const start = total ? (page - 1) * filters.perPage + 1 : 0;
  const end = Math.min(total, page * filters.perPage);
  return `<div class="death-pagination-controls">
    <span>${start}-${end} sur ${total}</span>
    <button class="secondary-action compact" type="submit" name="page" value="${Math.max(1, page - 1)}" ${page <= 1 ? "disabled" : ""}>Precedent</button>
    <button class="secondary-action compact" type="submit" name="page" value="${Math.min(pageCount, page + 1)}" ${page >= pageCount ? "disabled" : ""}>Suivant</button>
  </div>`;
}

function specialLetterFilters() {
  const filters = adminFilters.specialLetters || {};
  return {
    q: String(filters.q || ""),
    sort: deathSortOptions.includes(filters.sort) ? filters.sort : "date",
    page: Math.max(1, Number(filters.page || 1)),
    perPage: 25
  };
}

function specialLetterSearchText(item = {}) {
  const contact = contactById(item.contactId) || {};
  const template = deathTemplateForId(item.templateId);
  return normalizeName([item.title, item.notes, item.sentAt, item.responseStatus, contactDisplayName(contact), contactSearchLine(contact), template?.title].join(" "));
}

function filteredSpecialLetters() {
  const filters = specialLetterFilters();
  const q = normalizeName(filters.q);
  return [...(adminState.specialLetters || [])]
    .filter((item) => !q || specialLetterSearchText(item).includes(q))
    .sort((a, b) => {
      if (filters.sort === "az") return specialLetterName(a).localeCompare(specialLetterName(b), "fr", { sensitivity: "base" });
      if (filters.sort === "za") return specialLetterName(b).localeCompare(specialLetterName(a), "fr", { sensitivity: "base" });
      return String(b.sentAt || b.createdAt || "").localeCompare(String(a.sentAt || a.createdAt || ""));
    });
}

function specialLetterName(item = {}) {
  return item.title || contactDisplayName(contactById(item.contactId) || {}) || "Courrier special";
}

function renderSpecialLetters() {
  const filters = specialLetterFilters();
  const letters = filteredSpecialLetters();
  const pageCount = Math.max(1, Math.ceil(letters.length / filters.perPage));
  const page = Math.min(filters.page, pageCount);
  const pageLetters = letters.slice((page - 1) * filters.perPage, page * filters.perPage);
  const sent = (adminState.specialLetters || []).filter((item) => item.sentAt).length;
  const waiting = (adminState.specialLetters || []).filter((item) => item.sentAt && item.responseStatus === "pending").length;
  const month = new Date().toISOString().slice(0, 7);
  return `<div class="death-admin death-index">
    <section class="death-hero">
      <div><h2>Courriers speciaux</h2><p>Preparez et suivez des courriers Word envoyes a un seul destinataire, sans dossier de deces.</p></div>
      <button class="primary-action" type="button" data-special-letter-new-toggle>+ Creer un courrier special</button>
    </section>
    <form class="death-searchbar" data-admin-filter="specialLetters">
      <input name="q" value="${attr(filters.q)}" placeholder="Rechercher un courrier par destinataire, modele ou objet..." />
      <label>Tri<select name="sort"><option value="date" ${filters.sort === "date" ? "selected" : ""}>Date</option><option value="az" ${filters.sort === "az" ? "selected" : ""}>Nom A-Z</option><option value="za" ${filters.sort === "za" ? "selected" : ""}>Nom Z-A</option></select></label>
      <button class="secondary-action compact" type="submit" name="page" value="1">Filtres</button>
      ${renderDeathPagination({ ...filters, page }, letters.length)}
    </form>
    <section class="death-create-panel ${adminFilters.specialLetterCreateOpen ? "is-open" : ""}">
      <form class="admin-form" data-special-letter-create>
        <h3>Nouveau courrier special</h3>
        ${renderContactSearchPicker({ key: "special-letter-contact", name: "contactId", label: "Destinataire", searchMode: "death" })}
        <div class="form-grid"><label>Objet du courrier<input name="title" placeholder="Ex. Invitation ceremonie, felicitations..." required /></label><label>Modele<select name="templateId">${specialTemplateOptions()}</select></label></div>
        <label>Notes internes<textarea name="notes"></textarea></label>
        <button class="primary-action compact" type="submit">Creer le courrier</button>
      </form>
    </section>
    <section class="death-kpis">
      <article><span class="death-kpi-icon blue">${wordIcon("doc")}</span><strong>${(adminState.specialLetters || []).length}</strong><p>Courriers speciaux<br><small>Au total</small></p></article>
      <article><span class="death-kpi-icon green">${wordIcon("send")}</span><strong>${sent}</strong><p>Courriers generes<br><small>Au total</small></p></article>
      <article><span class="death-kpi-icon orange">${wordIcon("plus")}</span><strong>${(adminState.specialLetters || []).filter((item) => String(item.createdAt || "").startsWith(month)).length}</strong><p>Ce mois-ci<br><small>Courriers crees</small></p></article>
      <article><span class="death-kpi-icon purple">${wordIcon("mail")}</span><strong>${waiting}</strong><p>En attente<br><small>Reponses a suivre</small></p></article>
    </section>
    <section class="death-table-card">
      <div class="death-table-head"><h3>Liste des courriers speciaux</h3><span>25 courriers par page</span></div>
      <table class="death-table"><thead><tr><th>Destinataire</th><th>Objet</th><th>Modele</th><th>Date d'envoi</th><th>Reponse recue</th><th>Actions</th></tr></thead><tbody>
        ${pageLetters.map(renderSpecialLetterRow).join("") || `<tr><td colspan="6">${empty("Aucun courrier special.")}</td></tr>`}
      </tbody></table>
    </section>
  </div>`;
}

function renderSpecialLetterRow(item) {
  const contact = contactById(item.contactId) || {};
  const template = deathTemplateForId(item.templateId);
  return `<tr>
    <td><div class="death-recipient"><span>${text(contactInitials(contact))}</span><strong>${text(contactDisplayNameWithBirthName(contact))}</strong><small>${text(contactSearchLine(contact) || "Informations non renseignees")}</small></div></td>
    <td>${text(item.title || "Courrier special")}</td>
    <td>${text(template?.title || "Modele non renseigne")}</td>
    <td>${text(item.sentAt ? formatDate(item.sentAt.slice(0, 10)) : "Non envoye")}</td>
    <td>${renderDeathResponseBadge(item)}</td>
    <td><div class="form-actions"><button class="secondary-action compact" type="button" data-special-letter-generate="${attr(item.id)}">Courrier</button><button class="secondary-action compact" type="button" data-special-letter-response="${attr(item.id)}">Reponse</button><button class="secondary-action compact" type="button" data-open-contact="${attr(item.contactId)}">Voir le contact</button>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-special-letter="${attr(item.id)}">Supprimer</button>` : ""}</div></td>
  </tr>`;
}

function renderDeathList() {
  const filters = deathListFilters();
  const cases = filteredDeathCases();
  const pageCount = Math.max(1, Math.ceil(cases.length / filters.perPage));
  const page = Math.min(filters.page, pageCount);
  const pageCases = cases.slice((page - 1) * filters.perPage, page * filters.perPage);
  const totalLetters = adminState.deathCases.reduce((count, item) => count + deathCaseRelatives(item).filter((relative) => relative.sentAt).length, 0);
  const waiting = adminState.deathCases.reduce((count, item) => count + deathCaseRelatives(item).filter((relative) => relative.sentAt && relative.responseStatus === "pending").length, 0);
  const month = new Date().toISOString().slice(0, 7);
  return `<div class="death-admin death-index">
    <section class="death-hero">
      <div><h2>Gestion des deces</h2><p>Suivez les personnes decedees et gerez les courriers envoyes aux proches.</p></div>
      <button class="primary-action" type="button" data-death-new-toggle>+ Creer un nouveau dossier</button>
    </section>
    <form class="death-searchbar" data-admin-filter="death">
      <input name="q" value="${attr(filters.q)}" placeholder="Rechercher un dossier par nom du defunt..." />
      <label>Tri<select name="sort"><option value="date" ${filters.sort === "date" ? "selected" : ""}>Date du deces</option><option value="az" ${filters.sort === "az" ? "selected" : ""}>Nom A-Z</option><option value="za" ${filters.sort === "za" ? "selected" : ""}>Nom Z-A</option></select></label>
      <button class="secondary-action compact" type="submit" name="page" value="1">Filtres</button>
      ${renderDeathPagination({ ...filters, page }, cases.length)}
    </form>
    <section class="death-create-panel ${adminFilters.deathCreateOpen ? "is-open" : ""}">
      <form class="admin-form" data-death-case-create>
        <h3>Nouveau dossier de deces</h3>
        ${renderContactSearchPicker({ key: "death-deceased", name: "deceasedId", label: "Defunt", searchMode: "death" })}
        <div class="form-grid"><label>Date du deces<input name="deathDate" type="date" /></label><label>Age au deces<input name="deathAge" /></label><label>Lieu du deces<input name="deathPlace" /></label></div>
        <label>Notes internes<textarea name="notes"></textarea></label>
        <button class="primary-action compact" type="submit">Creer le dossier</button>
      </form>
    </section>
    <section class="death-kpis">
      <article><span class="death-kpi-icon blue">□</span><strong>${adminState.deathCases.length}</strong><p>Dossiers deces<br><small>Au total</small></p></article>
      <article><span class="death-kpi-icon green">✈</span><strong>${totalLetters}</strong><p>Courriers envoyes<br><small>Au total</small></p></article>
      <article><span class="death-kpi-icon orange">▣</span><strong>${adminState.deathCases.filter((item) => String(item.createdAt || "").startsWith(month)).length}</strong><p>Ce mois-ci<br><small>Dossiers crees</small></p></article>
      <article><span class="death-kpi-icon purple">✉</span><strong>${waiting}</strong><p>En attente<br><small>Courriers a suivre</small></p></article>
    </section>
    <section class="death-table-card">
      <div class="death-table-head"><h3>Liste des dossiers deces</h3><span>25 dossiers par page</span></div>
      <table class="death-table"><thead><tr><th>Date du deces</th><th>Nom de la personne</th><th>Nombre de courriers envoyes</th><th>Actions</th></tr></thead><tbody>
        ${pageCases.map((item) => {
          const deceased = contactById(item.deceasedId) || {};
          return `<tr><td>${text(item.deathDate ? formatDate(item.deathDate) : "Non renseignee")}</td><td>${text(contactDisplayNameWithBirthName(deceased))}</td><td><span class="death-count-pill">${deathCaseRelatives(item).filter((relative) => relative.sentAt).length} courrier(s)</span></td><td><button class="secondary-action compact" type="button" data-open-death-case="${attr(item.id)}">Voir</button>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-death-case="${attr(item.id)}">Supprimer</button>` : ""}</td></tr>`;
        }).join("") || `<tr><td colspan="4">${empty("Aucun dossier.")}</td></tr>`}
      </tbody></table>
    </section>
  </div>`;
}

function renderDeathDetail(item) {
  return renderDeathCasePage(item);
}

function renderRelative(deathCase, relative) {
  const contact = contactById(relative.contactId);
  return `<tr>
    <td><div class="death-recipient"><span>${text(contactInitials(contact))}</span><strong>${text(contactDisplayNameWithBirthName(contact || {}))}</strong><small>${text(contactSearchLine(contact || {}) || "Informations non renseignees")}</small></div></td>
    <td><span class="death-relation-pill">${text(relative.relation || "proche")}</span></td>
    <td>${text(relative.sentAt ? formatDate(relative.sentAt.slice(0, 10)) : "Non envoye")}</td>
    <td>${renderDeathResponseBadge(relative)}</td>
    <td><div class="form-actions"><button class="secondary-action compact" type="button" data-death-letter="${attr(deathCase.id)}" data-relative-id="${attr(relative.id)}">Courrier</button><button class="secondary-action compact" type="button" data-death-response="${attr(deathCase.id)}" data-relative-id="${attr(relative.id)}">Reponse</button><button class="secondary-action compact" type="button" data-open-contact="${attr(relative.contactId)}">Voir le contact</button>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-death-relative="${attr(deathCase.id)}" data-relative-id="${attr(relative.id)}">Supprimer</button>` : ""}</div></td>
  </tr>`;
}

function renderDeathCasePage(item) {
  const deceased = contactById(item.deceasedId) || {};
  const sent = deathCaseRelatives(item).filter((relative) => relative.sentAt).length;
  const answered = deathCaseRelatives(item).filter((relative) => relative.responseStatus === "answered").length;
  const waiting = deathCaseRelatives(item).filter((relative) => relative.sentAt && relative.responseStatus === "pending").length;
  return `<div class="death-admin death-case-page">
    <nav class="death-breadcrumb"><button type="button" data-back-death-list>Gestion des deces</button><span>›</span><strong>Dossier de ${text(deathCaseName(item))}</strong></nav>
    <header class="death-case-header">
      <div><h2>Dossier de ${text(contactDisplayNameWithBirthName(deceased))} <span>Decede</span></h2><p>${text(contactSearchLine(deceased) || "Informations contact non renseignees")} · Decede le ${text(item.deathDate ? formatDate(item.deathDate) : "date non renseignee")} · ${sent} courrier(s) envoye(s)</p></div>
      <div class="form-actions"><button class="secondary-action compact" type="button" data-open-contact="${attr(item.deceasedId)}">Voir la fiche du defunt</button><button class="secondary-action compact" type="button" data-back-death-list>Retour a la liste</button></div>
    </header>
    <div class="death-page-grid">
      <main>
        <div class="death-tabs"><button class="is-active" type="button">Courriers envoyes</button><button type="button">Documents generes</button><button type="button">Informations du dossier</button><button type="button">Notes internes</button><button type="button">Historique</button></div>
        <section class="death-table-card">
          <div class="death-section-head"><div><h3>Courriers envoyes aux proches</h3><p>Suivez l'envoi des courriers et les reponses recues de chaque destinataire.</p></div><button class="secondary-action compact" type="button" data-death-add-toggle>+ Ajouter un destinataire</button></div>
          <form class="death-relative-add ${adminFilters.deathAddOpen ? "is-open" : ""}" data-death-relative-add="${attr(item.id)}">
            ${renderContactSearchPicker({ key: `death-relative-${item.id}`, name: "contactId", label: "Destinataire", searchMode: "death", excludeIds: deathCaseRelatives(item).map((relative) => relative.contactId).filter(Boolean) })}<label>Lien de parente<input name="relation" placeholder="Ex. cousine, ancien conjoint, voisin proche..." /></label><label>Modele<select name="templateId">${deathTemplateOptions()}</select></label><button class="secondary-action compact" type="submit">Ajouter</button>
          </form>
          <table class="death-table death-recipient-table"><thead><tr><th>Destinataire</th><th>Lien de parente</th><th>Date d'envoi</th><th>Reponse recue</th><th>Actions</th></tr></thead><tbody>${deathCaseRelatives(item).map((relative) => renderRelative(item, relative)).join("") || `<tr><td colspan="5">${empty("Aucun destinataire.")}</td></tr>`}</tbody></table>
          <p class="death-info-note">Lorsqu'un destinataire repond, un commentaire est automatiquement ajoute dans sa fiche contact.</p>
        </section>
        <form class="death-edit-panel" data-death-case-update="${attr(item.id)}">
          <h3>Modifier le dossier</h3>
          <div class="form-grid"><label>Date du deces<input name="deathDate" type="date" value="${attr(item.deathDate || "")}" /></label><label>Age au deces<input name="deathAge" value="${attr(item.deathAge || "")}" /></label><label>Lieu du deces<input name="deathPlace" value="${attr(item.deathPlace || "")}" /></label></div>
          <label>Notes internes<textarea name="notes">${text(item.notes || "")}</textarea></label>
          <button class="primary-action compact" type="submit">Enregistrer les modifications</button>
        </form>
      </main>
      <aside class="death-side">
        <section><h3>Informations du dossier</h3><dl><div><dt>Date du deces</dt><dd>${text(item.deathDate ? formatDate(item.deathDate) : "-")}</dd></div><div><dt>Age au deces</dt><dd>${text(item.deathAge || "-")}</dd></div><div><dt>Lieu du deces</dt><dd>${text(item.deathPlace || "-")}</dd></div><div><dt>Cree le</dt><dd>${text(item.createdAt ? formatDate(item.createdAt.slice(0, 10)) : "-")}</dd></div></dl></section>
        <section><h3>Resume du dossier</h3><p>${sent} courriers envoyes</p><p>${answered} reponses recues</p><p>${waiting} en attente de reponse</p></section>
        <section><h3>Actions rapides</h3><button type="button" data-death-export="${attr(item.id)}">Exporter la liste des courriers</button>${isAdmin() ? `<button class="danger" type="button" data-delete-death-case="${attr(item.id)}">Supprimer ce dossier</button>` : ""}</section>
      </aside>
    </div>
  </div>`;
}

function renderDeathVariableRows(variables = []) {
  return normalizeDeathTemplateVariables(variables).map((variable, index) => wordVariableRowHtml(variable, index)).join("");
}

function wordVariableRowHtml(variable = {}, index = 0) {
  return `<div class="death-variable-row" data-word-variable-row>
    <input name="variableTag-${index}" value="${attr(variable.tag || "")}" placeholder="ex. defunt-nom" />
    <select name="variableSource-${index}">${deathTemplateSourceOptions(variable.source || "date_du_jour")}</select>
    <input name="variableFallback-${index}" value="${attr(variable.fallback || "")}" placeholder="Texte par defaut" />
    <textarea name="variableReplacements-${index}" placeholder="1=Monsieur&#10;2=Madame">${text(variable.replacements || "")}</textarea>
    <button class="icon-action danger" type="button" data-word-variable-delete aria-label="Supprimer la balise">${wordIcon("trash")}</button>
  </div>`;
}

function deathTemplateSourceOptions(selected = "") {
  const contactFieldOptions = contactFields().flatMap((field) => [
    [`defunt.${field.id}`, `Defunt - ${field.label}`],
    [`proche.${field.id}`, `Destinataire - ${field.label}`],
    [`destinataire.${field.id}`, `Courrier special - ${field.label}`]
  ]);
  const sources = [
    ["date_du_jour", "Date du jour"],
    ["courrier.title", "Courrier special - objet"],
    ["courrier.notes", "Courrier special - notes"],
    ["dossier.deathDate", "Dossier - date du deces"],
    ["dossier.deathAge", "Dossier - age au deces"],
    ["dossier.deathPlace", "Dossier - lieu du deces"],
    ["relative.relation", "Dossier - relation destinataire-defunt"],
    ["defunt.title", "Defunt - civilite"],
    ["defunt.civilite", "Defunt - civilite"],
    ["defunt.gender", "Defunt - genre"],
    ["proche.title", "Destinataire - civilite"],
    ["proche.civilite", "Destinataire - civilite"],
    ["proche.gender", "Destinataire - genre"],
    ["proche.adresse_complete", "Destinataire - adresse complete"],
    ["destinataire.adresse_complete", "Courrier special - adresse complete"],
    ["defunt.adresse_complete", "Defunt - adresse complete"],
    ...contactFieldOptions
  ];
  return sources.map(([value, label]) => `<option value="${attr(value)}" ${selected === value ? "selected" : ""}>${text(label)}</option>`).join("");
}

function contactInitials(contact = {}) {
  return [contact.firstName, contact.lastName].map((part) => String(part || "").slice(0, 1)).join("").toUpperCase() || "??";
}

function renderDeathResponseBadge(relative = {}) {
  if (relative.responseStatus === "answered") return `<span class="death-response answered">✓ A repondu${relative.respondedAt ? ` le ${text(formatDate(relative.respondedAt.slice(0, 10)))}` : ""}</span>`;
  if (relative.responseStatus === "none") return `<span class="death-response none">× Aucune reponse</span>`;
  return `<span class="death-response pending">En attente de reponse</span>`;
}

function renderDeathOptionsPanel() {
  const relations = deathRelationOptions();
  return `<section class="death-options-panel">
    <div class="death-section-head"><div><h3>Options</h3><p>Ajoutez, modifiez ou supprimez les relations disponibles entre le destinataire et le defunt.</p></div></div>
    <form class="death-relation-create" data-death-relation-create>
      <label>Nouvelle relation<input name="label" placeholder="Ex. conjoint" required /></label>
      <button class="secondary-action compact" type="submit">Ajouter</button>
    </form>
    <div class="death-relation-list">${relations.map((relation) => `<form class="death-relation-row" data-death-relation-update="${attr(relation)}"><input name="label" value="${attr(relation)}" required /><div class="form-actions"><button class="secondary-action compact" type="submit">Modifier</button>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-death-relation="${attr(relation)}">Supprimer</button>` : ""}</div></form>`).join("") || empty("Aucune relation configuree.")}</div>
  </section>`;
}

function deathTemplateOptions(selected = "") {
  return adminState.deathEmailTemplates.filter((template) => (template.scope || "deces") !== "special").map((template) => `<option value="${attr(template.id)}" ${selected === template.id ? "selected" : ""}>${text(template.title)}</option>`).join("");
}

function specialTemplateOptions(selected = "") {
  const templates = adminState.deathEmailTemplates.filter((template) => template.scope === "special");
  const fallback = templates.length ? templates : adminState.deathEmailTemplates.filter((template) => template.scope === "general");
  return fallback.map((template) => `<option value="${attr(template.id)}" ${selected === template.id ? "selected" : ""}>${text(template.title)}</option>`).join("") || `<option value="">Ajoutez un modele special</option>`;
}

function publicContentConfig(target) {
  return {
    victory: { key: "victories", label: "Victoire du groupe RN", bodyField: "summary" },
    event: { key: "agenda", label: "Evenement local / agenda", bodyField: "description" },
    law: { key: "legislative", label: "Travail parlementaire", bodyField: "summary" }
  }[target] || { key: "agenda", label: "Evenement local / agenda", bodyField: "description" };
}

function renderContentAdmin() {
  const filter = adminFilters.content || {};
  const selectedTarget = filter.target || "event";
  const items = [
    ...state.agenda.map((item) => ({ target: "event", label: "Agenda", item })),
    ...state.victories.map((item) => ({ target: "victory", label: "Victoire", item })),
    ...state.legislative.map((item) => ({ target: "law", label: "Parlementaire", item }))
  ].filter((entry) => !filter.target || entry.target === filter.target)
    .sort((a, b) => String(b.item.date || "").localeCompare(String(a.item.date || "")));
  return `<div class="content-admin">
    <section class="admin-panel">
      <div><h3>Actualites, agenda et contenus publics</h3><p>Ajoutez les evenements locaux auxquels le depute a participe, les victoires et les contenus parlementaires.</p><small class="admin-sync-note">${text(adminSyncMessage)}</small></div>
    </section>
    <form class="admin-form" data-public-content-create>
      <h3>Nouvelle publication</h3>
      <div class="form-grid">
        <label>Section<select name="target">${[["event", "Evenement local / agenda"], ["victory", "Victoire"], ["law", "Parlementaire"]].map(([value, label]) => `<option value="${attr(value)}" ${value === selectedTarget ? "selected" : ""}>${text(label)}</option>`).join("")}</select></label>
        <label>Date<input name="date" type="date" required /></label>
        <label>Titre<input name="title" required /></label>
        <label>Commune<input name="commune" list="communes-list" placeholder="Ex. Vesoul" ${selectedTarget === "event" ? "required" : ""} /></label>
      </div>
      <label>Résumé / description (facultatif)<textarea name="body"></textarea></label>
      <label class="event-photo-picker ${selectedTarget === "event" ? "" : "is-hidden"}">Photos de l’événement (facultatif)<input name="eventPhotos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" /><small>JPG, PNG, WebP ou HEIC · les photos rejoindront la photothèque avec la commune et la date.</small></label>
      <fieldset><legend>Liens publics</legend><div class="form-grid"><label>Facebook<input name="facebookUrl" type="url" /></label><label>X / Twitter<input name="twitterUrl" type="url" /></label><label>Instagram<input name="instagramUrl" type="url" /></label><label>LinkedIn<input name="linkedinUrl" type="url" /></label><label>TikTok<input name="tiktokUrl" type="url" /></label><label>Video<input name="videoUrl" type="url" /></label></div></fieldset>
      <button class="primary-action" type="submit">Enregistrer en base</button>
    </form>
    <form class="admin-filterbar" data-admin-filter="content"><select name="target"><option value="">Toutes les sections</option><option value="event" ${filter.target === "event" ? "selected" : ""}>Agenda</option><option value="victory" ${filter.target === "victory" ? "selected" : ""}>Victoires</option><option value="law" ${filter.target === "law" ? "selected" : ""}>Parlementaire</option></select><button class="secondary-action compact" type="submit">Filtrer</button></form>
    <section class="admin-table">${items.map(({ target, label, item }) => `<article class="admin-row"><div><strong>${text(item.title)}</strong><p>${text(label)} · ${text(formatDate(item.date))}${item.commune ? ` · ${text(item.commune)}` : ""}</p></div>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-public-content="${attr(target)}" data-id="${attr(item.id)}">Supprimer</button>` : ""}</article>`).join("") || empty("Aucun contenu.")}</section>
  </div>`;
}

function renderKeywordsAdmin() {
  const contactKeywords = normalizeKeywords(adminState.contactKeywords || []);
  return `<div class="keywords-admin">
    <section class="admin-panel"><div><h3>Gestion des mots-clés</h3><p>Étiquettes des contacts.</p><small class="admin-sync-note">${text(adminSyncMessage)}</small></div></section>
    <div class="admin-settings-grid">
      <form class="admin-form" data-keyword-create="contact"><h3>Etiquette contact</h3><div class="form-grid"><label>Libelle<input name="label" required /></label><label>Couleur<input name="color" type="color" value="#2d6fb6" /></label></div><button class="primary-action compact" type="submit">Ajouter</button></form>
    </div>
    <section class="admin-table">
      ${contactKeywords.map((item) => `<article class="admin-row"><div><strong>${text(item.label)}</strong><p>${text(item.id)}</p></div><div class="form-actions"><span class="keyword-swatch" style="background:${attr(item.color)}"></span>${isAdmin() ? `<button class="secondary-action compact danger" type="button" data-delete-keyword="contact" data-id="${attr(item.id)}">Retirer</button>` : ""}</div></article>`).join("")}
    </section>
  </div>`;
}

function renderSocialAdmin() {
  const links = state.socialLinks || {};
  return `<div class="admin-settings-grid">
    <form class="admin-form" data-social-update>
      <h3>Reseaux du depute</h3>
      <div class="form-grid">
        <label>Assemblee nationale<input name="assembly" type="url" value="${attr(links.assembly || "")}" /></label>
        <label>X / Twitter<input name="twitter" type="url" value="${attr(links.twitter || "")}" /></label>
        <label>Facebook<input name="facebook" type="url" value="${attr(links.facebook || "")}" /></label>
        <label>Instagram<input name="instagram" type="url" value="${attr(links.instagram || "")}" /></label>
        <label>Threads<input name="threads" type="url" value="${attr(links.threads || "")}" /></label>
        <label>TikTok<input name="tiktok" type="url" value="${attr(links.tiktok || "")}" /></label>
      </div>
      <button class="primary-action" type="submit">Enregistrer en base</button>
    </form>
  </div>`;
}

function renderMobileMenuSettings() {
  const selected = new Set(normalizeMobileAdminMenu(adminState.mobileAdminMenu));
  return `<div class="admin-settings-grid mobile-menu-settings"><form class="admin-form" data-mobile-menu-settings><div><h2>Menu administrateur mobile</h2><p>Choisissez les raccourcis qui apparaissent dans la barre de navigation sur téléphone. Les rubriques « Site web » et « Options » sont toutes disponibles ici.</p></div><div class="mobile-menu-choice-list">${adminMenu.groups.map((group) => `<fieldset><legend>${text(group.label)}</legend>${group.items.map(([id, label]) => `<label><input type="checkbox" name="items" value="${attr(id)}" ${selected.has(id) ? "checked" : ""} /><span>${text(label)}</span></label>`).join("")}</fieldset>`).join("")}</div><button class="primary-action" type="submit">Enregistrer le menu mobile</button></form></div>`;
}

function renderMapSettings() {
  const campaign = adminState.campaign || normalizeCampaign(null);
  const count = campaignFeatures().length;
  return `<div class="map-settings-admin"><section class="admin-panel"><div><h2>Carte GeoJSON commune</h2><p>La carte des événements locaux utilise exactement le même fichier que « Campagne → Terrain ».</p></div></section><section class="admin-form map-settings-card"><div><h3>${campaign.geojson ? text(campaign.fileName || "Carte chargée") : "Aucun GeoJSON chargé"}</h3><p>${campaign.geojson ? `${count} zone(s) disponibles. Les événements locaux déterminent automatiquement leur couleur.` : "Chargez un fichier ici ou depuis le menu Terrain. Il sera utilisé aux deux endroits."}</p></div><label class="primary-action campaign-file-button">${campaign.geojson ? "Remplacer le GeoJSON commun" : "Charger un GeoJSON"}<input type="file" accept=".geojson,.json,application/geo+json,application/json" data-campaign-geojson /></label>${campaign.geojson ? `<button class="secondary-action" type="button" data-admin-section="campaign-terrain">Ouvrir dans Terrain</button>` : ""}</section><section class="heatmap-legend-admin"><h3>Échelle des événements locaux</h3><div class="heatmap-gradient"></div><div><span>Jamais sur la commune</span><span>Souvent sur la commune</span></div></section></div>`;
}

function campaignFilterDefinitions() {
  return [
    { id: "boitage", label: "Boitage", description: "Zone coloree en bleu clair" },
    { id: "marche", label: "Marché", description: "Hachures verticales" },
    { id: "lettre-parlementaire", label: "Lettre parlementaire", description: "Hachures horizontales" }
  ];
}

function campaignFilterIds() {
  return campaignFilterDefinitions().map((filter) => filter.id);
}

function campaignFeatures() {
  const geojson = adminState.campaign?.geojson;
  if (!geojson) return [];
  if (geojson.type === "FeatureCollection") return Array.isArray(geojson.features) ? geojson.features : [];
  if (geojson.type === "Feature") return [geojson];
  return [{ type: "Feature", properties: {}, geometry: geojson }];
}

function campaignFeatureId(feature, index) {
  const properties = feature?.properties || {};
  const candidate = feature?.id ?? properties.id ?? properties.ID ?? properties.code ?? properties.CODE ?? properties.insee ?? properties.INSEE_COM ?? properties.nom ?? properties.name;
  return `campaign-${index}-${String(candidate ?? "feature").slice(0, 120)}`;
}

function campaignFeatureName(feature, index) {
  const properties = feature?.properties || {};
  return String(properties.nom ?? properties.name ?? properties.commune ?? properties.libelle ?? properties.label ?? properties.adresse ?? properties.address ?? properties.ref ?? campaignFeatureId(feature, index));
}

function walkCampaignCoordinates(geometry, callback) {
  if (!geometry) return;
  if (geometry.type === "GeometryCollection") {
    (geometry.geometries || []).forEach((item) => walkCampaignCoordinates(item, callback));
    return;
  }
  const visit = (coordinates) => {
    if (!Array.isArray(coordinates)) return;
    if (coordinates.length >= 2 && Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]))) {
      callback(Number(coordinates[0]), Number(coordinates[1]));
      return;
    }
    coordinates.forEach(visit);
  };
  visit(geometry.coordinates);
}

function campaignProjection(features) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  features.forEach((feature) => walkCampaignCoordinates(feature.geometry, (x, y) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }));
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  const width = Math.max(maxX - minX, 0.000001);
  const height = Math.max(maxY - minY, 0.000001);
  const scale = Math.min(900 / width, 600 / height);
  const offsetX = (1000 - width * scale) / 2;
  const offsetY = (700 - height * scale) / 2;
  return {
    point: ([x, y]) => [offsetX + (Number(x) - minX) * scale, 700 - offsetY - (Number(y) - minY) * scale]
  };
}

function campaignLinePath(coordinates, projection, close = false) {
  const points = (coordinates || []).filter((point) => Array.isArray(point) && point.length >= 2).map(projection.point);
  if (!points.length) return "";
  return `${points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")}${close ? " Z" : ""}`;
}

function campaignGeometryMarkup(geometry, projection, fill) {
  if (!geometry || !projection) return "";
  if (geometry.type === "Polygon") return `<path d="${attr((geometry.coordinates || []).map((ring) => campaignLinePath(ring, projection, true)).join(" "))}" fill="${attr(fill)}" fill-rule="evenodd" />`;
  if (geometry.type === "MultiPolygon") return `<path d="${attr((geometry.coordinates || []).flatMap((polygon) => polygon.map((ring) => campaignLinePath(ring, projection, true))).join(" "))}" fill="${attr(fill)}" fill-rule="evenodd" />`;
  if (geometry.type === "LineString") return `<path d="${attr(campaignLinePath(geometry.coordinates, projection))}" fill="none" />`;
  if (geometry.type === "MultiLineString") return (geometry.coordinates || []).map((line) => `<path d="${attr(campaignLinePath(line, projection))}" fill="none" />`).join("");
  if (geometry.type === "Point") {
    const [x, y] = projection.point(geometry.coordinates || [0, 0]);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="7" fill="${attr(fill)}" />`;
  }
  if (geometry.type === "MultiPoint") return (geometry.coordinates || []).map((point) => {
    const [x, y] = projection.point(point);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="7" fill="${attr(fill)}" />`;
  }).join("");
  if (geometry.type === "GeometryCollection") return (geometry.geometries || []).map((item) => campaignGeometryMarkup(item, projection, fill)).join("");
  return "";
}

function campaignFeatureCenter(feature, projection) {
  const points = [];
  walkCampaignCoordinates(feature.geometry, (x, y) => points.push(projection.point([x, y])));
  if (!points.length) return null;
  return [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length];
}

function campaignPatternDefinitions() {
  return Array.from({ length: 8 }, (_, mask) => {
    const ids = campaignFilterIds().filter((_, index) => mask & (1 << index));
    const name = ids.length ? ids.join("-") : "none";
    return `<pattern id="campaign-pattern-${attr(name)}" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="${ids.includes("boitage") ? "#b9def7" : "#eef2f6"}" />
      ${ids.includes("marche") ? `<path d="M3 0V12 M9 0V12" stroke="#d74855" stroke-width="1.6" />` : ""}
      ${ids.includes("lettre-parlementaire") ? `<path d="M0 3H12 M0 9H12" stroke="#18845e" stroke-width="1.6" />` : ""}
    </pattern>`;
  }).join("");
}

function campaignPatternFor(filters) {
  const ordered = campaignFilterIds().filter((id) => (filters || []).includes(id));
  return `url(#campaign-pattern-${ordered.length ? ordered.join("-") : "none"})`;
}

function campaignFeatureIsCommune(feature) {
  return ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type);
}

function campaignCommuneIndex(features) {
  const names = new Map();
  const aliases = new Map();
  features.forEach((feature, index) => {
    if (!campaignFeatureIsCommune(feature)) return;
    const name = campaignFeatureName(feature, index).trim();
    const key = normalizeName(name);
    if (!key) return;
    if (!names.has(key)) names.set(key, name);
    const alias = key.replace(/^(?:le|la|les|l)\s+/, "");
    if (!aliases.has(alias)) aliases.set(alias, new Set());
    aliases.get(alias).add(key);
  });
  return { names, aliases };
}

function campaignContactCommuneKey(contact, index) {
  if (contact.campaignMapCommune === "__NONE__") return "";
  const override = normalizeName(contact.campaignMapCommune || "");
  if (override) return index.names.has(override) ? override : "";
  const city = normalizeName(contact.city || "");
  if (index.names.has(city)) return city;
  const alias = city.replace(/^(?:le|la|les|l)\s+/, "");
  const matches = index.aliases.get(alias);
  return matches?.size === 1 ? [...matches][0] : "";
}

function campaignContactStats(features) {
  const index = campaignCommuneIndex(features);
  const counts = new Map();
  const unresolved = [];
  const manual = [];
  let excluded = 0;
  let matched = 0;
  adminState.localContacts.forEach((contact) => {
    const key = campaignContactCommuneKey(contact, index);
    if (key) { counts.set(key, (counts.get(key) || 0) + 1); matched += 1; if (contact.campaignMapCommune) manual.push(contact); }
    else if (contact.campaignMapCommune === "__NONE__") { excluded += 1; unresolved.push(contact); }
    else unresolved.push(contact);
  });
  return { index, counts, unresolved, manual, excluded, matched };
}

function campaignCountPasses(count) {
  return (!campaignCountFilters.minEnabled || count >= campaignCountFilters.min) && (!campaignCountFilters.maxEnabled || count <= campaignCountFilters.max);
}

function campaignCountColor(count, max) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, count / max)) : 0;
  const start = [255, 255, 255], end = [20, 83, 163];
  return `rgb(${start.map((channel, index) => Math.round(channel + (end[index] - channel) * ratio)).join(",")})`;
}

async function assignCampaignContactCommune(contactId, commune) {
  const contact = adminState.localContacts.find((item) => item.id === contactId);
  if (!contact) return;
  const index = campaignCommuneIndex(campaignFeatures());
  const name = ["__NONE__", "__AUTO__"].includes(commune) ? commune : index.names.get(normalizeName(commune));
  if (!name) { showToast("Choisissez une commune présente dans le GeoJSON."); return; }
  const sourceCommune = normalizeName(contact.city);
  const contacts = sourceCommune ? adminState.localContacts.filter((item) => normalizeName(item.city) === sourceCommune) : [contact];
  const previousState = { ...cloneAdminState(), localContacts: adminState.localContacts.map((item) => ({ ...item })) };
  const updatedAt = new Date().toISOString();
  contacts.forEach((item) => {
    if (name === "__AUTO__") delete item.campaignMapCommune;
    else item.campaignMapCommune = name;
    item.updatedAt = updatedAt;
  });
  const detail = `${contacts.length} contact(s) · ${contact.city || contactDisplayName(contact)} → ${name}`;
  const saved = contacts.length === 1
    ? await saveAdminEntityUpdates([adminEntityUpdate("localContacts", contact)], "attribution commune", "contact", detail, previousState)
    : await saveAdminStateToDatabaseOnly("attribution commune", "contacts", detail, previousState);
  if (saved) showToast(name === "__NONE__" ? `${contacts.length} contact(s) exclu(s) de la carte.` : name === "__AUTO__" ? `Attribution automatique rétablie pour ${contacts.length} contact(s).` : `${contacts.length} contact(s) attribué(s) à ${name}.`);
}

function renderCampaignMap(features, stats = campaignContactStats(features)) {
  const projection = campaignProjection(features);
  if (!projection) return `<div class="campaign-map-error">Le fichier ne contient pas de coordonnees exploitables.</div>`;
  const assignments = adminState.campaign.assignments || {};
  const searchedKey = campaignContactCommuneKey({ city: campaignSearchQuery }, stats.index);
  const maxCount = Math.max(0, ...stats.counts.values());
  const shapes = features.map((feature, index) => {
    const id = campaignFeatureId(feature, index);
    const name = campaignFeatureName(feature, index);
    const commune = campaignFeatureIsCommune(feature);
    const count = commune ? stats.counts.get(normalizeName(name)) || 0 : 0;
    const searched = commune && searchedKey && normalizeName(name) === searchedKey;
    const filteredOut = commune && !campaignCountPasses(count);
    const selected = selectedCampaignFeatureIds.has(id);
    const filters = assignments[id] || [];
    const center = campaignFeatureCenter(feature, projection);
    const label = center && features.length <= 250 ? `<text x="${center[0].toFixed(2)}" y="${center[1].toFixed(2)}">${text(name.slice(0, 24))}</text>` : "";
    const fill = campaignGradientEnabled && commune ? campaignCountColor(count, maxCount) : campaignPatternFor(filters);
    const marker = searched && center ? `<circle class="campaign-search-marker" cx="${center[0].toFixed(2)}" cy="${center[1].toFixed(2)}" r="11" />` : "";
    return `<g class="campaign-map-feature ${selected ? "is-selected" : ""} ${searched ? "is-searched" : ""} ${filteredOut ? "is-count-filtered" : ""}" data-campaign-feature="${attr(id)}" data-campaign-commune="${commune ? attr(name) : ""}" data-campaign-count="${commune ? count : ""}" role="button" tabindex="${filteredOut && !searched ? "-1" : "0"}" aria-label="${attr(`${name}${campaignGradientEnabled && commune ? `, ${count} inscrit${count > 1 ? "s" : ""}` : ""}${filters.length ? `, filtres : ${filters.join(", ")}` : ""}`)}"><title>${text(name)}</title>${campaignGeometryMarkup(feature.geometry, projection, fill)}${label}${marker}</g>`;
  }).join("");
  return `<svg class="campaign-map" viewBox="0 0 1000 700" role="img" aria-label="Carte interactive du fichier GeoJSON"><defs><pattern id="campaign-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#e7edf4" stroke-width="1" /></pattern>${campaignPatternDefinitions()}</defs><rect width="1000" height="700" fill="#f7f9fc" /><rect width="1000" height="700" fill="url(#campaign-grid)" />${shapes}</svg>`;
}

function updateCampaignMapTooltip(event) {
  const tooltip = document.querySelector("#campaign-map-tooltip");
  if (!tooltip) return;
  const feature = event.target.closest?.(".campaign-map-feature[data-campaign-commune]");
  if (!campaignGradientEnabled || event.pointerType === "touch" || !feature?.dataset.campaignCommune) { tooltip.hidden = true; return; }
  const count = Number(feature.dataset.campaignCount || 0);
  tooltip.textContent = `${feature.dataset.campaignCommune} · ${count} inscrit${count > 1 ? "s" : ""}`;
  tooltip.hidden = false;
  const panel = tooltip.closest(".campaign-map-panel");
  const bounds = panel.getBoundingClientRect();
  tooltip.style.left = `${Math.max(8, Math.min(bounds.width - tooltip.offsetWidth - 8, event.clientX - bounds.left + 14))}px`;
  const above = event.clientY - bounds.top - tooltip.offsetHeight - 12;
  tooltip.style.top = `${above >= 8 ? above : event.clientY - bounds.top + 16}px`;
}

function renderCampaignSelection(features, stats = campaignContactStats(features)) {
  const selected = features.map((feature, index) => ({ feature, index, id: campaignFeatureId(feature, index) })).filter((item) => selectedCampaignFeatureIds.has(item.id));
  const assignments = adminState.campaign.assignments || {};
  return `<section class="campaign-control-panel campaign-selection-panel"><header><h3>Selection</h3><span>${selected.length} element(s)</span></header>
    <div class="campaign-selection-list">${selected.map(({ feature, index, id }) => { const name = campaignFeatureName(feature, index); const count = stats.counts.get(normalizeName(name)) || 0; return `<article><button type="button" data-campaign-deselect="${attr(id)}" aria-label="Retirer ${attr(name)} de la selection">×</button><strong>${text(name)}</strong><small>${text(feature.geometry?.type || "Geometrie")}${campaignGradientEnabled && campaignFeatureIsCommune(feature) ? ` <span class="campaign-touch-count">· ${count} inscrit${count > 1 ? "s" : ""}</span>` : ""}</small><div>${(assignments[id] || []).map((filter) => `<button type="button" data-campaign-remove-one="${attr(id)}" data-campaign-filter-id="${attr(filter)}">${text(campaignFilterDefinitions().find((item) => item.id === filter)?.label || filter)} ×</button>`).join("")}</div></article>`; }).join("") || `<p class="empty-state">Cliquez sur une zone, une maison ou une commune dans la carte.</p>`}</div>
    ${selected.length ? `<button class="secondary-action compact" type="button" data-campaign-clear-selection>Vider la selection</button>` : ""}
  </section>`;
}

function renderCampaignUnmatched(stats) {
  const contacts = [...stats.unresolved, ...stats.manual];
  const pages = Math.max(1, Math.ceil(contacts.length / 20));
  campaignUnmatchedPage = Math.min(Math.max(1, campaignUnmatchedPage), pages);
  const page = contacts.slice((campaignUnmatchedPage - 1) * 20, campaignUnmatchedPage * 20);
  const names = [...stats.index.names.values()].sort((a, b) => a.localeCompare(b, "fr"));
  return `<section class="campaign-control-panel campaign-unmatched"><header><h3>Communes à attribuer et corriger</h3><span>${stats.unresolved.length} à traiter · ${stats.manual.length} attribution(s) manuelle(s)</span></header><p>Les variantes évidentes comme « Les Magny » et « Magny » sont rapprochées automatiquement lorsqu'une seule commune correspond. Une attribution ou exclusion s'applique à tous les contacts ayant le même nom de commune dans les données contacts. Si la commune n'est pas renseignée, seule la fiche choisie est modifiée.</p>
    <datalist id="campaign-commune-options">${names.map((name) => `<option value="${attr(name)}"></option>`).join("")}</datalist>
    <div class="campaign-unmatched-list">${page.map((contact) => `<article><div><strong>${text(contactDisplayName(contact))}</strong><small>Commune du contact : ${text(contact.city || "non renseignée")}${contact.campaignMapCommune === "__NONE__" ? " · Non affiché sur la carte" : contact.campaignMapCommune ? ` · Attribué à ${text(contact.campaignMapCommune)}` : ""}</small></div><form data-campaign-contact-map="${attr(contact.id)}"><input name="commune" list="campaign-commune-options" value="${attr(contact.campaignMapCommune && contact.campaignMapCommune !== "__NONE__" ? contact.campaignMapCommune : "")}" placeholder="Commune du GeoJSON" aria-label="Commune du GeoJSON pour ${attr(contactDisplayName(contact))}" /><button class="secondary-action compact" type="submit">Attribuer</button><button class="secondary-action compact" type="button" data-campaign-contact-exclude="${attr(contact.id)}">Sans commune</button>${contact.campaignMapCommune ? `<button class="secondary-action compact" type="button" data-campaign-contact-auto="${attr(contact.id)}">Automatique</button>` : ""}</form></article>`).join("") || `<p class="empty-state">Tous les contacts ont une commune reconnue par le GeoJSON.</p>`}</div>
    ${pages > 1 ? `<div class="campaign-unmatched-pages"><button class="secondary-action compact" type="button" data-campaign-unmatched-page="${campaignUnmatchedPage - 1}" ${campaignUnmatchedPage === 1 ? "disabled" : ""}>Précédent</button><span>Page ${campaignUnmatchedPage} / ${pages}</span><button class="secondary-action compact" type="button" data-campaign-unmatched-page="${campaignUnmatchedPage + 1}" ${campaignUnmatchedPage === pages ? "disabled" : ""}>Suivant</button></div>` : ""}
  </section>`;
}

function renderCampaignTerrain() {
  const campaign = adminState.campaign || normalizeCampaign(null);
  const features = campaignFeatures();
  if (!campaign.geojson) return `<div class="campaign-terrain"><header class="campaign-page-head"><div><h2>Terrain</h2><p>Chargez un fichier GeoJSON pour preparer et suivre les actions de campagne sur la carte.</p></div></header><section class="campaign-empty"><div class="campaign-empty-icon">${localIcon("map")}</div><h3>Aucune carte chargée</h3><p>Le fichier peut contenir des maisons, des zones, des communes, des points ou des lignes.</p><label class="primary-action campaign-file-button">Charger un fichier GeoJSON<input type="file" accept=".geojson,.json,application/geo+json,application/json" data-campaign-geojson /></label></section></div>`;
  const stats = campaignContactStats(features);
  const communeCount = [...stats.index.names.keys()].filter((key) => campaignCountPasses(stats.counts.get(key) || 0)).length;
  const searchKey = campaignContactCommuneKey({ city: campaignSearchQuery }, stats.index);
  const searched = features.find((feature, index) => campaignFeatureIsCommune(feature) && normalizeName(campaignFeatureName(feature, index)) === searchKey);
  const searchedCount = searched ? stats.counts.get(normalizeName(campaignFeatureName(searched, features.indexOf(searched)))) || 0 : 0;
  const searchStatus = campaignSearchQuery ? searched ? `${campaignFeatureName(searched, features.indexOf(searched))} trouvée.${campaignCountPasses(searchedCount) ? "" : " Hors des seuils choisis, mais surlignée pour la retrouver."}` : `Aucune commune nommée exactement « ${campaignSearchQuery} » dans ce GeoJSON.` : "Saisissez le nom exact d'une commune pour la repérer sur la carte.";
  const assignedCount = Object.keys(campaign.assignments || {}).length;
  return `<div class="campaign-terrain">
    <header class="campaign-page-head"><div><h2>Terrain</h2><p>Selectionnez les elements de la carte, puis appliquez ou retirez les filtres souhaites.</p></div><div><button class="secondary-action" type="button" data-campaign-change>Changer de GeoJSON</button><button class="secondary-action danger" type="button" data-campaign-reset>Remettre la campagne à zéro</button><input class="is-hidden" type="file" accept=".geojson,.json,application/geo+json,application/json" data-campaign-geojson data-campaign-replace /></div></header>
    <div class="campaign-workspace">
      <main class="campaign-map-panel"><header><div><strong>${text(campaign.fileName || "Carte GeoJSON")}</strong><span>${features.length} élément(s) · ${assignedCount} avec filtre(s) · ${communeCount} commune(s) affichée(s)</span></div><p>Cliquez sur la carte pour ajouter ou retirer des éléments de la sélection.</p></header><form class="campaign-search" data-campaign-search><label>Rechercher une commune exacte<input name="commune" type="search" list="campaign-search-options" value="${attr(campaignSearchQuery)}" placeholder="Ex. Magny" autocomplete="off" /></label><datalist id="campaign-search-options">${[...stats.index.names.values()].sort((a, b) => a.localeCompare(b, "fr")).map((name) => `<option value="${attr(name)}"></option>`).join("")}</datalist><button class="primary-action compact" type="submit">Trouver</button><button class="secondary-action compact" type="button" data-campaign-search-clear>Effacer</button></form><p class="campaign-search-status" role="status">${text(searchStatus)}</p>${renderCampaignMap(features, stats)}<div id="campaign-map-tooltip" class="campaign-map-tooltip" role="tooltip" hidden></div></main>
      <aside class="campaign-controls">
        <section class="campaign-control-panel campaign-count-controls"><header><h3>Inscrits par commune</h3></header><p>${stats.matched} contact(s) rapproché(s) d'une commune · ${stats.unresolved.length - stats.excluded} à attribuer · ${stats.excluded} sans commune sur la carte.</p><label class="campaign-toggle"><input type="checkbox" data-campaign-gradient ${campaignGradientEnabled ? "checked" : ""} /> Dégradé blanc–bleu et nombre exact d'inscrits au survol</label><small>Le dégradé remplace temporairement les hachures de terrain. Survolez une commune pour voir son total précis ; sur mobile, touchez-la.</small><div class="campaign-count-range"><label class="campaign-toggle"><input type="checkbox" data-campaign-min-enabled ${campaignCountFilters.minEnabled ? "checked" : ""} /> Minimum</label><input type="number" min="0" step="1" value="${campaignCountFilters.min}" data-campaign-min aria-label="Nombre minimum d'inscrits" ${campaignCountFilters.minEnabled ? "" : "disabled"} /><label class="campaign-toggle"><input type="checkbox" data-campaign-max-enabled ${campaignCountFilters.maxEnabled ? "checked" : ""} /> Maximum</label><input type="number" min="0" step="1" value="${campaignCountFilters.max}" data-campaign-max aria-label="Nombre maximum d'inscrits" ${campaignCountFilters.maxEnabled ? "" : "disabled"} /></div>${campaignGradientEnabled ? `<div class="campaign-count-legend"><span>0</span><i></i><span>${Math.max(0, ...stats.counts.values())}</span></div>` : ""}</section>
        <section class="campaign-control-panel"><header><h3>Filtres de terrain</h3></header><div class="campaign-filter-list">${campaignFilterDefinitions().map((filter) => `<label class="campaign-filter campaign-filter-${attr(filter.id)}"><input type="checkbox" data-campaign-filter="${attr(filter.id)}" ${selectedCampaignFilters.has(filter.id) ? "checked" : ""} /><span class="campaign-filter-swatch"></span><strong>${text(filter.label)}</strong><small>${text(filter.description)}</small></label>`).join("")}</div><div class="campaign-filter-actions"><button class="primary-action compact" type="button" data-campaign-apply ${selectedCampaignFeatureIds.size && selectedCampaignFilters.size ? "" : "disabled"}>Appliquer</button><button class="secondary-action compact" type="button" data-campaign-remove ${selectedCampaignFeatureIds.size && selectedCampaignFilters.size ? "" : "disabled"}>Retirer</button></div></section>
        ${renderCampaignSelection(features, stats)}
        <section class="campaign-control-panel campaign-legend"><h3>Legende</h3>${campaignFilterDefinitions().map((filter) => `<div><span class="campaign-legend-${attr(filter.id)}"></span><p><strong>${text(filter.label)}</strong><small>${text(filter.description)}</small></p></div>`).join("")}<p class="campaign-legend-note">Les couleurs et hachures se cumulent lorsqu'un element possede plusieurs filtres.</p></section>
      </aside>
    </div>
    ${renderCampaignUnmatched(stats)}
  </div>`;
}

function normalizeImportedCampaignGeojson(value) {
  if (!value || typeof value !== "object") throw new Error("Le fichier GeoJSON est invalide.");
  let collection;
  if (value.type === "FeatureCollection") collection = value;
  else if (value.type === "Feature") collection = { type: "FeatureCollection", features: [value] };
  else if (value.type && (value.coordinates || value.geometries)) collection = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: value }] };
  else throw new Error("Le fichier doit contenir une FeatureCollection, une Feature ou une geometrie GeoJSON.");
  const allowed = new Set(["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"]);
  const features = (Array.isArray(collection.features) ? collection.features : []).filter((feature) => feature?.type === "Feature" && allowed.has(feature.geometry?.type));
  if (!features.length) throw new Error("Aucune geometrie compatible n'a ete trouvee dans ce fichier.");
  if (features.length > 10000) throw new Error("Le fichier contient plus de 10 000 elements et ne peut pas etre charge.");
  return { type: "FeatureCollection", features };
}

async function importCampaignGeojson(file) {
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) throw new Error("Le fichier GeoJSON ne doit pas depasser 25 Mo.");
  let parsed;
  try { parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, "")); }
  catch { throw new Error("Le fichier sélectionné n'est pas un JSON valide."); }
  const geojson = normalizeImportedCampaignGeojson(parsed);
  adminState.campaign = { geojson, fileName: file.name, assignments: {}, importedAt: new Date().toISOString() };
  state.terrainGeojson = geojson;
  state.terrainGeojsonFileName = file.name;
  communesGeojson = geojson;
  saveState();
  selectedCampaignFeatureIds = new Set();
  selectedCampaignFilters = new Set(["boitage"]);
  campaignSearchQuery = "";
  campaignCountFilters = { minEnabled: false, min: 0, maxEnabled: false, max: 0 };
  campaignUnmatchedPage = 1;
  saveAdminState("import", "campagne terrain", file.name);
  showToast(`${geojson.features.length} element(s) charge(s) sur la carte.`);
}

function updateCampaignAssignments(mode) {
  if (!selectedCampaignFeatureIds.size || !selectedCampaignFilters.size) return;
  const assignments = { ...(adminState.campaign.assignments || {}) };
  selectedCampaignFeatureIds.forEach((id) => {
    const current = new Set(assignments[id] || []);
    selectedCampaignFilters.forEach((filter) => mode === "apply" ? current.add(filter) : current.delete(filter));
    const ordered = campaignFilterIds().filter((filter) => current.has(filter));
    if (ordered.length) assignments[id] = ordered;
    else delete assignments[id];
  });
  adminState.campaign.assignments = assignments;
  saveAdminState(mode === "apply" ? "application filtres" : "retrait filtres", "campagne terrain", `${selectedCampaignFeatureIds.size} element(s)`);
}

function resetCampaign() {
  adminState.campaign = normalizeCampaign(null);
  state.terrainGeojson = null;
  state.terrainGeojsonFileName = "";
  communesGeojson = null;
  saveState();
  selectedCampaignFeatureIds = new Set();
  selectedCampaignFilters = new Set(["boitage"]);
  campaignSearchQuery = "";
  campaignCountFilters = { minEnabled: false, min: 0, maxEnabled: false, max: 0 };
  campaignUnmatchedPage = 1;
  saveAdminState("reinitialisation", "campagne terrain", "Toutes les donnees de campagne");
}

function photoLibraryData(source = adminState.photoLibrary) {
  return normalizePhotoLibrary(source || state.photoLibrary);
}

function ensureAdminPhotoLibrary() {
  if (!adminState.photoLibrary?.photos?.length && state.photoLibrary?.photos?.length) {
    const publicLibrary = normalizePhotoLibrary(state.photoLibrary);
    const adminLibrary = normalizePhotoLibrary(adminState.photoLibrary);
    adminState.photoLibrary = { folders: [...adminLibrary.folders, ...publicLibrary.folders.filter((folder) => !adminLibrary.folders.some((item) => item.id === folder.id))], photos: publicLibrary.photos };
  }
}

function photoDetails(photo) {
  const event = photo.eventId && state.agenda.find((item) => item.id === photo.eventId);
  return { commune: event ? String(event.commune || "") : String(photo.commune || ""), takenAt: event ? String(event.date || "") : String(photo.takenAt || "") };
}

function eventPhotoKey(commune, date) {
  const normalizedCommune = normalizeName(commune || "").trim();
  const normalizedDate = String(date || "").slice(0, 10);
  return normalizedCommune && /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) ? `${normalizedDate}|${normalizedCommune}` : "";
}

function availableEventPhotoKeys() {
  const events = new Map(state.agenda.map((item) => [item.id, item]));
  const keys = new Set();
  normalizePhotoLibrary(state.photoLibrary).photos.forEach((photo) => {
    const event = events.get(photo.eventId);
    const key = eventPhotoKey(event ? event.commune : photo.commune, event ? event.date : photo.takenAt);
    if (key) keys.add(key);
  });
  return keys;
}

function eventPhotosButton(item, keys) {
  return keys.has(eventPhotoKey(item.commune, item.date))
    ? `<button class="event-photos-link" type="button" data-event-photos="${attr(item.id)}" aria-label="Photos de ${attr(item.title)}">Photos</button>`
    : "";
}

function publishPhotoLibrary(action, detail) {
  adminState.photoLibrary = normalizePhotoLibrary(adminState.photoLibrary);
  state.photoLibrary = JSON.parse(JSON.stringify(adminState.photoLibrary));
  saveState(["photoLibrary"]);
  saveAdminState(action, "phototheque", detail);
  renderPhotoLibrary();
  renderAgenda();
  renderSearchResults();
}

function renderPhotoLibraryAdmin() {
  const library = photoLibraryData();
  if (selectedPhotoFolderId === "all" && library.folders.length) selectedPhotoFolderId = library.folders[0].id;
  if (selectedPhotoFolderId !== "all" && !library.folders.some((folder) => folder.id === selectedPhotoFolderId)) selectedPhotoFolderId = library.folders[0]?.id || "all";
  const activeFolder = library.folders.find((folder) => folder.id === selectedPhotoFolderId);
  const folderPhotos = activeFolder ? library.photos.filter((photo) => photo.folderId === activeFolder.id) : [];
  const visiblePhotos = folderPhotos.filter((photo) => { const details = photoDetails(photo); return (!photoAdminFilters.commune || normalizeName(details.commune).includes(normalizeName(photoAdminFilters.commune))) && (!photoAdminFilters.date || details.takenAt === photoAdminFilters.date); });
  const pageCount = Math.max(1, Math.ceil(visiblePhotos.length / 30));
  photoAdminFilters.page = Math.min(Math.max(1, photoAdminFilters.page), pageCount);
  const pagePhotos = visiblePhotos.slice((photoAdminFilters.page - 1) * 30, photoAdminFilters.page * 30);
  return `<div class="photo-admin">
    <header class="photo-admin-head"><div><h2>Gérer la photothèque</h2><p>Ajoutez des photos directement ou classez-les dans un dossier.</p></div><form data-photo-folder-create><input name="name" required maxlength="120" placeholder="Nom du nouveau dossier" aria-label="Nom du nouveau dossier" /><button class="primary-action" type="submit">Créer un dossier</button></form></header>
    <section class="photo-admin-upload"><div><h3>Charger directement des photos</h3><p>Choisissez plusieurs images, même sans créer de dossier. Renseignez ensuite leur commune et leur date.</p></div><label><span>${localIcon("image")}</span><strong>Choisir des photos</strong><small>JPG, PNG, WebP ou HEIC · 10 Mo par fichier</small><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" data-photo-upload="direct" /></label></section>
    <section class="photo-admin-folders"><header><h3>Dossiers</h3><span>${library.folders.length} dossier(s)</span></header><div>${library.folders.map((folder) => { const count = library.photos.filter((photo) => photo.folderId === folder.id).length; return `<article class="${folder.id === selectedPhotoFolderId ? "is-active" : ""}"><button type="button" data-photo-folder-select="${attr(folder.id)}"><span>${localIcon("file")}</span><strong>${text(folder.name)}</strong><small>${count} photo(s)</small></button>${folder.id === EVENT_PHOTO_FOLDER_ID ? "" : `<button class="photo-folder-delete" type="button" data-photo-folder-delete="${attr(folder.id)}" aria-label="Supprimer le dossier ${attr(folder.name)}">×</button>`}</article>`; }).join("") || `<p class="empty-state">Créez votre premier dossier pour commencer.</p>`}</div></section>
    ${activeFolder ? `<section class="photo-admin-upload"><div><h3>Ajouter dans « ${text(activeFolder.name)} »</h3><p>Importez plusieurs photos dans ce dossier.</p></div><label><span>${localIcon("image")}</span><strong>Choisir des photos</strong><small>JPG, PNG, WebP ou HEIC · 10 Mo par fichier</small><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" data-photo-upload="${attr(activeFolder.id)}" /></label></section>
    <section class="photo-admin-list"><header><div><h3>Photos du dossier</h3><p>${visiblePhotos.length} photo(s) affichée(s) sur ${folderPhotos.length}</p></div></header>
      <form class="photo-admin-filters" data-photo-admin-filter><label>Commune<input name="commune" value="${attr(photoAdminFilters.commune)}" placeholder="Rechercher une commune" /></label><label>Date<input name="date" type="date" value="${attr(photoAdminFilters.date)}" /></label><button class="secondary-action compact" type="submit">Filtrer</button><button class="secondary-action compact" type="button" data-photo-admin-clear>Effacer</button></form>
      <div class="photo-admin-grid">${pagePhotos.map((photo) => { const details = photoDetails(photo); return `<article><img src="${attr(photo.thumbnail || photo.src)}" alt="${attr(photo.alt || details.commune || "Photo")}" loading="lazy" /><form data-photo-update="${attr(photo.id)}">${photo.eventId && state.agenda.some((item) => item.id === photo.eventId) ? `<p>Liée à un événement · ${text(details.commune || "Commune non renseignée")} · ${text(details.takenAt ? formatDate(details.takenAt) : "Date non renseignée")}</p>` : `<label>Commune<input name="commune" value="${attr(details.commune)}" list="communes-list" placeholder="Commune" /></label><label>Date<input name="takenAt" type="date" value="${attr(details.takenAt)}" /></label>`}<label>Description (facultative)<input name="alt" value="${attr(photo.alt)}" placeholder="Description accessible" /></label><div><button class="secondary-action compact" type="submit">Enregistrer</button><button class="secondary-action compact danger" type="button" data-photo-delete="${attr(photo.id)}">Supprimer</button></div></form></article>`; }).join("") || `<p class="empty-state">Aucune photo pour ces filtres.</p>`}</div>
      ${pageCount > 1 ? `<nav class="photo-admin-pagination" aria-label="Pages des photos"><button type="button" data-photo-admin-page="${photoAdminFilters.page - 1}" ${photoAdminFilters.page === 1 ? "disabled" : ""}>Précédent</button><span>Page ${photoAdminFilters.page} / ${pageCount}</span><button type="button" data-photo-admin-page="${photoAdminFilters.page + 1}" ${photoAdminFilters.page === pageCount ? "disabled" : ""}>Suivant</button></nav>` : ""}
    </section>` : `<section class="photo-admin-welcome"><h3>Aucun dossier sélectionné</h3><p>Chargez directement des photos ou créez un dossier.</p></section>`}
  </div>`;
}

function renderPhotoLibrary() {
  const results = document.querySelector("#photo-library-results");
  const foldersTarget = document.querySelector("#photo-folder-filter");
  const pagination = document.querySelector("#photo-library-pagination");
  if (!results || !foldersTarget || !pagination) return;
  const library = normalizePhotoLibrary(state.photoLibrary);
  const place = normalizeName(document.querySelector("#photo-place-filter")?.value || "");
  const start = document.querySelector("#photo-date-start")?.value || "";
  const end = document.querySelector("#photo-date-end")?.value || "";
  const activeFolder = selectedPhotoFolderId === "all" || library.folders.some((folder) => folder.id === selectedPhotoFolderId) ? selectedPhotoFolderId : "all";
  foldersTarget.innerHTML = `<button type="button" class="${activeFolder === "all" ? "is-active" : ""}" data-public-photo-folder="all"><strong>Tous les dossiers</strong><small>${library.photos.length} photo(s)</small></button>${library.folders.map((folder) => `<button type="button" class="${activeFolder === folder.id ? "is-active" : ""}" data-public-photo-folder="${attr(folder.id)}"><strong>${text(folder.name)}</strong><small>${library.photos.filter((photo) => photo.folderId === folder.id).length} photo(s)</small></button>`).join("")}`;
  const filtered = library.photos.filter((photo) => { const details = photoDetails(photo); const commune = normalizeName(details.commune); return (activeFolder === "all" || photo.folderId === activeFolder) && (!place || (photoFilterExactCommune ? commune === place : commune.includes(place))) && (!start || details.takenAt >= start) && (!end || details.takenAt <= end); }).sort((a, b) => String(photoDetails(b).takenAt || b.createdAt).localeCompare(String(photoDetails(a).takenAt || a.createdAt)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  photoLibraryPage = Math.min(Math.max(1, photoLibraryPage), pageCount);
  const pagePhotos = filtered.slice((photoLibraryPage - 1) * 20, photoLibraryPage * 20);
  results.innerHTML = pagePhotos.length ? `<div class="photo-public-grid">${pagePhotos.map((photo) => { const details = photoDetails(photo); return `<figure><button type="button" data-photo-open="${attr(photo.id)}"><img src="${attr(photo.thumbnail || photo.src)}" alt="${attr(photo.alt || `Photo prise à ${details.commune || "une commune non renseignée"}`)}" loading="lazy" /></button><figcaption><strong>${text(details.commune || "Commune non renseignée")}</strong><time datetime="${attr(details.takenAt)}">${text(details.takenAt ? formatDate(details.takenAt) : "Date non renseignée")}</time></figcaption></figure>`; }).join("")}</div>` : `<div class="photo-public-empty"><h3>Aucune photo trouvée</h3><p>Modifiez la commune, la période ou le dossier sélectionné.</p></div>`;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => page === 1 || page === pageCount || Math.abs(page - photoLibraryPage) <= 2);
  pagination.innerHTML = filtered.length > 20 ? `<span>20 photos par page</span><div><button type="button" data-photo-page="${photoLibraryPage - 1}" ${photoLibraryPage === 1 ? "disabled" : ""}>←</button>${pages.map((page, index) => `${index && page - pages[index - 1] > 1 ? "<i>…</i>" : ""}<button type="button" class="${page === photoLibraryPage ? "is-active" : ""}" data-photo-page="${page}">${page}</button>`).join("")}<button type="button" data-photo-page="${photoLibraryPage + 1}" ${photoLibraryPage === pageCount ? "disabled" : ""}>→</button></div><strong>${filtered.length} photo(s)</strong>` : `<span>${filtered.length} photo(s) · 20 photos maximum par page</span>`;
}

function isPhotoFile(file) {
  return Boolean(file && (file.type?.startsWith("image/") || /\.(?:jpe?g|png|webp|heic|heif)$/i.test(file.name || "")));
}

async function decodeBrowserImage(blob, fileName) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); }
    catch {
      try { return await createImageBitmap(blob); } catch {}
    }
  }

  // Some mobile browsers cannot decode an object URL backed by a picker file.
  // Keep the URL alive until the image has been copied to the canvas.
  const loadImage = (src) => new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error(`Impossible de lire ${fileName}.`));
    element.src = src;
  });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await loadImage(objectUrl);
    // Decouple the decoded image from the temporary URL before revoking it.
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    if (!canvas.width || !canvas.height) throw new Error(`Impossible de lire ${fileName}.`);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible de préparer l'image sur cet appareil.");
    context.drawImage(image, 0, 0);
    return canvas;
  } catch (objectUrlError) {
    // Android gallery / document pickers sometimes expose images that only
    // decode correctly once read into a regular data URL.
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || objectUrlError);
        reader.readAsDataURL(blob);
      });
      return await loadImage(dataUrl);
    } catch {
      throw objectUrlError;
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function isHeifImage(file) {
  if (/hei[cf]/i.test(file.type || "") || /\.(?:heic|heif)$/i.test(file.name || "")) return true;
  // Phones may label a HEIC as image/jpeg or application/octet-stream.
  try {
    const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const brand = String.fromCharCode(...header.slice(8, 12));
    return header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70
      && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand);
  } catch { return false; }
}

async function decodePhotoFile(file) {
  try {
    return await decodeBrowserImage(file, file.name);
  } catch (nativeError) {
    if (!await isHeifImage(file)) throw nativeError;
    try {
      const { heicTo } = await import("./assets/vendor/heic-to-csp.js?v=1.5.2");
      const converted = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
      return await decodeBrowserImage(converted, file.name);
    } catch {
      throw new Error(`Impossible de convertir ${file.name}. Essayez de partager la photo au format JPEG.`);
    }
  }
}

async function resizePhotoForLibrary(file) {
  if (!isPhotoFile(file)) throw new Error(`${file?.name || "Le fichier"} n'est pas une image compatible.`);
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} dépasse 10 Mo.`);
  const image = await decodePhotoFile(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const ratio = Math.min(1, 1440 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  if (typeof image.close === "function") image.close();
  return canvas.toDataURL("image/webp", 0.8);
}

function exifString(view, offset, length) {
  let value = ""; for (let i = 0; i < length; i += 1) { const byte = view.getUint8(offset + i); if (!byte) break; value += String.fromCharCode(byte); } return value.trim();
}

async function photoExif(file) {
  if (file.type !== "image/jpeg") return {};
  const view = new DataView(await file.arrayBuffer());
  if (view.byteLength < 12 || view.getUint16(0) !== 0xffd8) return {};
  let marker = 2, tiff = -1;
  while (marker + 4 < view.byteLength) { if (view.getUint16(marker) !== 0xffe1) { marker += 2 + view.getUint16(marker + 2); continue; } if (exifString(view, marker + 4, 4) === "Exif") { tiff = marker + 10; break; } marker += 2 + view.getUint16(marker + 2); }
  if (tiff < 0) return {};
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (at) => view.getUint16(at, little), u32 = (at) => view.getUint32(at, little);
  const entries = (offset) => { const output = new Map(); const base = tiff + offset; if (base + 2 > view.byteLength) return output; const count = u16(base); for (let i = 0; i < count; i += 1) { const row = base + 2 + i * 12; if (row + 12 > view.byteLength) break; output.set(u16(row), { type: u16(row + 2), count: u32(row + 4), raw: row + 8, offset: u32(row + 8) }); } return output; };
  const root = entries(u32(tiff + 4)); const exifPointer = root.get(0x8769); const gpsPointer = root.get(0x8825); let takenAt = ""; let latitude = null; let longitude = null;
  if (exifPointer) { const dateTag = entries(exifPointer.offset).get(0x9003); if (dateTag) { const at = dateTag.count <= 4 ? dateTag.raw : tiff + dateTag.offset; const raw = exifString(view, at, dateTag.count); const match = raw.match(/^(\d{4}):(\d{2}):(\d{2})/); if (match) takenAt = `${match[1]}-${match[2]}-${match[3]}`; } }
  if (gpsPointer) { const gps = entries(gpsPointer.offset); const rational = (tag) => { if (!tag) return []; const at = tiff + tag.offset; return Array.from({ length: tag.count }, (_, index) => u32(at + index * 8) / Math.max(1, u32(at + index * 8 + 4))); }; const coord = (tag) => { const parts = rational(tag); return parts.length >= 3 ? parts[0] + parts[1] / 60 + parts[2] / 3600 : null; }; latitude = coord(gps.get(2)); longitude = coord(gps.get(4)); const latRef = gps.get(1), lonRef = gps.get(3); if (latRef && exifString(view, latRef.raw, 2) === "S") latitude *= -1; if (lonRef && exifString(view, lonRef.raw, 2) === "W") longitude *= -1; }
  return { takenAt, latitude, longitude };
}

async function locationFromCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  try { const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=14&accept-language=fr`); if (!response.ok) return ""; const data = await response.json(); const address = data.address || {}; return [address.village || address.town || address.city || address.municipality, address.county || address.state].filter(Boolean).join(", ") || data.display_name?.split(",").slice(0, 2).join(",") || ""; } catch { return ""; }
}

async function addPhotoLibraryFiles(folderId, files) {
  if (!files.length) return;
  ensureAdminPhotoLibrary();
  let folder = adminState.photoLibrary.folders.find((item) => item.id === folderId);
  if (folderId === "direct") {
    folder = adminState.photoLibrary.folders.find((item) => item.id === "photos-directes");
    if (!folder) { folder = { id: "photos-directes", name: "Photos ajoutées directement", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; adminState.photoLibrary.folders.unshift(folder); }
    selectedPhotoFolderId = folder.id;
  }
  photoAdminFilters = { commune: "", date: "", page: 1 };
  if (!folder) return;
  showToast(`Analyse de ${files.length} photo(s)…`);
  let added = 0;
  for (const file of files) { try { const metadata = await photoExif(file).catch(() => ({})); const src = await resizePhotoForLibrary(file); adminState.photoLibrary.photos.unshift({ id: crypto.randomUUID(), folderId: folder.id, src, thumbnail: "", fileName: file.name, alt: "", commune: "", takenAt: metadata.takenAt || "", createdAt: new Date().toISOString() }); added += 1; } catch (error) { showToast(error.message || `Ajout impossible : ${file.name}`); } }
  if (added) { folder.updatedAt = new Date().toISOString(); publishPhotoLibrary("ajout photos", `${added} photo(s) dans ${folder.name}`); showToast(`${added} photo(s) ajoutée(s). Vous pouvez renseigner la commune et la date.`); }
}

function renderHomepageAdmin() {
  const home = homepageContent();
  const field = (name, label, type = "input") => type === "textarea"
    ? `<label>${text(label)}<textarea name="${attr(name)}" required>${text(home[name])}</textarea></label>`
    : `<label>${text(label)}<input name="${attr(name)}" value="${attr(home[name])}" required /></label>`;
  return `<div class="homepage-admin">
    <section class="admin-panel"><div><h3>Page d'accueil</h3><p>Modifiez ici tous les textes visibles sur la page d'accueil publique.</p></div></section>
    <form class="admin-form homepage-admin-form" data-homepage-update>
      <fieldset><legend>Identité et navigation</legend><div class="form-grid">
        ${field("browserTitle", "Nom de l'onglet du navigateur")}
        ${field("brandEyebrow", "Ligne au-dessus du nom")}
        ${field("brandName", "Nom affiché")}
        ${field("navHome", "Bouton Accueil")}
        ${field("navNewsletter", "Bouton d'inscription")}
        ${field("navSupport", "Bouton Support")}
      </div></fieldset>
      <fieldset><legend>Présentation principale</legend><div class="form-grid">
        ${field("heroEyebrow", "Fonction / circonscription")}
        ${field("heroTitle", "Titre principal")}
        ${field("heroBody", "Texte de présentation", "textarea")}
        ${field("searchPlaceholder", "Texte de la recherche")}
        ${field("searchButton", "Bouton de recherche")}
        ${field("portraitName", "Nom sous la photo")}
        ${field("portraitSubtitle", "Sous-titre de la photo")}
        ${field("heroImageAlt", "Description accessible de la photo")}
      </div></fieldset>
      <fieldset><legend>Photo de la page d'accueil</legend>
        <div class="homepage-photo-editor">
          <img src="${attr(home.heroImage || defaultHomepageContent().heroImage)}" alt="${attr(home.heroImageAlt || defaultHomepageContent().heroImageAlt)}" data-homepage-image-preview />
          <div>
            <label>Choisir une nouvelle photo<input name="heroImageFile" type="file" accept="image/jpeg,image/png,image/webp" data-homepage-image-input /></label>
            <p>La photo est redimensionnee automatiquement avant son enregistrement.</p>
            <label class="homepage-photo-reset"><input name="resetHeroImage" type="checkbox" /> Retablir la photo d'origine</label>
          </div>
        </div>
      </fieldset>
      <fieldset><legend>Mandat et accès rapides</legend><div class="form-grid">
        ${field("overviewEyebrow", "Titre court de la rubrique")}
        ${field("overviewTitle", "Titre du bloc mandat")}
        ${field("overviewIntro", "Introduction du bloc mandat", "textarea")}
        ${field("victoriesLabel", "Libellé Victoires")}
        ${field("victoriesMeta", "Complément du compteur Victoires")}
        ${field("agendaLabel", "Libellé Rendez-vous")}
        ${field("agendaMeta", "Complément du compteur Rendez-vous")}
        ${field("legislativeLabel", "Libellé Travail législatif")}
        ${field("legislativeMeta", "Complément du compteur législatif")}
        ${field("period30", "Période 30 jours")}
        ${field("period90", "Période 90 jours")}
        ${field("period365", "Période 1 an")}
        ${field("periodAll", "Période complète")}
      </div></fieldset>
      <fieldset><legend>Pied de page</legend><div class="form-grid">
        ${field("footerLegal", "Lien mentions légales")}
        ${field("footerSignature", "Signature")}
        ${field("adminAccess", "Lien administration")}
      </div></fieldset>
      <button class="primary-action" type="submit">Enregistrer la page d'accueil</button>
    </form>
  </div>`;
}

function renderSupportAdmin() {
  const requests = [...(adminState.citizenRequests || []), ...(state.supportRequests || [])]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return `<div class="support-admin">
    <section class="admin-panel"><div><h3>Support et propositions</h3><p>${requests.length} demande(s) recues depuis le site.</p><small class="admin-sync-note">${text(adminSyncMessage)}</small></div></section>
    <section class="admin-table">${requests.map((item) => `<article class="admin-row"><div><strong>${text(item.title || item.subject || "Demande")}</strong><p>${text([item.firstName, item.lastName, item.userEmail || item.email, item.city].filter(Boolean).join(" - "))}</p><p>${text(item.message || item.notes || "")}</p></div><form data-support-update="${attr(item.id)}"><select name="status">${options(requestStatuses, item.status || "nouveau")}</select><button class="secondary-action compact" type="submit">Enregistrer</button></form></article>`).join("") || empty("Aucune demande.")}</section>
  </div>`;
}

function renderUsers() {
  if (!adminUsersLoaded && !adminUsersLoading && !adminUsersLoadAttempted) loadAdminUsersFromApi();
  const users = adminUsersLoaded ? adminUsers : state.users;
  return `<div class="admin-settings-grid">
    <section class="admin-panel"><h3>Parametres de sauvegarde</h3><p class="admin-help">${text(adminSyncMessage)}</p><button class="secondary-action compact" type="button" data-admin-sync-now>Synchroniser maintenant</button></section>
    <section class="admin-table">${adminUsersLoading ? empty("Chargement des utilisateurs...") : users.map((user) => `<article class="admin-row"><div><strong>${text(userNameById(user.id))}</strong><p>${text(user.email)} - ${text(roleLabel(user.role))}</p><small>${text(user.createdAt ? `Inscrit le ${formatDate(String(user.createdAt).slice(0, 10))}` : "")}</small></div><select data-user-role="${attr(user.id)}" ${!isAdmin() ? "disabled" : ""}>${options(roles, user.role)}</select></article>`).join("") || empty("Aucun utilisateur inscrit.")}</section>
  </div>`;
}

function renderAddons() {
  return `<div class="addons-admin">
    <section class="admin-panel addons-head"><div><h3>Gestion des addons</h3><p>Modules actifs de l'administration et outils de donnees.</p><small class="admin-sync-note">${text(adminSyncMessage)}</small></div><button class="secondary-action compact" type="button" data-admin-sync-now>Synchroniser</button></section>
    <section class="plugin-list">${(adminState.addons || []).map((addon) => `<article class="plugin-toggle"><div><strong>${text(addon.name)}</strong><small>${text(addon.description || "")}</small></div><label><input type="checkbox" data-addon-toggle="${attr(addon.id)}" ${addon.enabled ? "checked" : ""} ${addon.locked ? "disabled" : ""}/><span>${addon.enabled ? "Actif" : "Inactif"}</span></label></article>`).join("")}</section>
    <section class="admin-panel data-admin-tools">
      <h3>Import / export global</h3>
      <p class="admin-help">Exporte ou restaure l'etat en base : contacts, dossiers, taches, modeles, documents, deces et addons.</p>
      <div class="data-actions">
        <button class="secondary-action" type="button" data-admin-export-all>Exporter tout</button>
        <label class="import-button">Importer tout<input type="file" data-admin-import-all accept="application/json" /></label>
      </div>
      <textarea id="data-output" readonly aria-label="Donnees exportees"></textarea>
    </section>
  </div>`;
}

function renderActivity() {
  const taskAlerts = assignedTaskNotifications();
  const now = Date.now();
  const weekStart = now - 7 * 86400000;
  const monthStart = now - 30 * 86400000;
  const staff = new Map();
  for (const user of [...(state.users || []), ...(adminUsersLoaded ? adminUsers : [])]) {
    if (!user?.id || roleRank(user.role) < roleRank("moderator")) continue;
    staff.set(String(user.id), user);
  }
  const records = (adminState.activityLog || []).filter((item) => Number.isFinite(Date.parse(item.createdAt || "")))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const byUser = new Map();
  for (const record of records) {
    const id = String(record.userId || "");
    if (!staff.has(id)) continue;
    if (!byUser.has(id)) byUser.set(id, []);
    byUser.get(id).push(record);
  }
  const memberCards = [...staff.values()].map((user) => {
    const actions = byUser.get(String(user.id)) || [];
    const lastWeek = actions.filter((item) => Date.parse(item.createdAt) >= weekStart && Date.parse(item.createdAt) <= now);
    const lastMonth = actions.filter((item) => Date.parse(item.createdAt) >= monthStart && Date.parse(item.createdAt) <= now);
    const label = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.login || user.email || "Membre du staff";
    return { user, label, lastWeek, lastMonth };
  }).sort((a, b) => b.lastMonth.length - a.lastMonth.length || a.label.localeCompare(b.label, "fr"));
  const totalWeek = memberCards.reduce((total, member) => total + member.lastWeek.length, 0);
  const totalMonth = memberCards.reduce((total, member) => total + member.lastMonth.length, 0);
  return `<div class="notification-center">
    ${taskAlerts.length ? `<section class="assigned-task-alerts"><header><h2>Mes notifications</h2><p>Ces alertes restent visibles jusqu'a ce que les taches soient terminees.</p></header>${taskAlerts.map((alert) => `<button type="button" data-open-permanence="${attr(alert.requestId)}"><span>!</span><div><strong>${text(alert.title)}</strong><p>${text(alert.message)}</p><small>${text(alert.dueDate ? `Echeance : ${formatDate(alert.dueDate)}` : "Sans echeance")}</small></div></button>`).join("")}</section>` : `<section class="assigned-task-alerts is-empty"><h2>Mes notifications</h2><p>Aucune tache en attente ne vous est attribuee.</p></section>`}
    <section class="admin-panel"><h2>Activité des membres du staff</h2><p>Actions enregistrées sur les 7 et 30 derniers jours (périodes glissantes). Le détail est masqué par défaut.</p><p><strong>${totalWeek} action(s) sur 7 jours</strong> · <strong>${totalMonth} action(s) sur 30 jours</strong></p><small>Les compteurs portent sur l'historique encore conservé par le site ; ils ne représentent pas nécessairement toutes les tâches réalisées hors du site.</small></section>
    <section class="admin-table">${memberCards.map(({ user, label, lastWeek, lastMonth }) => `
      <details class="admin-row staff-activity-detail">
        <summary><strong>${text(label)}</strong> · ${text(roleLabel(user.role))} — <strong>${lastWeek.length}</strong> sur 7 jours · <strong>${lastMonth.length}</strong> sur 30 jours <span>▾ Voir les actions</span></summary>
        <div><h4>Actions des 30 derniers jours (${lastMonth.length})</h4>${lastMonth.length ? lastMonth.map(renderActivityRow).join("") : "<p>Aucune action enregistrée sur cette période.</p>"}</div>
      </details>`).join("") || empty("Aucun membre du staff trouvé.")}
    </section>
  </div>`;
}

function assignedTaskNotifications() {
  return adminState.teamTasks.filter((task) => task.assignedTo === currentUserId && task.linkedRequestId && !["termine", "archive"].includes(task.status)).sort((a, b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"))).map((task) => ({ id: `task-alert-${task.id}`, title: task.title, message: adminState.permanenceRequests.find((item) => item.id === task.linkedRequestId)?.title || "Dossier local", requestId: task.linkedRequestId, dueDate: task.dueDate }));
}

function renderActivityRow(item) {
  return `<article class="activity-row"><time>${text((item.createdAt || "").slice(0, 16).replace("T", " "))}</time><strong>${text(item.userName || "Systeme")}</strong><span>${text(item.action)} - ${text(item.target)}</span><p>${text(item.detail || "")}</p></article>`;
}

function renderDocumentsAdmin() {
  const documents = documentFilteredList();
  if (!selectedDocumentId && documents[0]) selectedDocumentId = documents[0].id;
  const current = selectedDocument();
  return `<div class="document-workspace">
    <header class="document-topbar">
      <div><h2>Gestion des documents</h2><p>Organisez, consultez et gerez tous vos documents.</p><small class="admin-sync-note">${text(adminSyncMessage)}</small></div>
      <div class="document-topbar-actions">
        <button class="secondary-action compact" type="button" data-document-import-toggle>${docIcon("upload")} Importer</button>
        <button class="primary-action compact" type="button" data-document-folder-toggle>${docIcon("folderPlus")} Creer un dossier</button>
        <button class="primary-action compact" type="button" data-document-create-toggle>${docIcon("plus")} Ajouter un document</button>
      </div>
    </header>
    ${(adminFilters.documentFolderCreateOpen || adminFilters.documentFolderEdit) ? renderDocumentFolderForm() : ""}
    ${adminFilters.documentCreateOpen || adminFilters.documentImportOpen ? renderDocumentCreateForm() : ""}
    <div class="document-layout">
      <aside class="document-tree-panel">
        <div class="document-tree-head"><h3>Arborescence</h3><div><button type="button" data-document-folder-toggle aria-label="Creer un dossier">${docIcon("folderPlus")}</button><button type="button" data-document-folder-edit-current aria-label="Modifier le dossier">${docIcon("edit")}</button><button type="button" data-document-folder-delete-current aria-label="Supprimer le dossier">${docIcon("trash")}</button></div></div>
        <div class="document-tree">${renderDocumentTree()}</div>
        <div class="document-mini-list"><h4>Documents</h4>${documents.map((doc) => `<button class="${selectedDocumentId === doc.id ? "is-active" : ""}" type="button" data-document-open="${attr(doc.id)}"><span class="document-file-badge pdf">PDF</span><strong>${text(doc.title)}</strong><small>${text(documentFileName(doc, "pdf"))}${doc.wordFile ? " · Word associe" : ""}</small></button>`).join("") || empty("Aucun document dans ce dossier.")}</div>
        <section class="document-storage-card">
          <div><strong>${docIcon("cloud")} Stockage utilise</strong><span>${text(formatFileSize(documentStorageUsed()))}</span></div>
          <i style="--storage:${Math.min(100, documentStorageUsed() / (20 * 1024 * 1024) * 100).toFixed(1)}%"></i>
          <p><strong>Synchronisation</strong><span><em></em>${text(adminSyncStatus === "synced" ? "A jour" : adminSyncStatus === "error" ? "Erreur" : "En cours")}</span></p>
        </section>
      </aside>
      <main class="document-preview-panel">${current ? renderDocumentPreview(current) : renderDocumentEmptyState()}</main>
      <aside class="document-info-panel">${current ? renderDocumentInfo(current) : empty("Selectionnez un document.")}</aside>
    </div>
  </div>`;
}

function documentFolders() {
  return normalizeDocumentFolders(adminState.documentFolders);
}

function documentList() {
  return normalizeDocuments(adminState.documents, documentFolders());
}

function selectedDocument() {
  return documentList().find((item) => item.id === selectedDocumentId) || documentFilteredList()[0] || null;
}

function documentFilteredList() {
  const docs = documentList();
  if (!selectedDocumentFolderId || selectedDocumentFolderId === "all") return docs;
  const ids = documentFolderDescendantIds(selectedDocumentFolderId);
  return docs.filter((item) => ids.has(item.folderId));
}

function documentFolderDescendantIds(folderId) {
  const ids = new Set([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    documentFolders().forEach((folder) => {
      if (ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    });
  }
  return ids;
}

function renderDocumentTree(parentId = "", depth = 0) {
  const folders = documentFolders().filter((folder) => folder.parentId === parentId);
  const root = depth === 0 ? `<button class="document-tree-row ${selectedDocumentFolderId === "all" ? "is-active" : ""}" type="button" data-document-folder-select="all"><span>${docIcon("folder")}</span><strong>Tous les documents</strong><em>${documentList().length}</em></button>` : "";
  return `${root}${folders.map((folder) => {
    const count = documentList().filter((doc) => documentFolderDescendantIds(folder.id).has(doc.folderId)).length;
    return `<div class="document-tree-branch" style="--depth:${depth}"><button class="document-tree-row ${selectedDocumentFolderId === folder.id ? "is-active" : ""}" type="button" data-document-folder-select="${attr(folder.id)}"><span>${docIcon("folder")}</span><strong>${text(folder.name)}</strong><em>${count}</em></button>${renderDocumentTree(folder.id, depth + 1)}</div>`;
  }).join("")}`;
}

function renderDocumentFolderForm() {
  const folder = documentFolders().find((item) => item.id === adminFilters.documentFolderEdit);
  return `<form class="document-inline-form" data-document-folder-${folder ? `update="${attr(folder.id)}"` : "create"}>
    <h3>${folder ? "Modifier le dossier" : "Creer un dossier"}</h3>
    <label>Nom du dossier<input name="name" value="${attr(folder?.name || "")}" required /></label>
    <label>Dossier parent<select name="parentId"><option value="">Racine</option>${documentFolders().filter((item) => item.id !== folder?.id).map((item) => `<option value="${attr(item.id)}" ${folder?.parentId === item.id ? "selected" : ""}>${text(item.name)}</option>`).join("")}</select></label>
    <div class="form-actions"><button class="primary-action compact" type="submit">Enregistrer</button><button class="secondary-action compact" type="button" data-document-folder-cancel>Annuler</button></div>
  </form>`;
}

function renderDocumentCreateForm() {
  return `<form class="document-inline-form" data-document-create enctype="multipart/form-data">
    <h3>Ajouter un document</h3>
    <div class="form-grid"><label>Nom du document<input name="title" placeholder="Nom affiche dans la base" /></label><label>Dossier<select name="folderId"><option value="">Sans dossier</option>${documentFolders().map((folder) => `<option value="${attr(folder.id)}" ${selectedDocumentFolderId === folder.id ? "selected" : ""}>${text(folder.name)}</option>`).join("")}</select></label></div>
    <label>Fichier PDF a afficher<input name="pdfFile" type="file" accept=".pdf,application/pdf" required /><small>Seuls les PDF sont affiches directement sur le site.</small></label>
    <label>Fichier Word associe<input name="wordFile" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /><small>Optionnel, disponible au telechargement.</small></label>
    <label>Description<textarea name="description" placeholder="Notes internes ou contexte du document"></textarea></label>
    <div class="form-actions"><button class="primary-action compact" type="submit">Ajouter en base</button><button class="secondary-action compact" type="button" data-document-create-cancel>Annuler</button></div>
  </form>`;
}

function renderDocumentPreview(doc) {
  const pdf = doc.pdfFile;
  return `<section class="document-preview-card">
    <header>
      <button class="secondary-action compact" type="button" data-document-back-list>${docIcon("arrowLeft")} Retour a la liste</button>
      <div class="document-preview-title"><span class="document-file-badge pdf">PDF</span><div><h3>${text(documentFileName(doc, "pdf"))}</h3><p>Dossier : ${text(documentFolderName(doc.folderId))} · Ajoute le ${text(formatDate(String(doc.createdAt || "").slice(0, 10)))}</p></div><mark>Version a jour</mark></div>
      <div class="document-preview-actions"><button class="secondary-action compact" type="button" data-document-download-pdf="${attr(doc.id)}">${docIcon("download")} Telecharger</button><button class="icon-action" type="button" data-document-edit-toggle="${attr(doc.id)}">${docIcon("more")}</button></div>
    </header>
    ${adminFilters.documentEdit === doc.id ? renderDocumentEditForm(doc) : ""}
    <div class="document-pdf-stage">${pdf?.fileData ? `<iframe title="Aperçu PDF" data-document-pdf-preview="${attr(doc.id)}"></iframe>` : `<div class="document-pdf-empty">${docIcon("file")}<strong>Aucun PDF disponible</strong><p>Ajoutez ou remplacez le PDF associé à ce document.</p></div>`}</div>
  </section>`;
}

function mountDocumentPdfPreview() {
  const frame = document.querySelector("[data-document-pdf-preview]");
  if (!frame) return;
  const file = documentList().find((doc) => doc.id === frame.dataset.documentPdfPreview)?.pdfFile;
  if (!file?.fileData) return;
  try {
    const bytes = dataUrlToArrayBuffer(file.fileData);
    documentPdfObjectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    frame.src = documentPdfObjectUrl;
  } catch {
    const message = document.createElement("div");
    message.className = "document-pdf-empty";
    message.innerHTML = '<strong>Aperçu indisponible</strong><p>Le PDF ne peut pas être lu ici. Essayez de le télécharger ou de le remplacer.</p>';
    frame.replaceWith(message);
  }
}

function renderDocumentEditForm(doc) {
  return `<form class="document-edit-form" data-document-update="${attr(doc.id)}" enctype="multipart/form-data">
    <div class="form-grid"><label>Nom<input name="title" value="${attr(doc.title)}" required /></label><label>Dossier<select name="folderId"><option value="">Sans dossier</option>${documentFolders().map((folder) => `<option value="${attr(folder.id)}" ${doc.folderId === folder.id ? "selected" : ""}>${text(folder.name)}</option>`).join("")}</select></label></div>
    <label>Description<textarea name="description">${text(doc.description || "")}</textarea></label>
    <div class="form-actions"><button class="primary-action compact" type="submit">Modifier les informations</button><button class="secondary-action compact" type="button" data-document-edit-toggle="">Fermer</button></div>
  </form>`;
}

function renderDocumentInfo(doc) {
  const pdf = doc.pdfFile;
  const word = doc.wordFile;
  return `<section class="document-info-card">
    <h3>Informations du document</h3>
    <dl>
      <div><dt>Nom du document</dt><dd>${text(doc.title)}</dd></div>
      <div><dt>Type</dt><dd><span class="document-file-badge pdf">PDF</span>${word ? `<span class="document-file-badge word">Word disponible</span>` : ""}</dd></div>
      <div><dt>Dossier</dt><dd>${docIcon("folder")} ${text(documentFolderName(doc.folderId))}</dd></div>
      <div><dt>Taille</dt><dd>${text(formatFileSize((pdf?.size || 0) + (word?.size || 0)))}</dd></div>
      <div><dt>Ajoute le</dt><dd>${text(formatDate(String(doc.createdAt || "").slice(0, 10)))}</dd></div>
      <div><dt>Ajoute par</dt><dd>${text(userNameById(doc.createdBy) || "Equipe")}</dd></div>
      <div><dt>Derniere modification</dt><dd>${text(formatDate(String(doc.updatedAt || doc.createdAt || "").slice(0, 10)))}</dd></div>
      <div><dt>Version</dt><dd>${text(doc.version || "1.0")}</dd></div>
    </dl>
    <h4>Fichiers associes</h4>
    <div class="document-associated-files">${pdf ? renderAssociatedFile(doc, "pdf") : ""}${word ? renderAssociatedFile(doc, "word") : ""}</div>
    <h4>Actions</h4>
    <div class="document-side-actions">
      <label>${docIcon("file")} Remplacer le document Word<input type="file" data-document-replace-word="${attr(doc.id)}" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /></label>
      <label>${docIcon("file")} Remplacer le PDF<input type="file" data-document-replace-pdf="${attr(doc.id)}" accept=".pdf,application/pdf" /></label>
      ${pdf ? `<button type="button" data-document-download-pdf="${attr(doc.id)}">${docIcon("download")} Telecharger le PDF</button>` : ""}
      ${word ? `<button type="button" data-document-download-word="${attr(doc.id)}">${docIcon("download")} Telecharger le Word</button>` : ""}
      <button type="button" data-document-edit-toggle="${attr(doc.id)}">${docIcon("edit")} Modifier les informations</button>
      ${isAdmin() ? `<button class="danger" type="button" data-document-delete="${attr(doc.id)}">${docIcon("trash")} Supprimer le document</button>` : ""}
    </div>
  </section>`;
}

function renderAssociatedFile(doc, type) {
  const file = type === "word" ? doc.wordFile : doc.pdfFile;
  return `<article><span class="document-file-badge ${attr(type)}">${type === "word" ? "W" : "PDF"}</span><div><strong>${text(file.fileName)}</strong><small>${text(formatFileSize(file.size))}${file.generated ? " · genere" : ""}</small></div><button type="button" data-document-download-${attr(type)}="${attr(doc.id)}">${docIcon("download")}</button></article>`;
}

function renderDocumentEmptyState() {
  return `<section class="document-preview-card document-empty"><div>${docIcon("file")}<h3>Aucun document selectionne</h3><p>Ajoutez un document Word ou PDF pour charger son apercu ici.</p></div></section>`;
}

function documentFolderName(folderId) {
  return documentFolders().find((folder) => folder.id === folderId)?.name || "Tous les documents";
}

function documentFileName(doc, type = "pdf") {
  const file = type === "word" ? doc.wordFile : doc.pdfFile;
  return file?.fileName || `${doc.title || "document"}.${type === "word" ? "docx" : "pdf"}`;
}

function documentStorageUsed() {
  return documentList().reduce((sum, doc) => sum + (doc.pdfFile?.size || 0) + (doc.wordFile?.size || 0), 0);
}

function formatFileSize(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
  if (value >= 1024) return `${Math.round(value / 1024)} Ko`;
  return `${value} o`;
}

function docIcon(name) {
  const icons = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>',
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v9H4z"/></svg>',
    folderPlus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v9H4z"/><path d="M15 12v5M12.5 14.5h5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h4L19 9l-4-4L5 15z"/><path d="m13 7 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1 13h6l1-13M9 7l1-3h4l1 3"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h8l4 4v12H7z"/><path d="M15 4v5h5"/><path d="M10 13h6M10 17h4"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11-1 4.5 4.5 0 0 0 1 9z"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"/><path d="M9 12h10"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6h.01M12 12h.01M12 18h.01"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/></svg>',
    maximize: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4"/></svg>'
  };
  return icons[name] || icons.file;
}

function renderInternalSearch() {
  const q = adminFilters.global || "";
  const normalizedQuery = q ? normalizeName(q) : "";
  if (!normalizedQuery) return `<div class="admin-search-results">${empty("Saisissez une recherche.")}</div>`;
  const groups = [["Taches", "tasks", filterTasks(adminState.teamTasks, { q })], ["Permanence", "permanence", adminState.permanenceRequests.filter((item) => normalizeName(Object.values(item).join(" ")).includes(normalizedQuery))], ["Modeles", "templates", adminState.templates.filter((item) => normalizeName(Object.values(item).join(" ")).includes(normalizedQuery))], ["Contacts", "contacts", adminState.localContacts.filter((item) => contactSearchText(item).includes(normalizedQuery))]];
  return `<div class="admin-search-results">${groups.map(([label, section, items]) => `<section class="admin-panel"><h3>${text(label)}</h3>${items.slice(0, 8).map((item) => `<button type="button" data-admin-section="${attr(section)}"><strong>${text(item.title || contactDisplayName(item))}</strong><span>${text(item.status || item.category || item.city || "")}</span></button>`).join("") || empty("Aucun resultat.")}</section>`).join("")}</div>`;
}

function renderSimpleCollection(key, title, fields) {
  const items = adminState[key] || [];
  return `<div class="admin-crud"><form class="admin-form" data-admin-create="${attr(key)}"><h3>${text(title)}</h3>${fields.map((field) => `<label>${text(field)}<input name="${attr(field)}" /></label>`).join("")}<button class="primary-action" type="submit">Ajouter</button></form><section class="admin-table">${items.map((item) => `<article class="admin-row"><div><strong>${text(item.title || item.fileName || "Element")}</strong><p>${text(item.category || item.status || "")}</p></div></article>`).join("") || empty("Aucun element.")}</section></div>`;
}

function empty(message) {
  return `<p class="empty-state">${text(message)}</p>`;
}

function options(values, selected = "") {
  return values.map((value) => `<option value="${attr(value)}" ${value === selected ? "selected" : ""}>${text(value)}</option>`).join("");
}

function selectFilter(name, values, selected, label) {
  return `<select name="${attr(name)}"><option value="">${text(label)}</option>${options(values, selected)}</select>`;
}

function userOptions(selected = "") {
  return state.users.map((user) => `<option value="${attr(user.id)}" ${user.id === selected ? "selected" : ""}>${text(userNameById(user.id))}${roleRank(user.role) < 10 ? " (utilisateur)" : ""}</option>`).join("");
}

function contactOptions(selected = "") {
  return adminState.localContacts.map((contact) => `<option value="${attr(contact.id)}" ${contact.id === selected ? "selected" : ""}>${text(contactDisplayName(contact))} - ${text(contact.city || "")}</option>`).join("");
}

function contactSearchPickerState(key, selected = "") {
  adminFilters.contactPickers = adminFilters.contactPickers || {};
  const state = adminFilters.contactPickers[key] || {};
  if (selected && !state.selectedId) state.selectedId = selected;
  adminFilters.contactPickers[key] = state;
  return state;
}

function contactPickerSearchFilters(picker = {}) {
  return {
    firstName: String(picker.firstName || ""),
    name: String(picker.name || ""),
    city: String(picker.city || "")
  };
}

function contactPickerHasSearch(filters = {}) {
  return Object.values(filters).some((value) => normalizeName(value).length >= 2);
}

function renderDeathContactSearchFields(key, filters = {}) {
  return `<div class="contact-picker-field-grid">
    <label>Prénom<input type="search" value="${attr(filters.firstName || "")}" placeholder="Marc, Robert, Louis..." autocomplete="off" data-contact-picker-field-search="${attr(key)}" data-contact-picker-field="firstName" /></label>
    <label>Nom<input type="search" value="${attr(filters.name || "")}" placeholder="Nom usuel ou de naissance" autocomplete="off" data-contact-picker-field-search="${attr(key)}" data-contact-picker-field="name" /></label>
    <label>Commune<input type="search" value="${attr(filters.city || "")}" placeholder="Genevreuille" autocomplete="off" data-contact-picker-field-search="${attr(key)}" data-contact-picker-field="city" /></label>
  </div>`;
}

function renderContactSearchPicker({ key, name = "contactId", selected = "", label = "Contact", placeholder = "Nom, prenom ou commune", excludeIds = [], searchMode = "death" } = {}) {
  const picker = contactSearchPickerState(key, selected);
  const selectedId = picker.selectedId || selected || "";
  const selectedContact = contactById(selectedId);
  const isDeathSearch = searchMode === "death";
  const filters = contactPickerSearchFilters(picker);
  const query = String(picker.q || "");
  const contacts = isDeathSearch ? searchContactsByFields(filters, { limit: 25, excludeIds }) : searchContacts(query, { limit: 25, excludeIds });
  const resultIds = new Set(contacts.map((contact) => contact.id));
  const selectedOnly = selectedContact && !resultIds.has(selectedContact.id) ? [selectedContact] : [];
  return `<div class="contact-search-picker" data-contact-picker="${attr(key)}" data-contact-picker-mode="${attr(searchMode)}" data-contact-picker-exclude="${attr(JSON.stringify(excludeIds))}">
    ${isDeathSearch ? `<div class="contact-picker-label">${text(label)}</div>` : ""}
    ${isDeathSearch ? renderDeathContactSearchFields(key, filters) : `<label>${text(label)}
      <input type="search" value="${attr(query)}" placeholder="${attr(placeholder)}" autocomplete="off" data-contact-picker-search="${attr(key)}" />
    </label>`}
    <input type="hidden" name="${attr(name)}" value="${attr(selectedId)}" data-contact-picker-value="${attr(key)}" />
    <div class="contact-picker-selected">${renderContactPickerSelected(selectedContact)}</div>
    <div class="death-contact-results contact-picker-results">${renderContactPickerResultArea(key, [...selectedOnly, ...contacts], selectedId, isDeathSearch ? filters : query)}</div>
    <small>${isDeathSearch ? "Saisissez au moins 2 caracteres dans un champ. Les champs renseignes se cumulent." : "Saisissez au moins 2 caracteres. Recherche par prenom, nom, nom de naissance, commune, email ou telephone."}</small>
  </div>`;
}

function renderContactPickerSelected(contact) {
  if (!contact) return "Aucun contact selectionne";
  const details = contactSearchLine(contact);
  return `<div class="contact-picker-card ${isContactDeceased(contact) ? "is-deceased" : ""}"><strong>${text(contactDisplayNameWithBirthName(contact))}</strong><span>${text(details || "Informations non renseignees")}</span></div>`;
}

function renderContactPickerResults(key, contacts, selectedId = "") {
  return contacts.map((contact) => {
    const classes = [contact.id === selectedId ? "is-selected" : "", isContactDeceased(contact) ? "is-deceased" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-contact-picker-select="${attr(key)}" data-contact-id="${attr(contact.id)}"><strong>${text(contactDisplayNameWithBirthName(contact))}</strong><span>${text(contactSearchLine(contact) || "Contact")}</span></button>`;
  }).join("") || empty("Aucun contact trouve.");
}

function renderContactPickerResultArea(key, contacts, selectedId = "", query = "") {
  const hasSearch = typeof query === "object" ? contactPickerHasSearch(query) : normalizeName(query).length >= 2;
  if (!hasSearch && !contacts.length) return empty("Saisissez au moins 2 caracteres.");
  return renderContactPickerResults(key, contacts, selectedId);
}

function contactPickerExcludeIds(root) {
  try {
    const parsed = JSON.parse(root?.dataset.contactPickerExclude || "[]");
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function contactPickerRoot(key) {
  return [...document.querySelectorAll("[data-contact-picker]")].find((root) => root.dataset.contactPicker === key) || null;
}

function refreshContactSearchPicker(key, root = contactPickerRoot(key)) {
  if (!root) return;
  const picker = adminFilters.contactPickers?.[key] || {};
  const query = String(picker.q || "");
  const searchMode = root.dataset.contactPickerMode || "default";
  const filters = contactPickerSearchFilters(picker);
  const selectedId = String(picker.selectedId || root.querySelector("[data-contact-picker-value]")?.value || "");
  const selectedContact = contactById(selectedId);
  const contacts = searchMode === "death" ? searchContactsByFields(filters, { limit: 25, excludeIds: contactPickerExcludeIds(root) }) : searchContacts(query, { limit: 25, excludeIds: contactPickerExcludeIds(root) });
  const resultIds = new Set(contacts.map((contact) => contact.id));
  const selectedOnly = selectedContact && !resultIds.has(selectedContact.id) ? [selectedContact] : [];
  const selected = root.querySelector(".contact-picker-selected");
  const results = root.querySelector(".contact-picker-results");
  if (selected) selected.innerHTML = renderContactPickerSelected(selectedContact);
  if (results) results.innerHTML = renderContactPickerResultArea(key, [...selectedOnly, ...contacts], selectedId, searchMode === "death" ? filters : query);
}

function filterTasks(tasks, filters = {}) {
  let output = normalizeTasks(tasks || []);
  const q = normalizeName(filters.q || "");
  if (q) output = output.filter((task) => normalizeName([task.title, task.type, task.status, task.priority, task.description, userNameById(task.assignedTo)].join(" ")).includes(q));
  ["status", "priority", "assignedTo"].forEach((field) => { if (filters[field]) output = output.filter((task) => String(task[field] || "") === String(filters[field])); });
  if (filters.mine) output = output.filter((task) => task.assignedTo === currentUserId);
  return output.sort((a, b) => Number(isTaskLate(b)) - Number(isTaskLate(a)) || String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
}

function isTaskLate(task) {
  return task.dueDate && !["termine", "archive"].includes(task.status) && new Date(`${task.dueDate}T23:59:59`) < new Date();
}

function isContactDeceased(contact) {
  return Boolean(contact?.deathDateApprox || contactHasDeathKeyword(contact));
}

function taskFromForm(form, existing = {}) {
  const data = new FormData(form);
  const now = new Date().toISOString();
  const task = { ...existing, id: existing.id || crypto.randomUUID(), folderId: String(data.get("folderId") || existing.folderId || "team-folder-general"), title: String(data.get("title") || existing.title || "").slice(0, 180), type: taskTypes.includes(data.get("type")) ? data.get("type") : existing.type || "autre", status: taskStatuses.includes(data.get("status")) ? data.get("status") : existing.status || "a traiter", priority: priorities.includes(data.get("priority")) ? data.get("priority") : existing.priority || "normale", assignedTo: String(data.get("assignedTo") || ""), dueDate: String(data.get("dueDate") || ""), description: String(data.get("description") || ""), checklist: data.has("checklist") ? String(data.get("checklist") || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : (existing.checklist || []), completedChecklist: data.has("completedChecklist") ? data.getAll("completedChecklist") : (existing.completedChecklist || []), linkedContactId: String(data.get("linkedContactId") || ""), linkedRequestId: String(data.get("linkedRequestId") || existing.linkedRequestId || ""), comments: existing.comments || [], attachments: existing.attachments || [], createdAt: existing.createdAt || now, updatedAt: now };
  const comment = String(data.get("newComment") || "").trim();
  if (comment) task.comments.push({ id: crypto.randomUUID(), authorId: currentUserId, authorName: userNameById(currentUserId), body: comment, createdAt: now });
  return task;
}

function createTask(form) {
  const task = taskFromForm(form);
  adminState.teamTasks.unshift(task);
  form.reset();
  saveAdminState("creation", "tache", task.title);
}

function updateTask(id, form) {
  const index = adminState.teamTasks.findIndex((task) => task.id === id);
  if (index < 0) return;
  adminState.teamTasks[index] = taskFromForm(form, adminState.teamTasks[index]);
  saveAdminState("modification", "tache", adminState.teamTasks[index].title);
}

function createTeamFolder(form) {
  const data = new FormData(form);
  const now = new Date().toISOString();
  const folder = { id: crypto.randomUUID(), name: String(data.get("name") || "Nouveau dossier").slice(0, 120), description: "", createdAt: now, updatedAt: now };
  adminState.teamFolders.push(folder);
  selectedTeamFolderId = folder.id;
  saveAdminState("creation", "dossier equipe", folder.name);
}

function updateTeamFolder(id, form) {
  const folder = adminState.teamFolders.find((item) => item.id === id);
  if (!folder) return;
  const data = new FormData(form);
  folder.name = String(data.get("name") || folder.name).slice(0, 120);
  folder.description = String(data.get("description") || "").slice(0, 800);
  folder.updatedAt = new Date().toISOString();
  saveAdminState("modification", "dossier equipe", folder.name);
}

async function addTaskFiles(taskId, files) {
  const task = adminState.teamTasks.find((item) => item.id === taskId);
  if (!task || !files.length) return;
  const previousState = cloneAdminState();
  const stored = await Promise.all(files.map(async (file) => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, fileData: await fileToDataUrl(file), createdAt: new Date().toISOString() })));
  task.attachments = [...(task.attachments || []), ...stored];
  task.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("ajout fichier", "tache", task.title, previousState);
}

function createTemplate(form) {
  const data = new FormData(form);
  const item = { id: crypto.randomUUID(), title: data.get("title"), channel: data.get("channel"), category: data.get("category"), subject: data.get("subject"), body: data.get("body"), checklist: data.get("checklist"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  adminState.templates.unshift(item);
  form.reset();
  saveAdminState("creation", "modele", item.title);
}

function updateTemplate(id, form) {
  const index = adminState.templates.findIndex((item) => item.id === id);
  if (index < 0) return;
  const data = new FormData(form);
  adminState.templates[index] = { ...adminState.templates[index], title: data.get("title"), channel: data.get("channel"), category: data.get("category"), subject: data.get("subject"), body: data.get("body"), checklist: data.get("checklist"), updatedAt: new Date().toISOString() };
  saveAdminState("modification", "modele", adminState.templates[index].title);
}

function copyGeneratedTemplate(id) {
  const generated = generatedTemplate(id);
  if (!generated.body) return;
  navigator.clipboard?.writeText(`${generated.subject}\n\n${generated.body}`).then(() => showToast("Modele genere copie."));
}

function downloadGeneratedTemplate(id) {
  const generated = generatedTemplate(id);
  if (!generated.body) return;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;margin:2.2cm;color:#111}h1{font-size:15pt;margin:0 0 18pt}p{margin:0 0 12pt}</style></head><body><h1>${text(generated.subject)}</h1>${generated.body.split(/\n{2,}/).map((paragraph) => `<p>${text(paragraph).replace(/\n/g, "<br>")}</p>`).join("")}</body></html>`;
  downloadFile(`modele-${slugify(generated.subject || "courrier")}.doc`, html, "application/msword;charset=utf-8");
}

function templateMailto(id) {
  const generated = generatedTemplate(id);
  const data = templateContextData();
  return `mailto:${encodeURIComponent(data.email || "")}?subject=${encodeURIComponent(generated.subject)}&body=${encodeURIComponent(generated.body)}`;
}

function cloneAdminState() {
  const { localContacts, ...rest } = adminState;
  return { ...JSON.parse(JSON.stringify(rest)), localContacts };
}

function beginAdminMutationSnapshot() {
  adminMutationSnapshot = null;
}

async function createPermanence(form) {
  const previousState = cloneAdminState();
  const data = new FormData(form);
  const status = permanenceStatuses.includes(data.get("status")) ? data.get("status") : "nouveau";
  const item = { id: crypto.randomUUID(), localFolderId: String(data.get("localFolderId") || ""), title: String(data.get("title") || "").slice(0, 180), category: String(data.get("category") || "").slice(0, 120), contactId: String(data.get("contactId") || ""), status, urgency: permanenceUrgencies.includes(data.get("urgency")) ? data.get("urgency") : "normal", assignedTo: String(data.get("assignedTo") || ""), dueDate: String(data.get("dueDate") || ""), description: String(data.get("description") || "").slice(0, 4000), comments: [], pings: [], attachments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  adminState.permanenceRequests.unshift(item);
  selectedPermanenceId = item.id;
  if (adminFilters.contactPickers) delete adminFilters.contactPickers["permanence-create"];
  form.reset();
  renderAdmin();
  const saved = await saveAdminEntityUpdates(
    [adminEntityUpdate("permanenceRequests", item, { insertIfMissing: true })],
    "creation",
    "permanence",
    item.title,
    previousState
  );
  if (saved) showToast("Dossier cree et sauvegarde.");
  else if (currentUserId) {
    selectedPermanenceId = "";
    renderAdmin();
  }
}

async function updatePermanence(id, form) {
  const previousState = cloneAdminState();
  const item = adminState.permanenceRequests.find((request) => request.id === id);
  if (!item) return;
  const data = new FormData(form);
  item.title = String(data.get("title") || "").slice(0, 180);
  item.category = String(data.get("category") || "").slice(0, 120);
  item.localFolderId = String(data.get("localFolderId") || "");
  item.contactId = String(data.get("contactId") || "");
  item.status = permanenceStatuses.includes(data.get("status")) ? data.get("status") : item.status;
  item.urgency = permanenceUrgencies.includes(data.get("urgency")) ? data.get("urgency") : item.urgency;
  item.assignedTo = String(data.get("assignedTo") || "");
  item.dueDate = String(data.get("dueDate") || "");
  item.description = String(data.get("description") || "").slice(0, 4000);
  item.comments = Array.isArray(item.comments) ? item.comments : [];
  const comment = String(data.get("newComment") || "").trim();
  if (comment) item.comments.push({ id: crypto.randomUUID(), authorId: currentUserId, authorName: userNameById(currentUserId) || "Equipe", body: comment.slice(0, 1200), createdAt: new Date().toISOString() });
  item.updatedAt = new Date().toISOString();
  selectedPermanenceId = item.id;
  renderAdmin();
  const saved = await saveAdminEntityUpdates(
    [adminEntityUpdate("permanenceRequests", item)],
    "modification",
    "permanence",
    item.title,
    previousState
  );
  if (saved) showToast("Dossier sauvegarde.");
}

async function createTaskFromPermanence(id) {
  const previousState = cloneAdminState();
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  if (!request) return;
  const contact = contactById(request.contactId);
  const task = {
    id: crypto.randomUUID(),
    title: `Suivre - ${request.title}`,
    type: "dossier",
    status: "a traiter",
    priority: request.urgency === "critique" ? "urgente" : request.urgency === "prioritaire" ? "importante" : "normale",
    assignedTo: request.assignedTo || currentUserId || "",
    dueDate: request.dueDate || "",
    description: [request.description, contact ? `Contact : ${contactDisplayName(contact)}` : ""].filter(Boolean).join("\n\n"),
    checklist: ["Verifier les pieces du dossier", "Choisir un modele de reponse", "Planifier la prochaine relance"],
    completedChecklist: [],
    linkedContactId: request.contactId || "",
    linkedRequestId: request.id,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  adminState.teamTasks.unshift(task);
  await saveAdminStateToDatabaseOnly("creation", "tache depuis permanence", task.title, previousState);
}

async function createPermanenceTask(id, form) {
  const previousState = cloneAdminState();
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  if (!request) return;
  const data = new FormData(form);
  const task = {
    id: crypto.randomUUID(),
    title: String(data.get("title") || "").slice(0, 180),
    type: "dossier",
    status: "a traiter",
    priority: priorities.includes(data.get("priority")) ? data.get("priority") : request.urgency === "critique" ? "urgente" : request.urgency === "prioritaire" ? "importante" : "normale",
    assignedTo: String(data.get("assignedTo") || request.assignedTo || ""),
    dueDate: String(data.get("dueDate") || ""),
    description: String(data.get("description") || `Dossier lie : ${request.title}`).slice(0, 4000),
    checklist: [],
    completedChecklist: [],
    linkedContactId: request.contactId || "",
    linkedRequestId: request.id,
    comments: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  adminState.teamTasks.unshift(task);
  request.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("creation", "tache dossier local", task.title, previousState);
}

async function addPermanenceFiles(id, files) {
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  if (!request || !files.length) return;
  const previousState = cloneAdminState();
  const stored = await Promise.all(files.map(async (file) => ({ id: crypto.randomUUID(), name: file.name, type: file.type || fileMimeFromName(file.name), size: file.size || 0, fileData: await fileToDataUrl(file), createdAt: new Date().toISOString(), createdBy: currentUserId })));
  request.attachments = [...(request.attachments || []), ...stored];
  request.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("ajout documents", "permanence", request.title, previousState);
}

async function togglePermanenceTask(id, done) {
  const previousState = cloneAdminState();
  const task = adminState.teamTasks.find((item) => item.id === id);
  if (!task) return;
  task.status = done ? "termine" : "a traiter";
  task.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("statut", "tache dossier local", task.title, previousState);
}

async function deletePermanenceTask(id) {
  const previousState = cloneAdminState();
  const task = adminState.teamTasks.find((item) => item.id === id);
  adminState.teamTasks = adminState.teamTasks.filter((item) => item.id !== id);
  await saveAdminStateToDatabaseOnly("suppression", "tache dossier local", task?.title || id, previousState);
}

async function addPermanenceDocument(id, form) {
  const previousState = cloneAdminState();
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  if (!request) return;
  const data = new FormData(form);
  request.attachments = Array.isArray(request.attachments) ? request.attachments : [];
  request.attachments.push({ id: crypto.randomUUID(), name: String(data.get("name") || "").slice(0, 180), type: String(data.get("type") || "").slice(0, 120), url: String(data.get("url") || "").slice(0, 500), createdAt: new Date().toISOString(), createdBy: currentUserId });
  request.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("ajout document", "permanence", request.title, previousState);
}

async function deletePermanenceDocument(id, documentId) {
  const previousState = cloneAdminState();
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  if (!request) return;
  request.attachments = (request.attachments || []).filter((item) => item.id !== documentId);
  request.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("suppression document", "permanence", request.title, previousState);
}

async function addPermanenceComment(id, form) {
  const previousState = cloneAdminState();
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  if (!request) return;
  const data = new FormData(form);
  request.comments = Array.isArray(request.comments) ? request.comments : [];
  request.comments.push({ id: crypto.randomUUID(), authorId: currentUserId, authorName: userNameById(currentUserId) || "Equipe", body: String(data.get("comment") || "").slice(0, 1200), createdAt: new Date().toISOString() });
  request.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("commentaire", "permanence", request.title, previousState);
}

async function archivePermanence(id) {
  const previousState = cloneAdminState();
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  if (!request) return;
  request.status = "archive";
  request.updatedAt = new Date().toISOString();
  await saveAdminStateToDatabaseOnly("archivage", "permanence", request.title, previousState);
}

async function deletePermanence(id) {
  const previousState = cloneAdminState();
  const request = adminState.permanenceRequests.find((item) => item.id === id);
  adminState.permanenceRequests = adminState.permanenceRequests.filter((item) => item.id !== id);
  adminState.teamTasks = adminState.teamTasks.map((task) => task.linkedRequestId === id ? { ...task, linkedRequestId: "" } : task);
  selectedPermanenceId = adminState.permanenceRequests[0]?.id || "";
  await saveAdminStateToDatabaseOnly("suppression", "permanence", request?.title || id, previousState);
}

function updateContact(id, form) {
  const contact = contactById(id);
  if (!contact) return;
  const previousState = { ...cloneAdminState(), localContacts: adminState.localContacts.map((item) => item.id === id ? { ...item, keywords: [...(item.keywords || [])], comments: [...(item.comments || [])] } : item) };
  const data = new FormData(form);
  contactFields().filter((field) => field.id !== "id").forEach((field) => contact[field.id] = contactValueFromForm(data, field));
  synchronizeContactIdentity(contact);
  // Les tags historiques et le champ moderne restent synchronisés lors d'une modification explicite.
  if(Object.prototype.hasOwnProperty.call(contact,"tags"))contact.tags=[...contact.keywords];
  const catalogueChanged=registerContactKeywords(contact);
  const previousId = contact.id;
  assignUniqueContactId(contact, previousId);
  updateContactReferences(previousId, contact.id);
  selectedContactId = contact.id;
  contact.updatedAt = new Date().toISOString();
  if (contact.deathDateApprox) ensureDeathContactMetadata(contact, contact.deathDateApprox);
  if (previousId === contact.id && !catalogueChanged) {
    saveAdminEntityUpdates([adminEntityUpdate("localContacts", contact)], "modification", "contact", contactDisplayName(contact), previousState);
  } else {
    saveAdminStateToDatabaseOnly("modification", "contact", contactDisplayName(contact), previousState);
  }
}

function contactValueFromForm(data, field) {
  if (field.type === "boolean") return data.get(field.id) === "1";
  if (field.type === "multilist") return data.getAll(field.id).map(String);
  if (field.id === "keywords") return String(data.get(field.id) || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  if (field.type === "number") return data.get(field.id) === "" ? "" : Number(data.get(field.id));
  return String(data.get(field.id) || "");
}

function createContact(form) {
  const previousState = { ...cloneAdminState(), localContacts: adminState.localContacts.slice() };
  const data = new FormData(form);
  const now = new Date().toISOString();
  const usedIds = new Set(adminState.localContacts.map((item) => item.id));
  const contact = normalizeContactRecord({
    id: "",
    firstName: String(data.get("firstName") || ""),
    lastName: String(data.get("lastName") || ""),
    email: String(data.get("email") || ""),
    mobile: String(data.get("mobile") || ""),
    city: String(data.get("city") || ""),
    postalCode: String(data.get("postalCode") || ""),
    streetName: String(data.get("streetName") || ""),
    country: String(data.get("country") || ""),
    category: "autre",
    keywords: String(data.get("keywords") || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean),
    comments: [],
    createdAt: now,
    updatedAt: now
  }, usedIds);
  const catalogueChanged=registerContactKeywords(contact);
  contactFields().filter((field) => !field.system).forEach((field) => {
    if (["id", "firstName", "lastName", "email", "city"].includes(field.id)) return;
    const value = contactValueFromForm(data, field);
    if (value !== "" && !(Array.isArray(value) && !value.length)) contact[field.id] = value;
  });
  normalizeContactRecord(contact, new Set(adminState.localContacts.map((item) => item.id)));
  adminState.localContacts.unshift(contact);
  selectedContactId = contact.id;
  form.reset();
  if(catalogueChanged)saveAdminStateToDatabaseOnly("creation","contact",contactDisplayName(contact),previousState);
  else saveAdminEntityUpdates([adminEntityUpdate("localContacts", contact, { insertIfMissing: true })], "creation", "contact", contactDisplayName(contact), previousState);
}

function updateContactReferences(previousId, nextId) {
  if (!previousId || !nextId || previousId === nextId) return;
  (adminState.institutions || []).forEach((item) => {
    if (item.mayorContactId === previousId) item.mayorContactId = nextId;
    if (item.legacyContactId === previousId) item.legacyContactId = nextId;
    item.deputyContactIds = (item.deputyContactIds || []).map(id => id === previousId ? nextId : id);
  });
  adminState.permanenceRequests.forEach((item) => { if (item.contactId === previousId) item.contactId = nextId; });
  adminState.teamTasks.forEach((item) => { if (item.linkedContactId === previousId) item.linkedContactId = nextId; });
  adminState.calendarEvents.forEach((item) => { item.contactIds = (item.contactIds || []).map((id) => id === previousId ? nextId : id); for (const rows of Object.values(item.attendanceByDate || {})) rows.forEach((row) => { if (row.contactId === previousId) row.contactId = nextId; }); });
  (adminState.campaignEvents || []).forEach((item) => { item.participants = (item.participants || []).map((row) => ({...row, contactId: row.contactId === previousId ? nextId : row.contactId})); });
  (adminState.savedContactSearches||[]).forEach(item=>{
    ["includeIds","excludeIds","snapshotIds"].forEach(key=>{
      if(Array.isArray(item[key]))item[key]=[...new Set(item[key].map(id=>id===previousId?nextId:id))];
    });
  });
  adminState.deathCases.forEach((item) => {
    if (item.deceasedId === previousId) item.deceasedId = nextId;
    (item.relatives || []).forEach((relative) => { if (relative.contactId === previousId) relative.contactId = nextId; });
  });
}

function clearDeletedContactReferences(ids) {
  const deleted = new Set(ids);
  (adminState.institutions || []).forEach((item) => {
    if (deleted.has(item.mayorContactId)) item.mayorContactId = "";
    if (deleted.has(item.legacyContactId)) item.legacyContactId = "";
    item.deputyContactIds = (item.deputyContactIds || []).filter(id => !deleted.has(id));
  });
  adminState.permanenceRequests.forEach((item) => { if (deleted.has(item.contactId)) item.contactId = ""; });
  adminState.teamTasks.forEach((item) => { if (deleted.has(item.linkedContactId)) item.linkedContactId = ""; });
  adminState.calendarEvents.forEach((item) => { item.contactIds = (item.contactIds || []).filter((id) => !deleted.has(id)); for (const [day, rows] of Object.entries(item.attendanceByDate || {})) item.attendanceByDate[day] = rows.filter((row) => !deleted.has(row.contactId)); });
  (adminState.campaignEvents || []).forEach((item) => { item.participants = (item.participants || []).filter((row) => !deleted.has(row.contactId)); });
  (adminState.savedContactSearches||[]).forEach(item=>{
    ["includeIds","excludeIds","snapshotIds"].forEach(key=>{
      if(Array.isArray(item[key]))item[key]=item[key].filter(id=>!deleted.has(id));
    });
  });
  adminState.deathCases.forEach((item) => {
    if (deleted.has(item.deceasedId)) item.deceasedId = "";
    item.relatives = (item.relatives || []).filter((relative) => !deleted.has(relative.contactId));
  });
}

async function deleteContactsWithProgress(ids, label = "contacts") {
  const targetIds = [...new Set(ids)].filter(Boolean);
  if (!targetIds.length) return;
  const deleted = new Set(targetIds);
  await deleteContactsByMatcherWithProgress((contact) => deleted.has(contact.id), targetIds.length, label, deleted);
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function deleteContactsByMatcherWithProgress(shouldDelete, estimatedTotal, label = "contacts", knownDeleted = null) {
  const total = Math.max(0, Number(estimatedTotal) || 0);
  if (!total) return;
  const source = adminState.localContacts;
  const kept = [];
  const deletedIds = knownDeleted || new Set();
  let deletedCount = 0;
  contactDeletionProgress = { deleted: 0, total, percent: 0, label };
  activeAdminSection = "contacts";
  renderAdmin();
  await nextFrame();

  for (let index = 0; index < source.length; index += 1) {
    const contact = source[index];
    if (shouldDelete(contact)) {
      deletedCount += 1;
      if (!knownDeleted) deletedIds.add(contact.id);
    } else {
      kept.push(contact);
    }
    if (index % 5000 === 0 || deletedCount === total) {
      contactDeletionProgress = {
        deleted: deletedCount,
        total,
        percent: Math.min(100, Math.round((deletedCount / total) * 100)),
        label
      };
      updateContactDeletionProgressDom();
      await nextFrame();
    }
  }

  adminState.localContacts = kept;
  clearDeletedContactReferences(deletedIds);
  clearContactSelection();
  if (deletedIds.has(selectedContactId)) selectedContactId = adminState.localContacts[0]?.id || "";
  contactDeletionProgress = {
    deleted: deletedCount,
    total: deletedCount,
    percent: 100,
    label: "Sauvegarde en base"
  };
  updateContactDeletionProgressDom();
  await nextFrame();
  contactDeletionProgress = null;
  saveAdminState("suppression", "contacts", `${deletedCount} contact(s) supprime(s)`);
}

async function deleteSelectedContactsFast(selectedCount = null) {
  const filters = contactSearchFilters();
  if (isAllFilteredContactSelectionActive(filters)) {
    if(adminFilters.activeSavedContactSearchId){const current=normalizeSavedContactSearches(adminState.savedContactSearches).find(item=>item.id===adminFilters.activeSavedContactSearchId);if(current&&(current.sourceIds?.length||current.isSnapshot||["manual","hybrid"].includes(current.listType))){await deleteContactsWithProgress(filteredContacts().map(c=>c.id),"contacts de la liste");return;}}
    const fieldsById = new Map(contactFields().map((field) => [field.id, field]));
    const total = selectedCount === null ? filteredContacts(filters).length : selectedCount;
    await deleteContactsByMatcherWithProgress((contact) => contactMatchesFilters(contact, filters, fieldsById), total, "contacts filtres");
    return;
  }
  await deleteContactsWithProgress([...selectedContactIds], "contacts selectionnes");
}

function contactExportRows() {
  const headers = contactFields().map((field) => field.id);
  return { headers, rows: adminState.localContacts.filter((contact) => contact.entityType !== "institution").map((contact) => headers.map((field) => Array.isArray(contact[field]) ? contact[field].join(", ") : contact[field] || "")) };
}

function csvEscape(value = "") {
  const raw = String(value ?? "");
  return /[",\n;]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function exportContacts(format = "csv") {
  const scope=document.querySelector("input[name=contactExportScope]:checked")?.value||"all";
  const base=adminState.localContacts.filter(c=>c.entityType!=="institution");
  const subset=scope==="filtered"?filteredContacts():scope==="selected"?(isAllFilteredContactSelectionActive(contactSearchFilters())?filteredContacts():base.filter(c=>selectedContactIds.has(c.id))):base;
  if(!subset.length){showToast("Aucun contact à exporter.");return;}
  if (format === "json") {
    downloadFile("contacts-locaux.json", JSON.stringify(subset, null, 2), "application/json;charset=utf-8");
    return;
  }
  const headers=contactFields().map(field=>field.id);
  const rows=subset.map(c=>headers.map(id=>Array.isArray(c[id])?c[id].join(", "):c[id]??""));
  const csv = [headers.join(";"), ...rows.map((row) => row.map(csvEscape).join(";"))].join("\n");
  downloadFile("contacts-locaux.csv", csv, "text/csv;charset=utf-8");
}

function parseCsv(textValue = "") {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(textValue).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ";" || char === ",") && !quoted) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);
  return rows;
}

function contactsFromCsv(value = "") {
  const rows = parseCsv(value);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => slugify(header).replace(/-/g, ""));
  const aliases = {
    id: "id",
    prenom: "firstName",
    firstname: "firstName",
    nom: "lastName",
    lastname: "lastName",
    nomusage: "usageName",
    nomdusage: "usageName",
    usagename: "usageName",
    nomnaissance: "birthName",
    nomdenaissance: "birthName",
    birthname: "birthName",
    email: "email",
    mail: "email",
    mobile: "mobile",
    telephone: "phone",
    phone: "phone",
    ville: "city",
    city: "city",
    codepostal: "postalCode",
    postalcode: "postalCode",
    categorie: "category",
    category: "category",
    organisation: "organization",
    organization: "organization",
    role: "role",
    fonction: "role",
    datenaissance: "birthDate",
    datedenaissance: "birthDate",
    birthdate: "birthDate",
    datedeces: "deathDateApprox",
    deathdateapprox: "deathDateApprox",
    tags: "keywords",
    tag: "keywords",
    motscles: "keywords",
    motsclefs: "keywords",
    keywords: "keywords",
    notes: "notes"
  };
  const usedIds = new Set(adminState.localContacts.map((contact) => contact.id));
  return rows.map((row) => {
    const contact = { id: "", keywords: [], comments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    headers.forEach((header, index) => {
      const key = aliases[header];
      if (key) contact[key] = String(row[index] || "").trim();
    });
    return normalizeContactRecord(contact, usedIds);
  }).filter((contact) => contact.firstName || contact.lastName || contact.email);
}

function contactImportAliases() {
  const activeFieldIds = new Set(contactFields().map((field) => field.id));
  const baseAliases = {
    id: "id",
    prenom: "firstName",
    firstname: "firstName",
    nom: "lastName",
    lastname: "lastName",
    nomusage: "usageName",
    nomdusage: "usageName",
    usagename: "usageName",
    nomnaissance: "birthName",
    nomdenaissance: "birthName",
    birthname: "birthName",
    email: "email",
    mail: "email",
    mobile: "mobile",
    telephone: "phone",
    phone: "phone",
    ville: "city",
    city: "city",
    codepostal: "postalCode",
    postalcode: "postalCode",
    categorie: "category",
    category: "category",
    organisation: "organization",
    organization: "organization",
    role: "role",
    fonction: "role",
    datenaissance: "birthDate",
    datedenaissance: "birthDate",
    birthdate: "birthDate",
    datedeces: "deathDateApprox",
    deathdateapprox: "deathDateApprox",
    tags: "keywords",
    tag: "keywords",
    motscles: "keywords",
    motsclefs: "keywords",
    keywords: "keywords",
    notes: "notes"
  };
  const aliases = Object.fromEntries(Object.entries(baseAliases).filter(([, fieldId]) => activeFieldIds.has(fieldId)));
  contactFields().forEach((field) => {
    const labelKey = slugify(field.label).replace(/-/g, "");
    const idKey = slugify(field.id).replace(/-/g, "");
    if (!aliases[labelKey]) aliases[labelKey] = field.id;
    if (!aliases[idKey]) aliases[idKey] = field.id;
  });
  return aliases;
}

async function readContactImportPreview(file) {
  const buffer = await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer();
  let content = "";
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    content = new TextDecoder("windows-1252").decode(buffer);
  }
  return content;
}

function startContactCsvImport(file, content) {
  const rows = parseCsv(content);
  if (!rows.length) throw new Error("CSV vide.");
  const headers = rows.shift();
  const aliases = contactImportAliases();
  pendingContactImport = {
    fileName: file?.name || "contacts.csv",
    file,
    headers,
    rows: rows.slice(0, 5),
    previewOnly: true,
    mapping: headers.map((header) => aliases[slugify(header).replace(/-/g, "")] || "")
  };
  activeAdminSection = "contact-io";
  renderAdmin();
}

function parseContactImportValue(value, field) {
  const raw = String(value ?? "").trim();
  if (field.type === "boolean") return ["1", "oui", "yes", "true", "vrai", "x"].includes(raw.toLowerCase());
  if (field.type === "number") return raw === "" ? "" : Number(raw.replace(",", "."));
  if (field.id === "keywords") return raw.split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  if (field.type === "multilist") return raw.split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  return raw;
}

function contactsFromMappedRows(rows, mapping) {
  const fieldsById = new Map(contactFields().map((field) => [field.id, field]));
  const usedIds = new Set(adminState.localContacts.map((contact) => contact.id));
  return rows.map((row) => {
    const contact = { id: "", keywords: [], comments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mapping.forEach((fieldId, index) => {
      const field = fieldsById.get(fieldId);
      if (!field) return;
      const value = parseContactImportValue(row[index], field);
      if (value !== "" && !(Array.isArray(value) && !value.length)) contact[field.id] = value;
    });
    return normalizeContactRecord(contact, usedIds);
  }).filter((contact) => contact.firstName || contact.lastName || contact.email || contact.organization);
}

async function finishContactCsvImport(form) {
  if (!pendingContactImport) return;
  const data = new FormData(form);
  const mapping = pendingContactImport.headers.map((_, index) => String(data.get(`column-${index}`) || ""));
  if (pendingContactImport.file) {
    contactImportStatus = {
      title: "Import des contacts en cours",
      message: `Traitement de ${pendingContactImport.fileName}. Pour un gros fichier, l'operation peut prendre une ou deux minutes.`
    };
    renderAdmin();
    try {
      const formData = new FormData();
      formData.append("file", pendingContactImport.file);
      formData.append("mapping", JSON.stringify(mapping));
      const result = await adminFileApiRequest("import-contacts", formData);
      pendingContactImport = null;
      adminSyncStatus = "synced";
      adminSyncMessage = `${result.imported || 0} contact(s) importe(s). Rechargement de la base...`;
      contactImportStatus = {
        title: "Import termine",
        message: adminSyncMessage
      };
      renderAdmin();
      await loadAdminStateFromApi();
      adminSyncMessage = `${result.imported || 0} contact(s) importe(s).`;
      contactImportStatus = null;
      showToast(adminSyncMessage);
      renderAdmin();
    } catch (error) {
      contactImportStatus = null;
      adminSyncStatus = "error";
      adminSyncMessage = `${error.message || "Import contacts impossible"} - base obligatoire.`;
      renderAdmin();
      showToast(adminSyncMessage);
    }
    return;
  }
  const contacts = contactsFromMappedRows(pendingContactImport.rows, mapping);
  mergeImportedContacts(contacts);
  pendingContactImport = null;
  saveAdminState("import", "contacts", `${contacts.length} contact(s) importe(s)`);
}

function mergeImportedContacts(contacts) {
  const existing = new Map(adminState.localContacts.map((contact) => [contact.id, contact]));
  const usedIds = new Set(existing.keys());
  contacts.forEach((contact) => {
    if (contact.id) usedIds.delete(contact.id);
    const normalized = normalizeContactRecord({ ...contact, updatedAt: new Date().toISOString() }, usedIds);
    existing.set(normalized.id, { ...(existing.get(normalized.id) || {}), ...normalized });
  });
  adminState.localContacts = [...existing.values()];
}

async function importContactsFile(file, format = "csv") {
  if (!file) return;
  if (format === "csv") {
    contactImportStatus = {
      title: "Lecture des colonnes",
      message: `Preparation de l'apercu de ${file.name}.`
    };
    pendingContactImport = null;
    activeAdminSection = "contact-io";
    renderAdmin();
    try {
      const preview = await readContactImportPreview(file);
      contactImportStatus = null;
      startContactCsvImport(file, preview);
    } catch (error) {
      contactImportStatus = null;
      renderAdmin();
      showToast(error.message || "Lecture des colonnes impossible.");
    }
    return;
  }
  contactImportStatus = {
    title: "Lecture du fichier JSON",
    message: "Le fichier est en cours de preparation avant sauvegarde."
  };
  renderAdmin();
  try {
    const content = await file.text();
    let contacts = [];
    if (format === "json") {
      const parsed = JSON.parse(content);
      const allowedFields = new Set(contactFields().map((field) => field.id));
      contacts = (Array.isArray(parsed) ? parsed : Array.isArray(parsed.localContacts) ? parsed.localContacts : [])
        .map((contact) => Object.fromEntries(Object.entries(contact || {}).filter(([key]) => allowedFields.has(key) || ["comments", "createdAt", "updatedAt"].includes(key))));
    } else {
      startContactCsvImport(file, content);
      return;
    }
    mergeImportedContacts(contacts);
    contactImportStatus = null;
    saveAdminState("import", "contacts", `${contacts.length} contact(s) importe(s)`);
  } catch (error) {
    contactImportStatus = null;
    renderAdmin();
    throw error;
  }
}

function createContactField(form) {
  const data = new FormData(form);
  const label = String(data.get("label") || "").trim();
  if (!label) return;
  const id = slugify(label).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  const field = {
    id,
    label,
    type: contactFieldTypes.includes(data.get("type")) ? data.get("type") : "text",
    options: String(data.get("options") || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    required: data.get("required") === "1",
    order: contactFields().length + 1
  };
  adminState.deletedContactFields = (adminState.deletedContactFields || []).filter((fieldId) => fieldId !== id);
  adminState.contactFields = normalizeContactFields([...contactFields().filter((item) => item.id !== id), field]);
  form.reset();
  saveAdminState("creation", "champ contact", label);
}

function updateContactField(id, form) {
  const data = new FormData(form);
  adminState.contactFields = normalizeContactFields(contactFields().map((field) => field.id === id ? {
    ...field,
    label: String(data.get("label") || field.label),
    type: contactFieldTypes.includes(data.get("type")) ? data.get("type") : field.type,
    options: String(data.get("options") || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    required: data.get("required") === "1"
  } : field));
  saveAdminState("modification", "champ contact", id);
}

function deleteContactField(id) {
  const field = contactFields().find((item) => item.id === id);
  if (!field) return;
  adminState.deletedContactFields = [...new Set([...(adminState.deletedContactFields || []), id])];
  adminState.contactFields = contactFields().filter((item) => item.id !== id);
  adminState.localContacts.forEach((contact) => delete contact[id]);
  saveAdminState("suppression", "champ contact", field.label);
}

async function createDeathCase(form) {
  const previousState = cloneAdminState();
  const data = new FormData(form);
  const contact = contactById(data.get("deceasedId"));
  if (!contact) return;
  ensureDeathContactMetadata(contact, data.get("deathDate"));
  const now = new Date().toISOString();
  const item = { id: crypto.randomUUID(), deceasedId: contact.id, deathDate: data.get("deathDate"), deathAge: data.get("deathAge"), deathPlace: data.get("deathPlace"), notes: data.get("notes") || "", status: "ouvert", relatives: [], history: [], createdAt: now, updatedAt: now };
  adminState.deathCases.unshift(item);
  selectedDeathCaseId = item.id;
  adminFilters.deathCreateOpen = false;
  if (adminFilters.contactPickers) delete adminFilters.contactPickers["death-deceased"];
  await saveAdminEntityUpdates([
    adminEntityUpdate("deathCases", item, { insertIfMissing: true }),
    adminEntityUpdate("localContacts", contact)
  ], "creation", "dossier deces", contactDisplayName(contact), previousState);
}

async function updateDeathCase(caseId, form) {
  const previousState = cloneAdminState();
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  if (!deathCase) return;
  const data = new FormData(form);
  deathCase.deathDate = data.get("deathDate") || "";
  deathCase.deathAge = data.get("deathAge") || "";
  deathCase.deathPlace = data.get("deathPlace") || "";
  deathCase.notes = data.get("notes") || "";
  deathCase.updatedAt = new Date().toISOString();
  const contact = contactById(deathCase.deceasedId);
  ensureDeathContactMetadata(contact, deathCase.deathDate);
  const updates = [adminEntityUpdate("deathCases", deathCase, { insertIfMissing: true })];
  if (contact) updates.push(adminEntityUpdate("localContacts", contact));
  await saveAdminEntityUpdates(updates, "modification", "dossier deces", deathCaseName(deathCase), previousState);
}

function deleteDeathCase(caseId) {
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  adminState.deathCases = adminState.deathCases.filter((item) => item.id !== caseId);
  if (selectedDeathCaseId === caseId) selectedDeathCaseId = "";
  saveAdminState("suppression", "dossier deces", deathCase ? deathCaseName(deathCase) : caseId);
}

function addRelative(caseId, form) {
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  if (!deathCase) return;
  const data = new FormData(form);
  const relation = String(data.get("relation") || "").trim().slice(0, 160);
  deathCase.relatives = deathCase.relatives || [];
  deathCase.relatives.push({ id: crypto.randomUUID(), contactId: data.get("contactId"), relation: relation || "proche", templateId: data.get("templateId") || adminState.deathEmailTemplates[0]?.id || "", sentAt: "", responseStatus: "pending", respondedAt: "" });
  adminFilters.deathAddOpen = false;
  if (adminFilters.contactPickers) delete adminFilters.contactPickers[`death-relative-${caseId}`];
  saveAdminState("ajout proche", "dossier deces", data.get("contactId"));
}

function deleteDeathRelative(caseId, relativeId) {
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  if (!deathCase) return;
  deathCase.relatives = deathCaseRelatives(deathCase).filter((relative) => relative.id !== relativeId);
  deathCase.updatedAt = new Date().toISOString();
  saveAdminState("suppression destinataire", "dossier deces", deathCaseName(deathCase));
}

function createDeathRelation(form) {
  const label = String(new FormData(form).get("label") || "").trim();
  if (!label) return;
  adminState.deathRelationOptions = normalizeDeathRelationOptions([...(adminState.deathRelationOptions || []), label]);
  saveAdminState("creation", "relation deces", label);
}

function updateDeathRelation(previous, form) {
  const label = String(new FormData(form).get("label") || "").trim();
  if (!label) return;
  adminState.deathRelationOptions = deathRelationOptions().map((item) => item === previous ? label : item);
  adminState.deathCases.forEach((deathCase) => deathCaseRelatives(deathCase).forEach((relative) => {
    if (relative.relation === previous) relative.relation = label;
  }));
  adminState.deathRelationOptions = normalizeDeathRelationOptions(adminState.deathRelationOptions);
  saveAdminState("modification", "relation deces", label);
}

function deleteDeathRelation(label) {
  adminState.deathRelationOptions = deathRelationOptions().filter((item) => item !== label);
  saveAdminState("suppression", "relation deces", label);
}

function deathTemplateData(deathCase, relative) {
  const deceased = contactById(deathCase.deceasedId) || {};
  const close = contactById(relative.contactId) || {};
  return { date_du_jour: formatFullDate(new Date().toISOString().slice(0, 10)), civilite_proche: "Madame, Monsieur", prenom_proche: close.firstName || "", nom_proche: close.lastName || "", adresse_proche: contactAddress(close), prenom_defunt: deceased.firstName || "", nom_defunt: deceased.lastName || "", date_deces: deathCase.deathDate ? formatFullDate(deathCase.deathDate) : "date non renseignee" };
}

function fillDeathTemplate(value = "", deathCase, relative) {
  const values = deathTemplateData(deathCase, relative);
  return String(value || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[key] ?? "");
}

function deathTemplateForRelative(relative = {}) {
  return deathTemplateForId(relative.templateId) || adminState.deathEmailTemplates[0] || defaultDeathEmailTemplates()[0];
}

function deathTemplateForId(id = "") {
  return adminState.deathEmailTemplates.find((template) => template.id === id) || null;
}

function addContactNote(contact, body, asComment = false) {
  if (!contact || !body) return;
  contact.notes = [String(contact.notes || "").trim(), body].filter(Boolean).join("\n");
  contact.comments = Array.isArray(contact.comments) ? contact.comments : [];
  if (asComment) contact.comments.push({ id: crypto.randomUUID(), authorId: currentUserId, authorName: userNameById(currentUserId) || "Equipe", body, createdAt: new Date().toISOString() });
  contact.updatedAt = new Date().toISOString();
}

function deathCondolenceNote(deathCase, relative = {}) {
  const deceased = contactById(deathCase?.deceasedId) || {};
  const deceasedName = [deceased.lastName || deceased.usageName || deceased.birthName, deceased.firstName].filter(Boolean).join(" ");
  return `Condoléances pour ${relative.relation || "proche"} ${deceasedName || deathCaseName(deathCase)}`.trim();
}

async function markDeathLetterGenerated(caseId, relativeId) {
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  const relative = deathCase?.relatives?.find((item) => item.id === relativeId);
  if (!deathCase || !relative) return;
  const downloaded = await downloadDeathLetter(caseId, relativeId);
  if (!downloaded) return;
  const previousState = cloneAdminState();
  const now = new Date().toISOString();
  relative.sentAt = relative.sentAt || now;
  relative.responseStatus = relative.responseStatus || "pending";
  deathCase.updatedAt = now;
  const contact = contactById(relative.contactId);
  addContactNote(contact, deathCondolenceNote(deathCase, relative));
  const updates = [adminEntityUpdate("deathCases", deathCase, { insertIfMissing: true })];
  if (contact) updates.push(adminEntityUpdate("localContacts", contact));
  await saveAdminEntityUpdates(updates, "envoi courrier", "dossier deces", contactDisplayName(contact || {}), previousState);
}

async function markDeathResponse(caseId, relativeId) {
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  const relative = deathCase?.relatives?.find((item) => item.id === relativeId);
  if (!deathCase || !relative) return;
  const previousState = cloneAdminState();
  const contact = contactById(relative.contactId);
  const answered = relative.responseStatus !== "answered";
  const now = new Date().toISOString();
  relative.responseStatus = answered ? "answered" : "none";
  relative.respondedAt = answered ? now : "";
  deathCase.updatedAt = now;
  if (answered) addContactNote(contact, `Reponse recue au courrier deces pour ${deathCaseName(deathCase)} le ${formatDate(now.slice(0, 10))}`, true);
  const updates = [adminEntityUpdate("deathCases", deathCase, { insertIfMissing: true })];
  if (contact) updates.push(adminEntityUpdate("localContacts", contact));
  await saveAdminEntityUpdates(updates, "reponse courrier", "dossier deces", contactDisplayName(contact || {}), previousState);
}

function createSpecialLetter(form) {
  const data = new FormData(form);
  const contact = contactById(data.get("contactId"));
  if (!contact) {
    showToast("Selectionnez un destinataire.");
    return;
  }
  const templateId = data.get("templateId") || "";
  if (!deathTemplateForId(templateId)) {
    showToast("Ajoutez ou selectionnez un modele de courrier special.");
    return;
  }
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    contactId: contact.id,
    title: String(data.get("title") || "").trim(),
    templateId,
    notes: data.get("notes") || "",
    sentAt: "",
    responseStatus: "pending",
    respondedAt: "",
    createdAt: now,
    updatedAt: now
  };
  adminState.specialLetters = adminState.specialLetters || [];
  adminState.specialLetters.unshift(item);
  selectedSpecialLetterId = item.id;
  adminFilters.specialLetterCreateOpen = false;
  if (adminFilters.contactPickers) delete adminFilters.contactPickers["special-letter-contact"];
  saveAdminState("creation", "courrier special", contactDisplayName(contact));
}

function deleteSpecialLetter(id) {
  const letter = (adminState.specialLetters || []).find((item) => item.id === id);
  adminState.specialLetters = (adminState.specialLetters || []).filter((item) => item.id !== id);
  if (selectedSpecialLetterId === id) selectedSpecialLetterId = "";
  saveAdminState("suppression", "courrier special", specialLetterName(letter));
}

async function markSpecialLetterGenerated(id) {
  const letter = (adminState.specialLetters || []).find((item) => item.id === id);
  if (!letter) return;
  const downloaded = await downloadSpecialLetter(id);
  if (!downloaded) return;
  const previousState = cloneAdminState();
  const now = new Date().toISOString();
  letter.sentAt = letter.sentAt || now;
  letter.responseStatus = letter.responseStatus || "pending";
  letter.updatedAt = now;
  const contact = contactById(letter.contactId);
  addContactNote(contact, `Courrier special "${letter.title || "sans objet"}" genere le ${formatDate(now.slice(0, 10))}`);
  const updates = [adminEntityUpdate("specialLetters", letter)];
  if (contact) updates.push(adminEntityUpdate("localContacts", contact));
  await saveAdminEntityUpdates(updates, "envoi courrier", "courrier special", contactDisplayName(contact || {}), previousState);
}

async function markSpecialLetterResponse(id) {
  const letter = (adminState.specialLetters || []).find((item) => item.id === id);
  if (!letter) return;
  const previousState = cloneAdminState();
  const contact = contactById(letter.contactId);
  const answered = letter.responseStatus !== "answered";
  const now = new Date().toISOString();
  letter.responseStatus = answered ? "answered" : "none";
  letter.respondedAt = answered ? now : "";
  letter.updatedAt = now;
  if (answered) addContactNote(contact, `Reponse recue au courrier special "${letter.title || "sans objet"}" le ${formatDate(now.slice(0, 10))}`, true);
  const updates = [adminEntityUpdate("specialLetters", letter)];
  if (contact) updates.push(adminEntityUpdate("localContacts", contact));
  await saveAdminEntityUpdates(updates, "reponse courrier", "courrier special", contactDisplayName(contact || {}), previousState);
}

async function createDeathTemplate(form) {
  const data = new FormData(form);
  const file = data.get("templateFile");
  if (!file || !file.name) {
    showToast("Ajoutez un fichier Word .docx.");
    return;
  }
  const now = new Date().toISOString();
  const scope = data.get("scope") || "deces";
  adminState.deathEmailTemplates.push({
    id: crypto.randomUUID(),
    title: data.get("title"),
    description: data.get("description") || "",
    scope,
    fileName: file.name,
    fileData: await fileToDataUrl(file),
    fileDataDirty: true,
    mimeType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    variables: deathVariablesFromForm(data),
    subject: "",
    body: "",
    createdAt: now,
    updatedAt: now
  });
  saveAdminState("creation", scope === "special" ? "modele courrier special" : "modele deces", data.get("title"));
}

async function updateDeathTemplate(id, form) {
  const template = adminState.deathEmailTemplates.find((item) => item.id === id);
  if (!template) return;
  const data = new FormData(form);
  const file = data.get("templateFile");
  template.title = data.get("title") || template.title;
  template.description = data.get("description") || "";
  template.scope = data.get("scope") || template.scope || "deces";
  if (file && file.name) {
    template.fileName = file.name;
    template.fileData = await fileToDataUrl(file);
    template.fileDataDirty = true;
    template.mimeType = file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  template.variables = deathVariablesFromForm(data);
  template.updatedAt = new Date().toISOString();
  saveAdminState("modification", template.scope === "special" ? "modele courrier special" : "modele deces", template.title);
}

function duplicateDeathTemplate(id) {
  const source = adminState.deathEmailTemplates.find((item) => item.id === id);
  if (!source) return;
  const requestedName = prompt("Nom du modele duplique", `${source.title} - copie`);
  if (!requestedName?.trim()) return;
  const now = new Date().toISOString();
  const duplicate = {
    ...JSON.parse(JSON.stringify(source)),
    id: crypto.randomUUID(),
    title: requestedName.trim().slice(0, 180),
    variables: JSON.parse(JSON.stringify(source.variables || [])),
    fileDataDirty: Boolean(source.fileData),
    createdAt: now,
    updatedAt: now
  };
  adminState.deathEmailTemplates.push(duplicate);
  adminFilters.wordTemplateEdit = duplicate.id;
  saveAdminState("duplication", "modele courrier", duplicate.title);
}

function deathVariablesFromForm(data) {
  const variables = [];
  for (const [key] of data.entries()) {
    const match = key.match(/^variableTag-(\d+)$/);
    if (!match) continue;
    const index = match[1];
    const tag = String(data.get(`variableTag-${index}`) || "").trim().replace(/^\{+|\}+$/g, "");
    if (!tag) continue;
    variables.push({
      tag,
      source: String(data.get(`variableSource-${index}`) || "").trim(),
      fallback: String(data.get(`variableFallback-${index}`) || ""),
      replacements: String(data.get(`variableReplacements-${index}`) || "")
    });
  }
  return normalizeDeathTemplateVariables(variables);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

async function homepageImageToDataUrl(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Selectionnez un fichier image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("La photo ne doit pas depasser 8 Mo.");
  const source = await fileToDataUrl(file);
  const image = await new Promise((resolve, reject) => {
    const preview = new Image();
    preview.onload = () => resolve(preview);
    preview.onerror = () => reject(new Error("Cette image ne peut pas etre lue."));
    preview.src = source;
  });
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.88);
}

function deleteDeathTemplate(id) {
  if (adminState.deathEmailTemplates.length <= 1) {
    showToast("Conservez au moins un modele Word.");
    return;
  }
  adminState.deathEmailTemplates = adminState.deathEmailTemplates.filter((item) => item.id !== id);
  adminState.deathCases.forEach((deathCase) => deathCaseRelatives(deathCase).forEach((relative) => { if (relative.templateId === id) relative.templateId = adminState.deathEmailTemplates[0]?.id || ""; }));
  (adminState.specialLetters || []).forEach((letter) => { if (letter.templateId === id) letter.templateId = adminState.deathEmailTemplates.find((template) => template.scope === "special")?.id || ""; });
  saveAdminState("suppression", "modele courrier", id);
}

function deathLetterText(deathCase, relative) {
  const values = deathTemplateReplacementData(deathTemplateForRelative(relative), deathCase, relative);
  return Object.entries(values).map(([key, value]) => `${key}: ${value}`).join("\n");
}

async function downloadDeathLetter(caseId, relativeId) {
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  const relative = deathCase?.relatives?.find((item) => item.id === relativeId);
  if (!deathCase || !relative) return false;
  const template = deathTemplateForRelative(relative);
  const contact = contactById(relative.contactId) || {};
  if (!template.fileData) {
    showToast("Ajoutez un fichier Word a ce modele avant de generer le courrier.");
    return false;
  }
  try {
    const replacements = deathTemplateReplacementData(template, deathCase, relative);
    const docx = await replaceDocxVariables(dataUrlToArrayBuffer(template.fileData), replacements);
    downloadFile(`courrier-deces-${slugify(deathCaseName(deathCase))}-${slugify(contactDisplayName(contact))}.docx`, docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return true;
  } catch (error) {
    showToast(error.message || "Generation du document impossible.");
    return false;
  }
}

async function downloadSpecialLetter(id) {
  const letter = (adminState.specialLetters || []).find((item) => item.id === id);
  if (!letter) return false;
  const template = deathTemplateForId(letter.templateId) || adminState.deathEmailTemplates.find((item) => item.scope === "special") || adminState.deathEmailTemplates.find((item) => item.scope === "general");
  const contact = contactById(letter.contactId) || {};
  if (!template?.fileData) {
    showToast("Ajoutez un fichier Word au modele special avant de generer le courrier.");
    return false;
  }
  try {
    const replacements = specialTemplateReplacementData(template, letter);
    const docx = await replaceDocxVariables(dataUrlToArrayBuffer(template.fileData), replacements);
    downloadFile(`courrier-special-${slugify(letter.title || "courrier")}-${slugify(contactDisplayName(contact))}.docx`, docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return true;
  } catch (error) {
    showToast(error.message || "Generation du document impossible.");
    return false;
  }
}

function deathMailto(deathCase, relative) {
  const contact = contactById(relative.contactId) || {};
  const template = deathTemplateForRelative(relative);
  const subject = fillDeathTemplate(template.subject || "Condoleances", deathCase, relative);
  return `mailto:${encodeURIComponent(contact.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(deathLetterText(deathCase, relative))}`;
}

function deathTemplateReplacementData(template, deathCase, relative) {
  const variables = normalizeDeathTemplateVariables(template.variables);
  const replacements = {};
  variables.forEach((variable) => {
    const value = resolveDeathVariable(variable, deathCase, relative);
    replacements[variable.tag] = value;
    replacements[variable.tag.replace(/_/g, "-")] = value;
    replacements[variable.tag.replace(/-/g, "_")] = value;
  });
  return replacements;
}

function specialTemplateReplacementData(template, letter) {
  const variables = normalizeDeathTemplateVariables(template.variables);
  const replacements = {};
  variables.forEach((variable) => {
    const value = resolveSpecialVariable(variable, letter);
    replacements[variable.tag] = value;
    replacements[variable.tag.replace(/_/g, "-")] = value;
    replacements[variable.tag.replace(/-/g, "_")] = value;
  });
  return replacements;
}

function resolveDeathVariable(variable, deathCase, relative) {
  const raw = deathTemplateSourceValue(variable.source, deathCase, relative);
  const mapped = replacementValue(raw, variable.replacements);
  const civilite = mapped === null && isCivilityVariable(variable) ? civilityLabel(raw) : "";
  const value = mapped !== null ? mapped : civilite || raw;
  return String(value || variable.fallback || "");
}

function resolveSpecialVariable(variable, letter) {
  const raw = specialTemplateSourceValue(variable.source, letter);
  const mapped = replacementValue(raw, variable.replacements);
  const civilite = mapped === null && isCivilityVariable(variable) ? civilityLabel(raw) : "";
  const value = mapped !== null ? mapped : civilite || raw;
  return String(value || variable.fallback || "");
}

function isCivilityVariable(variable = {}) {
  return /civilite|civility|title|gender|sexe/i.test([variable.tag, variable.source].join(" "));
}

function civilityLabel(value = "") {
  const normalized = normalizeName(value);
  if (["1", "m", "mr", "m.", "monsieur"].includes(normalized)) return "Monsieur";
  if (["2", "f", "mme", "madame"].includes(normalized)) return "Madame";
  return "";
}

function deathTemplateSourceValue(source = "", deathCase, relative) {
  const deceased = contactById(deathCase.deceasedId) || {};
  const close = contactById(relative.contactId) || {};
  if (source === "date_du_jour") return formatFullDate(new Date().toISOString().slice(0, 10));
  if (source === "proche.adresse_complete") return contactAddress(close);
  if (source === "defunt.adresse_complete") return contactAddress(deceased);
  if (source.startsWith("relative.")) {
    const key = source.slice("relative.".length);
    return relative?.[key] || "";
  }
  if (source.startsWith("dossier.")) {
    const key = source.slice("dossier.".length);
    const value = deathCase[key] || "";
    return key.toLowerCase().includes("date") ? formatFullDate(value) : value;
  }
  if (source.startsWith("defunt.")) return formatDeathContactTemplateValue(deceased, source.slice("defunt.".length));
  if (source.startsWith("proche.")) return formatDeathContactTemplateValue(close, source.slice("proche.".length));
  if (source.startsWith("destinataire.")) return formatDeathContactTemplateValue(close, source.slice("destinataire.".length));
  return "";
}

function specialTemplateSourceValue(source = "", letter = {}) {
  const contact = contactById(letter.contactId) || {};
  if (source === "date_du_jour") return formatFullDate(new Date().toISOString().slice(0, 10));
  if (source === "destinataire.adresse_complete" || source === "proche.adresse_complete") return contactAddress(contact);
  if (source.startsWith("destinataire.")) return formatContactTemplateValue(contact, source.slice("destinataire.".length));
  if (source.startsWith("proche.")) return formatContactTemplateValue(contact, source.slice("proche.".length));
  if (source.startsWith("courrier.")) {
    const key = source.slice("courrier.".length);
    return letter?.[key] || "";
  }
  return "";
}

function formatContactTemplateValue(contact, key) {
  if (["title", "civilite", "civility", "gender", "sexe"].includes(key)) {
    return contact?.title || contact?.civilite || contact?.civility || contact?.gender || contact?.sexe || "";
  }
  if (["firstName", "prenom", "first_name"].includes(key)) {
    return contact?.firstName || contact?.prenom || contact?.first_name || "";
  }
  if (["lastName", "nom", "last_name"].includes(key)) {
    return contact?.lastName || contact?.usageName || contact?.birthName || contact?.nom || contact?.nomDusage || contact?.nomDeNaissance || contact?.last_name || "";
  }
  const value = contact?.[key];
  if (Array.isArray(value)) return value.join(", ");
  if (String(key).toLowerCase().includes("date")) return formatFullDate(value);
  return value || "";
}

function formatDeathContactTemplateValue(contact, key) {
  const value = formatContactTemplateValue(contact, key);
  if (!/^(firstName|first_name|pr[eé]noms?)$/i.test(String(key || ""))) return value;
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function replacementValue(rawValue, replacements = "") {
  const raw = String(rawValue || "").trim();
  const lines = String(replacements || "").split(/\r?\n/);
  for (const line of lines) {
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    if (key === raw) return value;
  }
  return null;
}

function dataUrlToArrayBuffer(dataUrl = "") {
  const base64 = (String(dataUrl).trim().split(",").pop() || "").replace(/\s+/g, "");
  let binary;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("Le fichier Word de ce modele est corrompu ou absent de la base. Rouvrez le modele de courrier et rechargez le fichier .docx.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function replaceDocxVariables(arrayBuffer, replacements) {
  const entries = await readZipEntries(arrayBuffer);
  const xmlTargets = entries.filter((entry) => /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/i.test(entry.name));
  if (!xmlTargets.length) throw new Error("Le fichier Word ne contient pas de document modifiable.");
  for (const entry of xmlTargets) {
    const xml = new TextDecoder().decode(entry.data);
    entry.data = new TextEncoder().encode(replaceVariablesInWordXml(xml, replacements));
  }
  return writeZipEntries(entries);
}

function replaceVariablesInWordXml(xml, replacements) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return replaceVariablesInText(xml, replacements);
  const textNodes = [...doc.getElementsByTagName("*")]
    .filter((node) => node.localName === "t" && node.firstChild)
    .map((node) => node.firstChild);
  let fullText = "";
  const ranges = textNodes.map((node) => {
    const start = fullText.length;
    fullText += node.nodeValue || "";
    return { node, start, end: fullText.length, text: node.nodeValue || "" };
  });
  const matches = [...fullText.matchAll(/\{\s*([a-zA-Z0-9_-]+)\s*\}/g)]
    .filter((match) => Object.prototype.hasOwnProperty.call(replacements, match[1]))
    .map((match) => ({ start: match.index, end: match.index + match[0].length, key: match[1], value: String(replacements[match[1]] ?? "") }));
  ranges.forEach((range) => {
    let output = "";
    let cursor = range.start;
    matches.filter((match) => match.end > range.start && match.start < range.end).forEach((match) => {
      const copyEnd = Math.min(Math.max(match.start, range.start), range.end);
      if (copyEnd > cursor) output += fullText.slice(cursor, copyEnd);
      if (match.start >= range.start && match.start < range.end) output += match.value;
      cursor = Math.max(cursor, Math.min(match.end, range.end));
    });
    if (cursor < range.end) output += fullText.slice(cursor, range.end);
    range.node.nodeValue = output;
  });
  preserveWordTextSpacing(doc);
  return new XMLSerializer().serializeToString(doc);
}

function preserveWordTextSpacing(doc) {
  [...doc.getElementsByTagName("*")]
    .filter((node) => node.localName === "t" && /^\s|\s$/.test(node.textContent || ""))
    .forEach((node) => node.setAttribute("xml:space", "preserve"));
}

function replaceVariablesInText(value, replacements) {
  return String(value || "").replace(/\{\s*([a-zA-Z0-9_-]+)\s*\}/g, (match, key) => Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match);
}

async function readZipEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Le fichier Word est illisible.");
  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = [];
  for (let i = 0; i < total; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : await inflateRaw(compressed);
    entries.push({ name, method: 0, data, crc, uncompressedSize });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== "function") throw new Error("Ce navigateur ne peut pas lire ce modele Word compresse.");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function writeZipEntries(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  entries.forEach((entry) => {
    const nameBytes = new TextEncoder().encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);
    const header = new Uint8Array(46 + nameBytes.length);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x02014b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint16(6, 20, true);
    headerView.setUint32(16, crc, true);
    headerView.setUint32(20, data.length, true);
    headerView.setUint32(24, data.length, true);
    headerView.setUint16(28, nameBytes.length, true);
    headerView.setUint32(42, offset, true);
    header.set(nameBytes, 46);
    central.push(header);
    offset += local.length + data.length;
  });
  const centralOffset = offset;
  central.forEach((chunk) => {
    chunks.push(chunk);
    offset += chunk.length;
  });
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, offset - centralOffset, true);
  endView.setUint32(16, centralOffset, true);
  chunks.push(end);
  return new Blob(chunks, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function crc32(bytes) {
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  }));
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  const target = document.querySelector("#share-feedback");
  if (!target) return;
  target.textContent = message;
  target.classList.add("is-visible");
  setTimeout(() => target.classList.remove("is-visible"), 2500);
}

async function handleLogin(event) {
  event.preventDefault();
  const data = new FormData(submittedForm(event));
  const login = String(data.get("login") || "").trim();
  const password = String(data.get("password") || "");
  const feedback = document.querySelector("#login-feedback");
  setFeedback(feedback);
  try {
    const result = await apiJson("auth.php?action=login", { login, password });
    if (result.state) {
      state = { ...state, ...result.state };
      saveState();
    }
    if (result.user) {
      upsertUser(result.user);
      currentUserId = result.user.id;
      safeSetLocalStorage(SESSION_KEY, currentUserId);
      if (ALLOW_LOCAL_DATA_FALLBACK) safeSetLocalStorage(STORAGE_KEY, JSON.stringify(state));
      adminApiLoadRequested = false;
      activePanel = roleRank(result.user.role) >= 10 ? "admin" : "profile";
      renderAll();
      return;
    }
  } catch (error) {
    if (!ALLOW_LOCAL_DATA_FALLBACK) {
      // Une ancienne version de l'API pouvait enregistrer la session puis
      // echouer en renvoyant le tres volumineux etat public. Dans ce cas, la
      // session est utilisable : on la recupere sans redemander le mot de passe.
      try {
        const recovery = await apiJson("auth.php?action=me");
        if (recovery.user) {
          upsertUser(recovery.user);
          currentUserId = recovery.user.id;
          safeSetLocalStorage(SESSION_KEY, currentUserId);
          adminApiLoadRequested = false;
          activePanel = roleRank(recovery.user.role) >= 10 ? "admin" : "profile";
          renderAll();
          return;
        }
      } catch (_recoveryError) {
        // Conserver le message de la tentative de connexion initiale.
      }
      setFeedback(feedback, error.message || "Connexion impossible : base de donnees indisponible.", "error");
      return;
    }
  }
  const account = state.users.find((item) => item.login === login || item.email === login);
  if (!account) {
    setFeedback(feedback, "Identifiant inconnu.", "error");
    return;
  }
  const user = account.password === password ? account : null;
  if (!user) {
    setFeedback(feedback, "Mot de passe errone.", "error");
    return;
  }
  currentUserId = user.id;
  user.lastLogin = new Date().toISOString();
  safeSetLocalStorage(SESSION_KEY, currentUserId);
  saveState();
  activePanel = roleRank(user.role) >= 10 ? "admin" : "profile";
  renderAll();
}

async function handleRegister(event) {
  event.preventDefault();
  const data = new FormData(submittedForm(event));
  const payload = Object.fromEntries(data.entries());
  const feedback = document.querySelector("#register-feedback");
  setFeedback(feedback);
  try {
    const result = await apiJson("auth.php?action=register", payload);
    if (result.state) state = { ...state, ...result.state };
    if (result.user) {
      upsertUser(result.user);
      currentUserId = result.user.id;
      safeSetLocalStorage(SESSION_KEY, currentUserId);
      saveState();
      activePanel = "profile";
      renderAll();
      if (result.verificationUrl) showToast(`Lien de verification : ${result.verificationUrl}`);
      return;
    }
  } catch (error) {
    if (!ALLOW_LOCAL_DATA_FALLBACK) {
      setFeedback(feedback, error.message || "Inscription impossible : base de donnees indisponible.", "error");
      return;
    }
  }
  const login = String(data.get("login") || "").trim();
  const email = String(data.get("email") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  if (!login || !email || password.length < 8) {
    setFeedback(feedback, "Login, email ou mot de passe invalide.", "error");
    return;
  }
  if (state.users.some((item) => item.login === login || String(item.email || "").toLowerCase() === email)) {
    setFeedback(feedback, "Ce login ou cet email existe deja.", "error");
    return;
  }
  const user = { id: crypto.randomUUID(), role: "user", login, password, firstName: data.get("firstName"), lastName: data.get("lastName"), city: data.get("city"), email, phone: data.get("phone"), categories: [], createdAt: new Date().toISOString() };
  state.users.push(user);
  currentUserId = user.id;
  safeSetLocalStorage(SESSION_KEY, currentUserId);
  saveState();
  activePanel = "profile";
  renderAll();
}

async function handlePasswordReset(event) {
  event.preventDefault();
  const form = submittedForm(event);
  const data = new FormData(form);
  const feedback = document.querySelector("#password-reset-feedback");
  const token = getPasswordResetToken();
  setFeedback(feedback);

  if (token) {
    const password = String(data.get("newPassword") || "");
    if (password.length < 8) {
      setFeedback(feedback, "Le nouveau mot de passe doit contenir au moins 8 caracteres.", "error");
      return;
    }
    try {
      const result = await apiJson("newsletter.php?action=password-reset-confirm", { token, password });
      setFeedback(feedback, result.message || "Mot de passe mis a jour.", "success");
      window.history.replaceState({}, document.title, window.location.pathname);
      setupPasswordResetForm();
    } catch (error) {
      if (ALLOW_LOCAL_DATA_FALLBACK && confirmLocalPasswordReset(token, password)) {
        setFeedback(feedback, "Mot de passe mis a jour.", "success");
        window.history.replaceState({}, document.title, window.location.pathname);
        setupPasswordResetForm();
        return;
      }
      setFeedback(feedback, error.message || "Reinitialisation impossible.", "error");
    }
    return;
  }

  const email = String(data.get("email") || "").trim();
  try {
    const result = await apiJson("newsletter.php?action=password-reset-request", { email });
    const suffix = result.resetUrl ? ` Lien : ${result.resetUrl}` : "";
    setFeedback(feedback, `${result.message || "Demande envoyee."}${suffix}`, "success");
  } catch (error) {
    if (ALLOW_LOCAL_DATA_FALLBACK) {
      const localResult = requestLocalPasswordReset(email);
      setFeedback(feedback, localResult.message, localResult.ok ? "success" : "error");
      return;
    }
    setFeedback(feedback, error.message || "Demande de reinitialisation impossible.", "error");
  }
}

function getPasswordResetToken() {
  return new URLSearchParams(window.location.search).get("reset_password") || "";
}

function requestLocalPasswordReset(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = state.users.find((item) => String(item.email || "").toLowerCase() === normalizedEmail);
  if (!user) return { ok: false, message: "Aucun compte associe a cet email." };
  user.passwordResetToken = crypto.randomUUID();
  user.passwordResetSentAt = new Date().toISOString();
  saveState();
  const resetUrl = `${window.location.origin}${window.location.pathname}?reset_password=${encodeURIComponent(user.passwordResetToken)}`;
  return { ok: true, message: `Lien de reinitialisation genere : ${resetUrl}` };
}

function confirmLocalPasswordReset(token, password) {
  const user = state.users.find((item) => item.passwordResetToken === token);
  if (!user || password.length < 8) return false;
  user.password = password;
  delete user.passwordResetToken;
  delete user.passwordResetSentAt;
  saveState();
  return true;
}

function setupPasswordResetForm() {
  const form = document.querySelector("#password-reset-form");
  if (!form) return;
  const token = getPasswordResetToken();
  const confirm = form.querySelector("#password-reset-confirm");
  const newPassword = form.querySelector("[name='newPassword']");
  const email = form.querySelector("[name='email']");
  const button = form.querySelector("button[type='submit']");
  confirm?.classList.toggle("is-hidden", !token);
  if (newPassword) newPassword.required = Boolean(token);
  if (email) {
    email.required = !token;
    email.closest("label")?.classList.toggle("is-hidden", Boolean(token));
  }
  if (button) button.textContent = token ? "Changer mon mot de passe" : "Recevoir un lien";
  if (token) {
    activePanel = "auth";
    setFeedback("#password-reset-feedback", "Choisissez un nouveau mot de passe.", "success");
  }
}

async function handleProfile(event) {
  event.preventDefault();
  const user = currentUser();
  if (!user) return;
  const data = new FormData(submittedForm(event));
  const payload = {
    lastName: data.get("lastName"),
    firstName: data.get("firstName"),
    city: data.get("city"),
    phone: data.get("phone"),
    categories: data.getAll("categories"),
    frequency: user.newsletterFrequency || "Hebdomadaire"
  };
  try {
    const result = await apiJson("profile.php", payload);
    if (result.user) upsertUser(result.user);
  } catch (error) {
    showToast(error.message || "Profil non enregistre en base.");
    return;
  }
  saveState();
  showToast("Profil enregistre.");
}

async function handleSupport(event) {
  event.preventDefault();
  const user = currentUser();
  if (!user) return;
  const form = submittedForm(event);
  const data = new FormData(form);
  const payload = { type: data.get("type"), title: data.get("title"), message: data.get("message") };
  let item = null;
  try {
    const result = await apiJson("support.php", payload);
    item = result.request || null;
  } catch (error) {
    showToast(error.message || "Demande non enregistree en base.");
    return;
  }
  if (!item) {
    showToast("Demande non renvoyee par la base.");
    return;
  }
  state.supportRequests.unshift(item);
  adminState.citizenRequests.unshift({ ...item, subject: item.title, firstName: user.firstName, lastName: user.lastName, email: user.email, city: user.city, priority: "normale", assignedTo: "", notes: "", history: [] });
  saveState();
  saveAdminState("creation", "support", item.title);
  form.reset();
  showToast("Demande envoyee.");
}

async function handleNewsletter(event) {
  event.preventDefault();
  const user = currentUser();
  const data = new FormData(submittedForm(event));
  const payload = {
    email: data.get("email") || user?.email || "",
    city: data.get("city") || user?.city || "",
    categories: data.getAll("categories"),
    frequency: data.get("frequency") || "Hebdomadaire"
  };
  try {
    const result = await apiJson("newsletter.php?action=subscribe", payload);
    if (result.user) upsertUser(result.user);
    if (result.verificationUrl) showToast(`Lien de verification : ${result.verificationUrl}`);
  } catch (error) {
    showToast(error.message || "Preferences non enregistrees en base.");
    return;
  }
  saveState();
  showToast("Preferences enregistrees.");
}

function handleAdminCreate(collection, form) {
  const data = new FormData(form);
  const item = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  for (const [key, value] of data.entries()) item[key] = value;
  adminState[collection] = adminState[collection] || [];
  adminState[collection].unshift(item);
  form.reset();
  saveAdminState("creation", collection, item.title || item.fileName || item.id);
}

function createDocumentFolder(form) {
  const data = new FormData(form);
  const now = new Date().toISOString();
  const folder = { id: crypto.randomUUID(), name: String(data.get("name") || "").trim(), parentId: data.get("parentId") || "", createdAt: now, updatedAt: now };
  if (!folder.name) return;
  adminState.documentFolders = [...documentFolders(), folder];
  selectedDocumentFolderId = folder.id;
  adminFilters.documentFolderCreateOpen = false;
  saveAdminState("creation", "dossier document", folder.name);
}

function updateDocumentFolder(id, form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return;
  adminState.documentFolders = documentFolders().map((folder) => folder.id === id ? { ...folder, name, parentId: data.get("parentId") || "", updatedAt: new Date().toISOString() } : folder);
  adminFilters.documentFolderEdit = "";
  saveAdminState("modification", "dossier document", name);
}

function deleteDocumentFolder(id) {
  const folder = documentFolders().find((item) => item.id === id);
  if (!folder) return;
  const ids = documentFolderDescendantIds(id);
  adminState.documentFolders = documentFolders().filter((item) => !ids.has(item.id));
  adminState.documents = documentList().map((doc) => ids.has(doc.folderId) ? { ...doc, folderId: "", updatedAt: new Date().toISOString() } : doc);
  selectedDocumentFolderId = "all";
  saveAdminState("suppression", "dossier document", folder.name);
}

async function createDocument(form) {
  const data = new FormData(form);
  const pdfInput = data.get("pdfFile");
  if (!pdfInput || !pdfInput.name) {
    showToast("Ajoutez un fichier PDF.");
    return;
  }
  const now = new Date().toISOString();
  const title = String(data.get("title") || pdfInput.name.replace(/\.[^.]+$/, "")).trim();
  const pdfFile = await fileToStoredFile(pdfInput);
  const wordInput = data.get("wordFile");
  const wordFile = wordInput && wordInput.name ? await fileToStoredFile(wordInput) : null;
  if (!isPdfFile(pdfFile)) {
    showToast("Le fichier principal doit etre un PDF.");
    return;
  }
  if (wordFile && !isWordFile(wordFile)) {
    showToast("Le fichier Word associe doit etre un .docx.");
    return;
  }
  const doc = {
    id: crypto.randomUUID(),
    title,
    folderId: data.get("folderId") || "",
    description: data.get("description") || "",
    pdfFile,
    wordFile,
    version: "1.0",
    createdBy: currentUserId || "",
    createdAt: now,
    updatedAt: now
  };
  adminState.documents = [doc, ...documentList()];
  selectedDocumentId = doc.id;
  adminFilters.documentCreateOpen = false;
  adminFilters.documentImportOpen = false;
  form.reset();
  saveAdminState("creation", "document", title);
}

function updateDocument(id, form) {
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  adminState.documents = documentList().map((doc) => doc.id === id ? { ...doc, title: title || doc.title, folderId: data.get("folderId") || "", description: data.get("description") || "", updatedAt: new Date().toISOString() } : doc);
  adminFilters.documentEdit = "";
  saveAdminState("modification", "document", title || id);
}

function deleteDocument(id) {
  const doc = documentList().find((item) => item.id === id);
  adminState.documents = documentList().filter((item) => item.id !== id);
  if (selectedDocumentId === id) selectedDocumentId = documentFilteredList()[0]?.id || "";
  saveAdminState("suppression", "document", doc?.title || id);
}

async function replaceDocumentFile(id, file, type) {
  if (!file || !file.name) return;
  const stored = await fileToStoredFile(file);
  if (type === "pdf" && !isPdfFile(stored)) {
    showToast("Selectionnez un fichier PDF.");
    return;
  }
  if (type === "word" && !isWordFile(stored)) {
    showToast("Selectionnez un fichier Word .docx.");
    return;
  }
  const now = new Date().toISOString();
  adminState.documents = documentList().map((doc) => {
    if (doc.id !== id) return doc;
    const next = { ...doc, updatedAt: now, version: incrementVersion(doc.version) };
    if (type === "pdf") next.pdfFile = stored;
    if (type === "word") next.wordFile = stored;
    return next;
  });
  saveAdminState("remplacement fichier", "document", type === "word" ? "Word" : "PDF");
}

function incrementVersion(version = "1.0") {
  const parts = String(version || "1.0").split(".");
  const major = Number(parts[0]) || 1;
  const minor = (Number(parts[1]) || 0) + 1;
  return `${major}.${minor}`;
}

async function fileToStoredFile(file) {
  return { fileName: file.name, fileData: await fileToDataUrl(file), mimeType: file.type || fileMimeFromName(file.name), size: file.size || 0, generated: false, updatedAt: new Date().toISOString() };
}

function fileMimeFromName(name = "") {
  if (String(name).toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (String(name).toLowerCase().endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

function isPdfFile(file = {}) {
  return String(file.mimeType || "").includes("pdf") || String(file.fileName || "").toLowerCase().endsWith(".pdf");
}

function isWordFile(file = {}) {
  return String(file.mimeType || "").includes("word") || String(file.fileName || "").toLowerCase().endsWith(".docx");
}

function bytesToDataUrl(bytes, mimeType) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function downloadStoredDocumentFile(id, type) {
  const doc = documentList().find((item) => item.id === id);
  const file = type === "word" ? doc?.wordFile : doc?.pdfFile;
  if (!file?.fileData) return;
  downloadDataUrl(file.fileName || documentFileName(doc, type), file.fileData, file.mimeType);
}

function downloadDataUrl(filename, dataUrl, mimeType) {
  const buffer = dataUrlToArrayBuffer(dataUrl);
  downloadFile(filename, buffer, mimeType || "application/octet-stream");
}

async function createPublicContent(form) {
  const data = new FormData(form);
  const target = String(data.get("target") || "event");
  const config = publicContentConfig(target);
  if (target === "event" && !String(data.get("commune") || "").trim()) throw new Error("Renseignez la commune de l’événement.");
  const item = {
    id: crypto.randomUUID(),
    date: String(data.get("date") || ""),
    title: String(data.get("title") || "").slice(0, 180),
    commune: String(data.get("commune") || "").trim().slice(0, 120),
    links: {
      facebook: String(data.get("facebookUrl") || ""),
      twitter: String(data.get("twitterUrl") || ""),
      instagram: String(data.get("instagramUrl") || ""),
      linkedin: String(data.get("linkedinUrl") || ""),
      tiktok: String(data.get("tiktokUrl") || ""),
      video: String(data.get("videoUrl") || "")
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  item[config.bodyField] = String(data.get("body") || "").slice(0, 6000);
  const files = target === "event" ? [...(form.querySelector('[name="eventPhotos"]')?.files || [])] : [];
  const newPhotos = [];
  for (const file of files) {
    const src = await resizePhotoForLibrary(file);
    newPhotos.push({ id: crypto.randomUUID(), eventId: item.id, src, thumbnail: "", fileName: file.name, alt: "", commune: item.commune, takenAt: item.date, createdAt: new Date().toISOString() });
  }
  if (newPhotos.length) {
    ensureAdminPhotoLibrary();
    if (!adminState.photoLibrary.folders.some((folder) => folder.id === EVENT_PHOTO_FOLDER_ID)) {
      adminState.photoLibrary.folders.unshift({ id: EVENT_PHOTO_FOLDER_ID, name: "Photos des événements", createdAt: item.createdAt, updatedAt: item.updatedAt });
    }
    adminState.photoLibrary.photos.unshift(...newPhotos.map((photo) => ({ ...photo, folderId: EVENT_PHOTO_FOLDER_ID })));
    state.photoLibrary = normalizePhotoLibrary(adminState.photoLibrary);
  }
  state[config.key] = state[config.key] || [];
  state[config.key].unshift(item);
  form.reset();
  saveState();
  addActivity("creation", config.label, item.title);
  saveAdminState("creation", newPhotos.length ? "phototheque" : config.label, item.title);
  renderAll();
}

function createKeyword(scope, form) {
  const data = new FormData(form);
  const label = String(data.get("label") || "").trim();
  if (!label) return;
  if (scope === "theme") {
    state.categories = [...new Set([...siteThemes(), label])];
    saveState();
    addActivity("creation", "theme public", label);
    saveAdminState("creation", "theme public", label);
  } else if (scope === "contentType") {
    state.contentTypes = [...new Set([...siteContentTypes(), label])];
    saveState();
    addActivity("creation", "type parlementaire", label);
    saveAdminState("creation", "type parlementaire", label);
  } else {
    adminState.contactKeywords = normalizeKeywords([...(adminState.contactKeywords || []), { id: slugify(label), label, color: data.get("color") || "#2d6fb6" }]);
    saveAdminState("creation", "mot-cle contact", label);
  }
  form.reset();
  renderAll();
}

function updateSocialLinks(form) {
  const data = new FormData(form);
  state.socialLinks = {
    assembly: String(data.get("assembly") || ""),
    twitter: String(data.get("twitter") || ""),
    facebook: String(data.get("facebook") || ""),
    instagram: String(data.get("instagram") || ""),
    threads: String(data.get("threads") || ""),
    tiktok: String(data.get("tiktok") || "")
  };
  saveState();
  addActivity("modification", "reseaux", "Liens publics");
  saveAdminState("modification", "reseaux", "Liens publics");
  renderAll();
}

async function updateHomepageContent(form) {
  const data = new FormData(form);
  const defaults = defaultHomepageContent();
  const current = homepageContent();
  const next = {};
  Object.keys(defaults).forEach((key) => {
    if (key === "heroImage") return;
    const limit = ["heroBody", "overviewIntro"].includes(key) ? 2000 : 300;
    next[key] = String(data.get(key) || defaults[key]).trim().slice(0, limit);
  });
  const imageFile = data.get("heroImageFile");
  next.heroImage = data.has("resetHeroImage")
    ? defaults.heroImage
    : imageFile instanceof File && imageFile.size
      ? await homepageImageToDataUrl(imageFile)
      : current.heroImage;
  state.homepage = next;
  saveState();
  addActivity("modification", "page d'accueil", "Textes publics");
  saveAdminState("modification", "page d'accueil", "Textes publics");
  renderAll();
  showToast("Page d'accueil mise à jour.");
}

function updateSupportRequest(id, form) {
  const status = String(new FormData(form).get("status") || "nouveau");
  const publicRequest = (state.supportRequests || []).find((item) => item.id === id);
  adminState.citizenRequests = adminState.citizenRequests || [];
  if (publicRequest && !adminState.citizenRequests.some((item) => item.id === id)) {
    adminState.citizenRequests.unshift({ ...publicRequest, subject: publicRequest.title, priority: "normale", assignedTo: "", notes: "" });
  }
  [...(state.supportRequests || []), ...adminState.citizenRequests].forEach((item) => {
    if (item.id === id) {
      item.status = status;
      item.updatedAt = new Date().toISOString();
    }
  });
  saveState();
  saveAdminState("modification", "support", id);
  renderAll();
}

function deletePublicContent(target, id) {
  const config = publicContentConfig(target);
  state[config.key] = (state[config.key] || []).filter((item) => item.id !== id);
  saveState();
  saveAdminState("suppression", config.label, id);
  renderAll();
}

function deleteKeyword(scope, id) {
  if (scope === "theme") {
    state.categories = siteThemes().filter((item) => item !== id);
    saveState();
    saveAdminState("suppression", "theme public", id);
  } else if (scope === "contentType") {
    state.contentTypes = siteContentTypes().filter((item) => item !== id);
    saveState();
    saveAdminState("suppression", "type parlementaire", id);
  } else {
    adminState.contactKeywords = (adminState.contactKeywords || []).filter((item) => item.id !== id);
    saveAdminState("suppression", "mot-cle contact", id);
  }
  renderAll();
}

function exportAllAdminData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    publicState: state,
    adminState
  };
  const json = JSON.stringify(payload, null, 2);
  const output = document.querySelector("#data-output");
  if (output) output.value = json;
  downloadFile("administration-complete.json", json, "application/json;charset=utf-8");
}

function exportDeathRecipients(caseId) {
  const deathCase = adminState.deathCases.find((item) => item.id === caseId);
  if (!deathCase) return;
  const rows = [["Defunt", "Destinataire", "Email", "Telephone", "Lien", "Date envoi", "Statut reponse"]];
  deathCaseRelatives(deathCase).forEach((relative) => {
    const contact = contactById(relative.contactId) || {};
    rows.push([deathCaseName(deathCase), contactDisplayName(contact), contact.email || "", contact.mobile || contact.phone || "", relative.relation || "", relative.sentAt ? formatDate(relative.sentAt.slice(0, 10)) : "", relative.responseStatus || "pending"]);
  });
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\n");
  downloadFile(`courriers-deces-${slugify(deathCaseName(deathCase))}.csv`, csv, "text/csv;charset=utf-8");
}

async function importAllAdminData(file) {
  if (!file) return;
  const parsed = JSON.parse(await file.text());
  if (parsed.publicState && typeof parsed.publicState === "object") {
    state = { ...state, ...parsed.publicState };
    saveState();
  }
  const incomingAdmin = parsed.adminState || parsed;
  if (incomingAdmin && typeof incomingAdmin === "object") {
    adminState = normalizeAdminState({ ...adminState, ...incomingAdmin });
    saveAdminState("import", "administration", file.name);
    renderAll();
  }
}

async function updateUserRole(userId, role) {
  const user = adminUsers.find((item) => item.id === userId) || state.users.find((item) => item.id === userId);
  if (!user) return;
  const previousRole = user.role;
  user.role = role;
  const stateUser = state.users.find((item) => item.id === userId);
  if (stateUser) stateUser.role = role;
  if (ALLOW_LOCAL_DATA_FALLBACK) safeSetLocalStorage(STORAGE_KEY, JSON.stringify(state));
  renderAll();
  try {
    await apiJson("users.php?action=role", { id: userId, role });
    showToast("Role utilisateur enregistre.");
    await loadAdminUsersFromApi();
  } catch (error) {
    user.role = previousRole;
    if (stateUser) stateUser.role = previousRole;
    if (ALLOW_LOCAL_DATA_FALLBACK) safeSetLocalStorage(STORAGE_KEY, JSON.stringify(state));
    renderAll();
    showToast(error.message || "Role non enregistre en base.");
  }
}


function updateContactTagEditor(editor) {
  const input=editor.querySelector("[data-contact-tag-value]");
  const values=String(input?.value||"").split(/[,;]/).map(v=>v.trim()).filter(Boolean);
  const selected=new Set(values.map(slugify));
  const choices=contactKeywordChoices();
  const pills=editor.querySelector("[data-contact-tag-selected]");
  if(pills)pills.innerHTML=values.map(value=>{
    const word=choices.find(w=>w.id===slugify(value));
    return '<button type="button" class="contact-tag-selected-pill" data-contact-tag-remove="'+attr(slugify(value))+'" style="--keyword-color:'+attr(word?.color||"#708199")+'" aria-label="Retirer '+attr(value)+'">'+text(word?.label||value)+' <span aria-hidden="true">×</span></button>';
  }).join("")||'<span class="contact-tag-empty">Aucun mot-clé associé</span>';
  const list=editor.querySelector("[data-contact-tag-suggestions]");
  if(list)list.innerHTML=choices.filter(word=>!selected.has(word.id)).map((word,i)=>'<button type="button" class="contact-tag-option" data-contact-tag-add="'+attr(word.id)+'" data-tag-search="'+attr(normalizeName(word.label))+'" '+(i>=8?"hidden":"")+'><i style="background:'+attr(word.color)+'"></i>'+text(word.label)+'</button>').join("")+'<span class="contact-tag-no-match" data-contact-tag-no-match hidden>Aucun mot-clé trouvé. Utilisez « Créer ».</span>';
  updateContactTagSuggestions(editor.querySelector("[data-contact-tag-query]"));
}
function updateContactTagSuggestions(input) {
  if(!input)return;
  const editor=input.closest("[data-contact-tag-editor]");
  if(!editor)return;
  const q=normalizeName(input.value);
  const expanded=editor.dataset.expanded==="true";
  let count=0,visible=0;
  editor.querySelectorAll("[data-contact-tag-add]").forEach(row=>{
    const match=!q||String(row.dataset.tagSearch||"").includes(q);
    row.hidden=!match||(!q&&!expanded&&count++>=8);
    if(!row.hidden)visible++;
  });
  const message=editor.querySelector("[data-contact-tag-no-match]");
  if(message)message.hidden=visible>0;
  const button=editor.querySelector("[data-contact-tag-add-new]");
  if(button)button.disabled=!input.value.trim()||slugify(input.value)==="item"||input.value.trim().length>80;
  const expand=editor.querySelector("[data-contact-tag-expand]");
  if(expand){expand.hidden=!!q||editor.querySelectorAll("[data-contact-tag-add]").length<=8;expand.textContent=expanded?"Afficher moins ↑":"Voir tous les mots-clés ↓";}
}
function addContactTag(editor,label) {
  const hidden=editor.querySelector("[data-contact-tag-value]");
  if(!hidden)return;
  const values=String(hidden.value||"").split(/[,;]/).map(v=>v.trim()).filter(Boolean);
  const id=slugify(label);
  if(id==="item"||values.some(v=>slugify(v)===id))return;
  hidden.value=[...values,label].join(", ");
  const input=editor.querySelector("[data-contact-tag-query]");
  if(input)input.value="";
  editor.dataset.expanded="";
  updateContactTagEditor(editor);
}
function registerContactKeywords(contact) {
  const existing=new Set(normalizeKeywords(adminState.contactKeywords||[]).map(w=>slugify(w.id)));
  const missing=contactKeywordValues(contact).filter(label=>!existing.has(slugify(label)));
  if(missing.length)adminState.contactKeywords=normalizeKeywords([...(adminState.contactKeywords||[]),...missing.map(label=>({id:slugify(label),label,color:"#708199"}))]);
  return missing.length>0;
}

function applyContactKeywordForm(form) {
  const formData=new FormData(form);
  adminFilters.contacts={
    ...Object.fromEntries(formData.entries()),
    keywordIds:normalizedContactKeywordIds(formData.getAll("keywordIds")),
    keywordMode:formData.get("keywordMode")==="AND"?"AND":"OR",
    page:1
  };
  adminFilters.activeSavedContactSearchId="";
  clearContactSelection();
  contactMobileDetailOpen=false;
  renderAdmin();
}
function updateContactKeywordSuggestions(input) {
  const picker=input.closest(".contact-keyword-picker");
  if(!picker)return;
  const q=normalizeName(input.value);
  let shown=0,matched=0;
  const expanded=picker.dataset.expanded==="true";
  picker.querySelectorAll("[data-contact-keyword-option]").forEach(row=>{
    const matches=!q||String(row.dataset.keywordSearch||"").includes(q);
    if(matches)matched++;
    row.hidden=!matches||(!q&&!expanded&&shown>=8);
    if(!row.hidden)shown++;
  });
  const more=picker.querySelector("[data-contact-keyword-expand]");
  if(more){more.hidden=!!q||matched<=8;more.textContent=expanded?"Afficher moins ↑":"Afficher tous les mots-clés ↓";}
  const noMatch=picker.querySelector("[data-contact-keyword-no-match]");
  if(noMatch)noMatch.hidden=shown>0;
  const button=picker.querySelector("[data-contact-keyword-create]");
  if(button){
    const id=slugify(input.value);
    const exists=[...picker.querySelectorAll('input[name="keywordIds"]')].some(el=>el.value===id);
    button.disabled=!input.value.trim()||exists||input.value.trim().length>80;
    button.textContent=input.value.trim()?'+ Créer « '+input.value.trim().slice(0,80)+' »':'+ Créer le mot-clé saisi';
  }
}
document.addEventListener("input",event=>{
  if(event.target.matches("[data-contact-keyword-query]"))updateContactKeywordSuggestions(event.target);
  if(event.target.matches("[data-contact-tag-query]"))updateContactTagSuggestions(event.target);
});
document.addEventListener("change",event=>{
  if(!event.target.matches('.contact-keyword-picker input[name="keywordIds"], .contact-keyword-picker input[name="keywordMode"]'))return;
  const form=event.target.closest('[data-admin-filter="contacts"]');
  if(form)applyContactKeywordForm(form);
});

document.addEventListener("keydown",event=>{
  if(event.key!=="Enter")return;
  if(event.target.matches("[data-contact-tag-query]")){
    event.preventDefault();
    const editor=event.target.closest("[data-contact-tag-editor]");
    const first=[...editor.querySelectorAll("[data-contact-tag-add]")].find(node=>!node.hidden);
    if(first)first.click();
    else editor.querySelector("[data-contact-tag-add-new]")?.click();
    return;
  }
  if(event.target.matches("[data-contact-keyword-query]")){
    event.preventDefault();
    const picker=event.target.closest(".contact-keyword-picker");
    const first=[...picker.querySelectorAll("[data-contact-keyword-option]")].find(node=>!node.hidden);
    if(first)first.querySelector('input[name="keywordIds"]')?.click();
    else picker.querySelector("[data-contact-keyword-create]")?.click();
  }
});
document.addEventListener("input",event=>{
  if(event.target.matches("[data-list-contact-query]"))updateSavedListContactSuggestions(event.target);
  if(event.target.matches("[data-saved-list-filter]")){
    const query=normalizeName(event.target.value);
    const panel=event.target.closest(".saved-contact-searches");
    panel?.querySelectorAll("[data-list-search-row]").forEach(row=>{row.hidden=!!query&&!row.dataset.listSearchText.includes(query);});
  }
});
document.addEventListener("change",event=>{
  if(event.target.matches('[data-saved-list-builder] select, [data-saved-list-builder] input[name="sourceIds"]'))refreshSavedListBuilder(event.target.closest("[data-saved-list-builder]"));
});
document.addEventListener("click", async (event) => {
  beginAdminMutationSnapshot();
  const savedToggle = event.target.closest("[data-contact-saved-toggle]");
  if (savedToggle) {
    const menu = document.querySelector("#contact-saved-popover");
    if (menu) {
      if (menu.hidden && !menu.childElementCount) {
        menu.innerHTML = renderSavedContactSearches();
      }
      menu.hidden = !menu.hidden;
      savedToggle.setAttribute("aria-expanded", String(!menu.hidden));
      if (!menu.hidden) hydrateSavedContactStats(menu);
    }
    return;
  }
  const savedPopover = document.querySelector("#contact-saved-popover");
  if (savedPopover && !savedPopover.hidden && !event.target.closest("#contact-saved-popover")) {
    savedPopover.hidden = true;
    document.querySelector("[data-contact-saved-toggle]")?.setAttribute("aria-expanded", "false");
  }
  const contactPickerSelect = event.target.closest("[data-contact-picker-select]");
  if (contactPickerSelect) {
    const key = contactPickerSelect.dataset.contactPickerSelect;
    const root = contactPickerSelect.closest("[data-contact-picker]");
    const input = root?.querySelector("[data-contact-picker-value]");
    adminFilters.contactPickers = adminFilters.contactPickers || {};
    adminFilters.contactPickers[key] = { ...(adminFilters.contactPickers[key] || {}), selectedId: contactPickerSelect.dataset.contactId };
    if (input) input.value = contactPickerSelect.dataset.contactId;
    if (key === "template-context-contact") {
      adminFilters.templateContext = { ...(adminFilters.templateContext || {}), contactId: contactPickerSelect.dataset.contactId };
      renderAdmin();
      return;
    }
    refreshContactSearchPicker(key, root);
    return;
  }

  const panel = event.target.closest("[data-panel-target]");
  if (panel) {
    setActivePanel(panel.dataset.panelTarget);
    document.querySelector("#main-nav")?.classList.remove("is-open");
    document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
  }

  const eventPhotos = event.target.closest("[data-event-photos]");
  if (eventPhotos) {
    const item = state.agenda.find((entry) => entry.id === eventPhotos.dataset.eventPhotos);
    if (!item || !availableEventPhotoKeys().has(eventPhotoKey(item.commune, item.date))) return;
    document.querySelector("#photo-place-filter").value = item.commune || "";
    document.querySelector("#photo-date-start").value = item.date || "";
    document.querySelector("#photo-date-end").value = item.date || "";
    selectedPhotoFolderId = "all";
    photoFilterExactCommune = true;
    photoLibraryPage = 1;
    setActivePanel("phototheque");
    renderPhotoLibrary();
    document.querySelector("#panel-phototheque")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const publicPhotoFolder = event.target.closest("[data-public-photo-folder]");
  if (publicPhotoFolder) { selectedPhotoFolderId = publicPhotoFolder.dataset.publicPhotoFolder || "all"; photoLibraryPage = 1; renderPhotoLibrary(); return; }
  const photoPage = event.target.closest("[data-photo-page]");
  if (photoPage && !photoPage.disabled) { photoLibraryPage = Number(photoPage.dataset.photoPage) || 1; renderPhotoLibrary(); document.querySelector("#panel-phototheque")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (event.target.closest("#photo-filter-clear")) { const place = document.querySelector("#photo-place-filter"); const start = document.querySelector("#photo-date-start"); const end = document.querySelector("#photo-date-end"); if (place) place.value = ""; if (start) start.value = ""; if (end) end.value = ""; selectedPhotoFolderId = "all"; photoFilterExactCommune = false; photoLibraryPage = 1; renderPhotoLibrary(); return; }
  const photoOpen = event.target.closest("[data-photo-open]");
  if (photoOpen) { const photo = normalizePhotoLibrary(state.photoLibrary).photos.find((item) => item.id === photoOpen.dataset.photoOpen); if (photo) { const details = photoDetails(photo); const overlay = document.createElement("div"); overlay.className = "photo-lightbox"; overlay.innerHTML = `<button type="button" data-photo-lightbox-close aria-label="Fermer">×</button><figure><img src="${attr(photo.src)}" alt="${attr(photo.alt || details.commune || "Photo")}" /><figcaption><strong>${text(details.commune || "Commune non renseignée")}</strong><time>${text(details.takenAt ? formatDate(details.takenAt) : "Date non renseignée")}</time></figcaption></figure>`; document.body.append(overlay); } return; }
  if (event.target.closest("[data-photo-lightbox-close]") || event.target.classList?.contains("photo-lightbox")) { event.target.closest(".photo-lightbox")?.remove(); return; }

  const adminNavToggle = event.target.closest("[data-admin-nav-toggle]");
  if (adminNavToggle && canModerate()) {
    const section = adminNavToggle.dataset.adminNavToggle;
    adminNavExpanded = { ...adminNavExpanded, [section]: !adminNavExpanded[section] };
    renderAdmin();
    return;
  }

  const admin = event.target.closest("[data-admin-section]");
  if (admin && canModerate()) {
    activeAdminSection = admin.dataset.adminSection;
    renderAdmin();
    if (activeAdminSection === "mail-campaigns") loadMailCampaignOverview();
    window.scrollTo(0, 0);
  }

  if (event.target.closest("[data-trombi-back]")) {
    selectedTrombinoscopeCategoryId = "";
    selectedTrombinoscopePersonId = "";
    adminFilters.trombinoscopeCategoryEdit = "";
    renderAdmin();
    return;
  }
  if (event.target.closest("[data-trombi-category-new]")) {
    selectedTrombinoscopeCategoryId = "";
    selectedTrombinoscopePersonId = "";
    adminFilters.trombinoscopeCategoryEdit = "__new";
    renderAdmin();
    return;
  }
  const trombiCategoryOpen = event.target.closest("[data-trombi-category-open]");
  if (trombiCategoryOpen) {
    selectedTrombinoscopeCategoryId = trombiCategoryOpen.dataset.trombiCategoryOpen;
    selectedTrombinoscopePersonId = "";
    adminFilters.trombinoscopeCategoryEdit = "";
    renderAdmin();
    return;
  }
  const trombiCategoryEdit = event.target.closest("[data-trombi-category-edit]");
  if (trombiCategoryEdit) {
    selectedTrombinoscopeCategoryId = trombiCategoryEdit.dataset.trombiCategoryEdit;
    selectedTrombinoscopePersonId = "";
    adminFilters.trombinoscopeCategoryEdit = selectedTrombinoscopeCategoryId;
    renderAdmin();
    return;
  }
  if (event.target.closest("[data-trombi-category-cancel]")) {
    adminFilters.trombinoscopeCategoryEdit = "";
    renderAdmin();
    return;
  }
  const trombiCategoryDelete = event.target.closest("[data-trombi-category-delete]");
  if (trombiCategoryDelete && confirm("Supprimer cette catégorie et toutes les personnes qu’elle contient ?")) {
    deleteTrombinoscopeCategory(trombiCategoryDelete.dataset.trombiCategoryDelete);
    return;
  }
  if (event.target.closest("[data-trombi-person-new]")) {
    selectedTrombinoscopePersonId = "__new";
    adminFilters.trombinoscopeCategoryEdit = "";
    renderAdmin();
    return;
  }
  const trombiPersonEdit = event.target.closest("[data-trombi-person-edit]");
  if (trombiPersonEdit) {
    selectedTrombinoscopePersonId = trombiPersonEdit.dataset.trombiPersonEdit;
    adminFilters.trombinoscopeCategoryEdit = "";
    renderAdmin();
    return;
  }
  if (event.target.closest("[data-trombi-person-cancel]")) {
    selectedTrombinoscopePersonId = "";
    renderAdmin();
    return;
  }
  const trombiPersonDelete = event.target.closest("[data-trombi-person-delete]");
  if (trombiPersonDelete && confirm("Supprimer cette personne du trombinoscope ?")) {
    deleteTrombinoscopePerson(trombiPersonDelete.dataset.trombiPersonDelete);
    return;
  }
  const trombiContactLink = event.target.closest("[data-trombi-contact-link]");
  if (trombiContactLink) {
    const form = trombiContactLink.closest("form");
    const contact = contactById(trombiContactLink.dataset.trombiContactLink);
    if (!form || !contact) return;
    form.elements.linkedContactId.value = contact.id;
    if (!form.elements.firstName.value.trim()) form.elements.firstName.value = contact.firstName || "";
    if (!form.elements.lastName.value.trim()) form.elements.lastName.value = contact.lastName || "";
    if (!form.elements.city.value.trim()) form.elements.city.value = contact.city || "";
    if (!form.elements.email.value.trim()) form.elements.email.value = contact.email || "";
    if (!form.elements.phone.value.trim()) form.elements.phone.value = contact.mobile || contact.phone || "";
    if (!form.elements.role.value.trim()) form.elements.role.value = contact.role || contact.profession || "";
    const linkedTarget = form.querySelector("[data-trombi-linked-contact]");
    if (linkedTarget) linkedTarget.innerHTML = renderTrombinoscopeLinkedContact(contact);
    refreshTrombinoscopeContactSearch(form.querySelector("[data-trombi-contact-linker]"));
    return;
  }
  const trombiContactUnlink = event.target.closest("[data-trombi-contact-unlink]");
  if (trombiContactUnlink) {
    const form = trombiContactUnlink.closest("form");
    if (!form) return;
    form.elements.linkedContactId.value = "";
    const linkedTarget = form.querySelector("[data-trombi-linked-contact]");
    if (linkedTarget) linkedTarget.innerHTML = `<p>Aucune fiche contact liée.</p>`;
    refreshTrombinoscopeContactSearch(form.querySelector("[data-trombi-contact-linker]"));
    return;
  }

  const photoFolderSelect = event.target.closest("[data-photo-folder-select]");
  if (photoFolderSelect) { selectedPhotoFolderId = photoFolderSelect.dataset.photoFolderSelect; photoAdminFilters = { commune: "", date: "", page: 1 }; renderAdmin(); return; }
  const photoAdminPage = event.target.closest("[data-photo-admin-page]");
  if (photoAdminPage && !photoAdminPage.disabled) { photoAdminFilters.page = Number(photoAdminPage.dataset.photoAdminPage) || 1; renderAdmin(); return; }
  if (event.target.closest("[data-photo-admin-clear]")) { photoAdminFilters = { commune: "", date: "", page: 1 }; renderAdmin(); return; }
  const photoFolderDelete = event.target.closest("[data-photo-folder-delete]");
  if (photoFolderDelete && photoFolderDelete.dataset.photoFolderDelete !== EVENT_PHOTO_FOLDER_ID && confirm("Supprimer ce dossier et toutes les photos qu’il contient ?")) { const id = photoFolderDelete.dataset.photoFolderDelete; const folder = adminState.photoLibrary.folders.find((item) => item.id === id); adminState.photoLibrary.folders = adminState.photoLibrary.folders.filter((item) => item.id !== id); adminState.photoLibrary.photos = adminState.photoLibrary.photos.filter((photo) => photo.folderId !== id); selectedPhotoFolderId = adminState.photoLibrary.folders[0]?.id || "all"; publishPhotoLibrary("suppression dossier", folder?.name || id); return; }
  const photoDelete = event.target.closest("[data-photo-delete]");
  if (photoDelete && confirm("Supprimer définitivement cette photo ?")) { const photo = adminState.photoLibrary.photos.find((item) => item.id === photoDelete.dataset.photoDelete); adminState.photoLibrary.photos = adminState.photoLibrary.photos.filter((item) => item.id !== photoDelete.dataset.photoDelete); publishPhotoLibrary("suppression photo", photo?.fileName || photoDelete.dataset.photoDelete); return; }

  const campaignFeature = event.target.closest("[data-campaign-feature]");
  if (campaignFeature) {
    const id = campaignFeature.dataset.campaignFeature;
    if (selectedCampaignFeatureIds.has(id)) selectedCampaignFeatureIds.delete(id);
    else selectedCampaignFeatureIds.add(id);
    renderAdmin();
    return;
  }

  if (event.target.closest("[data-campaign-search-clear]")) { campaignSearchQuery = ""; renderAdmin(); return; }
  const unmatchedPage = event.target.closest("[data-campaign-unmatched-page]");
  if (unmatchedPage && !unmatchedPage.disabled) { campaignUnmatchedPage = Number(unmatchedPage.dataset.campaignUnmatchedPage) || 1; renderAdmin(); return; }
  const excludedContact = event.target.closest("[data-campaign-contact-exclude]");
  if (excludedContact) { await assignCampaignContactCommune(excludedContact.dataset.campaignContactExclude, "__NONE__"); return; }
  const autoContact = event.target.closest("[data-campaign-contact-auto]");
  if (autoContact) { await assignCampaignContactCommune(autoContact.dataset.campaignContactAuto, "__AUTO__"); return; }

  const campaignDeselect = event.target.closest("[data-campaign-deselect]");
  if (campaignDeselect) {
    selectedCampaignFeatureIds.delete(campaignDeselect.dataset.campaignDeselect);
    renderAdmin();
    return;
  }

  if (event.target.closest("[data-campaign-clear-selection]")) {
    selectedCampaignFeatureIds = new Set();
    renderAdmin();
    return;
  }

  if (event.target.closest("[data-campaign-apply]")) {
    updateCampaignAssignments("apply");
    return;
  }

  if (event.target.closest("[data-campaign-remove]")) {
    updateCampaignAssignments("remove");
    return;
  }

  const campaignRemoveOne = event.target.closest("[data-campaign-remove-one]");
  if (campaignRemoveOne) {
    const id = campaignRemoveOne.dataset.campaignRemoveOne;
    const filter = campaignRemoveOne.dataset.campaignFilterId;
    const remaining = (adminState.campaign.assignments?.[id] || []).filter((item) => item !== filter);
    if (remaining.length) adminState.campaign.assignments[id] = remaining;
    else delete adminState.campaign.assignments[id];
    saveAdminState("retrait filtre", "campagne terrain", `${id} · ${filter}`);
    return;
  }

  if (event.target.closest("[data-campaign-change]")) {
    if (confirm("Changer de GeoJSON remettra toute la campagne à zéro. Continuer ?")) document.querySelector("[data-campaign-geojson][data-campaign-replace]")?.click();
    return;
  }

  if (event.target.closest("[data-campaign-reset]")) {
    if (confirm("Supprimer toutes les données liées à cette campagne ?")) resetCampaign();
    return;
  }

  const calendarOpenContact = event.target.closest("[data-calendar-open-contact]");
  if (calendarOpenContact) {
    const id = calendarOpenContact.dataset.calendarOpenContact;
    if (contactById(id)) {
      selectedContactId = id;
      adminFilters.contacts = { perPage: contactSearchFilters().perPage, page: 1 };
      clearContactSelection();
      activeAdminSection = "contacts";
      renderAdmin();
    }
    return;
  }
  if (event.target.closest("[data-campaign-major-new]")) {
    selectedCampaignMajorEventId = "new"; campaignMajorEventSearchText = ""; renderAdmin(); return;
  }
  const campaignMajorOpen = event.target.closest("[data-campaign-major-open]");
  if (campaignMajorOpen) {
    selectedCampaignMajorEventId = campaignMajorOpen.dataset.campaignMajorOpen;
    campaignMajorEventSearchText = ""; renderAdmin(); return;
  }
  const campaignMajorAdd = event.target.closest("[data-campaign-major-add]");
  if (campaignMajorAdd) { changeCampaignMajorParticipation(selectedCampaignMajorEventId, campaignMajorAdd.dataset.campaignMajorAdd, "add"); return; }
  const campaignMajorRemove = event.target.closest("[data-campaign-major-remove]");
  if (campaignMajorRemove) {
    if (confirm("Retirer ce contact des participants ?")) changeCampaignMajorParticipation(selectedCampaignMajorEventId, campaignMajorRemove.dataset.campaignMajorRemove, "remove");
    return;
  }
  const campaignMajorContact = event.target.closest("[data-campaign-major-contact]");
  if (campaignMajorContact) {
    if (!contactById(campaignMajorContact.dataset.campaignMajorContact)) return;
    selectedContactId = campaignMajorContact.dataset.campaignMajorContact;
    adminFilters.contacts = {perPage:contactSearchFilters().perPage,page:1};
    clearContactSelection();activeAdminSection = "contacts";renderAdmin();return;
  }
  const campaignMajorExport = event.target.closest("[data-campaign-major-export]");
  if (campaignMajorExport) { exportCampaignMajorParticipants(campaignMajorExport.dataset.campaignMajorExport); return; }
  const campaignMajorLink = event.target.closest("[data-campaign-major-link-calendar]");
  if (campaignMajorLink) { linkCampaignMajorCalendar(campaignMajorLink.dataset.campaignMajorLinkCalendar); return; }
  const campaignMajorUnlink = event.target.closest("[data-campaign-major-unlink-calendar]");
  if (campaignMajorUnlink) { unlinkCampaignMajorCalendar(campaignMajorUnlink.dataset.campaignMajorUnlinkCalendar); return; }
  const campaignMajorDelete = event.target.closest("[data-campaign-major-delete]");
  if (campaignMajorDelete) { deleteCampaignMajorEvent(campaignMajorDelete.dataset.campaignMajorDelete); return; }
  const campaignFromContact = event.target.closest("[data-open-contact-campaign-event]");
  if (campaignFromContact) { selectedCampaignMajorEventId = campaignFromContact.dataset.openContactCampaignEvent; activeAdminSection = "campaign-events"; renderAdmin(); return; }
  const campaignMajorBack = event.target.closest("[data-campaign-major-back]");
  if (campaignMajorBack) { selectedCampaignMajorEventId = campaignMajorBack.dataset.campaignMajorBack; activeAdminSection = "campaign-events"; renderAdmin(); return; }
  const campaignMajorOpenCalendar = event.target.closest("[data-campaign-major-open-calendar]");
  if (campaignMajorOpenCalendar) {
    const item = campaignMajorEventCalendarRecord(campaignMajorEventRecord(campaignMajorOpenCalendar.dataset.campaignMajorOpenCalendar));
    if (!item) return;
    selectedCalendarEventId = item.id;
    selectedCalendarOccurrenceKey = item.startAt.slice(0,10);
    calendarCursor = selectedCalendarOccurrenceKey;
    calendarView = "day"; activeAdminSection = "calendar"; renderAdmin(); return;
  }
  const attendeeAdd = event.target.closest("[data-attendance-add]");
  if (attendeeAdd) {
    const panel = attendeeAdd.closest("[data-calendar-attendance]");
    if (panel) calendarAttendanceAction(panel.dataset.calendarAttendance, panel.dataset.attendanceDay, attendeeAdd.dataset.attendanceAdd, "add");
    return;
  }
  const attendeeRemove = event.target.closest("[data-attendance-remove]");
  if (attendeeRemove) {
    const panel = attendeeRemove.closest("[data-calendar-attendance]");
    if (panel && confirm("Retirer ce participant de l'événement ?")) calendarAttendanceAction(panel.dataset.calendarAttendance, panel.dataset.attendanceDay, attendeeRemove.dataset.attendanceRemove, "remove");
    return;
  }
  const attendeeExport = event.target.closest("[data-attendance-export]");
  if (attendeeExport) {
    const panel = attendeeExport.closest("[data-calendar-attendance]");
    if (panel) exportCalendarAttendance(panel.dataset.calendarAttendance, panel.dataset.attendanceDay);
    return;
  }
  const calendarAddContact = event.target.closest("[data-calendar-add-contact]");
  if (calendarAddContact) {
    const form = calendarAddContact.closest("[data-calendar-save]");
    const chips = form?.querySelector("[data-calendar-contact-chips]");
    const id = calendarAddContact.dataset.calendarAddContact;
    if (chips && contactById(id) && ![...form.querySelectorAll('[name="contactIds"]')].some((field) => field.value === id)) {
      chips.insertAdjacentHTML("beforeend", calendarLinkedContactMarkup([id]));
      updateCalendarContactSearch(form);
    }
    return;
  }
  const calendarUnlinkContact = event.target.closest("[data-calendar-unlink-contact]");
  if (calendarUnlinkContact) {
    const form = calendarUnlinkContact.closest("[data-calendar-save]");
    calendarUnlinkContact.closest(".calendar-contact-chip")?.remove();
    updateCalendarContactSearch(form);
    return;
  }
  // Un clic suffit pour ouvrir le détail et ses coordonnées : ne pas obliger un double clic.
  const calendarEventClick = event.target.closest("[data-calendar-event]");
  if (calendarEventClick) {
    if (Date.now() < calendarSkipClickUntil) return;
    selectedCalendarOccurrenceKey = calendarEventClick.dataset.calendarOccurrence || "";
    selectedCalendarEventId = calendarEventClick.dataset.calendarEvent;
    // Keep keyboard focus on the event after rerender so Delete works immediately.
    renderAdmin();
    document.querySelector(`[data-calendar-event="${CSS.escape(selectedCalendarEventId)}"][data-calendar-occurrence="${CSS.escape(selectedCalendarOccurrenceKey)}"]`)?.focus();
    return;
  }

  const calendarDuplicate = event.target.closest("[data-calendar-duplicate]");
  if (calendarDuplicate) {
    const source = calendarOccurrenceSource(calendarDuplicate.dataset.calendarDuplicate, selectedCalendarOccurrenceKey);
    if (source) {
      const target = prompt("Nouvelle date et heure (AAAA-MM-JJTHH:MM)", String(source.startAt).slice(0, 16));
      if (target && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(target) && !Number.isNaN(new Date(target).getTime())) {
        calendarCopyEvent(source.id, selectedCalendarOccurrenceKey, target);
      } else if (target) showToast("Date ou heure invalide.");
    }
    return;
  }
  if (event.target.closest("[data-calendar-categories-toggle]")) {
    adminFilters.calendarCategoriesOpen = !adminFilters.calendarCategoriesOpen;
    renderAdmin();
    return;
  }
  if (event.target.closest("[data-calendar-categories-close]")) { adminFilters.calendarCategoriesOpen = false; renderAdmin(); return; }
  const categoryEdit = event.target.closest("[data-calendar-category-edit]");
  if (categoryEdit) { adminFilters.calendarCategoryEdit = categoryEdit.dataset.calendarCategoryEdit; renderAdmin(); return; }
  const categoryDelete = event.target.closest("[data-calendar-category-delete]");
  if (categoryDelete) { deleteCalendarCategory(categoryDelete.dataset.calendarCategoryDelete); return; }
  if (event.target.closest("[data-calendar-category-new]")) { adminFilters.calendarCategoryEdit = ""; renderAdmin(); return; }
  const calendarViewButton = event.target.closest("[data-calendar-view]");
  if (calendarViewButton) {
    calendarView = calendarViewButton.dataset.calendarView || "week";
    selectedCalendarEventId = "";
    renderAdmin();
    return;
  }

  const calendarMove = event.target.closest("[data-calendar-move]");
  if (calendarMove) {
    const direction = calendarMove.dataset.calendarMove === "prev" ? -1 : 1;
    const cursor = calendarDate(calendarCursor);
    if (calendarView === "month") cursor.setMonth(cursor.getMonth() + direction);
    else cursor.setDate(cursor.getDate() + direction * (calendarView === "week" ? 7 : 1));
    calendarCursor = calendarDateKey(cursor);
    selectedCalendarEventId = "";
    renderAdmin();
    return;
  }

  if (event.target.closest("[data-calendar-today]")) {
    calendarCursor = calendarDateKey(new Date());
    selectedCalendarEventId = "";
    renderAdmin();
    return;
  }

  if (event.target.closest("[data-calendar-new]")) {
    adminFilters.calendarDraftStart = `${calendarCursor}T09:00`;
    selectedCalendarEventId = "__new";
    renderAdmin();
    return;
  }

  const calendarSlot = event.target.closest("[data-calendar-slot]");
  if (calendarSlot) {
    adminFilters.calendarDraftStart = calendarSlot.dataset.calendarSlot;
    selectedCalendarEventId = "__new";
    renderAdmin();
    return;
  }

  if (event.target.closest("[data-calendar-close]")) {
    selectedCalendarEventId = "";
    delete adminFilters.calendarDraftStart;
    renderAdmin();
    return;
  }

  const calendarDelete = event.target.closest("[data-calendar-delete]");
  if (calendarDelete && confirm("Supprimer cet événement du calendrier ?")) {
    deleteCalendarEvent(calendarDelete.dataset.calendarDelete);
    return;
  }

  if (event.target.closest("[data-word-template-create-toggle]")) {
    adminFilters.wordTemplateCreateOpen = !adminFilters.wordTemplateCreateOpen;
    if (adminFilters.wordTemplateCreateOpen) adminFilters.wordTemplateEdit = "";
    renderAdmin();
  }

  const wordTemplateEdit = event.target.closest("[data-word-template-edit]");
  if (wordTemplateEdit) {
    adminFilters.wordTemplateEdit = wordTemplateEdit.dataset.wordTemplateEdit || "";
    adminFilters.wordTemplateCreateOpen = false;
    renderAdmin();
  }

  const wordVariableAdd = event.target.closest("[data-word-variable-add]");
  if (wordVariableAdd) {
    const editor = wordVariableAdd.closest(".word-variable-editor");
    const table = editor?.querySelector(".death-variable-table");
    const index = table?.querySelectorAll("[data-word-variable-row]").length || 0;
    table?.insertAdjacentHTML("beforeend", wordVariableRowHtml({}, Date.now() + index));
  }

  const wordVariableDelete = event.target.closest("[data-word-variable-delete]");
  if (wordVariableDelete) wordVariableDelete.closest("[data-word-variable-row]")?.remove();

  const logoutButton = event.target.closest("#logout-button, [data-mobile-logout]");
  if (logoutButton) {
    event.preventDefault();
    const button = logoutButton;
    button.disabled = true;
    button.textContent = "Deconnexion...";
    try {
      await apiJson("auth.php?action=logout");
    } catch {
      // La session locale doit tout de meme etre fermee si le serveur ne repond plus.
    } finally {
      currentUserId = "";
      localStorage.removeItem(SESSION_KEY);
      adminApiLoaded = false;
      adminApiLoadRequested = false;
      activePanel = "accueil";
      renderAll();
    }
    return;
  }

  if (event.target.id === "leave-admin") setActivePanel("accueil");

  if (event.target.closest("[data-admin-retry-db]")) {
    adminSyncStatus = "pending";
    adminSyncMessage = "Connexion a la base en cours.";
    adminApiLoadRequested = true;
    renderAdmin();
    loadAdminStateFromApi(true);
    return;
  }

  const openTeamFolder = event.target.closest("[data-open-team-folder]");
  if (openTeamFolder) { selectedTeamFolderId = openTeamFolder.dataset.openTeamFolder; renderAdmin(); return; }
  const contactTeamFolder = event.target.closest("[data-open-contact-team-folder]");
  if (contactTeamFolder) { selectedTeamFolderId = contactTeamFolder.dataset.openContactTeamFolder; activeAdminSection = "tasks"; renderAdmin(); return; }
  const contactCalendarEvent = event.target.closest("[data-open-contact-calendar-event]");
  if (contactCalendarEvent) {
    const item = adminState.calendarEvents.find((entry) => entry.id === contactCalendarEvent.dataset.openContactCalendarEvent);
    if (item) {
      selectedCalendarEventId = item.id;
      calendarCursor = String(item.startAt).slice(0, 10);
      calendarView = "day";
      activeAdminSection = "calendar";
      renderAdmin();
    }
    return;
  }
  const contactLocalCase = event.target.closest("[data-open-contact-local-case]");
  if (contactLocalCase) { selectedPermanenceId = contactLocalCase.dataset.openContactLocalCase; activeAdminSection = "permanence"; renderAdmin(); return; }
  if (event.target.closest("[data-close-team-folder]")) { selectedTeamFolderId = ""; renderAdmin(); return; }
  const renameTeamFolder = event.target.closest("[data-team-folder-rename]");
  if (renameTeamFolder) {
    const folder = adminState.teamFolders.find((item) => item.id === renameTeamFolder.dataset.teamFolderRename);
    const name = folder ? prompt("Nouveau nom du dossier", folder.name) : "";
    if (folder && name?.trim()) { folder.name = name.trim().slice(0, 120); folder.updatedAt = new Date().toISOString(); saveAdminState("modification", "dossier equipe", folder.name); }
    return;
  }
  const deleteTeamFolder = event.target.closest("[data-team-folder-delete]");
  if (deleteTeamFolder && confirm("Supprimer ce dossier et toutes ses taches ?")) {
    const id = deleteTeamFolder.dataset.teamFolderDelete;
    adminState.teamFolders = adminState.teamFolders.filter((item) => item.id !== id);
    adminState.teamTasks = adminState.teamTasks.filter((task) => task.folderId !== id);
    saveAdminState("suppression", "dossier equipe", id);
    return;
  }
  const teamTaskToggle = event.target.closest("[data-team-task-toggle]");
  if (teamTaskToggle) {
    const task = adminState.teamTasks.find((item) => item.id === teamTaskToggle.dataset.teamTaskToggle);
    if (task) { task.status = teamTaskToggle.checked ? "termine" : "a traiter"; task.updatedAt = new Date().toISOString(); saveAdminState("statut", "tache", task.title); }
    return;
  }
  const taskFileDelete = event.target.closest("[data-task-file-delete]");
  if (taskFileDelete) {
    const task = adminState.teamTasks.find((item) => item.id === taskFileDelete.dataset.taskFileDelete);
    if (task) { task.attachments = (task.attachments || []).filter((file) => file.id !== taskFileDelete.dataset.fileId); saveAdminState("suppression fichier", "tache", task.title); }
    return;
  }
  const taskFileDownload = event.target.closest("[data-task-file-download]");
  if (taskFileDownload) {
    const task = adminState.teamTasks.find((item) => item.id === taskFileDownload.dataset.taskFileDownload);
    const file = (task?.attachments || []).find((item) => item.id === taskFileDownload.dataset.fileId);
    if (file?.fileData) downloadDataUrl(file.name || "piece-jointe", file.fileData, file.type);
    return;
  }

  if (event.target.closest("[data-permanence-new]")) {
    selectedPermanenceId = "__new";
    adminFilters.permanence = { ...(adminFilters.permanence || {}), newStatus: "nouveau" };
    renderAdmin();
  }
  if (event.target.closest("[data-permanence-back-list]")) {
    selectedPermanenceId = "";
    adminFilters.permanenceTab = "tasks";
    renderAdmin();
    return;
  }
  const localFolderOpen = event.target.closest("[data-local-folder-open]");
  if (localFolderOpen) { selectedLocalFolderId = localFolderOpen.dataset.localFolderOpen; selectedPermanenceId = ""; renderAdmin(); return; }
  const localFolderRename = event.target.closest("[data-local-folder-rename]");
  if (localFolderRename) {
    const folder = adminState.localFolders.find((item) => item.id === localFolderRename.dataset.localFolderRename);
    const name = folder ? prompt("Nouveau nom", folder.name) : "";
    if (folder && name?.trim()) { folder.name = name.trim().slice(0, 120); folder.updatedAt = new Date().toISOString(); saveAdminState("modification", "dossier classement", folder.name); }
    return;
  }
  const localFolderDelete = event.target.closest("[data-local-folder-delete]");
  if (localFolderDelete && confirm("Supprimer ce dossier de classement ? Les dossiers citoyens seront replaces a la racine.")) {
    const id = localFolderDelete.dataset.localFolderDelete;
    adminState.localFolders = adminState.localFolders.filter((item) => item.id !== id);
    adminState.permanenceRequests.forEach((item) => { if (item.localFolderId === id) item.localFolderId = ""; });
    saveAdminState("suppression", "dossier classement", id);
    return;
  }

  const permanenceNewStatus = event.target.closest("[data-permanence-new-status]");
  if (permanenceNewStatus) {
    selectedPermanenceId = "__new";
    adminFilters.permanence = { ...(adminFilters.permanence || {}), newStatus: permanenceNewStatus.dataset.permanenceNewStatus || "nouveau" };
    renderAdmin();
  }

  if (event.target.closest("[data-permanence-close-new]")) {
    selectedPermanenceId = adminState.permanenceRequests[0]?.id || "";
    renderAdmin();
  }

  if (event.target.closest("[data-permanence-close-detail]")) {
    selectedPermanenceId = "";
    renderAdmin();
  }

  if (event.target.closest("[data-permanence-filters]")) {
    adminFilters.permanence = { ...(adminFilters.permanence || {}), filtersOpen: !(adminFilters.permanence || {}).filtersOpen };
    renderAdmin();
  }

  if (event.target.closest("[data-permanence-clear-filters]")) {
    adminFilters.permanence = { view: (adminFilters.permanence || {}).view || "board" };
    renderAdmin();
  }

  const permanenceView = event.target.closest("[data-permanence-view]");
  if (permanenceView) {
    adminFilters.permanence = { ...(adminFilters.permanence || {}), view: permanenceView.dataset.permanenceView || "board" };
    renderAdmin();
  }

  const permanenceTab = event.target.closest("[data-permanence-tab]");
  if (permanenceTab) {
    adminFilters.permanenceTab = permanenceTab.dataset.permanenceTab || "tasks";
    renderAdmin();
  }

  const searchType = event.target.closest("[data-search-type]");
  if (searchType) {
    activeSearchType = searchType.dataset.searchType;
    renderSearchFilters();
    renderSearchResults();
  }

  const commune = event.target.closest("[data-commune]");
  if (commune) {
    selectedCommune = commune.dataset.commune;
    renderAgenda();
  }

  if (event.target.id === "clear-commune-filter") {
    selectedCommune = "";
    renderAgenda();
  }

  if (event.target.id === "map-zoom-in") { mapZoom = Math.min(2.5, mapZoom + 0.15); renderMap(); }
  if (event.target.id === "map-zoom-out") { mapZoom = Math.max(0.7, mapZoom - 0.15); renderMap(); }
  if (event.target.id === "map-zoom-reset") { mapZoom = 1; renderMap(); }

  const openContact = event.target.closest("[data-open-contact]");
  if (openContact) {
    selectedContactId = openContact.dataset.openContact;
    contactMobileDetailOpen = true;
    activeAdminSection = "contacts";
    renderAdmin();
  }

  const openDeathCase = event.target.closest("[data-open-death-case]");
  if (openDeathCase) {
    selectedDeathCaseId = openDeathCase.dataset.openDeathCase;
    renderAdmin();
  }

  if (event.target.closest("[data-back-death-list]")) {
    selectedDeathCaseId = "";
    adminFilters.deathAddOpen = false;
    renderAdmin();
  }

  if (event.target.closest("[data-death-new-toggle]")) {
    adminFilters.deathCreateOpen = !adminFilters.deathCreateOpen;
    renderAdmin();
  }

  if (event.target.closest("[data-special-letter-new-toggle]")) {
    adminFilters.specialLetterCreateOpen = !adminFilters.specialLetterCreateOpen;
    renderAdmin();
  }

  if (event.target.closest("[data-death-add-toggle]")) {
    adminFilters.deathAddOpen = !adminFilters.deathAddOpen;
    renderAdmin();
  }

  if (event.target.closest("[data-mail-template-new]")) { adminFilters.mailTemplateId = ""; renderAdmin(); return; }
  const mailTemplateSelect = event.target.closest("[data-mail-template-select]");
  if (mailTemplateSelect) { adminFilters.mailTemplateId = mailTemplateSelect.dataset.mailTemplateSelect; renderAdmin(); return; }
  const mailTemplateDelete = event.target.closest("[data-mail-template-delete]");
  if (mailTemplateDelete) { deleteMailTemplate(mailTemplateDelete.dataset.mailTemplateDelete); return; }
  if (event.target.closest("[data-mail-refresh]")) { await loadMailCampaignOverview(); return; }
  if (event.target.closest("[data-mail-preview]")) { await previewMailCampaign(); return; }
  if (event.target.closest("[data-mail-send]")) { await sendMailCampaign(); return; }
  const mailResume = event.target.closest("[data-mail-resume]");
  if (mailResume && !mailCampaignUI.busy) { await dispatchMailCampaign(mailResume.dataset.mailResume); return; }

  const contactSelectPage = event.target.closest("[data-contact-select-page]");
  if (contactSelectPage) {
    selectedAllFilteredContacts = false;
    selectedAllFilteredContactsSignature = "";
    document.querySelectorAll("[data-contact-select]").forEach((input) => selectedContactIds.add(input.dataset.contactSelect));
    renderAdmin();
  }

  if (event.target.closest("[data-contact-select-filtered]")) {
    selectedContactIds = new Set();
    selectedAllFilteredContacts = true;
    selectedAllFilteredContactsSignature = contactFiltersSignature(contactSearchFilters());
    renderAdmin();
  }

  if (event.target.closest("[data-contact-clear-selection]")) {
    clearContactSelection();
    renderAdmin();
  }

  if(event.target.closest("[data-contact-mobile-back]")){contactMobileDetailOpen=false;renderAdmin();return;}
  const addCriterion=event.target.closest("[data-contact-add-field-apply]");
  if(addCriterion){const form=document.querySelector('[data-admin-filter="contacts"]');const id=form?.querySelector("[data-contact-add-field]")?.value;if(["firstName","lastName","city"].includes(id)){addContactExtraRule(form,id);return;}const row=id?form.querySelector('[data-contact-field-row="'+id+'"]'):null;if(row){row.hidden=false;row.querySelector("input[name],select[name^=field_]")?.focus();}return;}
  const removeChip=event.target.closest("[data-contact-remove-filter]");
  if(removeChip){
    const key=removeChip.dataset.contactRemoveFilter;
    if(key==="keywordIds"){adminFilters.contacts.keywordIds=[];}
    else if(key==="activityKind"){adminFilters.contacts.activityKind="";}
    else if(key==="fieldJoinMode"){adminFilters.contacts.fieldJoinMode="AND";}
    else if(key==="sortBy"){adminFilters.contacts.sortBy="";adminFilters.contacts.sortOrder="asc";}
    else if(key==="q"){adminFilters.contacts.q="";}
    else if(key.startsWith("extraRule_")){adminFilters.contacts.extraRules=normalizeContactExtraRules(adminFilters.contacts.extraRules).filter((_,i)=>i!==Number(key.slice(10)));}
    else if(key.startsWith("field_")){adminFilters.contacts[key]="";adminFilters.contacts["op_"+key.slice(6)]="contains";}
    adminFilters.activeSavedContactSearchId="";clearContactSelection();renderAdmin();return;
  }
  const removeExtra=event.target.closest("[data-contact-remove-extra-rule]");
  if(removeExtra){removeExtra.closest("[data-contact-extra-rule]")?.remove();return;}
  const hideCriterion=event.target.closest("[data-contact-hide-field]");
  if(hideCriterion){const id=hideCriterion.dataset.contactHideField;const row=hideCriterion.closest("[data-contact-field-row]");if(row){row.querySelectorAll("input,select").forEach(el=>{if(el.name==="op_"+id)el.value="contains";else el.value="";});row.hidden=true;}return;}
  const tagEditor=event.target.closest("[data-contact-tag-editor]");
  const tagAdd=event.target.closest("[data-contact-tag-add]");
  if(tagEditor&&tagAdd){
    const choice=contactKeywordChoices().find(word=>word.id===tagAdd.dataset.contactTagAdd);
    if(choice)addContactTag(tagEditor,choice.label);
    return;
  }
  const tagRemove=event.target.closest("[data-contact-tag-remove]");
  if(tagEditor&&tagRemove){
    const hidden=tagEditor.querySelector("[data-contact-tag-value]");
    if(hidden)hidden.value=String(hidden.value||"").split(/[,;]/).map(v=>v.trim()).filter(v=>v&&slugify(v)!==tagRemove.dataset.contactTagRemove).join(", ");
    updateContactTagEditor(tagEditor);
    return;
  }
  if(event.target.closest("[data-contact-tag-expand]")&&tagEditor){
    tagEditor.dataset.expanded=tagEditor.dataset.expanded==="true"?"false":"true";
    updateContactTagSuggestions(tagEditor.querySelector("[data-contact-tag-query]"));
    return;
  }
  if(event.target.closest("[data-contact-tag-add-new]")&&tagEditor){
    const input=tagEditor.querySelector("[data-contact-tag-query]");
    const label=String(input?.value||"").trim().replace(/\\s+/g," ").slice(0,80);
    if(!label||slugify(label)==="item")return;
    const old=contactKeywordChoices().find(word=>word.id===slugify(label));
    addContactTag(tagEditor,old?.label||label);
    return;
  }
  if(event.target.closest("[data-contact-keyword-expand]")){
    const picker=event.target.closest(".contact-keyword-picker");
    if(picker){picker.dataset.expanded=picker.dataset.expanded==="true"?"false":"true";updateContactKeywordSuggestions(picker.querySelector("[data-contact-keyword-query]"));}
    return;
  }
  const createContactKeyword=event.target.closest("[data-contact-keyword-create]");
  if(createContactKeyword){
    const picker=createContactKeyword.closest(".contact-keyword-picker");
    const input=picker?.querySelector("[data-contact-keyword-query]");
    const label=String(input?.value||"").trim().replace(/\s+/g," ").slice(0,80);
    const id=slugify(label);
    if(!label||id==="item")return;
    const existing=contactKeywordChoices().find(item=>item.id===id);
    if(existing){showToast("Ce mot-clé existe déjà : sélectionnez-le dans la liste.");return;}
    const form=createContactKeyword.closest('[data-admin-filter="contacts"]');
    const data=form?new FormData(form):null;
    adminState.contactKeywords=normalizeKeywords([...(adminState.contactKeywords||[]),{id,label,color:"#2d6fb6"}]);
    if(data)adminFilters.contacts={...Object.fromEntries(data.entries()),keywordIds:normalizedContactKeywordIds([...data.getAll("keywordIds"),id]),keywordMode:data.get("keywordMode")==="AND"?"AND":"OR",page:1};
    adminFilters.activeSavedContactSearchId="";
    clearContactSelection();
    saveAdminState("creation","mot-cle contact",label);
    showToast("Mot-clé « "+label+" » ajouté au catalogue et à la recherche.");
    return;
  }
  const formBuilder=event.target.closest("[data-saved-list-builder]");
  if(formBuilder){
    const add=event.target.closest("[data-list-add-member]");
    if(add){addSavedListMember(formBuilder,add.dataset.listAddMember,add.dataset.listKind);return;}
    const remove=event.target.closest("[data-list-remove-member]");
    if(remove){remove.closest("[data-list-member]")?.remove();refreshSavedListBuilder(formBuilder);return;}
    if(event.target.closest("[data-list-refresh-preview]")){refreshSavedListBuilder(formBuilder);return;}
  }
  if(event.target.closest("[data-contact-list-from-selection]")){
    const filters=contactSearchFilters();
    const contacts=isAllFilteredContactSelectionActive(filters)?filteredContacts():adminState.localContacts.filter(c=>selectedContactIds.has(c.id)&&c.entityType!=="institution");
    if(!contacts.length){showToast("Sélectionnez des contacts.");return;}
    const name=prompt("Nom de la liste manuelle");
    if(name===null)return;
    const clean=String(name).trim().slice(0,120);
    if(!clean){showToast("Saisissez un nom valide.");return;}
    const searches=normalizeSavedContactSearches(adminState.savedContactSearches),now=new Date().toISOString();
    const item={id:crypto.randomUUID(),name:clean,listType:"manual",includeIds:contacts.map(c=>c.id),excludeIds:[],filters:{},createdAt:now,updatedAt:now,createdBy:currentUserId};
    adminState.savedContactSearches=[item,...searches];
    clearContactSelection();
    adminFilters.activeSavedContactSearchId=item.id;
    saveAdminState("creation","recherche contact enregistree",clean);
    showToast("Liste manuelle créée : "+contacts.length+" contact(s).");
    return;
  }
  const contactListAdd=event.target.closest("[data-contact-add-to-list]");
  if(contactListAdd){
    const listId=contactListAdd.closest(".contact-add-to-list")?.querySelector("[data-contact-add-list]")?.value;
    if(!listId){showToast("Choisissez une liste.");return;}
    addContactToSavedList(contactListAdd.dataset.contactAddToList,listId);return;
  }
  const editList=event.target.closest("[data-list-edit]");
  if(editList){savedListEditorId=editList.dataset.listEdit;activeAdminSection="saved-contact-searches";renderAdmin();document.querySelector("[data-saved-list-builder]")?.scrollIntoView({block:"start",behavior:"smooth"});return;}
  if(event.target.closest("[data-list-cancel-edit]")){savedListEditorId="";renderAdmin();return;}
  const renameList=event.target.closest("[data-list-rename]");
  if(renameList){
    const searches=normalizeSavedContactSearches(adminState.savedContactSearches);
    const item=searches.find(x=>x.id===renameList.dataset.listRename);
    if(!item)return;
    const name=prompt("Nouveau nom de la liste",item.name);
    if(name===null)return;
    const clean=String(name).trim().slice(0,120);
    if(!clean){showToast("Saisissez un nom valide.");return;}
    adminState.savedContactSearches=searches.map(x=>x.id===item.id?{...x,name:clean,updatedAt:new Date().toISOString()}:x);
    saveAdminState("modification","recherche contact enregistree",clean);return;
  }
  const duplicateList=event.target.closest("[data-list-duplicate]");
  if(duplicateList){
    const searches=normalizeSavedContactSearches(adminState.savedContactSearches);
    const item=searches.find(x=>x.id===duplicateList.dataset.listDuplicate);
    if(!item)return;
    const now=new Date().toISOString();
    const copy={...item,id:crypto.randomUUID(),name:(item.name+" — copie").slice(0,120),createdAt:now,updatedAt:now,createdBy:currentUserId,favorite:false};
    adminState.savedContactSearches=[copy,...searches];
    saveAdminState("creation","recherche contact enregistree",copy.name);return;
  }
  const contactSaveSearch = event.target.closest("[data-contact-save-search]");
  if (contactSaveSearch) {
    const form = document.querySelector('[data-admin-filter="contacts"]');
    if (form) saveContactSearch(form);
    return;
  }
  const contactLoadSearch = event.target.closest("[data-contact-load-search]");
  if (contactLoadSearch) { loadContactSearch(contactLoadSearch.dataset.contactLoadSearch); return; }
  const peopleExport=event.target.closest("[data-contact-export-people]");
  if(peopleExport){exportSavedContactPeople(peopleExport.dataset.contactExportPeople);return;}
  const freezeSearch=event.target.closest("[data-contact-freeze-search]");
  if(freezeSearch){freezeSavedContactSearch(freezeSearch.dataset.contactFreezeSearch);return;}
  const favoriteSearch=event.target.closest("[data-contact-favorite-search]");
  if(favoriteSearch){favoriteSavedContactSearch(favoriteSearch.dataset.contactFavoriteSearch);return;}
  const searchExport = event.target.closest("[data-contact-export-search]");
  if (searchExport) { exportSavedContactSearch(searchExport.dataset.contactExportSearch); return; }
  if (event.target.closest("[data-contact-merge-searches]")) { mergeSavedContactSearches(); return; }
  const contactUpdateSearch = event.target.closest("[data-contact-update-search]");
  if (contactUpdateSearch) {
    const form = document.querySelector('[data-admin-filter="contacts"]');
    if (form) saveContactSearch(form, contactUpdateSearch.dataset.contactUpdateSearch);
    else { loadContactSearch(contactUpdateSearch.dataset.contactUpdateSearch); showToast("Modifiez les filtres puis cliquez sur Actualiser dans Contacts."); }
    return;
  }
  const contactDeleteSearch = event.target.closest("[data-contact-delete-search]");
  if (contactDeleteSearch) { deleteContactSearch(contactDeleteSearch.dataset.contactDeleteSearch); return; }

  if (event.target.closest("[data-contact-reset-filters]")) {
    adminFilters.contacts = { perPage: contactSearchFilters().perPage, page: 1 };
    adminFilters.activeSavedContactSearchId = "";
    clearContactSelection();
    renderAdmin();
    return;
  }

  const deleteContact = event.target.closest("[data-delete-contact]");
  if (deleteContact && isAdmin() && confirm("Confirmer la suppression du contact ?")) {
    await deleteContactsWithProgress([deleteContact.dataset.deleteContact], "contact");
  }

  const deleteSelectedContacts = event.target.closest("[data-delete-selected-contacts]");
  if (deleteSelectedContacts && isAdmin()) {
    const selectedCount = isAllFilteredContactSelectionActive(contactSearchFilters()) ? filteredContacts().length : selectedContactIds.size;
    if (selectedCount && confirm(`Confirmer la suppression de ${selectedCount} contact(s) ?`)) {
      await deleteSelectedContactsFast(selectedCount);
    }
  }

  const openPermanence = event.target.closest("[data-open-permanence]");
  if (openPermanence) {
    selectedPermanenceId = openPermanence.dataset.openPermanence;
    renderAdmin();
  }

  const taskFromPermanence = event.target.closest("[data-task-from-permanence]");
  if (taskFromPermanence) await createTaskFromPermanence(taskFromPermanence.dataset.taskFromPermanence);

  const templateFromPermanence = event.target.closest("[data-template-context-from-permanence]");
  if (templateFromPermanence) {
    const request = adminState.permanenceRequests.find((item) => item.id === templateFromPermanence.dataset.templateContextFromPermanence);
    adminFilters.templateContext = { requestId: request?.id || "", contactId: request?.contactId || "" };
    activeAdminSection = "templates";
    renderAdmin();
  }

  const taskStatus = event.target.closest("[data-task-status]");
  if (taskStatus) {
    const task = adminState.teamTasks.find((item) => item.id === taskStatus.dataset.taskStatus);
    if (task) {
      task.status = taskStatus.dataset.status;
      saveAdminState("statut", "tache", task.title);
    }
  }

  const permanenceTaskToggle = event.target.closest("[data-permanence-task-toggle]");
  if (permanenceTaskToggle) {
    await togglePermanenceTask(permanenceTaskToggle.dataset.permanenceTaskToggle, permanenceTaskToggle.checked);
  }

  const permanenceTaskDelete = event.target.closest("[data-permanence-task-delete]");
  if (permanenceTaskDelete && confirm("Supprimer cette tache ?")) {
    await deletePermanenceTask(permanenceTaskDelete.dataset.permanenceTaskDelete);
  }

  const permanenceDocumentDelete = event.target.closest("[data-permanence-document-delete]");
  if (permanenceDocumentDelete && confirm("Supprimer ce document ?")) {
    await deletePermanenceDocument(permanenceDocumentDelete.dataset.permanenceDocumentDelete, permanenceDocumentDelete.dataset.documentId);
  }
  const permanenceDocumentDownload = event.target.closest("[data-permanence-document-download]");
  if (permanenceDocumentDownload) {
    const request = adminState.permanenceRequests.find((item) => item.id === permanenceDocumentDownload.dataset.permanenceDocumentDownload);
    const file = (request?.attachments || []).find((item) => item.id === permanenceDocumentDownload.dataset.documentId);
    if (file?.fileData) downloadDataUrl(file.name || "document", file.fileData, file.type);
    return;
  }

  const permanenceArchive = event.target.closest("[data-permanence-archive]");
  if (permanenceArchive && confirm("Archiver ce dossier ?")) {
    await archivePermanence(permanenceArchive.dataset.permanenceArchive);
  }

  const permanenceDelete = event.target.closest("[data-permanence-delete]");
  if (permanenceDelete && isAdmin() && confirm("Supprimer definitivement ce dossier ?")) {
    await deletePermanence(permanenceDelete.dataset.permanenceDelete);
  }

  const copyPreview = event.target.closest("[data-template-copy-preview]");
  if (copyPreview) copyGeneratedTemplate(copyPreview.dataset.templateCopyPreview);

  const templateDownload = event.target.closest("[data-template-download]");
  if (templateDownload) downloadGeneratedTemplate(templateDownload.dataset.templateDownload);

  const contactExport = event.target.closest("[data-contact-export]");
  if (contactExport) exportContacts(contactExport.dataset.contactExport);

  if (event.target.closest("[data-contact-import-cancel]")) {
    pendingContactImport = null;
    renderAdmin();
  }

  if (event.target.closest("[data-admin-export-all]")) exportAllAdminData();

  if (event.target.closest("[data-admin-sync-now]")) await synchronizeAdminNow();

  const documentFolderSelect = event.target.closest("[data-document-folder-select]");
  if (documentFolderSelect) {
    selectedDocumentFolderId = documentFolderSelect.dataset.documentFolderSelect || "all";
    selectedDocumentId = documentFilteredList()[0]?.id || "";
    renderAdmin();
  }

  const documentOpen = event.target.closest("[data-document-open]");
  if (documentOpen) {
    selectedDocumentId = documentOpen.dataset.documentOpen;
    renderAdmin();
  }

  if (event.target.closest("[data-document-import-toggle]") || event.target.closest("[data-document-create-toggle]")) {
    adminFilters.documentCreateOpen = !adminFilters.documentCreateOpen;
    adminFilters.documentImportOpen = false;
    renderAdmin();
  }

  if (event.target.closest("[data-document-create-cancel]")) {
    adminFilters.documentCreateOpen = false;
    adminFilters.documentImportOpen = false;
    renderAdmin();
  }

  if (event.target.closest("[data-document-folder-toggle]")) {
    adminFilters.documentFolderCreateOpen = !adminFilters.documentFolderCreateOpen;
    adminFilters.documentFolderEdit = "";
    renderAdmin();
  }

  if (event.target.closest("[data-document-folder-cancel]")) {
    adminFilters.documentFolderCreateOpen = false;
    adminFilters.documentFolderEdit = "";
    renderAdmin();
  }

  if (event.target.closest("[data-document-folder-edit-current]")) {
    if (selectedDocumentFolderId && selectedDocumentFolderId !== "all") {
      adminFilters.documentFolderEdit = selectedDocumentFolderId;
      adminFilters.documentFolderCreateOpen = false;
      renderAdmin();
    }
  }

  if (event.target.closest("[data-document-folder-delete-current]") && selectedDocumentFolderId && selectedDocumentFolderId !== "all" && confirm("Supprimer ce dossier ? Les documents seront conserves sans dossier.")) {
    deleteDocumentFolder(selectedDocumentFolderId);
  }

  const documentEditToggle = event.target.closest("[data-document-edit-toggle]");
  if (documentEditToggle) {
    adminFilters.documentEdit = documentEditToggle.dataset.documentEditToggle || "";
    renderAdmin();
  }

  const documentDownloadPdf = event.target.closest("[data-document-download-pdf]");
  if (documentDownloadPdf) downloadStoredDocumentFile(documentDownloadPdf.dataset.documentDownloadPdf, "pdf");

  const documentDownloadWord = event.target.closest("[data-document-download-word]");
  if (documentDownloadWord) downloadStoredDocumentFile(documentDownloadWord.dataset.documentDownloadWord, "word");

  const documentDelete = event.target.closest("[data-document-delete]");
  if (documentDelete && isAdmin() && confirm("Supprimer ce document ?")) deleteDocument(documentDelete.dataset.documentDelete);

  const deletePublic = event.target.closest("[data-delete-public-content]");
  if (deletePublic && isAdmin() && confirm("Confirmer la suppression ?")) {
    deletePublicContent(deletePublic.dataset.deletePublicContent, deletePublic.dataset.id);
  }

  const deleteKeywordButton = event.target.closest("[data-delete-keyword]");
  if (deleteKeywordButton && isAdmin() && confirm("Confirmer le retrait ?")) {
    deleteKeyword(deleteKeywordButton.dataset.deleteKeyword, deleteKeywordButton.dataset.id);
  }

  const deleteItem = event.target.closest("[data-delete-admin-item]");
  if (deleteItem && isAdmin() && confirm("Confirmer la suppression ?")) {
    adminState[deleteItem.dataset.deleteAdminItem] = (adminState[deleteItem.dataset.deleteAdminItem] || []).filter((item) => item.id !== deleteItem.dataset.id);
    saveAdminState("suppression", deleteItem.dataset.deleteAdminItem, deleteItem.dataset.id);
  }

  const deathLetter = event.target.closest("[data-death-letter]");
  if (deathLetter) await markDeathLetterGenerated(deathLetter.dataset.deathLetter, deathLetter.dataset.relativeId);

  const deathResponse = event.target.closest("[data-death-response]");
  if (deathResponse) await markDeathResponse(deathResponse.dataset.deathResponse, deathResponse.dataset.relativeId);

  const specialLetterGenerate = event.target.closest("[data-special-letter-generate]");
  if (specialLetterGenerate) await markSpecialLetterGenerated(specialLetterGenerate.dataset.specialLetterGenerate);

  const specialLetterResponse = event.target.closest("[data-special-letter-response]");
  if (specialLetterResponse) await markSpecialLetterResponse(specialLetterResponse.dataset.specialLetterResponse);

  const deleteSpecialLetterButton = event.target.closest("[data-delete-special-letter]");
  if (deleteSpecialLetterButton && isAdmin() && confirm("Confirmer la suppression du courrier special ?")) {
    deleteSpecialLetter(deleteSpecialLetterButton.dataset.deleteSpecialLetter);
  }

  const deleteDeathRelativeButton = event.target.closest("[data-delete-death-relative]");
  if (deleteDeathRelativeButton && isAdmin() && confirm("Confirmer la suppression du destinataire ?")) {
    deleteDeathRelative(deleteDeathRelativeButton.dataset.deleteDeathRelative, deleteDeathRelativeButton.dataset.relativeId);
  }

  const deleteDeathRelationButton = event.target.closest("[data-delete-death-relation]");
  if (deleteDeathRelationButton && isAdmin() && confirm("Confirmer la suppression de cette relation ?")) {
    deleteDeathRelation(deleteDeathRelationButton.dataset.deleteDeathRelation);
  }

  const deleteDeathCaseButton = event.target.closest("[data-delete-death-case]");
  if (deleteDeathCaseButton && isAdmin() && confirm("Confirmer la suppression du dossier deces ?")) {
    deleteDeathCase(deleteDeathCaseButton.dataset.deleteDeathCase);
  }

  const deleteDeathTemplateButton = event.target.closest("[data-delete-death-template]");
  if (deleteDeathTemplateButton && isAdmin() && confirm("Confirmer la suppression du modele ?")) {
    deleteDeathTemplate(deleteDeathTemplateButton.dataset.deleteDeathTemplate);
  }
  const duplicateDeathTemplateButton = event.target.closest("[data-duplicate-death-template]");
  if (duplicateDeathTemplateButton) {
    duplicateDeathTemplate(duplicateDeathTemplateButton.dataset.duplicateDeathTemplate);
    return;
  }

  const exportDeath = event.target.closest("[data-death-export]");
  if (exportDeath) exportDeathRecipients(exportDeath.dataset.deathExport);

  const markDeath = event.target.closest("[data-contact-mark-death]");
  if (markDeath) {
    const contact = contactById(markDeath.dataset.contactMarkDeath);
    if (contact) {
      ensureDeathContactMetadata(contact, contact.deathDateApprox);
      saveAdminState("deces", "contact", contactDisplayName(contact));
    }
  }

  const deleteContactFieldButton = event.target.closest("[data-delete-contact-field]");
  if (deleteContactFieldButton && isAdmin() && confirm("Confirmer la suppression du champ ?")) {
    deleteContactField(deleteContactFieldButton.dataset.deleteContactField);
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-calendar-pdf-form]");
  if (!form) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(form);
  downloadCalendarAgendaPdf(String(data.get("from") || ""), String(data.get("to") || ""));
}, true);

document.addEventListener("submit", async (event) => {
  beginAdminMutationSnapshot();
  const form = event.target.closest?.("form") || event.target;
  if (form.id === "login-form") return handleLogin(event);
  if (form.id === "register-form") return handleRegister(event);
  if (form.id === "password-reset-form") return handlePasswordReset(event);
  if (form.id === "profile-form") return handleProfile(event);
  if (form.id === "support-form") return handleSupport(event);
  if (form.id === "newsletter-form") return handleNewsletter(event);
  const trombiCategorySave = form.closest("[data-trombi-category-save]");
  if (trombiCategorySave) { event.preventDefault(); saveTrombinoscopeCategory(trombiCategorySave); return; }
  const trombiPersonSave = form.closest("[data-trombi-person-save]");
  if (trombiPersonSave) {
    event.preventDefault();
    const button = event.submitter;
    if (button) button.disabled = true;
    try { await saveTrombinoscopePerson(trombiPersonSave); }
    catch (error) { showToast(error.message || "Enregistrement de la personne impossible."); }
    finally { if (button?.isConnected) button.disabled = false; }
    return;
  }
  const campaignSearch = form.closest("[data-campaign-search]");
  if (campaignSearch) { event.preventDefault(); campaignSearchQuery = String(new FormData(campaignSearch).get("commune") || "").trim(); renderAdmin(); return; }
  const campaignContactMap = form.closest("[data-campaign-contact-map]");
  if (campaignContactMap) { event.preventDefault(); await assignCampaignContactCommune(campaignContactMap.dataset.campaignContactMap, String(new FormData(campaignContactMap).get("commune") || "").trim()); return; }
  const mobileMenuSettings = form.closest("[data-mobile-menu-settings]");
  if (mobileMenuSettings) { event.preventDefault(); adminState.mobileAdminMenu = normalizeMobileAdminMenu(new FormData(mobileMenuSettings).getAll("items")); saveAdminState("configuration", "menu mobile", `${adminState.mobileAdminMenu.length} raccourci(s)`); showToast("Menu mobile enregistré."); return; }
  const photoAdminFilter = form.closest("[data-photo-admin-filter]");
  if (photoAdminFilter) { event.preventDefault(); const data = new FormData(photoAdminFilter); photoAdminFilters = { commune: String(data.get("commune") || "").trim(), date: String(data.get("date") || ""), page: 1 }; renderAdmin(); return; }
  const photoFolderCreate = form.closest("[data-photo-folder-create]");
  if (photoFolderCreate) { event.preventDefault(); const name = String(new FormData(photoFolderCreate).get("name") || "").trim(); if (!name) return; ensureAdminPhotoLibrary(); const now = new Date().toISOString(); const folder = { id: crypto.randomUUID(), name: name.slice(0, 120), createdAt: now, updatedAt: now }; adminState.photoLibrary.folders.unshift(folder); selectedPhotoFolderId = folder.id; publishPhotoLibrary("creation dossier", folder.name); return; }
  const photoUpdate = form.closest("[data-photo-update]");
  if (photoUpdate) { event.preventDefault(); const photo = adminState.photoLibrary.photos.find((item) => item.id === photoUpdate.dataset.photoUpdate); if (!photo) return; const data = new FormData(photoUpdate); if (!photo.eventId || !state.agenda.some((item) => item.id === photo.eventId)) { photo.commune = String(data.get("commune") || "").trim().slice(0, 120); photo.takenAt = String(data.get("takenAt") || ""); } photo.alt = String(data.get("alt") || "").trim().slice(0, 300); publishPhotoLibrary("modification photo", photo.fileName); return; }
  const categorySave = form.closest("[data-calendar-category-save]");
  if (categorySave) { event.preventDefault(); saveCalendarCategory(categorySave); return; }
  const campaignMajorSave = form.closest("[data-campaign-major-save]");
  if (campaignMajorSave) { event.preventDefault(); saveCampaignMajorEvent(campaignMajorSave); return; }
  const calendarSave = form.closest("[data-calendar-save]");
  if (calendarSave) { event.preventDefault(); saveCalendarEvent(calendarSave); return; }
  if (form.id === "hero-search-form") {
    event.preventDefault();
    const input = document.querySelector("#search-panel-input");
    if (input) input.value = document.querySelector("#global-search")?.value || "";
    setActivePanel("recherche");
    renderSearchResults();
    return;
  }

  if(form.matches("[data-saved-list-builder]")){event.preventDefault();saveSpecialContactList(form);return;}
  const filter = form.closest("[data-admin-filter]");
  if (filter) {
    event.preventDefault();
    const key = filter.dataset.adminFilter;
    const values = new FormData(filter, event.submitter);
    adminFilters[key] = Object.fromEntries(values.entries());
    if (key === "contacts") { contactMobileDetailOpen=false; adminFilters.contacts.keywordIds = normalizedContactKeywordIds(values.getAll("keywordIds")); adminFilters.contacts.keywordMode = values.get("keywordMode") === "AND" ? "AND" : "OR"; adminFilters.contacts.extraRules=contactExtraRulesFromForm(filter); adminFilters.contacts.page = 1; adminFilters.activeSavedContactSearchId = ""; clearContactSelection(); }
    renderAdmin();
    return;
  }

  const globalSearch = form.closest("[data-admin-global-search]");
  if (globalSearch) {
    event.preventDefault();
    adminFilters.global = new FormData(globalSearch).get("q") || "";
    activeAdminSection = "search";
    renderAdmin();
    return;
  }

  const mailTemplateSave = form.closest("[data-mail-template-save]");
  if (mailTemplateSave) { event.preventDefault(); saveMailTemplate(mailTemplateSave); return; }

  const taskCreate = form.closest("[data-task-create]");
  if (taskCreate) { event.preventDefault(); createTask(taskCreate); return; }
  const taskUpdate = form.closest("[data-task-update]");
  if (taskUpdate) { event.preventDefault(); updateTask(taskUpdate.dataset.taskUpdate, taskUpdate); return; }
  const teamFolderCreate = form.closest("[data-team-folder-create]");
  if (teamFolderCreate) { event.preventDefault(); createTeamFolder(teamFolderCreate); return; }
  const teamFolderUpdate = form.closest("[data-team-folder-update]");
  if (teamFolderUpdate) { event.preventDefault(); updateTeamFolder(teamFolderUpdate.dataset.teamFolderUpdate, teamFolderUpdate); return; }
  const localFolderCreate = form.closest("[data-local-folder-create]");
  if (localFolderCreate) {
    event.preventDefault(); const data = new FormData(localFolderCreate); const now = new Date().toISOString(); const folder = { id: crypto.randomUUID(), name: String(data.get("name") || "Nouveau dossier").slice(0, 120), parentId: String(data.get("parentId") || ""), createdAt: now, updatedAt: now }; adminState.localFolders.push(folder); saveAdminState("creation", "dossier classement", folder.name); return;
  }
  const templateCreate = form.closest("[data-template-create]");
  if (templateCreate) { event.preventDefault(); createTemplate(templateCreate); return; }
  const templateUpdate = form.closest("[data-template-update]");
  if (templateUpdate) { event.preventDefault(); updateTemplate(templateUpdate.dataset.templateUpdate, templateUpdate); return; }
  const permanenceCreate = form.closest("[data-permanence-create]");
  if (permanenceCreate) { event.preventDefault(); await createPermanence(permanenceCreate); return; }
  const permanenceUpdate = form.closest("[data-permanence-update]");
  if (permanenceUpdate) { event.preventDefault(); await updatePermanence(permanenceUpdate.dataset.permanenceUpdate, permanenceUpdate); return; }
  const permanenceTaskCreate = form.closest("[data-permanence-task-create]");
  if (permanenceTaskCreate) { event.preventDefault(); await createPermanenceTask(permanenceTaskCreate.dataset.permanenceTaskCreate, permanenceTaskCreate); return; }
  const permanenceDocumentAdd = form.closest("[data-permanence-document-add]");
  if (permanenceDocumentAdd) { event.preventDefault(); await addPermanenceDocument(permanenceDocumentAdd.dataset.permanenceDocumentAdd, permanenceDocumentAdd); return; }
  const permanenceCommentAdd = form.closest("[data-permanence-comment-add]");
  if (permanenceCommentAdd) { event.preventDefault(); await addPermanenceComment(permanenceCommentAdd.dataset.permanenceCommentAdd, permanenceCommentAdd); return; }
  const contactCreate = form.closest("[data-contact-create]");
  if (contactCreate) { event.preventDefault(); createContact(contactCreate); return; }
  const contactUpdate = form.closest("[data-contact-update]");
  if (contactUpdate) { event.preventDefault(); updateContact(contactUpdate.dataset.contactUpdate, contactUpdate); return; }
  const documentCreate = form.closest("[data-document-create]");
  if (documentCreate) { event.preventDefault(); await createDocument(documentCreate); return; }
  const documentUpdate = form.closest("[data-document-update]");
  if (documentUpdate) { event.preventDefault(); updateDocument(documentUpdate.dataset.documentUpdate, documentUpdate); return; }
  const documentFolderCreate = form.closest("[data-document-folder-create]");
  if (documentFolderCreate) { event.preventDefault(); createDocumentFolder(documentFolderCreate); return; }
  const documentFolderUpdate = form.closest("[data-document-folder-update]");
  if (documentFolderUpdate) { event.preventDefault(); updateDocumentFolder(documentFolderUpdate.dataset.documentFolderUpdate, documentFolderUpdate); return; }
  const contactImportMap = form.closest("[data-contact-import-map]");
  if (contactImportMap) { event.preventDefault(); await finishContactCsvImport(contactImportMap); return; }
  const contactFieldCreate = form.closest("[data-contact-field-create]");
  if (contactFieldCreate) { event.preventDefault(); createContactField(contactFieldCreate); return; }
  const contactFieldUpdate = form.closest("[data-contact-field-update]");
  if (contactFieldUpdate) { event.preventDefault(); updateContactField(contactFieldUpdate.dataset.contactFieldUpdate, contactFieldUpdate); return; }
  const deathCaseCreate = form.closest("[data-death-case-create]");
  if (deathCaseCreate) { event.preventDefault(); await createDeathCase(deathCaseCreate); return; }
  const deathCaseUpdate = form.closest("[data-death-case-update]");
  if (deathCaseUpdate) { event.preventDefault(); await updateDeathCase(deathCaseUpdate.dataset.deathCaseUpdate, deathCaseUpdate); return; }
  const relativeAdd = form.closest("[data-death-relative-add]");
  if (relativeAdd) { event.preventDefault(); addRelative(relativeAdd.dataset.deathRelativeAdd, relativeAdd); return; }
  const specialLetterCreate = form.closest("[data-special-letter-create]");
  if (specialLetterCreate) { event.preventDefault(); createSpecialLetter(specialLetterCreate); return; }
  const deathRelationCreate = form.closest("[data-death-relation-create]");
  if (deathRelationCreate) { event.preventDefault(); createDeathRelation(deathRelationCreate); return; }
  const deathRelationUpdate = form.closest("[data-death-relation-update]");
  if (deathRelationUpdate) { event.preventDefault(); updateDeathRelation(deathRelationUpdate.dataset.deathRelationUpdate, deathRelationUpdate); return; }
  const deathTemplateCreate = form.closest("[data-death-template-create]");
  if (deathTemplateCreate) { event.preventDefault(); await createDeathTemplate(deathTemplateCreate); return; }
  const deathTemplateUpdate = form.closest("[data-death-template-update]");
  if (deathTemplateUpdate) { event.preventDefault(); await updateDeathTemplate(deathTemplateUpdate.dataset.deathTemplateUpdate, deathTemplateUpdate); return; }
  const deathTemplate = form.closest("[data-death-template-form]");
  if (deathTemplate) { event.preventDefault(); adminState.deathLetterTemplate = new FormData(deathTemplate).get("template"); saveAdminState("modele courrier", "deces", "modele"); return; }
  const publicContentCreate = form.closest("[data-public-content-create]");
  if (publicContentCreate) { event.preventDefault(); const button = publicContentCreate.querySelector('[type="submit"]'); if (button?.disabled) return; if (button) button.disabled = true; try { await createPublicContent(publicContentCreate); } catch (error) { showToast(error.message || "Publication impossible."); } finally { if (button?.isConnected) button.disabled = false; } return; }
  const keywordCreate = form.closest("[data-keyword-create]");
  if (keywordCreate) { event.preventDefault(); createKeyword(keywordCreate.dataset.keywordCreate, keywordCreate); return; }
  const socialUpdate = form.closest("[data-social-update]");
  if (socialUpdate) { event.preventDefault(); updateSocialLinks(socialUpdate); return; }
  const homepageUpdate = form.closest("[data-homepage-update]");
  if (homepageUpdate) {
    event.preventDefault();
    try { await updateHomepageContent(homepageUpdate); }
    catch (error) { showToast(error.message || "Mise a jour de la photo impossible."); }
    return;
  }
  const supportUpdate = form.closest("[data-support-update]");
  if (supportUpdate) { event.preventDefault(); updateSupportRequest(supportUpdate.dataset.supportUpdate, supportUpdate); return; }
  const adminCreate = form.closest("[data-admin-create]");
  if (adminCreate) { event.preventDefault(); handleAdminCreate(adminCreate.dataset.adminCreate, adminCreate); }
});

document.addEventListener("pointerdown", (event) => {
  if (!event.ctrlKey || event.button !== 0 || !canModerate() || activeAdminSection !== "calendar" || calendarView === "month") return;
  const button = event.target.closest(".calendar-day-column [data-calendar-event]");
  if (!button) return;
  calendarCtrlDrag = {
    pointerId: event.pointerId, sourceId: button.dataset.calendarEvent,
    occurrenceKey: button.dataset.calendarOccurrence || "",
    originX: event.clientX, originY: event.clientY,
    grabOffset: Math.max(0, event.clientY - button.getBoundingClientRect().top), started: false
  };
  // Empêcher Ctrl+clic de sélectionner du texte, sans déclencher la duplication avant un déplacement.
  event.preventDefault();
});
document.addEventListener("pointermove", (event) => {
  const drag = calendarCtrlDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.started && Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) < 8) return;
  if (!drag.started) {
    drag.started = true;
    const marker = document.createElement("div");
    marker.id = "calendar-copy-drag-label";
    marker.textContent = "＋ Dupliquer · déposer dans un créneau";
    document.body.append(marker);
    document.querySelectorAll(".calendar-day-column [data-calendar-event]").forEach((button) => {
      if (button.dataset.calendarEvent === drag.sourceId) button.classList.add("calendar-drag-source");
    });
  }
  const label = document.querySelector("#calendar-copy-drag-label");
  if (label) { label.style.left = (event.clientX + 14) + "px"; label.style.top = (event.clientY + 14) + "px"; }
  document.querySelectorAll(".calendar-drop-target").forEach((node) => node.classList.remove("calendar-drop-target"));
  const destination = calendarPointDropDate(event.clientX, event.clientY, drag.grabOffset);
  const column = document.elementFromPoint(event.clientX, event.clientY)?.closest(".calendar-day-column");
  if (destination && column) column.classList.add("calendar-drop-target");
  event.preventDefault();
}, { passive: false });
document.addEventListener("pointerup", (event) => {
  const drag = calendarCtrlDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  const destination = drag.started ? calendarPointDropDate(event.clientX, event.clientY, drag.grabOffset) : "";
  calendarDragCleanup();
  if (drag.started) {
    calendarSkipClickUntil = Date.now() + 500;
    if (destination) calendarCopyEvent(drag.sourceId, drag.occurrenceKey, destination);
    else showToast("Duplication annulée : déposez l'événement dans une colonne horaire.");
    event.preventDefault();
  }
});
document.addEventListener("pointercancel", (event) => {
  if (calendarCtrlDrag?.pointerId === event.pointerId) calendarDragCleanup();
});
document.addEventListener("dragstart", (event) => {
  if (calendarCtrlDrag && event.target.closest("[data-calendar-event]")) event.preventDefault();
});

document.addEventListener("dblclick", (event) => {
  const calendarEvent = event.target.closest("[data-calendar-event]");
  if (!calendarEvent) return;
  selectedCalendarEventId = calendarEvent.dataset.calendarEvent;
  focusCalendarBodyAfterRender = true;
  renderAdmin();
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-campaign-major-search]")) {
    campaignMajorEventSearchText = event.target.value;
    const entry = campaignMajorEventRecord(selectedCampaignMajorEventId);
    const results = event.target.closest("[data-campaign-major-attendance]")?.querySelector("[data-campaign-major-results]");
    if (entry && results) results.innerHTML = renderCampaignMajorContactResults(entry, campaignMajorEventSearchText);
    return;
  }
  if (event.target.matches("[data-attendance-search]")) { searchCalendarAttendance(event.target); return; }
  if (event.target.matches("[data-calendar-color-hex]")) {
    const field = event.target;
    const raw = field.value.trim().toUpperCase();
    const picker = field.closest("form")?.querySelector("[data-calendar-color-picker]");
    field.setCustomValidity(raw && !/^#[0-9A-F]{6}$/.test(raw) ? "Utilisez le format #RRGGBB." : "");
    if (picker && /^#[0-9A-F]{6}$/.test(raw)) picker.value = raw;
    return;
  }
  if (event.target.matches("[data-calendar-color-picker]")) {
    const picker = event.target;
    const hex = picker.closest("form")?.querySelector("[data-calendar-color-hex]");
    if (hex) { hex.value = picker.value.toUpperCase(); hex.setCustomValidity(""); }
    return;
  }
  if (event.target.matches("[data-calendar-contact-query]")) { updateCalendarContactSearch(event.target.closest("[data-calendar-save]")); return; }
  if (event.target.matches("[data-trombi-contact-search]")) {
    refreshTrombinoscopeContactSearch(event.target.closest("[data-trombi-contact-linker]"));
    return;
  }
  if (event.target.id === "photo-place-filter") { photoFilterExactCommune = false; clearTimeout(photoLibrarySearchTimer); photoLibrarySearchTimer = setTimeout(() => { photoLibraryPage = 1; renderPhotoLibrary(); }, 120); return; }
  if (event.target.matches("[data-contact-picker-field-search]")) {
    const key = event.target.dataset.contactPickerFieldSearch;
    const field = event.target.dataset.contactPickerField;
    adminFilters.contactPickers = adminFilters.contactPickers || {};
    adminFilters.contactPickers[key] = { ...(adminFilters.contactPickers[key] || {}), [field]: event.target.value };
    const root = event.target.closest("[data-contact-picker]");
    clearTimeout(contactPickerSearchTimers.get(key));
    contactPickerSearchTimers.set(key, setTimeout(() => {
      refreshContactSearchPicker(key, root);
      contactPickerSearchTimers.delete(key);
    }, 120));
    return;
  }

  if (event.target.matches("[data-contact-picker-search]")) {
    const key = event.target.dataset.contactPickerSearch;
    adminFilters.contactPickers = adminFilters.contactPickers || {};
    adminFilters.contactPickers[key] = { ...(adminFilters.contactPickers[key] || {}), q: event.target.value };
    const root = event.target.closest("[data-contact-picker]");
    clearTimeout(contactPickerSearchTimers.get(key));
    contactPickerSearchTimers.set(key, setTimeout(() => {
      refreshContactSearchPicker(key, root);
      contactPickerSearchTimers.delete(key);
    }, 120));
    return;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-campaign-major-status]")) {
    changeCampaignMajorParticipation(selectedCampaignMajorEventId, event.target.dataset.campaignMajorStatus, event.target.checked ? event.target.value : "registered");
    return;
  }
  if (event.target.matches("[data-attendance-check]")) {
    const panel = event.target.closest("[data-calendar-attendance]");
    const status = event.target.checked ? event.target.value : "registered";
    if (panel) calendarAttendanceAction(panel.dataset.calendarAttendance, panel.dataset.attendanceDay, event.target.dataset.attendanceCheck, status);
    return;
  }
  if (event.target.matches("[data-calendar-recurrence]")) {
    const label = event.target.closest("form")?.querySelector(".calendar-recurrence-until");
    if (label) label.hidden = event.target.value === "none";
    return;
  }

  if (event.target.matches('[data-mail-campaign-form] select')) { mailCampaignUI.preview = null; mailCampaignUI.searchId = String(document.querySelector('[data-mail-campaign-form] select[name="searchId"]')?.value || ""); mailCampaignUI.templateId = String(document.querySelector('[data-mail-campaign-form] select[name="templateId"]')?.value || ""); mailCampaignUI.consentConfirmed = Boolean(document.querySelector('[data-mail-campaign-form] input[name="consentConfirmed"]')?.checked); renderAdmin(); return; }
  if (event.target.matches('[data-mail-campaign-form] input[name="consentConfirmed"]')) { mailCampaignUI.consentConfirmed = event.target.checked; return; }
  beginAdminMutationSnapshot();
  if (event.target.matches("[data-trombi-photo-input]")) {
    const file = event.target.files?.[0];
    const preview = event.target.closest("form")?.querySelector("[data-trombi-photo-preview]");
    if (file && preview) fileToDataUrl(file).then((src) => { preview.innerHTML = `<img src="${attr(src)}" alt="Aperçu du portrait" />`; }).catch((error) => showToast(error.message || "Aperçu de la photo impossible."));
    return;
  }
  if (event.target.matches('[data-public-content-create] select[name="target"]')) {
    const form = event.target.closest("form");
    form?.querySelector(".event-photo-picker")?.classList.toggle("is-hidden", event.target.value !== "event");
    if (form?.elements.commune) form.elements.commune.required = event.target.value === "event";
    return;
  }
  if (["photo-date-start", "photo-date-end"].includes(event.target.id)) { photoLibraryPage = 1; renderPhotoLibrary(); return; }
  if (event.target.matches("[data-photo-upload]")) { addPhotoLibraryFiles(event.target.dataset.photoUpload, [...(event.target.files || [])]).catch((error) => showToast(error.message || "Ajout des photos impossible.")); event.target.value = ""; return; }
  if (event.target.matches("[data-campaign-geojson]")) {
    importCampaignGeojson(event.target.files?.[0]).catch((error) => showToast(error.message || "Chargement du GeoJSON impossible."));
    event.target.value = "";
    return;
  }

  if (event.target.matches("[data-campaign-filter]")) {
    const id = event.target.dataset.campaignFilter;
    if (event.target.checked) selectedCampaignFilters.add(id);
    else selectedCampaignFilters.delete(id);
    renderAdmin();
    return;
  }
  if (event.target.matches("[data-campaign-gradient]")) { campaignGradientEnabled = event.target.checked; renderAdmin(); return; }
  if (event.target.matches("[data-campaign-min-enabled]")) { campaignCountFilters.minEnabled = event.target.checked; renderAdmin(); return; }
  if (event.target.matches("[data-campaign-max-enabled]")) { campaignCountFilters.maxEnabled = event.target.checked; renderAdmin(); return; }
  if (event.target.matches("[data-campaign-min]")) { campaignCountFilters.min = Math.max(0, Math.floor(Number(event.target.value) || 0)); renderAdmin(); return; }
  if (event.target.matches("[data-campaign-max]")) { campaignCountFilters.max = Math.max(0, Math.floor(Number(event.target.value) || 0)); renderAdmin(); return; }
  if (event.target.matches("[data-homepage-image-input]")) {
    const file = event.target.files?.[0];
    const preview = document.querySelector("[data-homepage-image-preview]");
    if (file && preview) fileToDataUrl(file).then((src) => { preview.src = src; }).catch((error) => showToast(error.message || "Apercu de la photo impossible."));
    return;
  }
  if (event.target.matches("[data-task-files]")) {
    addTaskFiles(event.target.dataset.taskFiles, [...(event.target.files || [])]).catch((error) => showToast(error.message || "Ajout des fichiers impossible."));
    event.target.value = "";
    return;
  }
  if (event.target.matches("[data-permanence-files]")) {
    addPermanenceFiles(event.target.dataset.permanenceFiles, [...(event.target.files || [])]).catch((error) => showToast(error.message || "Ajout des documents impossible."));
    event.target.value = "";
    return;
  }
  if (event.target.matches("[data-contact-import]")) {
    importContactsFile(event.target.files?.[0], event.target.dataset.contactImport).catch((error) => showToast(error.message || "Import contacts impossible."));
    event.target.value = "";
    return;
  }

  if (event.target.matches("[data-contact-select]")) {
    if (selectedAllFilteredContacts) {
      selectedAllFilteredContacts = false;
      selectedAllFilteredContactsSignature = "";
      selectedContactIds = new Set();
    }
    if (event.target.checked) selectedContactIds.add(event.target.dataset.contactSelect);
    else selectedContactIds.delete(event.target.dataset.contactSelect);
    renderAdmin();
    return;
  }

  if (event.target.matches("[data-admin-import-all]")) {
    importAllAdminData(event.target.files?.[0]).catch((error) => showToast(error.message || "Import administration impossible."));
    event.target.value = "";
    return;
  }

  if (event.target.matches("[data-document-replace-word]")) {
    replaceDocumentFile(event.target.dataset.documentReplaceWord, event.target.files?.[0], "word").catch((error) => showToast(error.message || "Remplacement du Word impossible."));
    event.target.value = "";
    return;
  }

  if (event.target.matches("[data-document-replace-pdf]")) {
    replaceDocumentFile(event.target.dataset.documentReplacePdf, event.target.files?.[0], "pdf").catch((error) => showToast(error.message || "Remplacement du PDF impossible."));
    event.target.value = "";
    return;
  }

  if (event.target.matches("[data-addon-toggle]")) {
    const addon = (adminState.addons || []).find((item) => item.id === event.target.dataset.addonToggle);
    if (addon && !addon.locked) {
      addon.enabled = event.target.checked;
      saveAdminState("configuration", "addon", addon.name);
    }
    return;
  }

  if (event.target.matches("[data-template-context]")) {
    adminFilters.templateContext = {
      ...(adminFilters.templateContext || {}),
      [event.target.name]: event.target.value
    };
    renderAdmin();
    return;
  }

  if (["victory-year-filter", "agenda-year-filter"].includes(event.target.id)) {
    renderVictories();
    renderAgenda();
  }
  if (event.target.id === "map-gradient-toggle") {
    mapGradientEnabled = event.target.checked;
    renderMap();
  }
  if (event.target.id === "mandate-period") renderMandateDashboard();
  if (["category-filter", "type-filter"].includes(event.target.id)) renderLegislative();
  if (event.target.matches("[data-user-role]") && isAdmin()) {
    updateUserRole(event.target.dataset.userRole, event.target.value);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "search-panel-input") renderSearchResults();
});

document.addEventListener("keydown", (event) => {
  if ((event.key === "Delete" || event.key === "Del") && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const focused = event.target;
    const editing = focused?.closest?.('input, textarea, select, [contenteditable], [role="textbox"]');
    if (!editing && activeAdminSection === "calendar" && selectedCalendarEventId && selectedCalendarEventId !== "__new") {
      const item = (adminState.calendarEvents || []).find((entry) => entry.id === selectedCalendarEventId);
      if (item && isAdmin()) {
        event.preventDefault();
        const recurring = item.recurrence && item.recurrence !== "none";
        const warning = recurring ? "Supprimer toute la série récurrente de cet événement ?" : `Supprimer l'événement « ${item.title} » ?`;
        if (confirm(warning)) deleteCalendarEvent(item.id);
      }
      return;
    }
  }
  const feature = event.target.closest?.("[data-campaign-feature]");
  if (!feature || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  feature.click();
});

document.addEventListener("pointermove", updateCampaignMapTooltip);

document.querySelector(".menu-toggle")?.addEventListener("click", (event) => {
  const nav = document.querySelector("#main-nav");
  nav?.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", nav?.classList.contains("is-open") ? "true" : "false");
});

function trackVisit() {
  const key = `emeric-salmon-visit-${new Date().toISOString().slice(0, 10)}`;
  let alreadyTracked = false;
  try { alreadyTracked = Boolean(sessionStorage.getItem(key)); } catch {}
  if (alreadyTracked) return;
  try { sessionStorage.setItem(key, "1"); } catch {}
  apiJson("state.php?action=visit", {}).then((data) => {
    if (data.state) state = { ...state, ...data.state };
    else if (Number.isFinite(Number(data.visits))) state.visits = Number(data.visits);
    if (ALLOW_LOCAL_DATA_FALLBACK) safeSetLocalStorage(STORAGE_KEY, JSON.stringify(state));
    renderCounts();
  }).catch(() => {
    if (ALLOW_LOCAL_DATA_FALLBACK) {
      state.visits = Number(state.visits || 0) + 1;
      saveState();
    }
  });
}

async function refreshSharedState() {
  if (stateSyncInProgress || document.hidden || publicStateSaveCount || adminStateSaveCount) return;
  stateSyncInProgress = true;
  try {
    const publicVersionData = await apiJson("state.php?action=version");
    const remotePublicVersion = String(publicVersionData.version || "");
    if (publicStateVersion && remotePublicVersion && remotePublicVersion !== publicStateVersion) {
      await loadPublicStateFromApi();
    } else if (remotePublicVersion) {
      publicStateVersion = remotePublicVersion;
    }

    if (adminApiLoaded && canModerate() && !adminStateSaveCount) {
      const adminVersionData = await apiJson("admin.php?action=version");
      const remoteAdminVersion = String(adminVersionData.version || "");
      if (adminStateVersion && remoteAdminVersion && remoteAdminVersion !== adminStateVersion) {
        await loadAdminStateFromApi();
      } else if (remoteAdminVersion) {
        adminStateVersion = remoteAdminVersion;
      }
    }
  } catch {
    // La prochaine verification reprendra automatiquement la synchronisation.
  } finally {
    stateSyncInProgress = false;
  }
}

function startStateSynchronization() {
  if (stateSyncTimer) return;
  stateSyncTimer = window.setInterval(refreshSharedState, 10000);
}

stateSyncChannel?.addEventListener("message", () => refreshSharedState());
window.addEventListener("focus", refreshSharedState);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshSharedState(); });

setupPasswordResetForm();
beginDatabaseLoading("public-state", "Chargement du site et de votre session...");
renderAll();
loadPublicStateFromApi().finally(() => {
  endDatabaseLoading("public-state");
  trackVisit();
  startStateSynchronization();
});
loadCommunesMap();
