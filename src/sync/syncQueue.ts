import { getDatabase } from '@database/db';
import { generateId } from '@utils/id';
import { getDeviceId } from '@utils/device';
import type { EntityType, OperationType, SyncQueueItem, SyncStats } from './types';
import { isReadyForRetry } from './backoff';

function mapRow(row: any): SyncQueueItem {
  return {
    operationId: row.operation_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operationType: row.operation_type,
    payload: row.payload,
    deviceId: row.device_id,
    createdAt: row.created_at,
    status: row.status,
    retryCount: row.retry_count,
    lastAttemptAt: row.last_attempt_at,
    lastError: row.last_error,
  };
}

export const SyncQueue = {
  async enqueue(
    entityType: EntityType,
    entityId: string,
    operationType: OperationType,
    payload: object
  ): Promise<void> {
    const db = await getDatabase();
    const deviceId = await getDeviceId();
    const operationId = generateId(); // unique per queued operation — used for duplicate detection server-side

    await db.runAsync(
      `INSERT INTO sync_queue (
        operation_id, entity_type, entity_id, operation_type, payload,
        device_id, created_at, status, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0);`,
      [
        operationId,
        entityType,
        entityId,
        operationType,
        JSON.stringify(payload),
        deviceId,
        new Date().toISOString(),
      ]
    );
  },

  async getPending(limit: number = 50): Promise<SyncQueueItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC LIMIT ?;`,
    [limit * 2] // fetch extra since we'll filter some out by backoff timing
  );
  const items = rows.map(mapRow);

  // Import at top of file: import { isReadyForRetry } from './backoff';
  return items
    .filter((item) => item.status === 'pending' || isReadyForRetry(item.lastAttemptAt, item.retryCount))
    .slice(0, limit);
},

  async markSyncing(operationId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'syncing', last_attempt_at = ? WHERE operation_id = ?;`,
      [new Date().toISOString(), operationId]
    );
  },

  async markSynced(operationId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'synced' WHERE operation_id = ?;`,
      [operationId]
    );
  },

  async markFailed(operationId: string, error: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, last_error = ? WHERE operation_id = ?;`,
      [error, operationId]
    );
  },

  async logReplication(
    operationId: string,
    entityType: EntityType,
    entityId: string,
    operationType: OperationType,
    direction: 'push' | 'pull',
    status: 'success' | 'failed' | 'conflict',
    details?: string
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO replication_log (
        operation_id, entity_type, entity_id, operation_type, direction, status, synced_at, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [operationId, entityType, entityId, operationType, direction, status, new Date().toISOString(), details ?? null]
    );
  },

  async getStats(): Promise<SyncStats> {
    const db = await getDatabase();
    const pending = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'syncing');`
    );
    const failed = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed';`
    );
    const synced = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'synced';`
    );
    const lastSync = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_meta WHERE key = 'last_synced_at';`
    );

    return {
      pendingCount: pending?.count ?? 0,
      failedCount: failed?.count ?? 0,
      syncedCount: synced?.count ?? 0,
      lastSyncedAt: lastSync?.value ?? null,
    };
  },

  async setLastSyncedAt(timestamp: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO sync_meta (key, value) VALUES ('last_synced_at', ?)
       ON CONFLICT(key) DO UPDATE SET value = ?;`,
      [timestamp, timestamp]
    );
  },
};