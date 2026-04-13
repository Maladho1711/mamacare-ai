# MamaCare AI — Architecture Technique

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        UTILISATEURS                          │
│                                                              │
│   [Patiente - PWA Mobile]    [Médecin - PWA Dashboard]      │
└──────────────┬──────────────────────────┬───────────────────┘
               │ HTTPS                    │ HTTPS
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js 14 PWA)                   │
│                                                              │
│  /app/(auth)/          → Pages login OTP                     │
│  /app/(patient)/       → Questionnaire, historique           │
│  /app/(doctor)/        → Dashboard, alertes, patientes       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS REST API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDER (NestJS API)                        │
│                                                              │
│  auth.module      → OTP, JWT Guards                         │
│  patients.module  → CRUD patientes                          │
│  questionnaire.module → Règles OMS + analyse IA             │
│  alerts.module    → WhatsApp + SMS fallback                  │
│  ai.module        → Wrapper Claude API                       │
└───────┬──────────────┬───────────────┬─────────────────────┘
        │              │               │
        ▼              ▼               ▼
┌──────────────┐ ┌──────────┐ ┌──────────────────────┐
│   SUPABASE   │ │ CLAUDE   │ │  NOTIFICATIONS       │
│              │ │ API      │ │                      │
│ PostgreSQL   │ │ Haiku    │ │ WhatsApp Business    │
│ Auth (OTP)   │ │ 4.5      │ │ Africa's Talking SMS │
│ Realtime     │ │          │ │                      │
└──────────────┘ └──────────┘ └──────────────────────┘
```

---

## Architecture du monorepo

### Pourquoi un monorepo ?
- Types TypeScript partagés entre frontend et backend (zéro duplication)
- Un seul `git clone`, une seule configuration
- Déploiement indépendant (Vercel pour web, Render pour api)

### Structure complète

```
mamacare/
├── CLAUDE.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── README.md
├── .env.example
├── .env                        ← Jamais commité (dans .gitignore)
├── .gitignore
├── package.json                ← Root workspaces
├── tsconfig.base.json          ← Config TypeScript partagée
│
├── apps/
│   ├── web/                    ← Next.js 14 PWA
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        ← Redirect vers login ou dashboard
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx    ← Saisie numéro téléphone
│   │   │   │   └── verify/
│   │   │   │       └── page.tsx    ← Saisie OTP
│   │   │   ├── (patient)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── questionnaire/
│   │   │   │   │   └── page.tsx    ← Questionnaire du jour
│   │   │   │   ├── result/
│   │   │   │   │   └── page.tsx    ← Résultat vert/orange/rouge
│   │   │   │   └── history/
│   │   │   │       └── page.tsx    ← Historique questionnaires
│   │   │   └── (doctor)/
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx    ← Vue d'ensemble patientes
│   │   │       ├── patients/
│   │   │       │   ├── page.tsx    ← Liste patientes
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx ← Créer patiente
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx ← Fiche patiente
│   │   │       └── alerts/
│   │   │           └── page.tsx    ← Historique alertes
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx       ← Vert/Orange/Rouge
│   │   │   │   ├── Input.tsx
│   │   │   │   └── Spinner.tsx
│   │   │   ├── patient/
│   │   │   │   ├── QuestionnaireForm.tsx
│   │   │   │   ├── AlertResult.tsx
│   │   │   │   └── HistoryCalendar.tsx
│   │   │   └── doctor/
│   │   │       ├── PatientTable.tsx
│   │   │       ├── PatientCard.tsx
│   │   │       ├── AlertBadge.tsx
│   │   │       └── RiskChart.tsx
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts       ← Client browser
│   │   │   │   └── server.ts       ← Client server-side
│   │   │   ├── api/
│   │   │   │   └── client.ts       ← Appels NestJS API
│   │   │   └── utils/
│   │   │       ├── format-date.ts
│   │   │       └── pregnancy-week.ts
│   │   ├── hooks/
│   │   │   ├── usePatient.ts
│   │   │   ├── useAlerts.ts
│   │   │   └── useQuestionnaire.ts
│   │   ├── public/
│   │   │   ├── manifest.json       ← PWA manifest
│   │   │   ├── icons/
│   │   │   │   ├── icon-192.png
│   │   │   │   └── icon-512.png
│   │   │   └── sw.js               ← Service Worker
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                        ← NestJS Backend
│       ├── src/
│       │   ├── main.ts             ← Bootstrap + CORS
│       │   ├── app.module.ts       ← Module racine
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── jwt.guard.ts
│       │   │   │   ├── roles.guard.ts
│       │   │   │   └── dto/
│       │   │   │       └── verify-otp.dto.ts
│       │   │   ├── patients/
│       │   │   │   ├── patients.module.ts
│       │   │   │   ├── patients.controller.ts
│       │   │   │   ├── patients.service.ts
│       │   │   │   └── dto/
│       │   │   │       ├── create-patient.dto.ts
│       │   │   │       └── update-patient.dto.ts
│       │   │   ├── questionnaire/
│       │   │   │   ├── questionnaire.module.ts
│       │   │   │   ├── questionnaire.controller.ts
│       │   │   │   ├── questionnaire.service.ts
│       │   │   │   ├── who-rules.service.ts    ← Règles OMS statiques
│       │   │   │   └── dto/
│       │   │   │       └── submit-questionnaire.dto.ts
│       │   │   ├── alerts/
│       │   │   │   ├── alerts.module.ts
│       │   │   │   ├── alerts.controller.ts
│       │   │   │   ├── alerts.service.ts
│       │   │   │   ├── whatsapp.service.ts
│       │   │   │   └── sms.service.ts
│       │   │   └── ai/
│       │   │       ├── ai.module.ts
│       │   │       ├── ai.service.ts           ← Wrapper Claude API
│       │   │       └── prompts/
│       │   │           └── medical.prompt.ts   ← Prompt système OMS
│       │   └── shared/
│       │       ├── dto/
│       │       │   └── pagination.dto.ts
│       │       ├── guards/
│       │       │   └── index.ts
│       │       ├── pipes/
│       │       │   └── validation.pipe.ts
│       │       └── decorators/
│       │           └── roles.decorator.ts
│       ├── test/
│       │   └── who-rules.spec.ts   ← Tests critiques règles médicales
│       ├── nest-cli.json
│       └── tsconfig.json
│
└── packages/
    └── shared-types/
        ├── package.json
        └── src/
            ├── index.ts
            ├── enums.ts            ← AlertLevel, PatientStatus, UserRole
            ├── patient.types.ts
            ├── questionnaire.types.ts
            └── alert.types.ts
```

---

## Types partagés — `packages/shared-types`

```typescript
// enums.ts
export enum UserRole {
  DOCTOR = 'doctor',
  PATIENT = 'patient'
}

export enum PatientStatus {
  PREGNANT = 'pregnant',
  POSTNATAL = 'postnatal',
  COMPLETED = 'completed'
}

export enum AlertLevel {
  GREEN = 'green',
  ORANGE = 'orange',
  RED = 'red'
}

export enum QuestionnaireType {
  PREGNANCY = 'pregnancy',
  POSTNATAL = 'postnatal'
}

// patient.types.ts
export interface IPatient {
  id: string;
  userId: string;
  doctorId: string;
  fullName: string;
  phone: string;
  pregnancyStart: Date;
  expectedTerm: Date;
  status: PatientStatus;
  riskLevel: AlertLevel;
  createdAt: Date;
}

// questionnaire.types.ts
export interface IQuestionnaireResponse {
  id: string;
  patientId: string;
  responses: Record<string, string>;
  aiAnalysis: string;
  alertLevel: AlertLevel;
  submittedAt: Date;
}

export interface IWhoRuleResult {
  alertLevel: AlertLevel;
  triggeredRules: string[];
}

// alert.types.ts
export interface IAlert {
  id: string;
  patientId: string;
  responseId: string;
  alertType: AlertLevel;
  message: string;
  whatsappSent: boolean;
  smsSent: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}
```

---

## Flux de données — Soumission questionnaire

```
1. POST /questionnaire/submit
        │
        ▼
2. SubmitQuestionnaireDto (validation class-validator)
        │
        ▼
3. WhoRulesService.evaluate(responses)
   → Règles statiques OMS
   → Retourne : { alertLevel: RED|ORANGE|GREEN, triggeredRules: [] }
        │
        ├─── Si RED ou ORANGE ──►  4a. AlertsService.sendAlert()
        │                                │
        │                                ├─► WhatsappService.send()
        │                                └─► (fallback) SmsService.send() après 5min
        │
        ▼
5. AiService.generateExplanation(responses, alertLevel)
   → Claude API avec prompt médical strict
   → Retourne message explicatif en français (2-3 phrases)
        │
        ▼
6. Supabase : INSERT questionnaire_responses
        │
        ▼
7. Supabase : UPDATE patients SET risk_level = alertLevel
        │
        ▼
8. Supabase Realtime → Dashboard médecin mis à jour
        │
        ▼
9. Réponse client : { alertLevel, message, explanation }
```

---

## Sécurité

### Authentification
- Supabase Auth gère les sessions JWT
- Tokens stockés en httpOnly cookies (Next.js)
- Refresh automatique via Supabase client

### Autorisation (NestJS Guards)
```
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
async createPatient() { ... }

@UseGuards(JwtGuard)
@Roles(UserRole.PATIENT)
async submitQuestionnaire() { ... }
```

### Row Level Security (Supabase)
- Les patientes voient uniquement leurs propres données
- Les médecins voient uniquement leurs patientes assignées
- Les admins voient tout (V2)

### Variables sensibles
- Jamais de clés API dans le code source
- `.env` dans `.gitignore`
- Variables d'environnement Render/Vercel pour la production

---

## PWA — Configuration

### manifest.json
```json
{
  "name": "MamaCare AI",
  "short_name": "MamaCare",
  "description": "Suivi de grossesse intelligent",
  "theme_color": "#E91E8C",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (stratégie cache)
- Pages statiques : Cache First
- Appels API : Network First avec fallback cache
- Questionnaire non soumis : sauvegardé en IndexedDB, synchronisé au retour réseau

---

## Performance — Contraintes réseau Guinée

- Images compressées WebP, max 100kb par image
- Pas de vidéos dans l'app
- Lazy loading sur tous les composants lourds
- Pas de polices Google Fonts (chargement local uniquement)
- Bundle JS < 200kb pour la page questionnaire (page la plus utilisée)
- Timeout API : 10 secondes (réseau instable)
