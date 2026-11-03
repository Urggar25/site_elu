# Consignes agent

1. Toujours noter ici ce qu'il faut faire pour eviter de reproduire une erreur rencontree.
2. Si l'utilisateur demande explicitement de ne pas lancer le site en local, ne pas lancer de serveur local et ne pas faire de validation navigateur.
3. Pour les changements contacts, lire d'abord les fonctions `contactFields`, `renderContacts`, `contactImportAliases`, `deleteContactField` et les gestionnaires d'evenements associes avant de modifier.
4. Un champ contact supprime doit disparaitre partout : fiche contact, recherche dynamique, mapping d'import et donnees existantes des contacts.
5. Les actions de selection globale doivent utiliser la meme fonction de filtrage que l'affichage des resultats, pour eviter une difference entre contacts visibles et contacts selectionnes.
6. Ne pas supposer qu'un bouton existe parce que le rendu HTML semble le contenir : verifier aussi les conditions qui le masquent, par exemple `field.system`.
7. Eviter les gros diffs Git comme outil de verification dans ce depot si les fins de ligne brouillent la lecture ; preferer des recherches ciblees par fonction ou selecteur.
8. Le dossier `.agents` peut etre bloque par une regle Windows `Deny Write`; si l'ecriture y echoue, demander une correction des permissions du dossier avant d'insister.
9. Quand une action de contenu public modifie aussi `adminState.photoLibrary`, sauvegarder cette action avec une cible qui inclut `photoLibrary` dans `adminChangeKeysForTarget`; la cible d'evenement seule n'envoie pas ces changements a la base admin.
10. Garder `api/db.php` limité aux paramètres propres au déploiement et laisser la fonction `db()` dans `api/config.php`, afin que les mises à jour du code n'obligent pas à modifier le fichier privé.
11. Pour l'aperçu des PDF volumineux, éviter de placer le contenu base64 dans l'attribut `src` d'une iframe : convertir les octets en `Blob`, utiliser une URL temporaire et la révoquer au changement de vue.
12. Pour les photos d'événements, conserver un dossier commun et filtrer les photos par commune et date ; ne pas créer un dossier par événement.
13. Avant un patch couvrant plusieurs gestionnaires d'événements éloignés, relire leurs lignes exactes et appliquer des modifications ciblées pour éviter un échec de contexte.
14. Pour le HEIC, utiliser la variante CSP locale `assets/vendor/heic-to-csp.js` et conserver `worker-src 'self' blob:` dans toutes les politiques CSP ; les variantes classiques testées échouent avec la politique de sécurité du site.
15. Les fichiers statiques longs à charger sont mis en cache avec des URLs versionnées : incrémenter la version dans `index.html` et `ASSET_VERSION` après chaque modification de `app.js` ou `styles.css`.
16. Pour les créations de dossiers et les autres actions lentes, mettre à jour l'interface immédiatement puis utiliser une écriture ciblée en base ; ne pas attendre une sauvegarde volumineuse avant d'afficher le résultat.
17. Une réponse API 401 hors formulaire de connexion doit vider la session locale et ouvrir l'écran de connexion en conservant la rubrique d'administration active pour permettre une reprise directe après reconnexion.
18. Définir explicitement la durée de session PHP et la durée du cookie ensemble ; ne pas dépendre de `session.gc_maxlifetime` fourni par l'hébergeur.
19. Les branches de secours de connexion doivent rester autonomes et ne pas référencer de variables provenant d'autres formulaires ou fonctions.
20. Toute image publique configurable doit avoir un état de repli visuel intégré afin qu'un fichier absent ou une ancienne URL enregistrée n'affiche jamais une icône d'image cassée.
21. Sur mobile, conserver les actions de compte dans le menu déroulant lorsque la barre de compte desktop est masquée ; vérifier en particulier « Connexion » et « Quitter ».

22. Pour les campagnes de mails, garder les clés fournisseur et l'adresse expéditrice dans `api/db.php` privé ; ne jamais les envoyer à l'état administratif public. Construire les listes de destinataires côté serveur à partir des recherches enregistrées et exiger le consentement explicite, la déduplication et la désinscription.

23. Pour les liens contacts ↔ calendrier, enregistrer les IDs uniquement dans `calendarEvents[].contactIds`, construire le sens inverse par recherche, et nettoyer ces IDs lors des suppressions de contacts. Une navigation de contact vers calendrier doit sélectionner la date et ouvrir l'événement ; la navigation inverse doit vider les filtres empêchant de voir la fiche.

24. Dans les cases des vues jour/semaine/mois de l'agenda, ne pas réintroduire d'horaires en texte : la grille et l'infobulle les donnent déjà. Dans l'éditeur d'événement, les contacts liés affichent directement leurs téléphones et leur email depuis la fiche (sans les dupliquer en base), avec des liens `tel:` et `mailto:` protégés par échappement HTML.

25. L'ouverture des détails d'événement doit fonctionner au clic simple : le double-clic ne permet pas de retrouver spontanément les téléphones/emails. Montrer les coordonnées des contacts associés en haut de la fiche d'événement, et comparer la version du JavaScript réellement servie par l'hébergement si une capture montre d'anciens horaires malgré leur suppression dans GitHub.

26. Les récurrences de l'agenda sont des séries enregistrées une seule fois dans `calendarEvents` (`recurrence` + `recurrenceUntil`), dont les occurrences sont calculées par jour de vue et non stockées en doublon. Le clic/édition/suppression agit sur la série entière ; les derniers jours de mois et le 29 février sont ramenés au dernier jour valide. Les catégories personnalisées (`calendarEventCategories`) doivent être sauvegardées avec les événements lors de leur suppression et ne pas utiliser une couleur hors palette sans validation hexadécimale.

27. L'attribution des événements se stocke dans `calendarEvents[].assignedUserIds` (IDs d'utilisateurs de l'équipe, pas des contacts). Garder l'attribution en place lorsque les événements récurrents sont copiés ; afficher « À moi » uniquement pour l'utilisateur courant.
28. La duplication Ctrl + glisser utilise les Pointer Events dans les vues Jour/Semaine, détecte le créneau au point de dépôt et aligne sur 15 minutes. L'événement d'origine ne doit jamais être déplacé. Conserver un bouton de duplication alternatif dans l'éditeur, et recopier une occurrence de série comme événement indépendant.

29. Lors d'une copie Ctrl + glisser, la date de dépôt est déduite de l'origine du rectangle de l'événement : soustraire au pointeur la distance à laquelle on a saisi la carte, puis seulement arrondir au quart d'heure. Sans cette compensation la copie est décalée, par exemple de 15 minutes.
30. Le raccourci Suppr dans l'agenda ne doit agir que sur un événement sélectionné, avec confirmation, si aucune entrée de texte n'a le focus. Une récurrence supprimée retire toute la série. Les couleurs de catégories sont saisissables directement en #RRGGBB ; le sélecteur et le champ hexadécimal restent synchronisés et le fond utilise la couleur exacte, avec un texte contrasté.

31. Les listes de participants ne sont pas les simples `calendarEvents[].contactIds` : enregistrer chaque personne dans `calendarEvents[].attendanceByDate[AAAA-MM-JJ]` avec un statut registered/attended/absent. Les événements récurrents ont une liste et un émargement distincts par occurrence. Ne jamais assimiler un contact lié à une personne ayant annoncé vouloir venir sans inscription explicite.
32. Lors de l'export des participants, fournir un véritable classeur XLSX (Office Open XML et ZIP) avec les colonnes prénom, nom, commune, téléphone, mail et présence. Exporter les numéros comme du texte pour préserver les zéros initiaux ; échapper le XML et ne pas exécuter les valeurs comme formules.
33. Préserver les listes de participants à la modification de la fiche événement, les répercuter lors des changements d'identifiant contact, les nettoyer lors des suppressions de contacts, et ne pas recopier automatiquement l'émargement quand on duplique un événement.

34. Les mots-clés des contacts se recherchent avec sélection multiple et mode ET / OU, par égalité d'étiquette normalisée (pas par sous-chaîne). Ce filtre doit être utilisé par `contactMatchesFilters`, la sélection globale, les listes enregistrées (normalisation et aperçu) et `api/mail_campaigns.php` pour que la liste d'envoi corresponde aux mêmes critères. Ne pas fusionner plusieurs cases du formulaire avec `Object.fromEntries(FormData)` sans `getAll('keywordIds')`.
