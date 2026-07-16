export type EntityType = 'patient' | 'visit';
export type OperationType = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  operationId: string;
  entityType: EntityType;
  entityId: string;
  operationType: OperationType;
  payload: string; // JSON string
  deviceId: string;
  createdAt: string;
  status: QueueStatus;
  retryCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
}

export interface SyncStats {
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncedAt: string | null;
}