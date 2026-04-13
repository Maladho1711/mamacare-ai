import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Format international requis (ex: +224623436513)',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le code OTP est requis' })
  @Length(6, 6, { message: 'Le code OTP doit contenir exactement 6 chiffres' })
  token!: string;

  /** Mode dev uniquement — force le rôle sans passer par la table DEV_ACCOUNTS */
  @IsOptional()
  @IsString()
  @IsIn(['doctor', 'patient'])
  devRole?: 'doctor' | 'patient';
}
