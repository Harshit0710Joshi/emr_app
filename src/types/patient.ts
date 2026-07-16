export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  gender: 'male' | 'female' | 'other';
  phone: string;
  address: string | null;
  bloodGroup: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;

  // Sync metadata (used later, present from day one)
  createdAt: string;
  updatedAt: string;
  deviceId: string;
  revision: number;
  isDeleted: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

// Fields the user actually fills in the registration form
export type PatientInput = Pick<
  Patient,
  | 'firstName'
  | 'lastName'
  | 'dateOfBirth'
  | 'gender'
  | 'phone'
  | 'address'
  | 'bloodGroup'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
>;