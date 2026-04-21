import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { ArchivePatientDto } from './dto/archive-patient.dto';

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

  /** GET /patients — liste triée par risque (doctor only) */
  @Get()
  @Roles(UserRole.DOCTOR)
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.patientsService.findAll(
      req.user.id,
      includeArchived === 'true',
    );
  }

  /** GET /patients/:id/summary — résumé IA des 7 derniers jours (doctor only) */
  @Get(':id/summary')
  @Roles(UserRole.DOCTOR)
  getSummary(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.patientsService.generateSummary(id, req.user.id);
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

  /** PATCH /patients/:id/archive — archiver une patiente (doctor only) */
  @Patch(':id/archive')
  @Roles(UserRole.DOCTOR)
  archive(
    @Param('id') id: string,
    @Body() dto: ArchivePatientDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.patientsService.archive(id, req.user.id, dto.reason);
  }

  /** PATCH /patients/:id/reactivate — réactiver une patiente archivée (doctor only) */
  @Patch(':id/reactivate')
  @Roles(UserRole.DOCTOR)
  reactivate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.patientsService.reactivate(id, req.user.id);
  }
}
