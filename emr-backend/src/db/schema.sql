CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  device_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL,
  diagnosis TEXT,
  symptoms TEXT,
  notes TEXT,
  prescribed_medication TEXT,
  vitals JSONB,

  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  device_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_updated ON patients (updated_at);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_updated ON visits (updated_at);