# MyFocus

MyFocus est une application de productivite personnelle avec :

- authentification par telephone et mot de passe ;
- gestion des taches quotidiennes ;
- planning mensuel ;
- journal de souvenirs ;
- objectifs personnels ;
- historique mensuel.

## Structure

```text
frontend/          Interface HTML, CSS et JavaScript
backend/api/       API PHP
backend/config/    Configuration de la base de donnees
database.sql       Schema MySQL
vercel.json        Configuration du frontend pour Vercel
```

## Lancer en local

1. Place le projet dans le dossier web de ton serveur PHP local.
2. Importe `database.sql` dans MySQL.
3. Verifie les informations de connexion dans `backend/config/db.php`.
4. Ouvre `frontend/index.html` ou l'URL locale du projet.

## Deploiement

Le frontend peut etre deploye sur Vercel.

Sans backend public, l'application utilise automatiquement le stockage local du navigateur sur Vercel. L'inscription, la connexion, les taches, les souvenirs et les objectifs restent donc disponibles pour une demo.

Pour synchroniser les donnees entre plusieurs appareils, le backend PHP/MySQL doit etre heberge sur un serveur compatible PHP et MySQL. Ensuite, mets l'URL publique de l'API dans `frontend/js/config.js` :

```js
window.MYFOCUS_API_BASE = "https://ton-domaine.com/backend/api";
```

Voir aussi `DEPLOYMENT.md`.
