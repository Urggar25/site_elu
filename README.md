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
