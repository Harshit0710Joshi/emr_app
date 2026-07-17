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

export const visitController = {
  async getByPatientId(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const result = await pool.query(
      'SELECT * FROM visits WHERE patient_id = $1 AND is_deleted = FALSE ORDER BY visit_date DESC;',
      [patientId]
    );
    res.json(result.rows);
  },

  async getChangedSince(req: Request, res: Response) {
    const since = (req.query.since as string) || '1970-01-01T00:00:00Z';
    const result = await pool.query(
      'SELECT * FROM visits WHERE updated_at > $1 ORDER BY updated_at ASC;',
      [since]
    );
    res.json(result.rows);
  },

  async create(req: Request, res: Response) {
    const v = req.body;
    const operationId = req.header('X-Operation-Id') || '';

    if (await isDuplicateOperation(operationId)) {
      const existing = await pool.query('SELECT * FROM visits WHERE id = $1;', [v.id]);
      return res.status(200).json(existing.rows[0] ?? { status: 'duplicate_ignored' });
    }

    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1;', [v.patientId]);
    if (patientCheck.rows.length === 0) {
      return res.status(409).json({ error: 'Parent patient not yet synced. Retry after patient syncs.' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO visits (
          id, patient_id, visit_date, visit_type, diagnosis, symptoms,
          notes, prescribed_medication, vitals,
          created_at, updated_at, device_id, revision, is_deleted, sync_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO UPDATE SET
          visit_date=EXCLUDED.visit_date, visit_type=EXCLUDED.visit_type, diagnosis=EXCLUDED.diagnosis,
          symptoms=EXCLUDED.symptoms, notes=EXCLUDED.notes, prescribed_medication=EXCLUDED.prescribed_medication,
          vitals=EXCLUDED.vitals, updated_at=EXCLUDED.updated_at, device_id=EXCLUDED.device_id,
          revision=EXCLUDED.revision, sync_status='synced'
        RETURNING *;`,
        [
          v.id, v.patientId, v.visitDate, v.visitType, v.diagnosis, v.symptoms,
          v.notes, v.prescribedMedication, v.vitals ? JSON.stringify(v.vitals) : null,
          v.createdAt, v.updatedAt, v.deviceId, v.revision, v.isDeleted, 'synced',
        ]
      );

      await markOperationProcessed(operationId, 'visit', v.id);
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error('Visit create error:', err.message);
      res.status(500).json({ error: err.message });
    }
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const v = req.body;
    const operationId = req.header('X-Operation-Id') || '';

    if (await isDuplicateOperation(operationId)) {
      const existing = await pool.query('SELECT * FROM visits WHERE id = $1;', [id]);
      return res.status(200).json(existing.rows[0] ?? { status: 'duplicate_ignored' });
    }

    const result = await pool.query(
      `UPDATE visits SET
        visit_date=$1, visit_type=$2, diagnosis=$3, symptoms=$4,
        notes=$5, prescribed_medication=$6, vitals=$7,
        updated_at=$8, device_id=$9, revision=$10, sync_status='synced'
      WHERE id=$11 RETURNING *;`,
      [
        v.visitDate, v.visitType, v.diagnosis, v.symptoms,
        v.notes, v.prescribedMedication, v.vitals ? JSON.stringify(v.vitals) : null,
        v.updatedAt, v.deviceId, v.revision, id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    await markOperationProcessed(operationId, 'visit', id);
    res.json(result.rows[0]);
  },

  async softDelete(req: Request, res: Response) {
    const id = req.params.id as string;
    const { deviceId, updatedAt, revision } = req.body;
    const operationId = req.header('X-Operation-Id') || '';

    if (await isDuplicateOperation(operationId)) {
      const existing = await pool.query('SELECT * FROM visits WHERE id = $1;', [id]);
      return res.status(200).json(existing.rows[0] ?? { status: 'duplicate_ignored' });
    }

    const result = await pool.query(
      `UPDATE visits SET is_deleted=TRUE, updated_at=$1, device_id=$2, revision=$3, sync_status='synced'
       WHERE id=$4 RETURNING *;`,
      [updatedAt, deviceId, revision, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    await markOperationProcessed(operationId, 'visit', id);
    res.json(result.rows[0]);
  },
};