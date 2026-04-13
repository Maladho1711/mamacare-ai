# MamaCare AI — Instructions pour Claude Code

## Contexte du projet
MamaCare AI est une PWA de santé maternelle et néonatale pour la Guinée (Afrique subsaharienne).
Elle permet aux femmes enceintes de remplir un questionnaire quotidien de symptômes et recevoir
des alertes personnalisées, et aux médecins de surveiller leurs patientes via un dashboard en temps réel.

**Développeur :** Mamadou Maladho Barry — ImprOOve
**Stack :** Next.js 14 + NestJS + Supabase + Claude API (Haiku 4.5)
**Repo :** Monorepo (frontend + backend dans le même repo)

---

## Documentation du projet — LIRE AVANT DE CODER

Avant de commencer une tâche, consulte toujours le document pertinent :

| Besoin | Document à lire |
|--------|----------------|
| Fonctionnalités, user stories, questionnaires OMS | `docs/PRD.md` |
| Structure dossiers, flux de données, types TS | `docs/ARCHITECTURE.md` |
| Tables Supabase, SQL, RLS, Realtime | `docs/DATABASE.md` |

---

## Structure du monorepo

```
mamacare/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── DATABASE.md
├── .env.example
├── package.json
├── apps/
│   ├── web/                   ← Next.js 14 PWA
│   │   ├── app/
│   │   │   ├── (auth)/        ← Login OTP
│   │   │   ├── (patient)/     ← Questionnaire, historique, résultat
│   │   │   └── (doctor)/      ← Dashboard, patientes, alertes
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── patient/
│   │   │   └── doctor/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   └── api/
│   │   └── public/
│   │       └── manifest.json
│   └── api/                   ← NestJS Backend
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           └── modules/
│               ├── auth/
│               ├── patients/
│               ├── questionnaire/
│               ├── alerts/
│               └── ai/
└── packages/
    └── shared-types/
        └── src/
            ├── enums.ts
            ├── patient.types.ts
            ├── questionnaire.types.ts
            └── alert.types.ts
```

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | Next.js App Router (PWA) | 14.x |
| Backend | NestJS | 10.x |
| Langage | TypeScript strict | 5.x |
| Base de données | Supabase (PostgreSQL) | latest |
| Agent IA | Claude API — Haiku 4.5 | latest |
| Alertes WhatsApp | WhatsApp Business API | Cloud API |
| Alertes SMS | Africa's Talking | latest |
| Styles | Tailwind CSS | 3.x |
| Hébergement Front | Vercel | - |
| Hébergement Back | Render | - |

---

## Conventions de code — TOUJOURS respecter

### TypeScript
- Strict mode partout (`"strict": true`)
- Pas de `any` — utiliser les types de `packages/shared-types`
- Interfaces préfixées `I` : `IPatient`, `IAlert`
- DTOs suffixés `Dto` : `CreatePatientDto`, `SubmitQuestionnaireDto`
- Enums en MAJUSCULES : `AlertLevel.RED`, `PatientStatus.PREGNANT`

### NestJS
- Un module par fonctionnalité (patients, questionnaire, alerts, ai)
- Controllers : routing + validation uniquement
- Services : toute la logique métier
- Guards pour l'authentification
- DTOs avec class-validator pour toute validation

### Next.js
- App Router uniquement (pas de Pages Router)
- Server Components par défaut
- `'use client'` seulement si nécessaire
- Fetching côté serveur quand possible

### Nommage fichiers
- Composants React : `PascalCase.tsx`
- Utilitaires : `kebab-case.ts`
- Modules NestJS : `kebab-case.module.ts`

---

## REGLES MEDICALES — NE JAMAIS VIOLER

> Ces règles protègent des vies humaines.

### Règle 1 — Décisions STATIQUES
Les niveaux d'alerte sont codés en dur dans `who-rules.service.ts`.
Claude API ne décide JAMAIS du niveau. Il génère uniquement le message explicatif.

### Règle 2 — Ordre alerte rouge
1. Enregistrer dans Supabase
2. WhatsApp médecin
3. SMS fallback si WhatsApp échoue après 5 min
4. PUIS appeler Claude API

### Règle 3 — Prompt médical strict
```
Tu es un assistant de santé maternelle. Explique simplement pourquoi
les symptômes méritent attention. Ne pose PAS de diagnostic.
Ne propose PAS de traitement. Dirige TOUJOURS vers le médecin.
Réponds en français, 2-3 phrases maximum.
```

### Règle 4 — Audit trail
Chaque réponse, alerte et action → enregistrée dans Supabase avec timestamp.
Ne jamais supprimer, uniquement archiver.

---

## Niveaux d'alerte

| Niveau | Valeur | Action |
|--------|--------|--------|
| VERT | `green` | Message encourageant |
| ORANGE | `orange` | Notification push médecin |
| ROUGE | `red` | WhatsApp + SMS médecin immédiat |

**ROUGE :** saignements vaginaux, maux tête + troubles visuels (prééclampsie),
douleurs abdominales fortes, absence mouvements fœtaux, bébé chaud (sepsis),
bébé en détresse respiratoire, jaunisse J1-J3.

**ORANGE :** fièvre, gonflement important, mouvements diminués,
difficultés respiratoires légères, dépression post-partum suspectée.

---

## Variables d'environnement

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
AFRICA_TALKING_API_KEY=
AFRICA_TALKING_USERNAME=
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:3001
```

---

## Commandes

```bash
npm install        # Installation
npm run dev        # Frontend + Backend
npm run dev:web    # Frontend seul (port 3000)
npm run dev:api    # Backend seul (port 3001)
npm run build      # Build production
npm run test       # Tests
npm run gen:types  # Générer types Supabase
```
