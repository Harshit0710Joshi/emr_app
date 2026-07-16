import { BridgeServer } from 'react-native-http-bridge-refurbished';
import { getDatabase } from '@database/db';
import { getDeviceId } from '@utils/device';

const PEER_SERVER_PORT = 8081;
let serverInstance: BridgeServer | null = null;

async function getAllLocalData() {
  const db = await getDatabase();
  const patients = await db.getAllAsync<any>('SELECT * FROM patients;');
  const visits = await db.getAllAsync<any>('SELECT * FROM visits;');
  return { patients, visits };
}

async function mergeIncomingData(patients: any[], visits: any[]) {
  const db = await getDatabase();

  for (const p of patients) {
    const local = await db.getFirstAsync<any>('SELECT updated_at FROM patients WHERE id = ?;', [p.id]);
    if (!local || new Date(p.updated_at) > new Date(local.updated_at)) {
      await db.runAsync(
        `INSERT INTO patients (
          id, first_name, last_name, date_of_birth, gender, phone,
          address, blood_group, emergency_contact_name, emergency_contact_phone,
          created_at, updated_at, device_id, revision, is_deleted, sync_status
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          first_name=excluded.first_name, last_name=excluded.last_name,
          date_of_birth=excluded.date_of_birth, gender=excluded.gender, phone=excluded.phone,
          address=excluded.address, blood_group=excluded.blood_group,
          emergency_contact_name=excluded.emergency_contact_name,
          emergency_contact_phone=excluded.emergency_contact_phone,
          updated_at=excluded.updated_at, device_id=excluded.device_id,
          revision=excluded.revision, is_deleted=excluded.is_deleted, sync_status='synced';`,
        [
          p.id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone,
          p.address, p.blood_group, p.emergency_contact_name, p.emergency_contact_phone,
          p.created_at, p.updated_at, p.device_id, p.revision, p.is_deleted ? 1 : 0,
        ]
      );
    }
  }

  for (const v of visits) {
    const local = await db.getFirstAsync<any>('SELECT updated_at FROM visits WHERE id = ?;', [v.id]);
    if (!local || new Date(v.updated_at) > new Date(local.updated_at)) {
      await db.runAsync(
        `INSERT INTO visits (
          id, patient_id, visit_date, visit_type, diagnosis, symptoms,
          notes, prescribed_medication, vitals,
          created_at, updated_at, device_id, revision, is_deleted, sync_status
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          visit_date=excluded.visit_date, visit_type=excluded.visit_type, diagnosis=excluded.diagnosis,
          symptoms=excluded.symptoms, notes=excluded.notes, prescribed_medication=excluded.prescribed_medication,
          vitals=excluded.vitals, updated_at=excluded.updated_at, device_id=excluded.device_id,
          revision=excluded.revision, is_deleted=excluded.is_deleted, sync_status='synced';`,
        [
          v.id, v.patient_id, v.visit_date, v.visit_type, v.diagnosis, v.symptoms,
          v.notes, v.prescribed_medication, v.vitals ? JSON.stringify(v.vitals) : null,
          v.created_at, v.updated_at, v.device_id, v.revision, v.is_deleted ? 1 : 0,
        ]
      );
    }
  }
}

export const PeerServer = {
  start() {
    if (serverInstance) return;

    // 'http_service' = internal service name, true = enable logging (set false in production)
    serverInstance = new BridgeServer('peer_sync_service', true);

    serverInstance.get('/peer/data', async (req, res) => {
      try {
        const data = await getAllLocalData();
        const deviceId = await getDeviceId();
        return { deviceId, ...data };
      } catch (err: any) {
        return { error: err.message };
      }
    });

    serverInstance.post('/peer/data', async (req: any, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await mergeIncomingData(body.patients ?? [], body.visits ?? []);
    return { status: 'merged' };
  } catch (err: any) {
    return { error: err.message };
  }
});

    serverInstance.listen(PEER_SERVER_PORT);
    console.log(`Peer server started on port ${PEER_SERVER_PORT}`);
  },

  stop() {
    if (!serverInstance) return;
    serverInstance.stop();
    serverInstance = null;
  },

  isRunning() {
    return serverInstance !== null;
  },

  mergeIncomingData,
};