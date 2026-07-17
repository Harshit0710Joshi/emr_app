import type { SQLiteDatabase } from 'expo-sqlite';

export const MIGRATION_NAME = '003_peer_receipts';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS peer_receipts (
      operation_id TEXT PRIMARY KEY NOT NULL,
      received_at TEXT NOT NULL
    );
  `);
}