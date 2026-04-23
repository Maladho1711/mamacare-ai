import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@mamacare/shared-types';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

interface AuthenticatedRequest {
  user: { id: string; role: UserRole };
  headers: Record<string, string | string[] | undefined>;
}

@Controller('appointments')
export class AppointmentsController {
  private readonly logger = new Logger(AppointmentsController.name);

  constructor(
    private readonly appointments: AppointmentsService,
    private readonly config: ConfigService,
  ) {}

  /** POST /appointments — créer un rendez-vous (médecin) */
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(req.user.id, dto);
  }

  /** GET /appointments?from=...&to=... — liste pour médecin connecté */
  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointments.findByDoctor(
      req.user.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  /** GET /appointments/patient/:id — RDV d'une patiente (médecin) */
  @Get('patient/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  findByPatient(@Param('id') patientId: string) {
    return this.appointments.findByPatient(patientId);
  }

  /** PATCH /appointments/:id — modifier / marquer honoré / annuler */
  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(id, req.user.id, dto);
  }

  /** DELETE /appointments/:id */
  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.appointments.delete(id, req.user.id);
  }

  /**
   * POST /appointments/send-reminders
   * Endpoint interne protégé — déclenché par le cron Render (18h UTC la veille).
   */
  @Post('send-reminders')
  @HttpCode(HttpStatus.OK)
  async sendReminders(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ sent: number; failed: number }> {
    const secret = this.config.get<string>('INTERNAL_CRON_SECRET');
    const provided = req.headers['x-internal-secret'];

    if (!secret || provided !== secret) {
      this.logger.warn('send-reminders — secret invalide');
      throw new UnauthorizedException('Secret interne invalide ou absent.');
    }

    return this.appointments.sendReminders();
  }
}
