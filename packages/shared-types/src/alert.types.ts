import { AlertLevel } from './enums';

export interface IAlert {
  id: string;
  patientId: string;
  responseId: string;
  alertType: AlertLevel;
  message: string;
  whatsappSent: boolean;
  whatsappAt?: Date;
  smsSent: boolean;
  smsAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}
