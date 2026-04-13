import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est requis' })
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Format international requis (ex: +224600000001)',
  })
  phone!: string;

  @IsDateString({}, { message: 'Date de début de grossesse invalide (YYYY-MM-DD)' })
  pregnancyStart!: string;

  @IsDateString({}, { message: 'Date du terme invalide (YYYY-MM-DD)' })
  expectedTerm!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
