-- Migration : add-push-subscriptions
-- Crée la table de subscriptions push PWA et ajoute notification_time sur patients

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Heure de notification préférée pour chaque patiente (format HH:MM)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notification_time VARCHAR(5) DEFAULT '08:00';
