import type { SQLiteDatabase } from 'expo-sqlite';

export const MIGRATION_NAME = '004_revision_history';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS revision_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      changed_fields TEXT,
      device_id TEXT NOT NULL,
      source TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );
  `);
  await db.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_revision_history_entity ON revision_history (entity_type, entity_id);`
  );
}