import { AlertLevel, PatientStatus } from './enums';
export interface IPatient {
    id: string;
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
