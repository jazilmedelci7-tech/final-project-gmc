# Site vétérinaire : front et back séparés

Application web pour un cabinet vétérinaire : site public (services, prise de rendez-vous) et espace sécurisé du vétérinaire (fiches des animaux, radios, rappels de vaccins, statistiques, sauvegardes, notifications Telegram).

## Architecture

```
frontend/   React + TypeScript + Vite + Tailwind   → site statique
backend/    Node.js + Express 5 + Mongoose          → API REST (/api/...)
            MongoDB (Atlas)                         → base de données
```

- Le **frontend** n'a aucun secret : il appelle l'API avec des adresses relatives `/api/...`.
- En développement, Vite redirige `/api` vers le back (voir `frontend/vite.config.ts`).
- En production, le front est un site statique et une règle de réécriture envoie `/api/*` vers le back : le navigateur ne voit qu'une seule adresse, donc les cookies de session (httpOnly, JWT) fonctionnent sans CORS.
- Les radios sont stockées dans MongoDB (compressées dans le navigateur avant l'envoi).
- Plusieurs clients : `frontend/clients/<nom>/` (réglages + logos), choisi par la variable `CLIENT`. Voir `VENDRE.md`.

## Lancer en local

Prérequis : Node 20+ et MongoDB (local ou Atlas).

```bash
# 1. Back
cd backend
cp .env.example .env        # puis adapter MONGODB_URI si besoin
npm install
npm run dev                 # http://localhost:4000

# 2. Front (autre terminal)
cd frontend
cp .env.example .env        # CLIENT=modele
npm install
npm run dev                 # http://localhost:5173
```

Ouvre http://localhost:5173/admin : à la première visite, le vétérinaire crée son mot de passe.

## Mise en ligne (Render + MongoDB Atlas)

Détail dans `VENDRE.md` : un *Web Service* pour `backend`, un *Static Site* pour `frontend` avec la réécriture `/api/*` vers le back.

## Sécurité et données

Mot de passe haché (bcrypt), session par cookie httpOnly, limitation des tentatives, validation de toutes les entrées (zod), vérification du type réel des images, sauvegardes (fichier + envoi hebdomadaire sur Telegram).
