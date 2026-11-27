import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Sse,
  UseGuards,
  HttpCode,
  HttpStatus,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AuthTeamUser,
  AuthAdminUser,
  RecordProctoringEventDto,
  ProctoringPolicyDto,
  AdminProctoringActionDto,
} from '@ignitron/shared';
import { ProctoringService } from './proctoring.service';

@Controller('proctoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProctoringController {
  constructor(private readonly proctoringService: ProctoringService) {}

  // ---------------------------------------------------------------------------
  // PARTICIPANT ENDPOINTS
  // ---------------------------------------------------------------------------

  @Get('status')
  @Roles('TEAM')
  async getParticipantStatus(
    @CurrentUser() teamUser: AuthTeamUser,
    @Query('roundNumber') roundNumberStr?: string,
  ) {
    const roundNumber = roundNumberStr ? parseInt(roundNumberStr, 10) : undefined;
    const data = await this.proctoringService.getParticipantProctoringStatus(teamUser, roundNumber);
    return { success: true, data };
  }

  @Post('event')
  @Roles('TEAM')
  @HttpCode(HttpStatus.OK)
  async recordEvent(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto: RecordProctoringEventDto,
  ) {
    const data = await this.proctoringService.recordEvent(teamUser, dto);
    return { success: true, data };
  }

  // ---------------------------------------------------------------------------
  // ADMIN ENDPOINTS & REAL-TIME SSE STREAM
  // ---------------------------------------------------------------------------

  @Sse('events')
  @Roles('ADMIN')
  streamAdminEvents(): Observable<MessageEvent> {
    return this.proctoringService.getAdminEventStream();
  }

  @Get('incidents')
  @Roles('ADMIN')
  async listIncidents(
    @Query('roundNumber') roundNumberStr?: string,
    @Query('teamId') teamId?: string,
    @Query('participantId') participantId?: string,
    @Query('lockStatus') lockStatus?: string,
    @Query('date') date?: string,
  ) {
    const roundNumber = roundNumberStr ? parseInt(roundNumberStr, 10) : undefined;
    const data = await this.proctoringService.listAdminIncidents({
      roundNumber,
      teamId,
      participantId,
      lockStatus,
      date,
    });
    return { success: true, data };
  }

  @Get('audit-logs')
  @Roles('ADMIN')
  async listAuditLogs(@Query('teamId') teamId?: string) {
    const data = await this.proctoringService.listAuditLogs(teamId);
    return { success: true, data };
  }

  @Get('policy')
  @Roles('ADMIN')
  async getPolicy() {
    const data = await this.proctoringService.getPolicy();
    return { success: true, data };
  }

  @Put('policy')
  @Roles('ADMIN')
  async updatePolicy(
    @CurrentUser() admin: AuthAdminUser,
    @Body() dto: Partial<ProctoringPolicyDto>,
  ) {
    const data = await this.proctoringService.updatePolicy(admin, dto);
    return { success: true, data };
  }

  @Post('actions')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async performAction(
    @CurrentUser() admin: AuthAdminUser,
    @Body() dto: AdminProctoringActionDto,
  ) {
    const data = await this.proctoringService.performAdminAction(admin, dto);
    return { success: true, data };
  }
}
