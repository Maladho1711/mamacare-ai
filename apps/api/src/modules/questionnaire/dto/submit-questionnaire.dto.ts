import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { QuestionnaireType } from '@mamacare/shared-types';

export class SubmitQuestionnaireDto {
  /**
   * Réponses au questionnaire : clé = identifiant question (Q1…Q13 ou N1…N6),
   * valeur = réponse normalisée (ex: 'oui', 'non', 'forte', 'pas_du_tout').
   */
  @IsObject()
  responses!: Record<string, string>;

  @IsEnum(QuestionnaireType, { message: 'Type invalide (pregnancy | postnatal)' })
  type!: QuestionnaireType;

  /** Semaine de grossesse calculée côté frontend depuis pregnancyStart */
  @IsInt()
  @Min(0)
  @Max(45)
  pregnancyWeek!: number;

  /** Jour de vie du bébé — requis pour les questionnaires post-natals */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(28)
  babyDayOfLife?: number;
}
