// Tracks every local write as a pending operation to sync to the server
export const CREATE_SYNC_QUEUE_TABLE = `
CREATE TABLE IF NOT EXISTS sync_queue (
  operation_id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,        -- 'patient' | 'visit'
  entity_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,     -- 'create' | 'update' | 'delete'
  payload TEXT NOT NULL,            -- JSON snapshot of the record at write time
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'syncing' | 'synced' | 'failed'
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  last_error TEXT
);
`;

// Replication log — permanent audit trail of what synced and when (append-only, never deleted)
export const CREATE_REPLICATION_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS replication_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  direction TEXT NOT NULL,          -- 'push' | 'pull'
  status TEXT NOT NULL,             -- 'success' | 'failed' | 'conflict'
  synced_at TEXT NOT NULL,
  details TEXT
);
`;

// Tracks last successful pull per entity type, for incremental sync
export const CREATE_SYNC_META_TABLE = `
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export const CREATE_SYNC_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status);`,
  `CREATE INDEX IF NOT EXISTS idx_replication_log_entity ON replication_log (entity_type, entity_id);`,
];