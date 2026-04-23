# Supabase — Infra MamaCare AI

## Architecture

```
Next.js (Vercel) → Edge Function `api` (Deno) → Postgres + Auth (Supabase)
```

La Edge Function `supabase/functions/api/` remplace l'ancien backend NestJS.
Elle est déployée sur le projet `jnkabdrqmdgefamahysc`.

## 🔧 Setup initial (une seule fois)

### 1. Créer un Personal Access Token Supabase

https://supabase.com/dashboard/account/tokens → **Generate new token** → copie le `sbp_...`

### 2. Lancer le script de setup

```bash
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxxx"

# Optionnel : si tu as déjà tes vraies clés API
export ANTHROPIC_API_KEY="sk-ant-..."
export WHATSAPP_ACCESS_TOKEN="..."
export WHATSAPP_PHONE_NUMBER_ID="..."
export AFRICA_TALKING_USERNAME="..."
export AFRICA_TALKING_API_KEY="..."

bash supabase/setup-secrets.sh
```

Les secrets `INTERNAL_CRON_SECRET`, `DEV_MODE_SECRET` et `PWA_URL` sont **générés automatiquement** par le script.

### 3. Vérifier

```bash
curl https://jnkabdrqmdgefamahysc.supabase.co/functions/v1/api
# → {"status":"ok","service":"mamacare-api","version":"2.0-edge"}
```

## 🔄 Redéployer la Edge Function après modification

Depuis Cursor/Claude Code, la commande de redéploiement se fait via le MCP Supabase — le plus simple est de demander à Claude : *"redéploie la fonction api"*.

Ou via CLI :

```bash
npx supabase functions deploy api --project-ref jnkabdrqmdgefamahysc --no-verify-jwt
```

## 🗓️ Cron quotidien (optionnel — rappels patient)

Une fois les secrets configurés, active le cron Supabase pour envoyer les rappels de questionnaire à 8h UTC (9h Guinée) :

```sql
-- Dans le SQL Editor Supabase
SELECT cron.schedule(
  'daily-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnkabdrqmdgefamahysc.supabase.co/functions/v1/api/notifications/send-daily-reminders',
    headers := jsonb_build_object('x-internal-secret', '<INTERNAL_CRON_SECRET>')
  );
  $$
);
```

## 📁 Structure

```
supabase/
├── README.md                      ← ce fichier
├── setup-secrets.sh               ← script one-shot de config
└── functions/
    └── api/
        ├── index.ts               ← routeur principal (27 routes)
        └── _shared/
            ├── cors.ts
            ├── supabase.ts
            ├── auth.ts            (JWT + tokens dev HMAC)
            ├── dev-mode.ts        (Web Crypto)
            ├── who-rules.ts       (règles OMS)
            ├── claude.ts          (API Anthropic)
            ├── whatsapp.ts        (WhatsApp Business)
            └── sms.ts             (Africa's Talking)
```
