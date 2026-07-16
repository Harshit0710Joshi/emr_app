import { getDatabase } from '../db';
import { generateId } from '@utils/id';
import { getDeviceId } from '@utils/device';
import { SyncQueue } from '@sync/syncQueue';
import type { Visit, VisitInput } from '@models/visit';

function mapRowToVisit(row: any): Visit {
  return {
    id: row.id,
    patientId: row.patient_id,
    visitDate: row.visit_date,
    visitType: row.visit_type,
    diagnosis: row.diagnosis,
    symptoms: row.symptoms,
    notes: row.notes,
    prescribedMedication: row.prescribed_medication,
    vitals: row.vitals ? JSON.parse(row.vitals) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deviceId: row.device_id,
    revision: row.revision,
    isDeleted: !!row.is_deleted,
    syncStatus: row.sync_status,
  };
}

export const VisitRepository = {
  async create(input: VisitInput): Promise<Visit> {
    const db = await getDatabase();
    const id = generateId();
    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO visits (
        id, patient_id, visit_date, visit_type, diagnosis, symptoms,
        notes, prescribed_medication, vitals,
        created_at, updated_at, device_id, revision, is_deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'pending');`,
      [
        id,
        input.patientId,
        input.visitDate,
        input.visitType,
        input.diagnosis,
        input.symptoms,
        input.notes,
        input.prescribedMedication,
        input.vitals ? JSON.stringify(input.vitals) : null,
        now,
        now,
        deviceId,
      ]
    );

    const created = await this.getById(id);
    if (!created) throw new Error('Failed to create visit');
    await SyncQueue.enqueue('visit', id, 'create', created);
    return created;
  },

  async getById(id: string): Promise<Visit | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM visits WHERE id = ? AND is_deleted = 0;',
      [id]
    );
    return row ? mapRowToVisit(row) : null;
  },

  async getByPatientId(patientId: string): Promise<Visit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM visits WHERE patient_id = ? AND is_deleted = 0 ORDER BY visit_date DESC;',
      [patientId]
    );
    return rows.map(mapRowToVisit);
  },

  async update(id: string, input: Partial<VisitInput>): Promise<Visit> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Visit not found');

    const deviceId = await getDeviceId();
    const now = new Date().toISOString();
    const merged = { ...existing, ...input };

    await db.runAsync(
      `UPDATE visits SET
        visit_date = ?, visit_type = ?, diagnosis = ?, symptoms = ?,
        notes = ?, prescribed_medication = ?, vitals = ?,
        updated_at = ?, device_id = ?, revision = revision + 1, sync_status = 'pending'
      WHERE id = ?;`,
      [
        merged.visitDate,
        merged.visitType,
        merged.diagnosis,
        merged.symptoms,
        merged.notes,
        merged.prescribedMedication,
        merged.vitals ? JSON.stringify(merged.vitals) : null,
        now,
        deviceId,
        id,
      ]
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update visit');
    await SyncQueue.enqueue('visit', id, 'update', updated);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE visits SET
        is_deleted = 1, updated_at = ?, device_id = ?, revision = revision + 1, sync_status = 'pending'
      WHERE id = ?;`,
      [now, deviceId, id]
    );
    const deleted = await this.getById(id); // will be null since getById filters is_deleted=0 — use raw fetch instead:
    await SyncQueue.enqueue('visit', id, 'delete', { id, isDeleted: true, updatedAt: new Date().toISOString(), deviceId: await getDeviceId() });
  },
};