import { IsIn } from 'class-validator';

export class DevLoginDto {
  @IsIn(['doctor', 'patient'])
  role!: 'doctor' | 'patient';
}
