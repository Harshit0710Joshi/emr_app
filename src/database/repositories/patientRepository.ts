import { getDatabase } from '../db';
import { generateId } from '@utils/id';
import { getDeviceId } from '@utils/device';
import { SyncQueue } from '@sync/syncQueue';
import type { Patient, PatientInput } from '@models/patient';

// Maps a raw SQLite row (snake_case) to our Patient type (camelCase)
function mapRowToPatient(row: any): Patient {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    phone: row.phone,
    address: row.address,
    bloodGroup: row.blood_group,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deviceId: row.device_id,
    revision: row.revision,
    isDeleted: !!row.is_deleted,
    syncStatus: row.sync_status,
  };
}

export const PatientRepository = {
  async create(input: PatientInput): Promise<Patient> {
    const db = await getDatabase();
    const id = generateId();
    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO patients (
        id, first_name, last_name, date_of_birth, gender, phone,
        address, blood_group, emergency_contact_name, emergency_contact_phone,
        created_at, updated_at, device_id, revision, is_deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'pending');`,
      [
        id,
        input.firstName,
        input.lastName,
        input.dateOfBirth,
        input.gender,
        input.phone,
        input.address,
        input.bloodGroup,
        input.emergencyContactName,
        input.emergencyContactPhone,
        now,
        now,
        deviceId,
      ]
    );

    const created = await this.getById(id);
    if (!created) throw new Error('Failed to create patient');
    await SyncQueue.enqueue('patient', id, 'create', created);
    return created;
  },

  async getById(id: string): Promise<Patient | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM patients WHERE id = ? AND is_deleted = 0;',
      [id]
    );
    return row ? mapRowToPatient(row) : null;
  },

  async getAll(): Promise<Patient[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM patients WHERE is_deleted = 0 ORDER BY updated_at DESC;'
    );
    return rows.map(mapRowToPatient);
  },

  async search(query: string): Promise<Patient[]> {
    const db = await getDatabase();
    const like = `%${query}%`;
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM patients
       WHERE is_deleted = 0
       AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)
       ORDER BY updated_at DESC;`,
      [like, like, like]
    );
    return rows.map(mapRowToPatient);
  },

  async update(id: string, input: Partial<PatientInput>): Promise<Patient> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Patient not found');

    const deviceId = await getDeviceId();
    const now = new Date().toISOString();
    const merged = { ...existing, ...input };

    await db.runAsync(
      `UPDATE patients SET
        first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, phone = ?,
        address = ?, blood_group = ?, emergency_contact_name = ?, emergency_contact_phone = ?,
        updated_at = ?, device_id = ?, revision = revision + 1, sync_status = 'pending'
      WHERE id = ?;`,
      [
        merged.firstName,
        merged.lastName,
        merged.dateOfBirth,
        merged.gender,
        merged.phone,
        merged.address,
        merged.bloodGroup,
        merged.emergencyContactName,
        merged.emergencyContactPhone,
        now,
        deviceId,
        id,
      ]
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update patient');
    await SyncQueue.enqueue('patient', id, 'update', updated);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE patients SET
        is_deleted = 1, updated_at = ?, device_id = ?, revision = revision + 1, sync_status = 'pending'
      WHERE id = ?;`,
      [now, deviceId, id]
    );
    const deleted = await this.getById(id); // will be null since getById filters is_deleted=0 — use raw fetch instead:
    await SyncQueue.enqueue('patient', id, 'delete', { id, isDeleted: true, updatedAt: new Date().toISOString(), deviceId: await getDeviceId() });
  },
};