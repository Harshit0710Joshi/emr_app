import type { SQLiteDatabase } from 'expo-sqlite';
import {
  CREATE_PATIENTS_TABLE,
  CREATE_VISITS_TABLE,
  CREATE_INDEXES,
  CREATE_MIGRATIONS_TABLE,
} from '../schema/schema';

export const MIGRATION_NAME = '001_initial';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_MIGRATIONS_TABLE);
  await db.execAsync(CREATE_PATIENTS_TABLE);
  await db.execAsync(CREATE_VISITS_TABLE);

  for (const indexSql of CREATE_INDEXES) {
    await db.execAsync(indexSql);
  }
}