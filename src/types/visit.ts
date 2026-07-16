export interface Visit {
  id: string;
  patientId: string;
  visitDate: string; // ISO date string
  visitType: 'consultation' | 'follow-up' | 'emergency' | 'routine-checkup';
  diagnosis: string | null;
  symptoms: string | null;
  notes: string | null;
  prescribedMedication: string | null;
  vitals: {
    bloodPressure?: string;
    temperature?: string;
    pulse?: string;
    weight?: string;
  } | null;

  // Sync metadata
  createdAt: string;
  updatedAt: string;
  deviceId: string;
  revision: number;
  isDeleted: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export type VisitInput = Pick<
  Visit,
  | 'patientId'
  | 'visitDate'
  | 'visitType'
  | 'diagnosis'
  | 'symptoms'
  | 'notes'
  | 'prescribedMedication'
  | 'vitals'
>;