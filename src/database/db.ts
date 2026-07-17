import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Migration001 from './migrations/001_initial';
import * as Migration002 from './migrations/002_sync_queue';
import * as Migration003 from './migrations/003_peer_receipts';
import * as Migration004 from './migrations/004_revision_history';
import * as Migration005 from './migrations/005_replication_metrics';

const DB_NAME = 'emr.db';

let dbInstance: SQLiteDatabase | null = null;

const migrations = [Migration001, Migration002, Migration003, Migration004, Migration005];

async function hasMigrationRun(db: SQLiteDatabase, name: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM migrations WHERE name = ?;',
      [name]
    );
    return !!result;
  } catch {
    // migrations table doesn't exist yet — first run
    return false;
  }
}

async function markMigrationRun(db: SQLiteDatabase, name: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO migrations (name, applied_at) VALUES (?, ?);',
    [name, new Date().toISOString()]
  );
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  for (const migration of migrations) {
    const alreadyRun = await hasMigrationRun(db, migration.MIGRATION_NAME);
    if (!alreadyRun) {
      console.log(`Running migration: ${migration.MIGRATION_NAME}`);
      await migration.up(db);
      await markMigrationRun(db, migration.MIGRATION_NAME);
    }
  }
}

/**
 * Returns the singleton database instance, initializing and running
 * migrations on first call. Safe to call multiple times.
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // WAL mode improves concurrent read/write performance — important since
  // sync operations will read/write alongside UI queries later
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db);

  dbInstance = db;
  return dbInstance;
}

/**
 * Useful for tests or a "reset app data" feature later.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}