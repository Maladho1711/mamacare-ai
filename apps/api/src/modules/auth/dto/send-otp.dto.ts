import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Format international requis (ex: +224600000001)',
  })
  phone!: string;
}
