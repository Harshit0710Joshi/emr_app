import { Request, Response } from 'express';
import { pool } from '../config/database';

async function isDuplicateOperation(operationId: string): Promise<boolean> {
  if (!operationId) return false;
  const result = await pool.query(
    'SELECT 1 FROM processed_operations WHERE operation_id = $1;',
    [operationId]
  );
  return result.rows.length > 0;
}

async function markOperationProcessed(operationId: string, entityType: string, entityId: string) {
  if (!operationId) return;
  await pool.query(
    `INSERT INTO processed_operations (operation_id, entity_type, entity_id)
     VALUES ($1, $2, $3) ON CONFLICT (operation_id) DO NOTHING;`,
    [operationId, entityType, entityId]
  );
}

export const patientController = {
  async getAll(req: Request, res: Response) {
    const result = await pool.query(
      'SELECT * FROM patients WHERE is_deleted = FALSE ORDER BY updated_at DESC;'
    );
    res.json(result.rows);
  },

  async getChangedSince(req: Request, res: Response) {
    const since = (req.query.since as string) || '1970-01-01T00:00:00Z';
    const result = await pool.query(
      'SELECT * FROM patients WHERE updated_at > $1 ORDER BY updated_at ASC;',
      [since]
    );
    res.json(result.rows);
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  },

  async create(req: Request, res: Response) {
    const p = req.body;
    const operationId = req.header('X-Operation-Id') || '';

    if (await isDuplicateOperation(operationId)) {
      const existing = await pool.query('SELECT * FROM patients WHERE id = $1;', [p.id]);
      return res.status(200).json(existing.rows[0] ?? { status: 'duplicate_ignored' });
    }

    const result = await pool.query(
      `INSERT INTO patients (
        id, first_name, last_name, date_of_birth, gender, phone,
        address, blood_group, emergency_contact_name, emergency_contact_phone,
        created_at, updated_at, device_id, revision, is_deleted, sync_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (id) DO UPDATE SET
        first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,
        date_of_birth=EXCLUDED.date_of_birth, gender=EXCLUDED.gender, phone=EXCLUDED.phone,
        address=EXCLUDED.address, blood_group=EXCLUDED.blood_group,
        emergency_contact_name=EXCLUDED.emergency_contact_name,
        emergency_contact_phone=EXCLUDED.emergency_contact_phone,
        updated_at=EXCLUDED.updated_at, device_id=EXCLUDED.device_id,
        revision=EXCLUDED.revision, sync_status='synced'
      RETURNING *;`,
      [
        p.id, p.firstName, p.lastName, p.dateOfBirth, p.gender, p.phone,
        p.address, p.bloodGroup, p.emergencyContactName, p.emergencyContactPhone,
        p.createdAt, p.updatedAt, p.deviceId, p.revision, p.isDeleted, 'synced',
      ]
    );

    await markOperationProcessed(operationId, 'patient', p.id);
    res.status(201).json(result.rows[0]);
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const p = req.body;
    const operationId = req.header('X-Operation-Id') || '';

    if (await isDuplicateOperation(operationId)) {
      const existing = await pool.query('SELECT * FROM patients WHERE id = $1;', [id]);
      return res.status(200).json(existing.rows[0] ?? { status: 'duplicate_ignored' });
    }

    const result = await pool.query(
      `UPDATE patients SET
        first_name=$1, last_name=$2, date_of_birth=$3, gender=$4, phone=$5,
        address=$6, blood_group=$7, emergency_contact_name=$8, emergency_contact_phone=$9,
        updated_at=$10, device_id=$11, revision=$12, sync_status='synced'
      WHERE id=$13 RETURNING *;`,
      [
        p.firstName, p.lastName, p.dateOfBirth, p.gender, p.phone,
        p.address, p.bloodGroup, p.emergencyContactName, p.emergencyContactPhone,
        p.updatedAt, p.deviceId, p.revision, id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await markOperationProcessed(operationId, 'patient', id);
    res.json(result.rows[0]);
  },

  async softDelete(req: Request, res: Response) {
    const id = req.params.id as string;
    const { deviceId, updatedAt, revision } = req.body;
    const operationId = req.header('X-Operation-Id') || '';

    if (await isDuplicateOperation(operationId)) {
      const existing = await pool.query('SELECT * FROM patients WHERE id = $1;', [id]);
      return res.status(200).json(existing.rows[0] ?? { status: 'duplicate_ignored' });
    }

    const result = await pool.query(
      `UPDATE patients SET is_deleted=TRUE, updated_at=$1, device_id=$2, revision=$3, sync_status='synced'
       WHERE id=$4 RETURNING *;`,
      [updatedAt, deviceId, revision, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await markOperationProcessed(operationId, 'patient', id);
    res.json(result.rows[0]);
  },
};