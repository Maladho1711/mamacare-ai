#!/usr/bin/env bash
# ─── Setup Supabase Edge Function Secrets ─────────────────────────────────────
#
# Un seul script pour configurer toute la prod.
#
# PRÉREQUIS :
#   1. Avoir un Personal Access Token Supabase
#      → https://supabase.com/dashboard/account/tokens
#   2. L'exporter avant d'exécuter ce script :
#      export SUPABASE_ACCESS_TOKEN="sbp_xxx..."
#
# USAGE :
#   cd supabase && bash setup-secrets.sh
#
# ⚠️ Les secrets WhatsApp / Africa's Talking / Anthropic sont à remplir
#    manuellement dans la section "SECRETS_À_REMPLIR" ci-dessous avant de lancer.

set -euo pipefail

PROJECT_REF="jnkabdrqmdgefamahysc"

# ─── Vérifier le token ────────────────────────────────────────────────────────
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN manquant."
  echo "   Récupère ton token ici : https://supabase.com/dashboard/account/tokens"
  echo "   Puis : export SUPABASE_ACCESS_TOKEN=\"sbp_xxx...\""
  exit 1
fi

# ─── Secrets générés automatiquement (sécurisés) ──────────────────────────────
# Ces secrets ont été générés pour toi le 23 avril 2026.
INTERNAL_CRON_SECRET="0a3aabb70de6bc4ddaf12df2966c1265a251364a1c28cf1f4f5d4cc553980fe5"
DEV_MODE_SECRET="145811dcd676948f1995a67e083b26bdc3a4ccca59d219b56f4c8a746d9448f9"
PWA_URL="https://mamacare-ai.vercel.app"

# ─── SECRETS À REMPLIR (API tiers) ────────────────────────────────────────────
# Remplace les "REMPLIR_..." par tes vraies clés avant de lancer.
# Si tu n'as pas encore une clé, laisse vide — la fonctionnalité sera juste
# désactivée (fallback message en dur) sans casser l'app.

ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-REMPLIR_ANTHROPIC_API_KEY}"
WHATSAPP_ACCESS_TOKEN="${WHATSAPP_ACCESS_TOKEN:-REMPLIR_WHATSAPP_TOKEN}"
WHATSAPP_PHONE_NUMBER_ID="${WHATSAPP_PHONE_NUMBER_ID:-REMPLIR_WHATSAPP_PHONE_ID}"
AFRICA_TALKING_USERNAME="${AFRICA_TALKING_USERNAME:-REMPLIR_AT_USERNAME}"
AFRICA_TALKING_API_KEY="${AFRICA_TALKING_API_KEY:-REMPLIR_AT_API_KEY}"

# ─── Pousser les secrets via supabase CLI ─────────────────────────────────────
echo "🚀 Poussée des secrets vers le projet $PROJECT_REF..."

npx --yes supabase@latest secrets set \
  --project-ref "$PROJECT_REF" \
  INTERNAL_CRON_SECRET="$INTERNAL_CRON_SECRET" \
  DEV_MODE_SECRET="$DEV_MODE_SECRET" \
  PWA_URL="$PWA_URL" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  WHATSAPP_ACCESS_TOKEN="$WHATSAPP_ACCESS_TOKEN" \
  WHATSAPP_PHONE_NUMBER_ID="$WHATSAPP_PHONE_NUMBER_ID" \
  AFRICA_TALKING_USERNAME="$AFRICA_TALKING_USERNAME" \
  AFRICA_TALKING_API_KEY="$AFRICA_TALKING_API_KEY"

echo ""
echo "✅ Secrets configurés. La Edge Function utilisera ces valeurs au prochain appel."
echo ""
echo "🧪 Test :"
echo "   curl https://${PROJECT_REF}.supabase.co/functions/v1/api"
