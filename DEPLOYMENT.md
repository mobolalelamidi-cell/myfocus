# Deploiement MyFocus

## Frontend sur Vercel

1. Cree un nouveau projet sur Vercel.
2. Importe ce dossier `myfocus`.
3. Garde la configuration de `vercel.json`.
4. Deploie le projet.

Vercel servira le dossier `frontend` comme site statique.

Si `frontend/js/config.js` garde `window.MYFOCUS_API_BASE = "";`, l'application utilise le stockage local du navigateur. L'inscription, la connexion, les taches, les souvenirs et les objectifs fonctionnent alors sur Vercel sans backend public, mais les donnees restent sur le navigateur de l'utilisateur.

## Backend PHP et MySQL

Pour synchroniser les donnees entre plusieurs appareils, le backend PHP/MySQL doit etre heberge sur un serveur qui supporte PHP et MySQL.
Apres l'hebergement du backend, modifie `frontend/js/config.js` :

```js
window.MYFOCUS_API_BASE = "https://ton-domaine.com/backend/api";
```

## Base de donnees

Importe `database.sql` dans ta base MySQL.

Le fichier `backend/config/db.php` accepte ces variables d'environnement si ton hebergeur les propose :

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`

En local, il continue d'utiliser `localhost`, la base `myfocus`, l'utilisateur `root` et un mot de passe vide.
