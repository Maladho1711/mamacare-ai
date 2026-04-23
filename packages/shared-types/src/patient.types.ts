import { AlertLevel, PatientStatus } from './enums';

export interface IPatient {
  id: string;
  /** Null tant que la patiente n'a pas créé son compte via OTP */
  userId: string | null;
  doctorId: string;
  fullName: string;
  phone: string;
  pregnancyStart: Date;
  expectedTerm: Date;
  status: PatientStatus;
  riskLevel: AlertLevel;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
