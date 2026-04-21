import { IsOptional, IsString } from 'class-validator';

export class ArchivePatientDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
