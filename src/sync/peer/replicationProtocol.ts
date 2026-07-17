import { getDatabase } from '@database/db';
import { getDeviceId } from '@utils/device';
import type { PeerOperation, PeerPacket } from './types';

/**
 * Builds a packet containing all locally queued operations
 * (create/update/delete) that haven't been fully synced yet —
 * these are exactly the changes a peer doesn't have.
 */
export async function buildOutgoingPacket(): Promise<PeerPacket> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sync_queue WHERE status != 'synced' ORDER BY created_at ASC LIMIT 200;`
  );

  const operations: PeerOperation[] = rows.map((row) => ({
    operationId: row.operation_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operationType: row.operation_type,
    payload: JSON.parse(row.payload),
    originDeviceId: row.device_id,
  }));

  return {
    senderDeviceId: deviceId,
    timestamp: new Date().toISOString(),
    operations,
  };
}

async function isAlreadyReceived(operationId: string): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<any>(
    `SELECT operation_id FROM peer_receipts WHERE operation_id = ?;`,
    [operationId]
  );
  return !!existing;
}

async function markReceived(operationId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO peer_receipts (operation_id, received_at) VALUES (?, ?);`,
    [operationId, new Date().toISOString()]
  );
}

async function applyPatientOperation(op: PeerOperation): Promise<void> {
  const db = await getDatabase();
  const p = op.payload;
  const local = await db.getFirstAsync<any>('SELECT updated_at FROM patients WHERE id = ?;', [p.id]);

  // Same "newer wins" rule as cloud sync (Step 8) — keeps conflict behavior consistent
  if (local && new Date(p.updatedAt ?? p.updated_at) <= new Date(local.updated_at)) {
    return; // local is already newer or equal — nothing to do
  }

  await db.runAsync(
    `INSERT INTO patients (
      id, first_name, last_name, date_of_birth, gender, phone,
      address, blood_group, emergency_contact_name, emergency_contact_phone,
      created_at, updated_at, device_id, revision, is_deleted, sync_status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')
    ON CONFLICT(id) DO UPDATE SET
      first_name=excluded.first_name, last_name=excluded.last_name,
      date_of_birth=excluded.date_of_birth, gender=excluded.gender, phone=excluded.phone,
      address=excluded.address, blood_group=excluded.blood_group,
      emergency_contact_name=excluded.emergency_contact_name,
      emergency_contact_phone=excluded.emergency_contact_phone,
      updated_at=excluded.updated_at, device_id=excluded.device_id,
      revision=excluded.revision, is_deleted=excluded.is_deleted, sync_status='pending';`,
    [
      p.id, p.firstName, p.lastName, p.dateOfBirth, p.gender, p.phone,
      p.address, p.bloodGroup, p.emergencyContactName, p.emergencyContactPhone,
      p.createdAt, p.updatedAt, p.deviceId, p.revision, p.isDeleted ? 1 : 0,
    ]
  );
}

async function applyVisitOperation(op: PeerOperation): Promise<void> {
  const db = await getDatabase();
  const v = op.payload;
  const local = await db.getFirstAsync<any>('SELECT updated_at FROM visits WHERE id = ?;', [v.id]);

  if (local && new Date(v.updatedAt ?? v.updated_at) <= new Date(local.updated_at)) {
    return;
  }

  await db.runAsync(
    `INSERT INTO visits (
      id, patient_id, visit_date, visit_type, diagnosis, symptoms,
      notes, prescribed_medication, vitals,
      created_at, updated_at, device_id, revision, is_deleted, sync_status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')
    ON CONFLICT(id) DO UPDATE SET
      visit_date=excluded.visit_date, visit_type=excluded.visit_type, diagnosis=excluded.diagnosis,
      symptoms=excluded.symptoms, notes=excluded.notes, prescribed_medication=excluded.prescribed_medication,
      vitals=excluded.vitals, updated_at=excluded.updated_at, device_id=excluded.device_id,
      revision=excluded.revision, is_deleted=excluded.is_deleted, sync_status='pending';`,
    [
      v.id, v.patientId, v.visitDate, v.visitType, v.diagnosis, v.symptoms,
      v.notes, v.prescribedMedication, v.vitals ? JSON.stringify(v.vitals) : null,
      v.createdAt, v.updatedAt, v.deviceId, v.revision, v.isDeleted ? 1 : 0,
    ]
  );
}

/**
 * Applies an incoming packet from a peer:
 * - Skips operations we've already received (dedup via peer_receipts)
 * - Skips operations that originated from us (avoid loopback)
 * - Applies everything else, then re-queues it locally so it can
 *   propagate onward to the cloud AND to any future peer (gossip-style)
 */
export async function applyIncomingPacket(packet: PeerPacket): Promise<{ applied: number; skipped: number }> {
  const db = await getDatabase();
  const myDeviceId = await getDeviceId();
  let applied = 0;
  let skipped = 0;

  for (const op of packet.operations) {
    if (op.originDeviceId === myDeviceId) {
      skipped++;
      continue;
    }
    if (await isAlreadyReceived(op.operationId)) {
      skipped++;
      continue;
    }

    if (op.entityType === 'patient') {
      await applyPatientOperation(op);
    } else if (op.entityType === 'visit') {
      await applyVisitOperation(op);
    }

    await markReceived(op.operationId);

    // Re-queue locally under the ORIGINAL operation id so it can still push to
    // cloud/other peers, but we won't re-apply it again thanks to peer_receipts
    await db.runAsync(
      `INSERT OR IGNORE INTO sync_queue (
        operation_id, entity_type, entity_id, operation_type, payload,
        device_id, created_at, status, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0);`,
      [
        op.operationId, op.entityType, op.entityId, op.operationType,
        JSON.stringify(op.payload), op.originDeviceId, new Date().toISOString(),
      ]
    );

    applied++;
  }

  return { applied, skipped };
}