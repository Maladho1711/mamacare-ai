import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@mamacare/shared-types';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { SubscribeDto } from './dto/subscribe.dto';

interface AuthenticatedRequest {
  user: { id: string; role: UserRole };
  headers: Record<string, string>;
}

interface UnsubscribeBody {
  endpoint: string;
}

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /notifications/vapid-public-key
   * Route publique — retourne la clé VAPID pour que le SW puisse s'inscrire.
   */
  @Get('vapid-public-key')
  getVapidPublicKey(): { publicKey: string } {
    const publicKey = this.notificationsService.getVapidPublicKey();
    return { publicKey: publicKey ?? '' };
  }

  /**
   * POST /notifications/subscribe
   * Enregistre la subscription push de la patiente connectée.
   */
  @Post('subscribe')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Body() dto: SubscribeDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.notificationsService.saveSubscription(req.user.id, dto);
    return { message: 'Subscription enregistrée.' };
  }

  /**
   * DELETE /notifications/unsubscribe
   * Supprime la subscription push de la patiente connectée.
   */
  @Delete('unsubscribe')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Body() body: UnsubscribeBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.notificationsService.deleteSubscription(
      req.user.id,
      body.endpoint,
    );
    return { message: 'Subscription supprimée.' };
  }

  /**
   * POST /notifications/send-daily-reminders
   * Endpoint interne — déclenche l'envoi des rappels quotidiens.
   * Protégé par un header secret X-Internal-Secret.
   * Destiné à être appelé par un cron (ex: Render Cron Job, GitHub Actions).
   */
  @Post('send-daily-reminders')
  @HttpCode(HttpStatus.OK)
  async sendDailyReminders(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ sent: number; failed: number }> {
    const internalSecret = this.config.get<string>('INTERNAL_CRON_SECRET');
    const providedSecret = req.headers['x-internal-secret'];

    if (!internalSecret || providedSecret !== internalSecret) {
      this.logger.warn(
        'send-daily-reminders — tentative d\'accès avec secret invalide ou absent',
      );
      throw new UnauthorizedException('Secret interne invalide ou absent.');
    }

    return this.notificationsService.sendDailyReminders();
  }
}
