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
