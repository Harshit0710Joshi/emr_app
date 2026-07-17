import { getDatabase } from '../db';
import { getDeviceId } from '@utils/device';

type EntityType = 'patient' | 'visit';
type Source = 'local_write' | 'cloud_pull' | 'peer_pull' | 'conflict_resolution';

/** Fields to ignore when diffing — these change on every write and aren't meaningful content diffs */
const IGNORED_FIELDS = new Set(['updatedAt', 'updated_at', 'revision', 'syncStatus', 'sync_status', 'deviceId', 'device_id']);

function diffFields(before: any, after: any): string[] {
  if (!before) return ['(new record)'];
  const changed: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const beforeVal = JSON.stringify(before[key]);
    const afterVal = JSON.stringify(after[key]);
    if (beforeVal !== afterVal) {
      changed.push(key);
    }
  }
  return changed;
}

export const RevisionHistoryRepository = {
  async record(
    entityType: EntityType,
    entityId: string,
    revision: number,
    snapshot: any,
    source: Source,
    previousSnapshot?: any
  ): Promise<void> {
    const db = await getDatabase();
    const deviceId = await getDeviceId();
    const changedFields = diffFields(previousSnapshot, snapshot);

    await db.runAsync(
      `INSERT INTO revision_history (
        entity_type, entity_id, revision, snapshot, changed_fields, device_id, source, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        entityType,
        entityId,
        revision,
        JSON.stringify(snapshot),
        JSON.stringify(changedFields),
        deviceId,
        source,
        new Date().toISOString(),
      ]
    );
  },

  async getHistoryFor(entityType: EntityType, entityId: string): Promise<any[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM revision_history WHERE entity_type = ? AND entity_id = ? ORDER BY recorded_at DESC;`,
      [entityType, entityId]
    );
    return rows.map((r) => ({
      ...r,
      snapshot: JSON.parse(r.snapshot),
      changedFields: JSON.parse(r.changed_fields ?? '[]'),
    }));
  },
};