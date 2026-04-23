-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : rendez-vous (CPN, vaccinations, consultations)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE appointment_type AS ENUM (
  'cpn',            -- Consultation prénatale
  'vaccination',    -- Vaccin (BCG, VAT, Polio, etc.)
  'ultrasound',     -- Échographie
  'consultation',   -- Consultation générale
  'postnatal'       -- Suivi post-natal
);

CREATE TYPE appointment_status AS ENUM (
  'scheduled',      -- Prévu
  'completed',      -- Honoré
  'missed',         -- Manqué
  'cancelled'       -- Annulé
);

CREATE TABLE IF NOT EXISTS appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type             appointment_type NOT NULL,
  title            text NOT NULL,
  description      text,
  scheduled_at     timestamptz NOT NULL,
  location         text,
  status           appointment_status NOT NULL DEFAULT 'scheduled',
  reminder_sent_at timestamptz,
  completed_at     timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_patient_id    ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id     ON appointments(doctor_id);
CREATE INDEX idx_appointments_scheduled_at  ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status        ON appointments(status);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Médecin : accès à ses rendez-vous uniquement
CREATE POLICY appointments_doctor_rw ON appointments
  FOR ALL
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Patiente : accès en lecture à ses rendez-vous
CREATE POLICY appointments_patient_read ON appointments
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at_trigger
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();
