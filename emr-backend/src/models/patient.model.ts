export interface PatientRow {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
  device_id: string;
  revision: number;
  is_deleted: boolean;
  sync_status: string;
}