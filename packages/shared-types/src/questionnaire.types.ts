import { AlertLevel, QuestionnaireType } from './enums';

export interface IQuestionnaireResponse {
  id: string;
  patientId: string;
  type: QuestionnaireType;
  responses: Record<string, string>;
  alertLevel: AlertLevel;
  triggeredRules: string[];
  aiAnalysis: string;
  submittedAt: Date;
}

export interface IWhoRuleResult {
  alertLevel: AlertLevel;
  triggeredRules: string[];
}
