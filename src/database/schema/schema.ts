export const CREATE_PATIENTS_TABLE = `
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
`;

export const CREATE_VISITS_TABLE = `
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_type TEXT NOT NULL,
  diagnosis TEXT,
  symptoms TEXT,
  notes TEXT,
  prescribed_medication TEXT,
  vitals TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending',

  FOREIGN KEY (patient_id) REFERENCES patients (id)
);
`;

// Indexes for common query patterns — search by name/phone, list visits per patient
export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (first_name, last_name);`,
  `CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);`,
  `CREATE INDEX IF NOT EXISTS idx_patients_deleted ON patients (is_deleted);`,
  `CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits (patient_id);`,
  `CREATE INDEX IF NOT EXISTS idx_visits_date ON visits (visit_date);`,
  `CREATE INDEX IF NOT EXISTS idx_visits_deleted ON visits (is_deleted);`,
];

// Tracks which migrations have run — needed so we don't re-run schema changes
export const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
`;