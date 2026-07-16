import { getDatabase } from '@database/db';
import { apiClient } from '@network/apiClient';
import { SyncQueue } from './syncQueue';
import type { SyncQueueItem } from './types';

const MAX_RETRIES = 5;

async function pushOperation(item: SyncQueueItem): Promise<void> {
  await SyncQueue.markSyncing(item.operationId);
  const payload = JSON.parse(item.payload);

  try {
    if (item.entityType === 'patient') {
      if (item.operationType === 'create') await apiClient.post('/patients', payload);
      else if (item.operationType === 'update') await apiClient.put(`/patients/${item.entityId}`, payload);
      else if (item.operationType === 'delete') await apiClient.delete(`/patients/${item.entityId}`, payload);
    } else if (item.entityType === 'visit') {
      if (item.operationType === 'create') await apiClient.post('/visits', payload);
      else if (item.operationType === 'update') await apiClient.put(`/visits/${item.entityId}`, payload);
      else if (item.operationType === 'delete') await apiClient.delete(`/visits/${item.entityId}`, payload);
    }

    await SyncQueue.markSynced(item.operationId);
    await SyncQueue.logReplication(item.operationId, item.entityType, item.entityId, item.operationType, 'push', 'success');
  } catch (err: any) {
    await SyncQueue.markFailed(item.operationId, err.message ?? String(err));
    await SyncQueue.logReplication(item.operationId, item.entityType, item.entityId, item.operationType, 'push', 'failed', err.message);
    throw err;
  }
}

async function pushQueue(): Promise<{ succeeded: number; failed: number }> {
  const pending = await SyncQueue.getPending(50);
  let succeeded = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.retryCount >= MAX_RETRIES) {
      failed++;
      continue;
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

async function pullPatients(lastSyncedAt: string | null): Promise<{ pulled: number; conflicts: number }> {
  const db = await getDatabase();
  const since = lastSyncedAt ?? '1970-01-01T00:00:00Z';
  const remotePatients = await apiClient.get<any[]>(`/patients/changes?since=${encodeURIComponent(since)}`);

  let conflicts = 0;

  for (const p of remotePatients) {
    const local = await db.getFirstAsync<any>(
      'SELECT revision, sync_status, updated_at FROM patients WHERE id = ?;',
      [p.id]
    );

    if (!local) {
      // New record from server — just insert it
      await insertOrReplacePatient(db, p, 'synced');
      continue;
    }

    if (isConflict(local.sync_status, lastSyncedAt, p.updated_at)) {
      conflicts++;
      // Last-Write-Wins: compare timestamps, keep the newer one
      const remoteIsNewer = new Date(p.updated_at) > new Date(local.updated_at);

      await SyncQueue.logReplication(
        'conflict-' + p.id, 'patient', p.id, 'update', 'pull', 'conflict',
        `Local vs remote conflict. Remote newer: ${remoteIsNewer}`
      );

      if (remoteIsNewer) {
        await insertOrReplacePatient(db, p, 'synced');
      }
      // else: keep local version, it'll get pushed on next push cycle since it's still 'pending'
    } else if (p.revision > local.revision || new Date(p.updated_at) > new Date(local.updated_at)) {
      // No conflict — just a newer remote version, apply it
      await insertOrReplacePatient(db, p, 'synced');
    }
  }

  return { pulled: remotePatients.length, conflicts };
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

async function pullVisits(lastSyncedAt: string | null): Promise<{ pulled: number; conflicts: number }> {
  const db = await getDatabase();
  const since = lastSyncedAt ?? '1970-01-01T00:00:00Z';
  const remoteVisits = await apiClient.get<any[]>(`/visits/changes?since=${encodeURIComponent(since)}`);

  let conflicts = 0;

  for (const v of remoteVisits) {
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
      await SyncQueue.logReplication(
        'conflict-' + v.id, 'visit', v.id, 'update', 'pull', 'conflict',
        `Local vs remote conflict. Remote newer: ${remoteIsNewer}`
      );
      if (remoteIsNewer) {
        await insertOrReplaceVisit(db, v, 'synced');
      }
    } else if (v.revision > local.revision || new Date(v.updated_at) > new Date(local.updated_at)) {
      await insertOrReplaceVisit(db, v, 'synced');
    }
  }

  return { pulled: remoteVisits.length, conflicts };
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

    const lastSyncedAt = (await SyncQueue.getStats()).lastSyncedAt;
    const patientPull = await pullPatients(lastSyncedAt);
    const visitPull = await pullVisits(lastSyncedAt);

    await SyncQueue.setLastSyncedAt(new Date().toISOString());

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