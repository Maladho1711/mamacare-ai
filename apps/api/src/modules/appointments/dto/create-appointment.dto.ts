import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum AppointmentType {
  CPN = 'cpn',
  VACCINATION = 'vaccination',
  ULTRASOUND = 'ultrasound',
  CONSULTATION = 'consultation',
  POSTNATAL = 'postnatal',
}

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsEnum(AppointmentType, { message: 'Type de rendez-vous invalide' })
  type!: AppointmentType;

  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString({}, { message: 'Date invalide (format ISO)' })
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
