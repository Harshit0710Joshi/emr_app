import { getDatabase } from '@database/db';
import { apiClient } from '@network/apiClient';
import { SyncQueue } from './syncQueue';
import type { SyncQueueItem } from './types';
import { RevisionHistoryRepository } from '@database/repositories/revisionHistoryRepository';

const MAX_RETRIES = 5;

/**
 * After a successful push, the entity itself (patients/visits row) must be
 * marked 'synced' too — not just the sync_queue entry. Otherwise our conflict
 * detection (which checks entity.sync_status === 'pending') keeps treating
 * already-synced records as having local unsynced changes forever.
 */
async function markEntitySynced(entityType: 'patient' | 'visit', entityId: string): Promise<void> {
  const db = await getDatabase();
  const table = entityType === 'patient' ? 'patients' : 'visits';

  const stillPending = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue
     WHERE entity_id = ? AND entity_type = ? AND status IN ('pending', 'syncing', 'failed');`,
    [entityId, entityType]
  );

  if (!stillPending || stillPending.count === 0) {
    await db.runAsync(
      `UPDATE ${table} SET sync_status = 'synced' WHERE id = ?;`,
      [entityId]
    );
  }
}

async function pushOperation(item: SyncQueueItem): Promise<void> {
  await SyncQueue.markSyncing(item.operationId);
  const payload = JSON.parse(item.payload);
  const payloadBytes = item.payload.length;
  const startTime = Date.now();

  try {
    if (item.entityType === 'patient') {
      if (item.operationType === 'create') await apiClient.post('/patients', payload, item.operationId);
      else if (item.operationType === 'update') await apiClient.put(`/patients/${item.entityId}`, payload, item.operationId);
      else if (item.operationType === 'delete') await apiClient.delete(`/patients/${item.entityId}`, payload, item.operationId);
    } else if (item.entityType === 'visit') {
      if (item.operationType === 'create') await apiClient.post('/visits', payload, item.operationId);
      else if (item.operationType === 'update') await apiClient.put(`/visits/${item.entityId}`, payload, item.operationId);
      else if (item.operationType === 'delete') await apiClient.delete(`/visits/${item.entityId}`, payload, item.operationId);
    }

    const durationMs = Date.now() - startTime;
    await SyncQueue.markSynced(item.operationId);
    await markEntitySynced(item.entityType, item.entityId);
    await SyncQueue.logReplication(
      item.operationId, item.entityType, item.entityId, item.operationType, 'push', 'success',
      undefined, durationMs, payloadBytes
    );
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await SyncQueue.markFailed(item.operationId, err.message ?? String(err));
    await SyncQueue.logReplication(
      item.operationId, item.entityType, item.entityId, item.operationType, 'push', 'failed',
      err.message, durationMs, payloadBytes
    );
    throw err;
  }
}

async function pushQueue(): Promise<{ succeeded: number; failed: number }> {
  const db = await getDatabase();
  const pending = await SyncQueue.getPending(50);
  let succeeded = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.retryCount >= MAX_RETRIES) {
      failed++;
      continue;
    }

    // Dependency guard: a visit can't sync before its parent patient exists
    // server-side. If the parent patient still has unsynced operations queued,
    // skip this visit for now — it'll be picked up on a later sync pass.
    if (item.entityType === 'visit') {
      const payload = JSON.parse(item.payload);
      const patientId = payload.patientId ?? payload.patient_id;
      const parentPending = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue
         WHERE entity_id = ? AND entity_type = 'patient' AND status IN ('pending', 'syncing', 'failed');`,
        [patientId]
      );
      if (parentPending && parentPending.count > 0) {
        continue;
      }
    }

    try {
      await pushOperation(item);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}

/**
 * Determines if a local record is in true conflict with an incoming remote record.
 * Conflict = local record was modified (sync_status = 'pending') AND remote was
 * also modified after our last successful sync.
 */
function isConflict(localSyncStatus: string, lastSyncedAt: string | null, remoteUpdatedAt: string): boolean {
  const localHasUnsyncedChanges = localSyncStatus === 'pending';
  const remoteChangedAfterLastSync = !lastSyncedAt || new Date(remoteUpdatedAt) > new Date(lastSyncedAt);
  return localHasUnsyncedChanges && remoteChangedAfterLastSync;
}

async function pullPatients(lastSyncedAt: string | null): Promise<{ pulled: number; conflicts: number; maxUpdatedAt: string | null }> {
  const db = await getDatabase();
  const since = lastSyncedAt ?? '1970-01-01T00:00:00Z';
  const remotePatients = await apiClient.get<any[]>(`/patients/changes?since=${encodeURIComponent(since)}`);

  let conflicts = 0;
  let maxUpdatedAt: string | null = null;

  for (const p of remotePatients) {
    if (!maxUpdatedAt || new Date(p.updated_at) > new Date(maxUpdatedAt)) {
      maxUpdatedAt = p.updated_at;
    }

    const local = await db.getFirstAsync<any>(
      'SELECT revision, sync_status, updated_at FROM patients WHERE id = ?;',
      [p.id]
    );

    if (!local) {
      await insertOrReplacePatient(db, p, 'synced');
      continue;
    }

    if (isConflict(local.sync_status, lastSyncedAt, p.updated_at)) {
      conflicts++;
      const remoteIsNewer = new Date(p.updated_at) > new Date(local.updated_at);
      const localFull = await db.getFirstAsync<any>('SELECT * FROM patients WHERE id = ?;', [p.id]);

      await SyncQueue.logReplication(
        'conflict-' + p.id, 'patient', p.id, 'update', 'pull', 'conflict',
        `Local vs remote conflict. Remote newer: ${remoteIsNewer}`
      );
      await RevisionHistoryRepository.record('patient', p.id, p.revision, p, 'conflict_resolution', localFull);

      if (remoteIsNewer) {
        await insertOrReplacePatient(db, p, 'synced');
      }
    } else if (p.revision > local.revision || new Date(p.updated_at) > new Date(local.updated_at)) {
      await insertOrReplacePatient(db, p, 'synced');
    }
  }

  return { pulled: remotePatients.length, conflicts, maxUpdatedAt };
}

async function insertOrReplacePatient(db: any, p: any, syncStatus: string) {
  await db.runAsync(
    `INSERT INTO patients (
      id, first_name, last_name, date_of_birth, gender, phone,
      address, blood_group, emergency_contact_name, emergency_contact_phone,
      created_at, updated_at, device_id, revision, is_deleted, sync_status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      first_name=excluded.first_name, last_name=excluded.last_name,
      date_of_birth=excluded.date_of_birth, gender=excluded.gender, phone=excluded.phone,
      address=excluded.address, blood_group=excluded.blood_group,
      emergency_contact_name=excluded.emergency_contact_name,
      emergency_contact_phone=excluded.emergency_contact_phone,
      updated_at=excluded.updated_at, device_id=excluded.device_id,
      revision=excluded.revision, is_deleted=excluded.is_deleted, sync_status=excluded.sync_status;`,
    [
      p.id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone,
      p.address, p.blood_group, p.emergency_contact_name, p.emergency_contact_phone,
      p.created_at, p.updated_at, p.device_id, p.revision, p.is_deleted ? 1 : 0, syncStatus,
    ]
  );
}

async function pullVisits(lastSyncedAt: string | null): Promise<{ pulled: number; conflicts: number; maxUpdatedAt: string | null }> {
  const db = await getDatabase();
  const since = lastSyncedAt ?? '1970-01-01T00:00:00Z';
  const remoteVisits = await apiClient.get<any[]>(`/visits/changes?since=${encodeURIComponent(since)}`);

  let conflicts = 0;
  let maxUpdatedAt: string | null = null;

  for (const v of remoteVisits) {
    if (!maxUpdatedAt || new Date(v.updated_at) > new Date(maxUpdatedAt)) {
      maxUpdatedAt = v.updated_at;
    }

    const local = await db.getFirstAsync<any>(
      'SELECT revision, sync_status, updated_at FROM visits WHERE id = ?;',
      [v.id]
    );

    if (!local) {
      await insertOrReplaceVisit(db, v, 'synced');
      continue;
    }

    if (isConflict(local.sync_status, lastSyncedAt, v.updated_at)) {
      conflicts++;
      const remoteIsNewer = new Date(v.updated_at) > new Date(local.updated_at);
      const localFull = await db.getFirstAsync<any>('SELECT * FROM visits WHERE id = ?;', [v.id]);

      await SyncQueue.logReplication(
        'conflict-' + v.id, 'visit', v.id, 'update', 'pull', 'conflict',
        `Local vs remote conflict. Remote newer: ${remoteIsNewer}`
      );
      await RevisionHistoryRepository.record('visit', v.id, v.revision, v, 'conflict_resolution', localFull);

      if (remoteIsNewer) {
        await insertOrReplaceVisit(db, v, 'synced');
      }
    } else if (v.revision > local.revision || new Date(v.updated_at) > new Date(local.updated_at)) {
      await insertOrReplaceVisit(db, v, 'synced');
    }
  }

  return { pulled: remoteVisits.length, conflicts, maxUpdatedAt };
}

async function insertOrReplaceVisit(db: any, v: any, syncStatus: string) {
  await db.runAsync(
    `INSERT INTO visits (
      id, patient_id, visit_date, visit_type, diagnosis, symptoms,
      notes, prescribed_medication, vitals,
      created_at, updated_at, device_id, revision, is_deleted, sync_status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      visit_date=excluded.visit_date, visit_type=excluded.visit_type, diagnosis=excluded.diagnosis,
      symptoms=excluded.symptoms, notes=excluded.notes, prescribed_medication=excluded.prescribed_medication,
      vitals=excluded.vitals, updated_at=excluded.updated_at, device_id=excluded.device_id,
      revision=excluded.revision, is_deleted=excluded.is_deleted, sync_status=excluded.sync_status;`,
    [
      v.id, v.patient_id, v.visit_date, v.visit_type, v.diagnosis, v.symptoms,
      v.notes, v.prescribed_medication, v.vitals ? JSON.stringify(v.vitals) : null,
      v.created_at, v.updated_at, v.device_id, v.revision, v.is_deleted ? 1 : 0, syncStatus,
    ]
  );
}

export const SyncEngine = {
  async runFullSync() {
    const pushResult = await pushQueue();

    const previousCursor = (await SyncQueue.getStats()).lastSyncedAt;
    const patientPull = await pullPatients(previousCursor);
    const visitPull = await pullVisits(previousCursor);

    // Advance the cursor to the latest SERVER timestamp actually seen this round —
    // never to the phone's own local clock. If nothing new came in, keep the old
    // cursor as-is rather than advancing it blindly, so we never accidentally
    // skip a window of changes due to client/server clock drift.
    const candidates = [patientPull.maxUpdatedAt, visitPull.maxUpdatedAt, previousCursor].filter(
      (v): v is string => v !== null
    );
    if (candidates.length > 0) {
      const newCursor = candidates.reduce((latest, current) =>
        new Date(current) > new Date(latest) ? current : latest
      );
      await SyncQueue.setLastSyncedAt(newCursor);
    }

    return {
      pushResult,
      pullResult: {
        patientsPulled: patientPull.pulled,
        patientConflicts: patientPull.conflicts,
        visitsPulled: visitPull.pulled,
        visitConflicts: visitPull.conflicts,
      },
    };
  },
  pushQueue,
};