-- Migration : add-patient-archiving
-- Ajoute les colonnes d'archivage à la table patients

ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS archive_reason TEXT DEFAULT NULL;

-- Mettre à jour les lignes existantes pour garantir is_active = TRUE
UPDATE patients SET is_active = TRUE WHERE is_active IS NULL;
