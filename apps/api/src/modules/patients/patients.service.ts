import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AlertLevel, IPatient, PatientStatus } from '@mamacare/shared-types';
import { SupabaseService } from '../../shared/supabase/supabase.service';
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
};

@Injectable()
export class PatientsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(doctorId: string, dto: CreatePatientDto): Promise<IPatient> {
    if (isDevMode()) {
      const mock: IPatient = {
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
      };
      DEV_PATIENTS.push(mock);
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
    return this.mapRow(data as PatientRow);
  }

  /** Liste triée RED → ORANGE → GREEN pour le dashboard médecin */
  async findAll(doctorId: string): Promise<IPatient[]> {
    if (isDevMode()) {
      return [...DEV_PATIENTS]
        .filter((p) => p.doctorId === doctorId)
        .sort(
          (a, b) =>
            (RISK_PRIORITY[a.riskLevel] ?? 3) -
            (RISK_PRIORITY[b.riskLevel] ?? 3),
        );
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('*')
      .eq('doctor_id', doctorId);

    if (error) throw new InternalServerErrorException(error.message);

    return ((data ?? []) as PatientRow[])
      .sort(
        (a, b) =>
          (RISK_PRIORITY[a.risk_level] ?? 3) -
          (RISK_PRIORITY[b.risk_level] ?? 3),
      )
      .map((row) => this.mapRow(row));
  }

  async findOne(id: string, doctorId: string): Promise<IPatient> {
    if (isDevMode()) {
      const mock = DEV_PATIENTS.find((p) => p.id === id && p.doctorId === doctorId);
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
  ): Promise<IPatient> {
    if (isDevMode()) {
      const idx = DEV_PATIENTS.findIndex(
        (p) => p.id === id && p.doctorId === doctorId,
      );
      if (idx === -1) throw new NotFoundException('Patiente introuvable');
      const current = DEV_PATIENTS[idx]!;
      const updated: IPatient = {
        ...current,
        phone:        dto.phone        ?? current.phone,
        expectedTerm: dto.expectedTerm ? new Date(dto.expectedTerm) : current.expectedTerm,
        status:       (dto.status as PatientStatus | undefined) ?? current.status,
        notes:        dto.notes        ?? current.notes,
        updatedAt:    new Date(),
      };
      DEV_PATIENTS[idx] = updated;
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
      const idx = DEV_PATIENTS.findIndex((p) => p.id === id);
      if (idx !== -1) {
        DEV_PATIENTS[idx] = { ...DEV_PATIENTS[idx]!, riskLevel: level };
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
  async findByUserId(userId: string): Promise<IPatient> {
    if (isDevMode()) {
      const mock = DEV_PATIENTS.find((p) => p.userId === userId || p.id === userId);
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

  /** Retourne le nombre de semaines écoulées depuis le début de la grossesse */
  calculatePregnancyWeek(pregnancyStart: Date | string): number {
    const start = new Date(pregnancyStart);
    const diffMs = Date.now() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)));
  }

  private mapRow(row: PatientRow): IPatient {
    return {
      id: row.id,
      userId: row.user_id,
      doctorId: row.doctor_id,
      fullName: row.full_name,
      phone: row.phone,
      pregnancyStart: new Date(row.pregnancy_start),
      expectedTerm: new Date(row.expected_term),
      status: row.status as PatientStatus,
      riskLevel: row.risk_level as AlertLevel,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
