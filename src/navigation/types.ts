export type RootStackParamList = {
  PatientList: undefined;
  PatientRegistration: { patientId?: string } | undefined;
  PatientProfile: { patientId: string };
  VisitHistory: { patientId: string };
  AddEditVisit: { patientId: string; visitId?: string };
  PeerSync: undefined;
  SyncDashboard: undefined;
};