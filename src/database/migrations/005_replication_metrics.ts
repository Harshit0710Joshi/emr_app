import type { SQLiteDatabase } from 'expo-sqlite';

export const MIGRATION_NAME = '005_replication_metrics';

export async function up(db: SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(replication_log);`);
  const columnNames = columns.map((c) => c.name);

  if (!columnNames.includes('duration_ms')) {
    await db.execAsync(`ALTER TABLE replication_log ADD COLUMN duration_ms INTEGER;`);
  }
  if (!columnNames.includes('payload_bytes')) {
    await db.execAsync(`ALTER TABLE replication_log ADD COLUMN payload_bytes INTEGER;`);
  }
}