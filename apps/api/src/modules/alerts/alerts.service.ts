import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AlertLevel } from '@mamacare/shared-types';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { isDevMode } from '../../shared/dev-mode';
import { DEV_ALERTS } from '../../shared/dev-mocks';
import { WhatsAppService } from './whatsapp.service';
import { SmsService } from './sms.service';

/** Délai SMS fallback si WhatsApp non livré — CLAUDE.md Règle 2 */
const SMS_FALLBACK_DELAY_MS = 5 * 60 * 1000;

type AlertRow = {
  id: string;
  patient_id: string;
  response_id: string | null;
  alert_type: string;
  message: string;
  whatsapp_sent: boolean;
  whatsapp_at: string | null;
  sms_sent: boolean;
  sms_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

type NotificationLogParams = {
  alertId: string;
  patientId: string;
  channel: 'whatsapp' | 'sms' | 'push';
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly whatsapp: WhatsAppService,
    private readonly sms: SmsService,
  ) {}

  /**
   * ORDRE IMPÉRATIF — CLAUDE.md Règle 2.
   *
   * a. INSERT dans alerts (Supabase)
   * b. WhatsApp → UPDATE whatsapp_sent si succès
   * c. SMS fallback après 5 min si WhatsApp échoue
   * d. INSERT dans notification_logs à chaque tentative
   */
  /**
   * Retourne l'alertId créé — utilisé par QuestionnaireService pour lier
   * l'alerte à la réponse une fois celle-ci insérée en BDD.
   */
  async triggerAlert(
    patientId: string,
    responseId: string | null,
    alertType: AlertLevel,
    message: string,
  ): Promise<string> {
    if (isDevMode()) {
      const mockId = `dev-alert-${Date.now()}`;
      this.logger.log(
        `[DEV] Alerte ${alertType.toUpperCase()} simulée — patient: ${patientId}`,
      );
      return mockId;
    }

    // ── a. INSERT dans alerts ────────────────────────────────────────────────
    const { data: alert, error: alertError } = await this.supabase
      .getClient()
      .from('alerts')
      .insert({
        patient_id: patientId,
        response_id: responseId,
        alert_type: alertType,
        message,
      })
      .select()
      .single();

    if (alertError || !alert) {
      this.logger.error('Impossible de créer l\'alerte en BDD', alertError);
      throw new InternalServerErrorException('Erreur création alerte');
    }

    const alertId = (alert as AlertRow).id;
    this.logger.log(
      `Alerte ${alertType.toUpperCase()} créée (id: ${alertId}) — patient: ${patientId}`,
    );

    // ── Récupérer le téléphone du médecin ────────────────────────────────────
    const doctorPhone = await this.getDoctorPhone(patientId);

    if (!doctorPhone) {
      this.logger.error(
        `Téléphone médecin introuvable pour patient ${patientId}`,
      );
      return alertId;
    }

    // ── b. WhatsApp → UPDATE si succès ───────────────────────────────────────
    const whatsappResult = await this.whatsapp.sendAlert(doctorPhone, message);

    await this.logNotification({
      alertId,
      patientId,
      channel: 'whatsapp',
      recipient: doctorPhone,
      message,
      status: whatsappResult.success ? 'sent' : 'failed',
    });

    if (whatsappResult.success) {
      await this.supabase
        .getClient()
        .from('alerts')
        .update({
          whatsapp_sent: true,
          whatsapp_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      this.logger.log(`WhatsApp confirmé — alerte ${alertId}`);
      return alertId;
    }

    // ── c. SMS fallback après 5 min ──────────────────────────────────────────
    this.logger.warn(
      `WhatsApp échoué → SMS fallback dans 5 min — alerte ${alertId}`,
    );

    setTimeout(() => {
      void this.sendSmsFallback(alertId, patientId, doctorPhone, message);
    }, SMS_FALLBACK_DELAY_MS);

    return alertId;
  }

  async resolveAlert(alertId: string, doctorId: string): Promise<void> {
    if (isDevMode()) {
      const idx = DEV_ALERTS.findIndex((a) => a.id === alertId);
      if (idx !== -1) {
        DEV_ALERTS[idx] = {
          ...DEV_ALERTS[idx]!,
          resolved_by: doctorId,
          resolved_at: new Date().toISOString(),
        };
      }
      return;
    }

    // Vérifier que l'alerte existe
    const { data: alert } = await this.supabase
      .getClient()
      .from('alerts')
      .select('patient_id')
      .eq('id', alertId)
      .single();

    if (!alert) {
      throw new NotFoundException(`Alerte introuvable`);
    }

    // Vérifier que le médecin a bien accès à cette patiente
    const { data: patient } = await this.supabase
      .getClient()
      .from('patients')
      .select('id')
      .eq('id', (alert as { patient_id: string }).patient_id)
      .eq('doctor_id', doctorId)
      .single();

    if (!patient) {
      throw new ForbiddenException('Accès refusé à cette alerte');
    }

    const { error } = await this.supabase
      .getClient()
      .from('alerts')
      .update({
        resolved_by: doctorId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      throw new InternalServerErrorException(
        `Impossible de résoudre l'alerte ${alertId}`,
      );
    }
  }

  async getUnresolvedAlerts(doctorId: string) {
    if (isDevMode()) {
      return DEV_ALERTS.filter((a) => a.resolved_at === null);
    }

    // Étape 1 — Récupérer les IDs des patientes du médecin
    const { data: patients, error: patientsError } = await this.supabase
      .getClient()
      .from('patients')
      .select('id, full_name, phone')
      .eq('doctor_id', doctorId);

    if (patientsError) {
      throw new InternalServerErrorException(patientsError.message);
    }

    const rows = (patients ?? []) as Array<{
      id: string;
      full_name: string;
      phone: string;
    }>;

    if (rows.length === 0) return [];

    const patientIds = rows.map((p) => p.id);
    const patientMap = new Map(rows.map((p) => [p.id, p]));

    // Étape 2 — Alertes non résolues pour ces patientes
    const { data: alerts, error: alertsError } = await this.supabase
      .getClient()
      .from('alerts')
      .select('*')
      .in('patient_id', patientIds)
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (alertsError) {
      throw new InternalServerErrorException(alertsError.message);
    }

    // Enrichir chaque alerte avec les infos de la patiente
    return ((alerts ?? []) as AlertRow[]).map((alert) => ({
      ...alert,
      patient: patientMap.get(alert.patient_id) ?? null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Méthodes privées
  // ---------------------------------------------------------------------------

  private async sendSmsFallback(
    alertId: string,
    patientId: string,
    phone: string,
    message: string,
  ): Promise<void> {
    this.logger.log(`SMS fallback → alerte ${alertId}`);

    const smsResult = await this.sms.sendSms(phone, message);

    await this.logNotification({
      alertId,
      patientId,
      channel: 'sms',
      recipient: phone,
      message,
      status: smsResult.success ? 'sent' : 'failed',
    });

    if (smsResult.success) {
      await this.supabase
        .getClient()
        .from('alerts')
        .update({
          sms_sent: true,
          sms_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      this.logger.log(`SMS fallback livré — alerte ${alertId}`);
    } else {
      this.logger.error(`SMS fallback échoué — alerte ${alertId}`);
    }
  }

  private async getDoctorPhone(patientId: string): Promise<string | null> {
    const { data: patient } = await this.supabase
      .getClient()
      .from('patients')
      .select('doctor_id')
      .eq('id', patientId)
      .single();

    if (!patient) return null;

    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('phone')
      .eq('id', (patient as { doctor_id: string }).doctor_id)
      .single();

    return (profile as { phone: string } | null)?.phone ?? null;
  }

  private async logNotification(params: NotificationLogParams): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('notification_logs')
      .insert({
        alert_id: params.alertId,
        patient_id: params.patientId,
        channel: params.channel,
        recipient: params.recipient,
        message: params.message,
        status: params.status,
        error_message: params.errorMessage ?? null,
      });

    if (error) {
      this.logger.error('Erreur notification_logs', error);
    }
  }
}
