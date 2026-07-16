import { Request, Response } from 'express';
import { pool } from '../config/database';

export const visitController = {
  async getByPatientId(req: Request, res: Response) {
    const { patientId } = req.params;
    const result = await pool.query(
      'SELECT * FROM visits WHERE patient_id = $1 AND is_deleted = FALSE ORDER BY visit_date DESC;',
      [patientId]
    );
    res.json(result.rows);
  },

  async create(req: Request, res: Response) {
    const v = req.body;
    const result = await pool.query(
      `INSERT INTO visits (
        id, patient_id, visit_date, visit_type, diagnosis, symptoms,
        notes, prescribed_medication, vitals,
        created_at, updated_at, device_id, revision, is_deleted, sync_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *;`,
      [
        v.id, v.patientId, v.visitDate, v.visitType, v.diagnosis, v.symptoms,
        v.notes, v.prescribedMedication, v.vitals ? JSON.stringify(v.vitals) : null,
        v.createdAt, v.updatedAt, v.deviceId, v.revision, v.isDeleted, 'synced',
      ]
    );
    res.status(201).json(result.rows[0]);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const v = req.body;
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
    res.json(result.rows[0]);
  },
  // visit.controller.ts
async getChangedSince(req: Request, res: Response) {
  const { since } = req.query;
  const result = await pool.query(
    'SELECT * FROM visits WHERE updated_at > $1 ORDER BY updated_at ASC;',
    [since || '1970-01-01T00:00:00Z']
  );
  res.json(result.rows);
},

  async softDelete(req: Request, res: Response) {
    const { id } = req.params;
    const { deviceId, updatedAt, revision } = req.body;
    const result = await pool.query(
      `UPDATE visits SET is_deleted=TRUE, updated_at=$1, device_id=$2, revision=$3, sync_status='synced'
       WHERE id=$4 RETURNING *;`,
      [updatedAt, deviceId, revision, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json(result.rows[0]);
  },
};