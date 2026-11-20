import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { CompetitionService } from './competition.service';
import { CompetitionController } from './competition.controller';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { ArenaService } from './arena.service';
import { ArenaController } from './arena.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { EventAnalyticsService } from './event-analytics.service';

@Module({
  imports: [DatabaseModule, AuthModule, CodeExecutionModule],
  controllers: [
    CompetitionController,
    QuestionsController,
    ArenaController,
    EvaluationController,
  ],
  providers: [
    CompetitionService,
    QuestionsService,
    ArenaService,
    EvaluationService,
    EventAnalyticsService,
  ],
  exports: [
    CompetitionService,
    QuestionsService,
    ArenaService,
    EvaluationService,
    EventAnalyticsService,
  ],
})
export class CompetitionModule {}
