import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './shared/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    SupabaseModule,
    AuthModule,
    PatientsModule,
    QuestionnaireModule,
    AlertsModule,
    AiModule,
  ],
})
export class AppModule {}
