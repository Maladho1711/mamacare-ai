import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PatientStatus } from '@mamacare/shared-types';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Format international requis (ex: +224600000001)',
  })
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date du terme invalide (YYYY-MM-DD)' })
  expectedTerm?: string;

  @IsOptional()
  @IsEnum(PatientStatus, { message: 'Statut invalide' })
  status?: PatientStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
