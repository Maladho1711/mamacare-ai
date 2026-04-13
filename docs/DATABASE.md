# MamaCare AI — Base de données Supabase

## Setup initial

### 1. Créer le projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet : `mamacare`
3. Récupérer les clés dans Settings → API :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Exécuter les SQL dans l'ordre
Copier-coller chaque bloc SQL dans **Supabase → SQL Editor → New Query**

---

## Schéma de la base de données

```
users (Supabase Auth)
  └── patients (un user patient → un profil patient)
  └── doctors (un user doctor → géré via user.role)

patients
  └── questionnaire_responses (une patiente → plusieurs réponses)
  └── alerts (une patiente → plusieurs alertes)

questionnaire_responses
  └── alerts (une réponse → zéro ou une alerte)
```

---

## SQL — Création des tables

### Étape 1 — Extensions et types

```sql
-- Activer UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum : rôles utilisateur
CREATE TYPE user_role AS ENUM ('doctor', 'patient');

-- Enum : statut grossesse
CREATE TYPE patient_status AS ENUM ('pregnant', 'postnatal', 'completed');

-- Enum : niveau d'alerte
CREATE TYPE alert_level AS ENUM ('green', 'orange', 'red');

-- Enum : type de questionnaire
CREATE TYPE questionnaire_type AS ENUM ('pregnancy', 'postnatal');
```

---

### Étape 2 — Table profiles (extension de Supabase Auth)

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'patient',
  full_name   TEXT,
  phone       TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- Trigger : créer profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'),
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### Étape 3 — Table patients

```sql
CREATE TABLE patients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id         UUID NOT NULL REFERENCES profiles(id),
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL UNIQUE,
  pregnancy_start   DATE NOT NULL,
  expected_term     DATE NOT NULL,
  status            patient_status NOT NULL DEFAULT 'pregnant',
  risk_level        alert_level NOT NULL DEFAULT 'green',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX idx_patients_risk_level ON patients(risk_level);
CREATE INDEX idx_patients_status ON patients(status);

-- Trigger : updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### Étape 4 — Table questionnaire_responses

```sql
CREATE TABLE questionnaire_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type            questionnaire_type NOT NULL DEFAULT 'pregnancy',
  responses       JSONB NOT NULL DEFAULT '{}',
  alert_level     alert_level NOT NULL DEFAULT 'green',
  triggered_rules TEXT[] DEFAULT '{}',
  ai_analysis     TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_responses_patient_id ON questionnaire_responses(patient_id);
CREATE INDEX idx_responses_alert_level ON questionnaire_responses(alert_level);
CREATE INDEX idx_responses_submitted_at ON questionnaire_responses(submitted_at DESC);

-- Index pour vérifier si questionnaire déjà rempli aujourd'hui
CREATE INDEX idx_responses_patient_today
  ON questionnaire_responses(patient_id, DATE(submitted_at));
```

---

### Étape 5 — Table alerts

```sql
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  response_id     UUID REFERENCES questionnaire_responses(id),
  alert_type      alert_level NOT NULL,
  message         TEXT NOT NULL,
  whatsapp_sent   BOOLEAN DEFAULT FALSE,
  whatsapp_at     TIMESTAMPTZ,
  sms_sent        BOOLEAN DEFAULT FALSE,
  sms_at          TIMESTAMPTZ,
  resolved_by     UUID REFERENCES profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX idx_alerts_resolved ON alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
```

---

### Étape 6 — Table notification_logs

```sql
-- Log de toutes les notifications envoyées (audit trail)
CREATE TABLE notification_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id        UUID REFERENCES alerts(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  channel         TEXT NOT NULL,    -- 'whatsapp' | 'sms' | 'push'
  recipient       TEXT NOT NULL,    -- numéro ou device token
  message         TEXT NOT NULL,
  status          TEXT NOT NULL,    -- 'sent' | 'failed' | 'pending'
  error_message   TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_logs_alert_id ON notification_logs(alert_id);
CREATE INDEX idx_notif_logs_patient_id ON notification_logs(patient_id);
```

---

## Row Level Security (RLS)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- =====================
-- Policies : profiles
-- =====================

-- Chaque utilisateur voit son propre profil
CREATE POLICY "profiles: voir le sien"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Chaque utilisateur modifie son propre profil
CREATE POLICY "profiles: modifier le sien"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================
-- Policies : patients
-- =====================

-- Médecin voit ses propres patientes
CREATE POLICY "patients: médecin voit les siennes"
  ON patients FOR SELECT
  USING (doctor_id = auth.uid());

-- Médecin crée des patientes
CREATE POLICY "patients: médecin crée"
  ON patients FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

-- Médecin modifie ses patientes
CREATE POLICY "patients: médecin modifie"
  ON patients FOR UPDATE
  USING (doctor_id = auth.uid());

-- Patiente voit son propre profil patient
CREATE POLICY "patients: patiente voit le sien"
  ON patients FOR SELECT
  USING (user_id = auth.uid());

-- =====================
-- Policies : questionnaire_responses
-- =====================

-- Patiente voit ses propres réponses
CREATE POLICY "responses: patiente voit les siennes"
  ON questionnaire_responses FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Patiente soumet ses réponses
CREATE POLICY "responses: patiente soumet"
  ON questionnaire_responses FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Médecin voit les réponses de ses patientes
CREATE POLICY "responses: médecin voit celles de ses patientes"
  ON questionnaire_responses FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE doctor_id = auth.uid()
    )
  );

-- =====================
-- Policies : alerts
-- =====================

-- Médecin voit les alertes de ses patientes
CREATE POLICY "alerts: médecin voit les siennes"
  ON alerts FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE doctor_id = auth.uid()
    )
  );

-- Médecin résout les alertes
CREATE POLICY "alerts: médecin résout"
  ON alerts FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE doctor_id = auth.uid()
    )
  );

-- Patiente voit ses propres alertes
CREATE POLICY "alerts: patiente voit les siennes"
  ON alerts FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Service role (NestJS backend) peut tout faire
-- Utiliser SUPABASE_SERVICE_ROLE_KEY côté backend
-- Le service role bypass automatiquement les RLS
```

---

## Realtime — Abonnements

```sql
-- Activer Realtime sur les tables critiques
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE questionnaire_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
```

Côté frontend (Next.js) pour le dashboard médecin :
```typescript
// hooks/useAlerts.ts
const channel = supabase
  .channel('doctor-alerts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `patient_id=in.(${patientIds.join(',')})`
    },
    (payload) => {
      // Nouvelle alerte → mettre à jour le dashboard
      setAlerts(prev => [payload.new as IAlert, ...prev]);
    }
  )
  .subscribe();
```

---

## Requêtes utiles

### Vérifier si questionnaire déjà rempli aujourd'hui
```sql
SELECT EXISTS (
  SELECT 1 FROM questionnaire_responses
  WHERE patient_id = $1
  AND DATE(submitted_at) = CURRENT_DATE
) AS already_submitted;
```

### Patientes triées par niveau de risque (dashboard médecin)
```sql
SELECT
  p.*,
  qr.submitted_at AS last_questionnaire,
  qr.alert_level AS last_alert_level,
  EXTRACT(WEEK FROM AGE(NOW(), p.pregnancy_start)) AS pregnancy_week
FROM patients p
LEFT JOIN LATERAL (
  SELECT submitted_at, alert_level
  FROM questionnaire_responses
  WHERE patient_id = p.id
  ORDER BY submitted_at DESC
  LIMIT 1
) qr ON true
WHERE p.doctor_id = $1
ORDER BY
  CASE p.risk_level
    WHEN 'red' THEN 1
    WHEN 'orange' THEN 2
    WHEN 'green' THEN 3
  END,
  qr.submitted_at ASC NULLS FIRST;
```

### Alertes non résolues pour un médecin
```sql
SELECT
  a.*,
  p.full_name AS patient_name,
  p.phone AS patient_phone
FROM alerts a
JOIN patients p ON a.patient_id = p.id
WHERE p.doctor_id = $1
AND a.resolved_at IS NULL
ORDER BY a.created_at DESC;
```

### Historique symptômes d'une patiente (30 derniers jours)
```sql
SELECT
  DATE(submitted_at) AS date,
  alert_level,
  responses,
  ai_analysis
FROM questionnaire_responses
WHERE patient_id = $1
AND submitted_at >= NOW() - INTERVAL '30 days'
ORDER BY submitted_at DESC;
```

---

## Données de test (seed)

```sql
-- Insérer un médecin de test
-- (Créer d'abord via Supabase Auth puis mettre à jour le profil)
UPDATE profiles
SET role = 'doctor', full_name = 'Dr. Mamadou Diallo'
WHERE phone = '+224600000001';

-- Insérer une patiente de test (après création auth)
INSERT INTO patients (
  user_id, doctor_id, full_name, phone,
  pregnancy_start, expected_term, status, risk_level
) VALUES (
  '<patient-user-id>',
  '<doctor-user-id>',
  'Aïssatou Bah',
  '+224600000002',
  NOW() - INTERVAL '6 months',
  NOW() + INTERVAL '3 months',
  'pregnant',
  'green'
);
```

---

## Génération des types TypeScript depuis Supabase

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Générer les types
supabase gen types typescript \
  --project-id <ton-project-id> \
  > packages/shared-types/src/supabase.types.ts
```

Ou ajouter dans `package.json` :
```json
{
  "scripts": {
    "gen:types": "supabase gen types typescript --project-id <id> > packages/shared-types/src/supabase.types.ts"
  }
}
```
