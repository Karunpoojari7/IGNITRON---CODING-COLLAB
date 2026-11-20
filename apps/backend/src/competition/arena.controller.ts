import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthTeamUser } from '@ignitron/shared';
import { ArenaService } from './arena.service';
import { EventAnalyticsService } from './event-analytics.service';
import {
  SaveMcqAnswerDto,
  SubmitMcqAnswersDto,
  ReportBugDto,
  SaveAnalyticsDraftDto,
  SelectAnalyticsOptionDto,
  SubmitAnalyticsQuestionDto,
} from '@ignitron/shared';

@Controller('arena')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEAM')
export class ArenaController {
  constructor(
    private readonly arenaService: ArenaService,
    private readonly eventAnalyticsService: EventAnalyticsService,
  ) {}

  /**
   * Contestant: Check access eligibility and competition state for a specific round
   */
  @Get('status/:roundNumber')
  async getRoundAccess(
    @CurrentUser() teamUser: AuthTeamUser,
    @Param('roundNumber', ParseIntPipe) roundNumber: number,
  ) {
    const data = await this.arenaService.assertRoundAccess(teamUser, roundNumber, 'READ');
    return {
      success: true,
      data: {
        roundNumber,
        durationMinutes: data.round.durationMinutes,
        eligibilityStatus: data.progress.eligibilityStatus,
        participationStatus: data.progress.participationStatus,
        isRoundActive: data.isRoundActive,
        isPaused: data.isPaused,
        remainingSeconds: data.remainingSeconds,
        deadlineAt: data.state?.deadlineAt ? data.state.deadlineAt.toISOString() : null,
      },
    };
  }

  /**
   * Contestant: Get current MCQ arena state (questions, answers, timer)
   */
  @Get('mcq/state')
  async getMcqState(@CurrentUser() teamUser: AuthTeamUser) {
    const data = await this.arenaService.getMcqArenaState(teamUser);
    return { success: true, data };
  }

  /**
   * Contestant: Autosave single MCQ answer
   */
  @Post('mcq/save')
  @HttpCode(HttpStatus.OK)
  async saveMcqAnswer(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto: SaveMcqAnswerDto,
  ) {
    return this.arenaService.saveMcqAnswer(teamUser, dto);
  }

  /**
   * Contestant: Submit final MCQ answers for Round 1
   */
  @Post('mcq/submit')
  @HttpCode(HttpStatus.OK)
  async submitMcq(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto?: SubmitMcqAnswersDto,
  ) {
    const data = await this.arenaService.submitMcqRound(teamUser, dto?.autoSubmit || false);
    return { success: true, data };
  }

  /**
   * Contestant: Get current Bug Hunt arena state (briefing, faulty code, isolated defects)
   */
  @Get('bug-hunt/state')
  async getBugHuntState(@CurrentUser() teamUser: AuthTeamUser) {
    const data = await this.arenaService.getBugHuntArenaState(teamUser);
    return { success: true, data };
  }

  /**
   * Contestant: Report suspected faulty code token/expression in Bug Hunt
   */
  @Post('bug-hunt/report-bug')
  @HttpCode(HttpStatus.OK)
  async reportBug(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto: ReportBugDto,
  ) {
    const data = await this.arenaService.reportBug(teamUser, dto);
    return { success: true, data };
  }

  /**
   * Contestant: Get workspace draft for a round and case number
   */
  @Get('workspace/draft')
  async getDraft(
    @CurrentUser() teamUser: AuthTeamUser,
    @Query('roundNumber') roundNumberStr?: string,
    @Query('caseNumber') caseNumberStr?: string,
  ) {
    const roundNumber = roundNumberStr ? parseInt(roundNumberStr, 10) : 2;
    const caseNumber = caseNumberStr ? parseInt(caseNumberStr, 10) : 1;
    const data = await this.arenaService.getWorkspaceDraft(teamUser, roundNumber, caseNumber);
    return { success: true, data };
  }

  /**
   * Contestant: Save workspace draft
   */
  @Post('workspace/draft')
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body()
    body: {
      roundNumber: number;
      caseNumber?: number;
      sourceCode: string;
      language: string;
    },
  ) {
    const data = await this.arenaService.saveWorkspaceDraft(
      teamUser,
      body.roundNumber,
      body.caseNumber || 1,
      body.sourceCode,
      body.language,
    );
    return { success: true, data };
  }

  /**
   * Contestant: Submit code for Round 2 or Round 3
   */
  @Post('workspace/submit')
  @HttpCode(HttpStatus.OK)
  async submitCode(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body()
    body: {
      roundNumber: number;
      caseNumber?: number;
      sourceCode: string;
      language: string;
    },
  ) {
    const data = await this.arenaService.submitCode(
      teamUser,
      body.roundNumber,
      body.caseNumber || 1,
      body.sourceCode,
      body.language,
    );
    return { success: true, data };
  }

  // ============================================================================
  // ROUND 3: EVENT ANALYTICS ENGINE ENDPOINTS
  // ============================================================================

  /**
   * Contestant: Get current Round 3 Event Analytics state (dataset meta, 3 cases, 6 questions, drafts, scores)
   */
  @Get('analytics/state')
  async getAnalyticsState(@CurrentUser() teamUser: AuthTeamUser) {
    const data = await this.eventAnalyticsService.getAnalyticsArenaState(teamUser);
    return { success: true, data };
  }

  /**
   * Contestant: Get dataset metadata (file directory, schemas, preview rows)
   */
  @Get('analytics/dataset-meta')
  async getDatasetMeta(@CurrentUser() teamUser: AuthTeamUser) {
    await this.arenaService.assertRoundAccess(teamUser, 3, 'READ');
    const data = this.eventAnalyticsService.getDatasetMeta();
    return { success: true, data };
  }

  /**
   * Contestant: Get paginated preview of a specific dataset CSV
   */
  @Get('analytics/dataset-preview/:filename')
  async getDatasetPreview(
    @CurrentUser() teamUser: AuthTeamUser,
    @Param('filename') filename: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
  ) {
    await this.arenaService.assertRoundAccess(teamUser, 3, 'READ');
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const data = this.eventAnalyticsService.getDatasetPreview(filename, page, limit, search);
    return { success: true, data };
  }

  /**
   * Contestant: Download an individual dataset CSV or JSON
   */
  @Get('analytics/dataset-download/:filename')
  async downloadDatasetFile(
    @CurrentUser() teamUser: AuthTeamUser,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    await this.arenaService.assertRoundAccess(teamUser, 3, 'READ');
    const { fullPath, mimeType } = this.eventAnalyticsService.getDatasetFilePath(filename);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(fullPath);
  }

  /**
   * Contestant: Save code draft for an analytical question
   */
  @Post('analytics/draft')
  @HttpCode(HttpStatus.OK)
  async saveAnalyticsDraft(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto: SaveAnalyticsDraftDto,
  ) {
    const data = await this.eventAnalyticsService.saveDraft(teamUser, dto);
    return { success: true, data };
  }

  /**
   * Contestant: Save selected MCQ option for Q1, Q3, or Q5
   */
  @Post('analytics/select-option')
  @HttpCode(HttpStatus.OK)
  async selectAnalyticsOption(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto: SelectAnalyticsOptionDto,
  ) {
    const data = await this.eventAnalyticsService.selectOption(teamUser, dto);
    return { success: true, data };
  }

  /**
   * Contestant: Test-run Python analytical code against sample test cases
   */
  @Post('analytics/test-run')
  @HttpCode(HttpStatus.OK)
  async testRunAnalytics(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() body: { questionId: string; sourceCode: string },
  ) {
    const data = await this.eventAnalyticsService.executeSampleTest(
      teamUser,
      body.questionId,
      body.sourceCode,
    );
    return { success: true, data };
  }

  /**
   * Contestant: Submit an individual analytical question (evaluated against all test cases or option key)
   */
  @Post('analytics/submit-question')
  @HttpCode(HttpStatus.OK)
  async submitAnalyticsQuestion(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto: SubmitAnalyticsQuestionDto,
  ) {
    const data = await this.eventAnalyticsService.submitQuestion(teamUser, dto);
    return { success: true, data };
  }

  /**
   * Contestant: Finalize Round 3 submission
   */
  @Post('analytics/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizeRound3(@CurrentUser() teamUser: AuthTeamUser) {
    const data = await this.eventAnalyticsService.finalizeRound3(teamUser);
    return { success: true, data };
  }
}
