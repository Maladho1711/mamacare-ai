import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { SubscribeDto } from './dto/subscribe.dto';

/** Payload d'une notification push */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Ligne retournée par Supabase pour push_subscriptions */
interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

/** Ligne retournée pour les patients actifs sans soumission aujourd'hui */
interface ActivePatientRow {
  user_id: string | null;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * webpush est chargé dynamiquement dans onModuleInit pour éviter les
   * erreurs si le package n'est pas encore installé en environnement CI.
   * Type déclaré loosely mais les appels restent typés via les overloads.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private webpush: any;

  /** Indique si VAPID est correctement configuré */
  private vapidReady = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // Dynamic import — évite de crasher si web-push n'est pas installé
      this.webpush = await import('web-push');

      const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
      const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
      const subject = this.config.get<string>(
        'VAPID_SUBJECT',
        'mailto:contact@improove.co',
      );

      if (!publicKey || !privateKey) {
        this.logger.warn(
          'VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY absent — notifications push désactivées. ' +
          'Génère des clés avec : npx web-push generate-vapid-keys',
        );
        return;
      }

      this.webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidReady = true;
      this.logger.log('VAPID configuré — notifications push actives.');
    } catch (err) {
      this.logger.warn(
        `Impossible de charger web-push : ${err instanceof Error ? err.message : String(err)}. ` +
        'Notifications push désactivées.',
      );
    }
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  /**
   * Enregistre ou met à jour la subscription push d'un utilisateur.
   * Upsert sur (user_id, endpoint).
   */
  async saveSubscription(userId: string, dto: SubscribeDto): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: dto.endpoint,
          p256dh: dto.p256dh,
          auth_key: dto.auth,
        },
        { onConflict: 'user_id,endpoint' },
      );

    if (error) {
      this.logger.error(
        `saveSubscription — user ${userId} : ${error.message}`,
      );
      throw new Error('Impossible d\'enregistrer la subscription push.');
    }

    this.logger.log(`Subscription push enregistrée pour user ${userId}`);
  }

  /**
   * Supprime une subscription push par endpoint.
   */
  async deleteSubscription(userId: string, endpoint: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      this.logger.error(
        `deleteSubscription — user ${userId} : ${error.message}`,
      );
      throw new Error('Impossible de supprimer la subscription push.');
    }

    this.logger.log(`Subscription push supprimée pour user ${userId}`);
  }

  // ─── Envoi ────────────────────────────────────────────────────────────────

  /**
   * Envoie une notification push à tous les endpoints d'un utilisateur.
   * Si un endpoint renvoie 410 (Gone), il est supprimé automatiquement.
   */
  async sendPushToUser(
    userId: string,
    payload: PushPayload,
  ): Promise<void> {
    if (!this.vapidReady || !this.webpush) {
      this.logger.warn(
        `sendPushToUser — VAPID non configuré, notification ignorée pour user ${userId}`,
      );
      return;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .eq('user_id', userId);

    if (error) {
      this.logger.error(
        `sendPushToUser — lecture subscriptions user ${userId} : ${error.message}`,
      );
      return;
    }

    if (!data || data.length === 0) {
      this.logger.debug(`sendPushToUser — aucune subscription pour user ${userId}`);
      return;
    }

    const serializedPayload = JSON.stringify(payload);

    const sends = (data as PushSubscriptionRow[]).map(async (sub) => {
      try {
        await this.webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key,
            },
          },
          serializedPayload,
        );
        this.logger.debug(
          `Push envoyé à user ${userId} — endpoint: ${sub.endpoint.slice(0, 40)}...`,
        );
      } catch (err: unknown) {
        const statusCode = this.extractStatusCode(err);

        if (statusCode === 410) {
          // Subscription expirée — nettoyer
          this.logger.warn(
            `Subscription expirée (410) pour user ${userId}, suppression...`,
          );
          await this.deleteSubscription(userId, sub.endpoint);
        } else {
          this.logger.error(
            `Échec envoi push user ${userId} (status ${statusCode ?? 'inconnu'}) : ` +
            `${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    });

    await Promise.allSettled(sends);
  }

  /**
   * Envoie le rappel quotidien à toutes les patientes actives qui n'ont
   * pas encore soumis leur questionnaire aujourd'hui.
   * Retourne le compte de succès et d'échecs.
   */
  async sendDailyReminders(): Promise<{ sent: number; failed: number }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Patients actifs dont le user_id n'a PAS soumis de questionnaire aujourd'hui
    const { data: patients, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('user_id')
      .eq('is_active', true)
      .not('user_id', 'is', null);

    if (error) {
      this.logger.error(`sendDailyReminders — lecture patients : ${error.message}`);
      return { sent: 0, failed: 0 };
    }

    if (!patients || patients.length === 0) {
      this.logger.log('sendDailyReminders — aucune patiente active trouvée');
      return { sent: 0, failed: 0 };
    }

    // Récupérer les user_ids ayant déjà soumis aujourd'hui
    const allUserIds = (patients as ActivePatientRow[])
      .map((p) => p.user_id)
      .filter((id): id is string => id !== null);

    const { data: submissions } = await this.supabase
      .getClient()
      .from('questionnaire_submissions')
      .select('patient_id')
      .gte('submitted_at', `${today}T00:00:00.000Z`)
      .lte('submitted_at', `${today}T23:59:59.999Z`);

    // Construire un set des patient user_ids ayant déjà soumis
    // On doit joindre via la table patients pour retrouver user_id
    const submittedPatientIds = new Set<string>(
      (submissions ?? []).map(
        (s: { patient_id: string }) => s.patient_id,
      ),
    );

    // Pour filtrer par user_id, on récupère les patientes qui ont soumis aujourd'hui
    const { data: submittedPatients } = await this.supabase
      .getClient()
      .from('patients')
      .select('user_id')
      .in(
        'id',
        Array.from(submittedPatientIds),
      );

    const submittedUserIds = new Set<string>(
      (submittedPatients ?? [])
        .map((p: { user_id: string | null }) => p.user_id)
        .filter((id): id is string => id !== null),
    );

    // Ne garder que ceux qui n'ont PAS encore soumis
    const pending = allUserIds.filter((uid) => !submittedUserIds.has(uid));

    if (pending.length === 0) {
      this.logger.log('sendDailyReminders — toutes les patientes ont déjà soumis aujourd\'hui');
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    const payload: PushPayload = {
      title: 'MamaCare — Check-up quotidien',
      body: 'N\'oubliez pas votre check-up du jour ! Quelques minutes suffisent.',
      url: '/questionnaire',
      tag: 'daily-reminder',
    };

    const results = await Promise.allSettled(
      pending.map((userId) => this.sendPushToUser(userId, payload)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        this.logger.warn(`sendDailyReminders — échec pour un user : ${String(result.reason)}`);
      }
    }

    this.logger.log(
      `sendDailyReminders terminé — envoyés: ${sent}, échecs: ${failed}`,
    );
    return { sent, failed };
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────

  /** Extrait le statusCode d'une erreur web-push (qui expose .statusCode) */
  private extractStatusCode(err: unknown): number | undefined {
    if (
      err !== null &&
      typeof err === 'object' &&
      'statusCode' in err &&
      typeof (err as { statusCode: unknown }).statusCode === 'number'
    ) {
      return (err as { statusCode: number }).statusCode;
    }
    return undefined;
  }

  /** Retourne la clé publique VAPID (pour le frontend). */
  getVapidPublicKey(): string | undefined {
    return this.config.get<string>('VAPID_PUBLIC_KEY');
  }
}
