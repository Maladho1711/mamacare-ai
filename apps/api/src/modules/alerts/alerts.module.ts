import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { WhatsAppService } from './whatsapp.service';
import { SmsService } from './sms.service';

@Module({
  imports: [AuthModule],
  controllers: [AlertsController],
  providers: [AlertsService, WhatsAppService, SmsService],
  exports: [AlertsService],
})
export class AlertsModule {}
