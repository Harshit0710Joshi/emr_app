import type { SQLiteDatabase } from 'expo-sqlite';
import {
  CREATE_SYNC_QUEUE_TABLE,
  CREATE_REPLICATION_LOG_TABLE,
  CREATE_SYNC_META_TABLE,
  CREATE_SYNC_INDEXES,
} from '../schema/syncSchema';

export const MIGRATION_NAME = '002_sync_queue';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_SYNC_QUEUE_TABLE);
  await db.execAsync(CREATE_REPLICATION_LOG_TABLE);
  await db.execAsync(CREATE_SYNC_META_TABLE);
  for (const sql of CREATE_SYNC_INDEXES) {
    await db.execAsync(sql);
  }
}