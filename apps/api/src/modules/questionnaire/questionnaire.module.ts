import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AiModule } from '../ai/ai.module';
import { PatientsModule } from '../patients/patients.module';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';
import { WhoRulesService } from './who-rules.service';

@Module({
  imports: [AuthModule, AlertsModule, AiModule, PatientsModule],
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService, WhoRulesService],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
