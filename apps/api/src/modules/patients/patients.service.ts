import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { AlertLevel, IPatient, PatientStatus } from '@mamacare/shared-types';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { SmsService } from '../alerts/sms.service';
import { AiService } from '../ai/ai.service';
import { SummaryHistoryEntry } from '../ai/prompts/medical.prompt';
import { isDevMode } from '../../shared/dev-mode';
import { DEV_PATIENTS } from '../../shared/dev-mocks';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
/** Ordre de priorité pour le tri du dashboard médecin */
const RISK_PRIORITY: Record<string, number> = {
  red: 0,
  orange: 1,
  green: 2,
};

type PatientRow = {
  id: string;
  user_id: string | null;
  doctor_id: string;
  full_name: string;
  phone: string;
  pregnancy_start: string;
  expected_term: string;
  status: string;
  risk_level: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  archived_at: string | null;
  archive_reason: string | null;
};

type QuestionnaireSubmissionRow = {
  submitted_at: string;
  alert_level: string;
  triggered_rules: string[];
  ai_analysis: string | null;
};

/** Extension locale de IPatient avec les champs d'archivage */
export type PatientWithArchiving = IPatient & {
  isActive: boolean;
  archivedAt: Date | null;
  archiveReason: string | null;
};

/** Mock en mémoire enrichi pour le mode dev */
type DevPatientExtended = IPatient & {
  isActive: boolean;
  archivedAt: Date | null;
  archiveReason: string | null;
};

const DEV_PATIENTS_EXTENDED: DevPatientExtended[] = [];

/** URL de la PWA envoyée dans le SMS d'onboarding */
const PWA_URL = 'https://mamacare-app.vercel.app';

/** Cache mémoire pour les résumés IA — TTL 24h */
type SummaryCacheEntry = {
  summary: string;
  generatedAt: string;
  cachedAt: number; // timestamp ms — pour comparer avec Date.now()
};

/** Résultat de generateSummary */
export interface PatientSummaryResult {
  summary: string;
  generatedAt: string;
  cached: boolean;
}

/** TTL du cache résumé IA — 24 heures en millisecondes */
const SUMMARY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PatientsService implements OnModuleInit {
  private readonly logger = new Logger(PatientsService.name);
  /** Cache mémoire des résumés IA : clé = patientId */
  private readonly summaryCache = new Map<string, SummaryCacheEntry>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly sms: SmsService,
    private readonly ai: AiService,
  ) {}

  /** Initialise les mocks dev enrichis depuis DEV_PATIENTS */
  onModuleInit(): void {
    if (isDevMode() && DEV_PATIENTS_EXTENDED.length === 0) {
      for (const p of DEV_PATIENTS) {
        DEV_PATIENTS_EXTENDED.push({
          ...p,
          isActive: true,
          archivedAt: null,
          archiveReason: null,
        });
      }
    }
  }

  async create(doctorId: string, dto: CreatePatientDto): Promise<PatientWithArchiving> {
    if (isDevMode()) {
      const mock: DevPatientExtended = {
        id:             `dev-patient-${Date.now()}`,
        userId:         null,
        doctorId,
        fullName:       dto.fullName,
        phone:          dto.phone,
        pregnancyStart: new Date(dto.pregnancyStart),
        expectedTerm:   new Date(dto.expectedTerm),
        status:         PatientStatus.PREGNANT,
        riskLevel:      AlertLevel.GREEN,
        notes:          dto.notes,
        createdAt:      new Date(),
        updatedAt:      new Date(),
        isActive:       true,
        archivedAt:     null,
        archiveReason:  null,
      };
      DEV_PATIENTS_EXTENDED.push(mock);

      // En mode dev : on simule l'envoi sans appeler Africa's Talking
      this.logger.log(
        `[DEV] SMS onboarding simulé → ${dto.phone} (patiente : ${dto.fullName})`,
      );

      return mock;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .insert({
        doctor_id: doctorId,
        full_name: dto.fullName,
        phone: dto.phone,
        pregnancy_start: dto.pregnancyStart,
        expected_term: dto.expectedTerm,
        notes: dto.notes ?? null,
        status: PatientStatus.PREGNANT,
        risk_level: AlertLevel.GREEN,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    const patient = this.mapRow(data as PatientRow);

    // SMS d'onboarding — non-bloquant : un échec n'annule pas la création
    void this.sendOnboardingSms(patient.phone, patient.fullName);

    return patient;
  }

  /**
   * Envoie le SMS d'onboarding à la patiente.
   * Isolé dans sa propre méthode pour ne jamais bloquer `create()`.
   */
  private async sendOnboardingSms(phone: string, fullName: string): Promise<void> {
    const message =
      `Bonjour ${fullName} ! Votre médecin vous a inscrite sur MamaCare AI. ` +
      `Remplissez votre questionnaire quotidien ici : ${PWA_URL}\n` +
      `Répondez STOP pour vous désabonner.`;

    try {
      const result = await this.sms.sendSms(phone, message);
      if (result.success) {
        this.logger.log(`SMS onboarding envoyé → ${phone}`);
      } else {
        this.logger.warn(`SMS onboarding non livré → ${phone}`);
      }
    } catch (err) {
      this.logger.error(`SMS onboarding exception → ${phone}`, err);
    }
  }

  /** Liste triée RED → ORANGE → GREEN pour le dashboard médecin */
  async findAll(
    doctorId: string,
    includeArchived: boolean = false,
  ): Promise<PatientWithArchiving[]> {
    if (isDevMode()) {
      return [...DEV_PATIENTS_EXTENDED]
        .filter((p) => p.doctorId === doctorId)
        .filter((p) => includeArchived || p.isActive)
        .sort(
          (a, b) =>
            (RISK_PRIORITY[a.riskLevel] ?? 3) -
            (RISK_PRIORITY[b.riskLevel] ?? 3),
        );
    }

    let query = this.supabase
      .getClient()
      .from('patients')
      .select('*')
      .eq('doctor_id', doctorId);

    if (!includeArchived) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw new InternalServerErrorException(error.message);

    return ((data ?? []) as PatientRow[])
      .sort(
        (a, b) =>
          (RISK_PRIORITY[a.risk_level] ?? 3) -
          (RISK_PRIORITY[b.risk_level] ?? 3),
      )
      .map((row) => this.mapRow(row));
  }

  async findOne(id: string, doctorId: string): Promise<PatientWithArchiving> {
    if (isDevMode()) {
      const mock = DEV_PATIENTS_EXTENDED.find(
        (p) => p.id === id && p.doctorId === doctorId,
      );
      if (!mock) throw new NotFoundException('Patiente introuvable');
      return mock;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('*')
      .eq('id', id)
      .eq('doctor_id', doctorId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Patiente introuvable`);
    }
    return this.mapRow(data as PatientRow);
  }

  async update(
    id: string,
    doctorId: string,
    dto: UpdatePatientDto,
  ): Promise<PatientWithArchiving> {
    if (isDevMode()) {
      const idx = DEV_PATIENTS_EXTENDED.findIndex(
        (p) => p.id === id && p.doctorId === doctorId,
      );
      if (idx === -1) throw new NotFoundException('Patiente introuvable');
      const current = DEV_PATIENTS_EXTENDED[idx]!;
      const updated: DevPatientExtended = {
        ...current,
        phone:        dto.phone        ?? current.phone,
        expectedTerm: dto.expectedTerm ? new Date(dto.expectedTerm) : current.expectedTerm,
        status:       (dto.status as PatientStatus | undefined) ?? current.status,
        notes:        dto.notes        ?? current.notes,
        updatedAt:    new Date(),
      };
      DEV_PATIENTS_EXTENDED[idx] = updated;
      return updated;
    }

    const updates: Record<string, unknown> = {};
    if (dto.phone !== undefined) updates['phone'] = dto.phone;
    if (dto.expectedTerm !== undefined) updates['expected_term'] = dto.expectedTerm;
    if (dto.status !== undefined) updates['status'] = dto.status;
    if (dto.notes !== undefined) updates['notes'] = dto.notes;

    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .update(updates)
      .eq('id', id)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Patiente introuvable ou accès refusé`);
    }
    return this.mapRow(data as PatientRow);
  }

  /**
   * Appelé par QuestionnaireService après évaluation OMS.
   * Pas de vérification doctorId ici — le backend opère avec service role.
   */
  async updateRiskLevel(id: string, level: AlertLevel): Promise<void> {
    if (isDevMode()) {
      const idx = DEV_PATIENTS_EXTENDED.findIndex((p) => p.id === id);
      if (idx !== -1) {
        DEV_PATIENTS_EXTENDED[idx] = { ...DEV_PATIENTS_EXTENDED[idx]!, riskLevel: level };
      }
      return;
    }

    const { error } = await this.supabase
      .getClient()
      .from('patients')
      .update({ risk_level: level })
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
  }

  /**
   * Résout le profil patiente depuis l'userId Supabase Auth.
   * Utilisé par QuestionnaireController pour identifier la patiente connectée.
   */
  async findByUserId(userId: string): Promise<PatientWithArchiving> {
    if (isDevMode()) {
      const mock = DEV_PATIENTS_EXTENDED.find(
        (p) => p.userId === userId || p.id === userId,
      );
      if (!mock) throw new NotFoundException('Profil patiente introuvable');
      return mock;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profil patiente introuvable');
    }
    return this.mapRow(data as PatientRow);
  }

  /**
   * Retourne les infos du m\u00e9decin d'une patiente (pour les appels d'urgence).
   */
  async findMyDoctor(userId: string): Promise<{ fullName: string; phone: string }> {
    const patient = await this.findByUserId(userId);

    if (isDevMode()) {
      // En dev, on connait le profil doctor
      const { DEV_PROFILES } = await import('../../shared/dev-mode');
      if (patient.doctorId === DEV_PROFILES.doctor.sub) {
        return {
          fullName: DEV_PROFILES.doctor.full_name,
          phone:    DEV_PROFILES.doctor.phone,
        };
      }
      return { fullName: 'Dr. (inconnu)', phone: '+224000000000' };
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('full_name, phone')
      .eq('id', patient.doctorId)
      .single();

    if (error || !data) {
      return { fullName: 'Votre m\u00e9decin', phone: '' };
    }

    return {
      fullName: (data as { full_name: string }).full_name,
      phone:    (data as { phone: string }).phone,
    };
  }

  /**
   * Génère un résumé IA des 7 derniers questionnaires d'une patiente.
   *
   * Accès réservé au médecin responsable de la patiente.
   * Cache mémoire TTL 24h — suffisant pour le MVP.
   *
   * RÈGLE MÉDICALE — Claude génère UNIQUEMENT le texte de synthèse.
   * Il ne décide jamais du niveau d'alerte ni de conduite à tenir.
   */
  async generateSummary(
    patientId: string,
    doctorId: string,
  ): Promise<PatientSummaryResult> {
    // ── Mode DEV : résumé mock, pas d'appel Supabase ni Claude ────────────────
    if (isDevMode()) {
      return {
        summary:
          "Tendance stable sur les 7 derniers jours. Aucun signe d'alerte récurrent détecté. Patiente coopérante — bonne adhésion au suivi.",
        generatedAt: new Date().toISOString(),
        cached: false,
      };
    }

    // ── Vérifier que le médecin a accès à cette patiente ──────────────────────
    const { data: patient } = await this.supabase
      .getClient()
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .eq('doctor_id', doctorId)
      .single();

    if (!patient) {
      throw new ForbiddenException('Accès refusé à cette patiente');
    }

    // ── Cache : retourner l'entrée si toujours valide (< 24h) ─────────────────
    const cached = this.summaryCache.get(patientId);
    if (cached && Date.now() - cached.cachedAt < SUMMARY_CACHE_TTL_MS) {
      return {
        summary: cached.summary,
        generatedAt: cached.generatedAt,
        cached: true,
      };
    }

    // ── Récupérer les 7 derniers questionnaires via Supabase ──────────────────
    const { data: rows, error } = await this.supabase
      .getClient()
      .from('questionnaire_responses')
      .select('submitted_at, alert_level, triggered_rules, ai_analysis')
      .eq('patient_id', patientId)
      .order('submitted_at', { ascending: false })
      .limit(30);

    if (error) throw new InternalServerErrorException(error.message);

    const submissions = (rows ?? []) as QuestionnaireSubmissionRow[];

    // ── Moins de 2 entrées → pas assez de données ─────────────────────────────
    if (submissions.length < 2) {
      return {
        summary:
          'Pas assez de données pour générer un résumé (minimum 2 questionnaires requis).',
        generatedAt: new Date().toISOString(),
        cached: false,
      };
    }

    // ── Construire l'historique pour le prompt ────────────────────────────────
    const history: SummaryHistoryEntry[] = submissions.map((row) => ({
      date: new Date(row.submitted_at).toLocaleDateString('fr-FR'),
      level: row.alert_level,
      rules: row.triggered_rules ?? [],
      analysis: row.ai_analysis,
    }));

    // ── Appel AiService → résumé textuel uniquement ───────────────────────────
    const summary = await this.ai.generatePatientSummary(history);
    const generatedAt = new Date().toISOString();

    // ── Mettre en cache ───────────────────────────────────────────────────────
    this.summaryCache.set(patientId, {
      summary,
      generatedAt,
      cachedAt: Date.now(),
    });

    return { summary, generatedAt, cached: false };
  }

  /** Retourne le nombre de semaines écoulées depuis le début de la grossesse */
  calculatePregnancyWeek(pregnancyStart: Date | string): number {
    const start = new Date(pregnancyStart);
    const diffMs = Date.now() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)));
  }

  /**
   * Archive une patiente (is_active = false).
   * Seul le médecin propriétaire peut archiver.
   */
  async archive(
    id: string,
    doctorId: string,
    reason?: string,
  ): Promise<PatientWithArchiving> {
    if (isDevMode()) {
      const idx = DEV_PATIENTS_EXTENDED.findIndex(
        (p) => p.id === id && p.doctorId === doctorId,
      );
      if (idx === -1) throw new NotFoundException('Patiente introuvable');
      const updated: DevPatientExtended = {
        ...DEV_PATIENTS_EXTENDED[idx]!,
        isActive:      false,
        archivedAt:    new Date(),
        archiveReason: reason ?? null,
        updatedAt:     new Date(),
      };
      DEV_PATIENTS_EXTENDED[idx] = updated;
      return updated;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .update({
        is_active:      false,
        archived_at:    new Date().toISOString(),
        archive_reason: reason ?? null,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', id)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Patiente introuvable ou accès refusé');
    }
    return this.mapRow(data as PatientRow);
  }

  /**
   * Réactive une patiente archivée (is_active = true).
   * Seul le médecin propriétaire peut réactiver.
   */
  async reactivate(
    id: string,
    doctorId: string,
  ): Promise<PatientWithArchiving> {
    if (isDevMode()) {
      const idx = DEV_PATIENTS_EXTENDED.findIndex(
        (p) => p.id === id && p.doctorId === doctorId,
      );
      if (idx === -1) throw new NotFoundException('Patiente introuvable');
      const updated: DevPatientExtended = {
        ...DEV_PATIENTS_EXTENDED[idx]!,
        isActive:      true,
        archivedAt:    null,
        archiveReason: null,
        updatedAt:     new Date(),
      };
      DEV_PATIENTS_EXTENDED[idx] = updated;
      return updated;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .update({
        is_active:      true,
        archived_at:    null,
        archive_reason: null,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', id)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Patiente introuvable ou accès refusé');
    }
    return this.mapRow(data as PatientRow);
  }

  private mapRow(row: PatientRow): PatientWithArchiving {
    return {
      id:             row.id,
      userId:         row.user_id,
      doctorId:       row.doctor_id,
      fullName:       row.full_name,
      phone:          row.phone,
      pregnancyStart: new Date(row.pregnancy_start),
      expectedTerm:   new Date(row.expected_term),
      status:         row.status as PatientStatus,
      riskLevel:      row.risk_level as AlertLevel,
      notes:          row.notes ?? undefined,
      createdAt:      new Date(row.created_at),
      updatedAt:      new Date(row.updated_at),
      isActive:       row.is_active ?? true,
      archivedAt:     row.archived_at ? new Date(row.archived_at) : null,
      archiveReason:  row.archive_reason ?? null,
    };
  }
}
