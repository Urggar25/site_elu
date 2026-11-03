# Emeric Salmon Website

Site statique pret a publier avec :

- frise des victoires du groupe RN ;
- agenda classe par annee puis par mois ;
- carte interactive des communes de Haute-Saone avec epingles sur les communes liees a des posts d'agenda ;
- travail legislatif filtre par categorie et type de contenu ;
- recherche globale sur les contenus, pages detail partageables et boutons de partage ;
- espace parlementaire enrichi avec votes expliques, bibliotheque video et metriques par type de contenu ;
- tableau interactif "mandat en chiffres" par mois, trimestre, annee ou depuis le debut ;
- inscription aux actualites avec preferences ;
- inscription aux actualites possible sans compte, avec persistance serveur si l'API PHP/MySQL est active ;
- support et propositions pour les utilisateurs connectes, avec suivi dans le profil ;
- login/register active sur site statique, verification email, reinitialisation de mot de passe via lien et outils de confidentialite du profil ;
- metadonnees SEO, Open Graph et donnees structurees dynamiques ;
- administration locale avec statistiques, mots cles, creation d'actualites, traitement des demandes, gestion utilisateurs et export des donnees ;
- durcissement de publication : en-tetes de securite, protection CSP, nettoyage des contenus affiches, blocage de l'administration sur un domaine public statique.

Les identifiants initiaux du compte fondateur se règlent dans `api/db.php` lors de l'installation.

## Lancer en local

Ouvrir directement `index.html` dans un navigateur suffit.

Option avec petit serveur local :

```powershell
npm run start
```

Le site sera disponible sur `http://localhost:4173`.

## Mise en ligne statique

Importer ces fichiers a la racine d'un hebergement web classique, Netlify, Vercel, GitHub Pages ou tout serveur qui sert des fichiers HTML/CSS/JS :

- `index.html`
- `styles.css`
- `app.js`
- `assets/`
- `api/` si l'hebergement accepte PHP/MySQL
- `_headers` si l'hebergeur le prend en charge
- `.htaccess` sur Apache

Le site public fonctionne avec des chemins relatifs, donc il n'est pas limite a `localhost`.

## Activation MySQL

1. Creer la base MySQL chez l'hebergeur.
2. Copier `api/db.example.php` vers `api/db.php`, puis renseigner les paramètres MySQL, le compte fondateur initial et les paramètres propres au site.
3. Envoyer le dossier `api/` sur le site, avec son `db.php` privé.
4. Ouvrir une seule fois `https://votre-domaine/api/install.php`.
5. Supprimer ensuite `api/install.php` du serveur public.

Quand l'API PHP est disponible, le site synchronise les comptes, profils, contenus admin et demandes de support avec MySQL. Si l'API est indisponible, le site retombe sur le stockage local du navigateur.

La newsletter, la verification email et la reinitialisation de mot de passe utilisent `api/newsletter.php`. Le serveur tente d'envoyer les emails via `mail()`. Si l'hebergeur ne permet pas l'envoi, l'API renvoie un lien de verification ou de reinitialisation affichable dans l'interface pour finaliser l'action.

Lors des mises à jour suivantes, conserver le `api/db.php` déjà présent sur le serveur et remplacer les autres fichiers. Ce fichier est exclu de Git et son accès HTTP est bloqué par `api/.htaccess` sur Apache. Sur un autre serveur web, bloquer également l'accès HTTP à `db.php`.

Ne jamais mettre les identifiants MySQL dans `app.js` ni publier `api/db.php` dans un dépôt ou une archive publique. Le titre de l'onglet du navigateur se modifie depuis **Site web → Page d'accueil → Nom de l'onglet du navigateur**.

## Donnees cartographiques

Le fichier `assets/communes-70-haute-saone.geojson` vient du projet public `gregoiredavid/france-geojson`.


## Modèles de mails et campagnes vers les recherches de contacts

Dans **Administration → Permanence → Modèles de mails**, créer des modèles avec un nom,
un objet et un corps en texte brut. Les variables acceptées sont `{{prenom}}`, `{{nom}}` et `{{commune}}`.
Ces modèles sont stockés dans l'état administratif MySQL (`mailTemplates`).

Dans **Administration → Permanence → Envoi de mails**, choisir une recherche avancée
de contacts déjà sauvegardée et un modèle. La prévisualisation recalcule le nombre de
destinataires depuis la base serveur. Après confirmation explicite, une campagne est créée,
puis envoyée individuellement par lots de cinq via l'API transactionnelle de Brevo.
La progression et les échecs sont consultables dans l'historique. Si la page est fermée,
l'envoi peut être repris manuellement. Le statut « envoyé » signifie **accepté par le prestataire**,
pas nécessairement livré dans la boîte de réception.

### Relier une adresse expéditrice

Créer un compte Brevo, vérifier l'adresse ou le domaine expéditeur dans Brevo et
activer l'API transactionnelle. **Sur l'hébergement, uniquement dans `api/db.php`
(non versionné), après les paramètres existants**, ajouter :

```php
define('BREVO_API_KEY', 'cle-api-brevo-privee');
define('CAMPAIGN_FROM_EMAIL', 'permanence@exemple.fr');
define('CAMPAIGN_FROM_NAME', 'Permanence parlementaire');
```

Ces valeurs ne doivent **jamais** être ajoutées à GitHub ou à `app.js`.
Le serveur PHP doit disposer de cURL et d'un accès HTTPS sortant à Brevo.
L'interface indique si un expéditeur est configuré, mais le prestataire peut
rejeter l'envoi si l'adresse n'est pas vérifiée ou si le compte n'est pas activé.

### Consentement, désinscription et limites

Les envois ne sont possibles que pour les contacts ayant une adresse valide et
un statut **« Statut de l'email pour les campagnes »** renseigné explicitement
avec une valeur autorisée (`oui`, `inscrit`, `opt-in`, `consentement`, etc.).
Ce champ doit correspondre à un consentement réellement obtenu et documenté :
il ne suffit pas de l'activer arbitrairement. Le système exclut les destinataires
désinscrits et les adresses en doublon. Chaque message comporte un lien personnel
de désinscription, qui alimente la table `mail_suppressions`. Une confirmation
est exigée avant toute préparation d'envoi. Maximum 250 adresses admissibles
par campagne. Les campagnes sont historisées en MySQL dans `mail_campaigns`
et `mail_campaign_recipients` ; les tables sont créées automatiquement.

Ce système ne remplace pas une politique de protection des données, de durée
de conservation, ni le suivi des preuves de consentement. Les messages marqués
« processing » lors d'une interruption serveur ne sont pas automatiquement
réémis, afin d'éviter les doublons : contrôler leur statut chez le prestataire.
