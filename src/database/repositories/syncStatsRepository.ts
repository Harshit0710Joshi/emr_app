import { getDatabase } from '../db';

export interface DetailedSyncStats {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  conflicts: number;
  lastSyncedAt: string | null;
}

export interface FailedOperation {
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  retryCount: number;
  lastError: string | null;
  lastAttemptAt: string | null;
}

export const SyncStatsRepository = {
  async getDetailedStats(): Promise<DetailedSyncStats> {
    const db = await getDatabase();

    const counts = await db.getAllAsync<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status;`
    );

    const conflictsRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM replication_log WHERE status = 'conflict';`
    );

    const lastSync = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_meta WHERE key = 'last_synced_at';`
    );

    const statusMap: Record<string, number> = {};
    counts.forEach((row) => {
      statusMap[row.status] = row.count;
    });

    return {
      pending: statusMap['pending'] ?? 0,
      syncing: statusMap['syncing'] ?? 0,
      synced: statusMap['synced'] ?? 0,
      failed: statusMap['failed'] ?? 0,
      conflicts: conflictsRow?.count ?? 0,
      lastSyncedAt: lastSync?.value ?? null,
    };
  },

  async getFailedOperations(): Promise<FailedOperation[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue WHERE status = 'failed' ORDER BY last_attempt_at DESC;`
    );
    return rows.map((row) => ({
      operationId: row.operation_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operationType: row.operation_type,
      retryCount: row.retry_count,
      lastError: row.last_error,
      lastAttemptAt: row.last_attempt_at,
    }));
  },

  async getRecentActivity(limit: number = 20): Promise<any[]> {
    const db = await getDatabase();
    return db.getAllAsync<any>(
      `SELECT * FROM replication_log ORDER BY synced_at DESC LIMIT ?;`,
      [limit]
    );
  },

  /** Resets a failed operation back to 'pending' so it gets picked up on the next sync run */
  async retryOperation(operationId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'pending' WHERE operation_id = ?;`,
      [operationId]
    );
  },

  async retryAllFailed(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE sync_queue SET status = 'pending' WHERE status = 'failed';`);
  },
};