import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { SmsService } from '../alerts/sms.service';
import { isDevMode } from '../../shared/dev-mode';
import { CreateAppointmentDto, AppointmentType } from './dto/create-appointment.dto';
import {
  UpdateAppointmentDto,
  AppointmentStatus,
} from './dto/update-appointment.dto';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  type: AppointmentType;
  title: string;
  description: string | null;
  scheduledAt: Date;
  location: string | null;
  status: AppointmentStatus;
  reminderSentAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type AppointmentRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  type: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  status: string;
  reminder_sent_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const DEV_APPOINTMENTS: Appointment[] = [];

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly sms: SmsService,
  ) {}

  async create(doctorId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    if (isDevMode()) {
      const mock: Appointment = {
        id: `dev-appt-${Date.now()}`,
        patientId: dto.patientId,
        doctorId,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        scheduledAt: new Date(dto.scheduledAt),
        location: dto.location ?? null,
        status: AppointmentStatus.SCHEDULED,
        reminderSentAt: null,
        completedAt: null,
        notes: dto.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      DEV_APPOINTMENTS.push(mock);
      return mock;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('appointments')
      .insert({
        patient_id: dto.patientId,
        doctor_id: doctorId,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        scheduled_at: dto.scheduledAt,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapRow(data as AppointmentRow);
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    if (isDevMode()) {
      return DEV_APPOINTMENTS.filter((a) => a.patientId === patientId).sort(
        (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
      );
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return ((data ?? []) as AppointmentRow[]).map((r) => this.mapRow(r));
  }

  async findByDoctor(
    doctorId: string,
    from?: Date,
    to?: Date,
  ): Promise<Appointment[]> {
    if (isDevMode()) {
      return DEV_APPOINTMENTS.filter((a) => a.doctorId === doctorId);
    }

    let query = this.supabase
      .getClient()
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: true });

    if (from) query = query.gte('scheduled_at', from.toISOString());
    if (to) query = query.lte('scheduled_at', to.toISOString());

    const { data, error } = await query;

    if (error) throw new InternalServerErrorException(error.message);
    return ((data ?? []) as AppointmentRow[]).map((r) => this.mapRow(r));
  }

  async update(
    id: string,
    doctorId: string,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    if (isDevMode()) {
      const idx = DEV_APPOINTMENTS.findIndex(
        (a) => a.id === id && a.doctorId === doctorId,
      );
      if (idx === -1) throw new NotFoundException('Rendez-vous introuvable');
      const cur = DEV_APPOINTMENTS[idx]!;
      const updated: Appointment = {
        ...cur,
        type: dto.type ?? cur.type,
        title: dto.title ?? cur.title,
        description: dto.description ?? cur.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : cur.scheduledAt,
        location: dto.location ?? cur.location,
        status: dto.status ?? cur.status,
        notes: dto.notes ?? cur.notes,
        completedAt:
          dto.status === AppointmentStatus.COMPLETED
            ? new Date()
            : cur.completedAt,
        updatedAt: new Date(),
      };
      DEV_APPOINTMENTS[idx] = updated;
      return updated;
    }

    const updates: Record<string, unknown> = {};
    if (dto.type !== undefined) updates['type'] = dto.type;
    if (dto.title !== undefined) updates['title'] = dto.title;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.scheduledAt !== undefined) updates['scheduled_at'] = dto.scheduledAt;
    if (dto.location !== undefined) updates['location'] = dto.location;
    if (dto.status !== undefined) updates['status'] = dto.status;
    if (dto.notes !== undefined) updates['notes'] = dto.notes;
    if (dto.status === AppointmentStatus.COMPLETED) {
      updates['completed_at'] = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Rendez-vous introuvable ou accès refusé');
    }
    return this.mapRow(data as AppointmentRow);
  }

  async delete(id: string, doctorId: string): Promise<void> {
    if (isDevMode()) {
      const idx = DEV_APPOINTMENTS.findIndex(
        (a) => a.id === id && a.doctorId === doctorId,
      );
      if (idx === -1) throw new NotFoundException('Rendez-vous introuvable');
      DEV_APPOINTMENTS.splice(idx, 1);
      return;
    }

    const { error } = await this.supabase
      .getClient()
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('doctor_id', doctorId);

    if (error) throw new ForbiddenException(error.message);
  }

  /**
   * Envoie les SMS de rappel pour tous les rendez-vous de demain.
   * Déclenché par le cron Render (18h UTC la veille).
   */
  async sendReminders(): Promise<{ sent: number; failed: number }> {
    if (isDevMode()) {
      this.logger.log('[DEV] Rappels RDV simulés');
      return { sent: 0, failed: 0 };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const { data, error } = await this.supabase
      .getClient()
      .from('appointments')
      .select('id, patient_id, title, scheduled_at, location, patients!inner(phone, full_name)')
      .eq('status', 'scheduled')
      .is('reminder_sent_at', null)
      .gte('scheduled_at', tomorrow.toISOString())
      .lt('scheduled_at', dayAfter.toISOString());

    if (error) {
      this.logger.error('Erreur récupération rappels RDV', error.message);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    type Row = {
      id: string;
      patient_id: string;
      title: string;
      scheduled_at: string;
      location: string | null;
      patients: { phone: string; full_name: string };
    };

    for (const row of (data ?? []) as unknown as Row[]) {
      const when = new Date(row.scheduled_at);
      const hour = when.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const loc = row.location ? ` à ${row.location}` : '';
      const msg =
        `Rappel MamaCare : ${row.patients.full_name}, vous avez "${row.title}" ` +
        `demain à ${hour}${loc}. N'oubliez pas ! Répondez STOP pour ne plus recevoir.`;

      const res = await this.sms.sendSms(row.patients.phone, msg);
      if (res.success) {
        sent++;
        await this.supabase
          .getClient()
          .from('appointments')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', row.id);
      } else {
        failed++;
      }
    }

    this.logger.log(`Rappels RDV envoyés : ${sent} OK, ${failed} échecs`);
    return { sent, failed };
  }

  private mapRow(row: AppointmentRow): Appointment {
    return {
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      type: row.type as AppointmentType,
      title: row.title,
      description: row.description,
      scheduledAt: new Date(row.scheduled_at),
      location: row.location,
      status: row.status as AppointmentStatus,
      reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
