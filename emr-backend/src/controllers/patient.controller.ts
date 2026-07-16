import { Request, Response } from 'express';
import { pool } from '../config/database';

export const patientController = {
  async getAll(req: Request, res: Response) {
    const result = await pool.query(
      'SELECT * FROM patients WHERE is_deleted = FALSE ORDER BY updated_at DESC;'
    );
    res.json(result.rows);
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  },

  async create(req: Request, res: Response) {
    const p = req.body;
    const result = await pool.query(
      `INSERT INTO patients (
        id, first_name, last_name, date_of_birth, gender, phone,
        address, blood_group, emergency_contact_name, emergency_contact_phone,
        created_at, updated_at, device_id, revision, is_deleted, sync_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *;`,
      [
        p.id, p.firstName, p.lastName, p.dateOfBirth, p.gender, p.phone,
        p.address, p.bloodGroup, p.emergencyContactName, p.emergencyContactPhone,
        p.createdAt, p.updatedAt, p.deviceId, p.revision, p.isDeleted, 'synced',
      ]
    );
    res.status(201).json(result.rows[0]);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const p = req.body;
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
    res.json(result.rows[0]);
  },
  async getChangedSince(req: Request, res: Response) {
  const { since } = req.query;
  const result = await pool.query(
    'SELECT * FROM patients WHERE updated_at > $1 ORDER BY updated_at ASC;',
    [since || '1970-01-01T00:00:00Z']
  );
  res.json(result.rows);
},

  async softDelete(req: Request, res: Response) {
    const { id } = req.params;
    const { deviceId, updatedAt, revision } = req.body;
    const result = await pool.query(
      `UPDATE patients SET is_deleted=TRUE, updated_at=$1, device_id=$2, revision=$3, sync_status='synced'
       WHERE id=$4 RETURNING *;`,
      [updatedAt, deviceId, revision, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  },
};