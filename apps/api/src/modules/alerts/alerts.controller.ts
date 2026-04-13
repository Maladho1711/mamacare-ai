import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@mamacare/shared-types';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AlertsService } from './alerts.service';

interface AuthenticatedRequest {
  user: { id: string; role: UserRole };
}

@Controller('alerts')
@UseGuards(JwtGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /** GET /alerts — alertes non résolues du médecin, triées par date */
  @Get()
  @Roles(UserRole.DOCTOR)
  getUnresolved(@Req() req: AuthenticatedRequest) {
    return this.alertsService.getUnresolvedAlerts(req.user.id);
  }

  /** PATCH /alerts/:id/resolve — marquer une alerte comme traitée */
  @Patch(':id/resolve')
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  resolve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.alertsService.resolveAlert(id, req.user.id);
  }
}
