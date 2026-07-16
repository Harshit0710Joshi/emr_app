export interface VisitRow {
  id: string;
  patient_id: string;
  visit_date: string;
  visit_type: string;
  diagnosis: string | null;
  symptoms: string | null;
  notes: string | null;
  prescribed_medication: string | null;
  vitals: object | null;
  created_at: string;
  updated_at: string;
  device_id: string;
  revision: number;
  is_deleted: boolean;
  sync_status: string;
}