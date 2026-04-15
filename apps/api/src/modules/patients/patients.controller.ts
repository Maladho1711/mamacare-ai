import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@mamacare/shared-types';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

interface AuthenticatedRequest {
  user: { id: string; role: UserRole };
}

@Controller('patients')
@UseGuards(JwtGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /** GET /patients/me — profil de la patiente connect\u00e9e */
  @Get('me')
  @Roles(UserRole.PATIENT)
  findMe(@Req() req: AuthenticatedRequest) {
    return this.patientsService.findByUserId(req.user.id);
  }

  /** GET /patients/me/doctor \u2014 infos du m\u00e9decin de la patiente connect\u00e9e */
  @Get('me/doctor')
  @Roles(UserRole.PATIENT)
  async findMyDoctor(@Req() req: AuthenticatedRequest) {
    return this.patientsService.findMyDoctor(req.user.id);
  }

  /** GET /patients — liste tri\u00e9e par risque (doctor only) */
  @Get()
  @Roles(UserRole.DOCTOR)
  findAll(@Req() req: AuthenticatedRequest) {
    return this.patientsService.findAll(req.user.id);
  }

  /** GET /patients/:id — fiche patiente (doctor only) */
  @Get(':id')
  @Roles(UserRole.DOCTOR)
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.patientsService.findOne(id, req.user.id);
  }

  /** POST /patients — créer une patiente (doctor only) */
  @Post()
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePatientDto, @Req() req: AuthenticatedRequest) {
    return this.patientsService.create(req.user.id, dto);
  }

  /** PATCH /patients/:id — modifier une patiente (doctor only) */
  @Patch(':id')
  @Roles(UserRole.DOCTOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.patientsService.update(id, req.user.id, dto);
  }
}
