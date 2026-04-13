import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@mamacare/shared-types';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PatientsService } from '../patients/patients.service';
import { QuestionnaireService } from './questionnaire.service';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

interface AuthenticatedRequest {
  user: { id: string; role: UserRole };
}

@Controller('questionnaire')
@UseGuards(JwtGuard, RolesGuard)
export class QuestionnaireController {
  constructor(
    private readonly questionnaireService: QuestionnaireService,
    private readonly patientsService: PatientsService,
  ) {}

  /**
   * POST /questionnaire/submit — patiente soumet son questionnaire du jour.
   * Retourne { alertLevel, triggeredRules, explanation } pour l'écran résultat.
   */
  @Post('submit')
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Body() dto: SubmitQuestionnaireDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Résoudre patientId depuis l'userId Supabase Auth
    const patient = await this.patientsService.findByUserId(req.user.id);
    return this.questionnaireService.submit(patient.id, dto);
  }

  /**
   * GET /questionnaire/history/:patientId — historique 30 jours (doctor only).
   */
  @Get('history/:patientId')
  @Roles(UserRole.DOCTOR)
  getHistory(
    @Param('patientId') patientId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.questionnaireService.getHistory(patientId, req.user.id);
  }

  /**
   * GET /questionnaire/my-history — historique 30 jours de la patiente connectée.
   */
  @Get('my-history')
  @Roles(UserRole.PATIENT)
  async getMyHistory(@Req() req: AuthenticatedRequest) {
    const patient = await this.patientsService.findByUserId(req.user.id);
    return this.questionnaireService.getMyHistory(patient.id);
  }

  /**
   * GET /questionnaire/today — la patiente a-t-elle déjà soumis aujourd'hui ?
   */
  @Get('today')
  @Roles(UserRole.PATIENT)
  async getTodayStatus(@Req() req: AuthenticatedRequest) {
    const patient = await this.patientsService.findByUserId(req.user.id);
    return this.questionnaireService.getTodayStatus(patient.id);
  }
}
