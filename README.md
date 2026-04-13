# MamaCare AI

PWA de suivi de grossesse et santé néonatale pour la Guinée.  
Questionnaire quotidien OMS → alertes WhatsApp/SMS médecin → dashboard temps réel.

**Stack :** Next.js 14 · NestJS 10 · Supabase · Claude Haiku 4.5 · Tailwind CSS

---

## Setup en 5 étapes

### 1 — Cloner et installer

```bash
git clone https://github.com/Maladho1711/mamacare.git
cd mamacare
npm install
```

### 2 — Variables d'environnement

Copiez le fichier exemple à la racine :

```bash
cp .env.example .env.local
```

Puis renseignez chaque valeur dans `.env.local` :

| Variable | Description | Où trouver |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (anon) | Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (backend seulement) | Dashboard → Settings → API |
| `ANTHROPIC_API_KEY` | Clé API Claude | console.anthropic.com |
| `WHATSAPP_ACCESS_TOKEN` | Token WhatsApp Business | Meta for Developers |
| `WHATSAPP_PHONE_NUMBER_ID` | ID numéro WhatsApp | Meta for Developers |
| `AFRICA_TALKING_API_KEY` | Clé Africa's Talking | africastalking.com |
| `AFRICA_TALKING_USERNAME` | Username Africa's Talking | africastalking.com |
| `NEXT_PUBLIC_APP_URL` | URL du frontend | `http://localhost:3000` en dev |
| `NEXT_PUBLIC_API_URL` | URL de l'API NestJS | `http://localhost:3001` en dev |

### 3 — Base de données Supabase

Exécutez les blocs SQL dans l'ordre dans **Supabase → SQL Editor** :

1. Extensions et types énumérés
2. Tables (`profiles`, `patients`, `questionnaire_responses`, `alerts`, `notification_logs`)
3. Row Level Security (RLS) — politiques par rôle
4. Fonctions et triggers (`update_updated_at`, `handle_new_user`)
5. Index de performance
6. Données de test (optionnel)

> Les scripts SQL complets sont dans `docs/DATABASE.md`.

### 4 — Lancer en développement

```bash
npm run dev          # Frontend (3000) + Backend (3001) en parallèle
npm run dev:web      # Frontend seul
npm run dev:api      # Backend seul
```

### 5 — Tests et build

```bash
npm run test         # Tests NestJS (42 tests OMS)
npm run build        # Build production complet
```

---

## Architecture

```
mamacare/
├── apps/
│   ├── web/          Next.js 14 PWA  →  Vercel
│   └── api/          NestJS 10       →  Render
├── packages/
│   └── shared-types/ Types TypeScript partagés
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── DATABASE.md
├── vercel.json       Config déploiement frontend
└── apps/api/
    └── render.yaml   Config déploiement backend
```

### Flux questionnaire quotidien

```
Patiente remplit → NestJS évalue règles OMS (statiques)
  → si ROUGE/ORANGE : INSERT alerte Supabase
                    → WhatsApp médecin
                    → SMS fallback (5 min)
  → Claude Haiku génère l'explication
  → Résultat affiché à la patiente
  → Dashboard médecin mis à jour (Supabase Realtime)
```

> **Règle de sécurité critique :** Claude API ne décide JAMAIS du niveau d'alerte.
> Les règles sont statiques dans `apps/api/src/modules/questionnaire/who-rules.service.ts`.

---

## Déploiement

### Frontend → Vercel

```bash
npm i -g vercel
vercel --prod
```

Ajoutez les variables d'environnement dans **Vercel Dashboard → Settings → Environment Variables**.

### Backend → Render

1. Connectez le repo GitHub dans [render.com](https://render.com)
2. Sélectionnez le fichier `apps/api/render.yaml`
3. Ajoutez les variables secrètes dans **Environment → Secret Files**

---

## Commandes utiles

```bash
npm run dev          # Dev complet (frontend + backend)
npm run dev:web      # Frontend seul — port 3000
npm run dev:api      # Backend seul — port 3001
npm run build        # Build production (workspaces)
npm run test         # Tests NestJS (42 tests règles OMS)
npm run gen:types    # Générer types TypeScript depuis Supabase
```

---

## Niveaux d'alerte (règles OMS)

| Niveau | Déclencheurs | Action |
|--------|-------------|--------|
| 🟢 **Vert** | Aucun signe de danger | Message encourageant |
| 🟠 **Orange** | Fièvre, gonflement, diminution mouvements | Notification push médecin |
| 🔴 **Rouge** | Saignements, prééclampsie, sepsis, détresse | WhatsApp + SMS médecin immédiat |

---

## Auteur

**Mamadou Maladho Barry** — [ImprOOve](https://github.com/Maladho1711)  
Projet pilote · Labé, Guinée · MVP 2026
