import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  MessageEvent,
} from '@nestjs/common';
import { Subject, Observable, merge, interval, map } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import {
  AuthTeamUser,
  AuthAdminUser,
  ProctoringPolicyDto,
  RecordProctoringEventDto,
  ProctoringStatusDto,
  ProctoringRecordResultDto,
  ProctoringIncidentDto,
  ProctoringLockStatus,
  ProctoringAuditLogDto,
  AdminProctoringSummaryItemDto,
  AdminProctoringActionDto,
} from '@ignitron/shared';

@Injectable()
export class ProctoringService {
  private readonly logger = new Logger(ProctoringService.name);
  private readonly eventStream$ = new Subject<MessageEvent>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Real-time SSE stream for administrator notifications with 20s heartbeat keepalive.
   */
  getAdminEventStream(): Observable<MessageEvent> {
    const heartbeat$ = interval(20000).pipe(
      map(
        (): MessageEvent => ({
          type: 'HEARTBEAT',
          data: JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() }),
        }),
      ),
    );
    return merge(this.eventStream$.asObservable(), heartbeat$);
  }

  private emitAdminEvent(eventType: string, payload: any) {
    try {
      this.eventStream$.next({
        type: eventType,
        data: JSON.stringify({
          type: eventType,
          timestamp: new Date().toISOString(),
          payload,
        }),
      });
    } catch (err: any) {
      this.logger.warn(`Failed to emit SSE proctoring event: ${err?.message}`);
    }
  }

  /**
   * Get or initialize global anti-cheat policy configuration.
   */
  async getPolicy(): Promise<ProctoringPolicyDto> {
    const config = await this.prisma.proctoringConfig.upsert({
      where: { id: 'global' },
      update: {},
      create: {
        id: 'global',
        strictModeEnabled: true,
        maxWarningsBeforeLock: 1,
        autoRevokeThreshold: 3,
        monitorCopyEvents: true,
      },
    });

    return {
      strictModeEnabled: config.strictModeEnabled,
      maxWarningsBeforeLock: config.maxWarningsBeforeLock,
      autoRevokeThreshold: config.autoRevokeThreshold,
      monitorCopyEvents: config.monitorCopyEvents,
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  /**
   * Update global anti-cheat policy configuration (Admin only).
   */
  async updatePolicy(
    admin: AuthAdminUser,
    dto: Partial<ProctoringPolicyDto>,
  ): Promise<ProctoringPolicyDto> {
    const current = await this.getPolicy();

    const updated = await this.prisma.proctoringConfig.upsert({
      where: { id: 'global' },
      update: {
        strictModeEnabled:
          dto.strictModeEnabled !== undefined ? Boolean(dto.strictModeEnabled) : current.strictModeEnabled,
        maxWarningsBeforeLock:
          dto.maxWarningsBeforeLock !== undefined
            ? Math.max(1, Math.min(10, Number(dto.maxWarningsBeforeLock)))
            : current.maxWarningsBeforeLock,
        autoRevokeThreshold:
          dto.autoRevokeThreshold !== undefined
            ? Math.max(1, Math.min(20, Number(dto.autoRevokeThreshold)))
            : current.autoRevokeThreshold,
        monitorCopyEvents:
          dto.monitorCopyEvents !== undefined ? Boolean(dto.monitorCopyEvents) : current.monitorCopyEvents,
      },
      create: {
        id: 'global',
        strictModeEnabled: dto.strictModeEnabled ?? true,
        maxWarningsBeforeLock: dto.maxWarningsBeforeLock ?? 1,
        autoRevokeThreshold: dto.autoRevokeThreshold ?? 3,
        monitorCopyEvents: dto.monitorCopyEvents ?? true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'PROCTORING_POLICY_UPDATED',
        description: `Admin ${admin.email} updated anti-cheat policy (Strict=${updated.strictModeEnabled}, LockAfter=${updated.maxWarningsBeforeLock}, RevokeAt=${updated.autoRevokeThreshold}).`,
        metadata: {
          strictModeEnabled: updated.strictModeEnabled,
          maxWarningsBeforeLock: updated.maxWarningsBeforeLock,
          autoRevokeThreshold: updated.autoRevokeThreshold,
          monitorCopyEvents: updated.monitorCopyEvents,
        },
      },
    });

    const result: ProctoringPolicyDto = {
      strictModeEnabled: updated.strictModeEnabled,
      maxWarningsBeforeLock: updated.maxWarningsBeforeLock,
      autoRevokeThreshold: updated.autoRevokeThreshold,
      monitorCopyEvents: updated.monitorCopyEvents,
      updatedAt: updated.updatedAt.toISOString(),
    };

    this.emitAdminEvent('POLICY_UPDATED', result);
    return result;
  }

  /**
   * Authoritative server-side check: blocks locked, blocked, or disqualified participants.
   */
  async assertParticipantNotLocked(teamUser: AuthTeamUser, roundNumber?: number): Promise<void> {
    if (!teamUser || teamUser.type !== 'TEAM') {
      return;
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamUser.id },
      select: { status: true },
    });

    if (team?.status === 'DISQUALIFIED') {
      throw new ForbiddenException({
        code: 'PROCTORING_LOCKED',
        lockStatus: 'BLOCKED',
        isDisqualified: true,
        message: 'Your team has been disqualified from the competition. Workspace access is locked.',
      });
    }

    if (teamUser.sessionId) {
      const session = await this.prisma.teamSession.findUnique({
        where: { id: teamUser.sessionId },
        select: {
          status: true,
          lockStatus: true,
          lockReason: true,
        },
      });

      if (session && (session.lockStatus === 'LOCKED_PENDING_REVIEW' || session.lockStatus === 'BLOCKED')) {
        throw new ForbiddenException({
          code: 'PROCTORING_LOCKED',
          lockStatus: session.lockStatus,
          isDisqualified: false,
          message:
            session.lockReason ||
            'Competition access temporarily locked pending administrator review.',
        });
      }
    }

    if (roundNumber) {
      const round = await this.prisma.competitionRound.findUnique({
        where: { roundNumber },
        select: { id: true },
      });
      if (round) {
        const progress = await this.prisma.teamRoundProgress.findUnique({
          where: { teamId_roundId: { teamId: teamUser.id, roundId: round.id } },
          select: { participationStatus: true },
        });
        if (progress?.participationStatus === 'DISQUALIFIED') {
          throw new ForbiddenException({
            code: 'PROCTORING_LOCKED',
            lockStatus: 'BLOCKED',
            isDisqualified: true,
            message: `Your team has been disqualified from Round ${roundNumber}.`,
          });
        }
      }
    }
  }

  /**
   * Participant: Read current proctoring lock/review status.
   * Remains accessible even while locked so the Exam-Lock Overlay can poll/display review status.
   */
  async getParticipantProctoringStatus(
    teamUser: AuthTeamUser,
    roundNumber?: number,
  ): Promise<ProctoringStatusDto> {
    const policy = await this.getPolicy();
    const participantId = teamUser.activeParticipant?.id || '';

    const [session, team, incidents] = await Promise.all([
      teamUser.sessionId
        ? this.prisma.teamSession.findUnique({
            where: { id: teamUser.sessionId },
          })
        : Promise.resolve(null),
      this.prisma.team.findUnique({
        where: { id: teamUser.id },
        select: { status: true },
      }),
      this.prisma.proctoringIncident.findMany({
        where: {
          teamId: teamUser.id,
          ...(participantId ? { participantId } : {}),
          ...(roundNumber ? { roundNumber } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    let isDisqualified = team?.status === 'DISQUALIFIED';
    if (!isDisqualified && roundNumber) {
      const round = await this.prisma.competitionRound.findUnique({
        where: { roundNumber },
        select: { id: true },
      });
      if (round) {
        const progress = await this.prisma.teamRoundProgress.findUnique({
          where: { teamId_roundId: { teamId: teamUser.id, roundId: round.id } },
          select: { participationStatus: true },
        });
        if (progress?.participationStatus === 'DISQUALIFIED') {
          isDisqualified = true;
        }
      }
    }

    const lockStatus: ProctoringLockStatus = isDisqualified
      ? 'BLOCKED'
      : ((session?.lockStatus as ProctoringLockStatus) || 'ACTIVE');

    const latest = incidents[0] ? this.mapIncident(incidents[0]) : null;

    return {
      lockStatus,
      isDisqualified,
      lockReason: session?.lockReason || null,
      lockedAt: session?.lockedAt ? session.lockedAt.toISOString() : null,
      warningCount: session?.warningCount || 0,
      incidentCount: incidents.length,
      latestIncident: latest,
      policy,
    };
  }

  /**
   * Participant: Record an authenticated monitoring event (tab switch, page hidden, blur, copy).
   * Identity is strictly derived from the verified JWT/TeamSession (`teamUser`).
   */
  async recordEvent(
    teamUser: AuthTeamUser,
    dto: RecordProctoringEventDto,
  ): Promise<ProctoringRecordResultDto> {
    const policy = await this.getPolicy();
    const participantId = teamUser.activeParticipant?.id || 'unknown';
    const roundNumber = Number(dto.roundNumber) || 1;
    const now = new Date();

    const session = teamUser.sessionId
      ? await this.prisma.teamSession.findUnique({
          where: { id: teamUser.sessionId },
        })
      : null;

    const currentLockStatus: ProctoringLockStatus =
      (session?.lockStatus as ProctoringLockStatus) || 'ACTIVE';

    // 1. Verify round is genuinely active, unpaused, and within deadline
    const state = await this.prisma.competitionState.findUnique({ where: { id: 'global' } });
    const round = await this.prisma.competitionRound.findUnique({
      where: { roundNumber },
      select: { id: true, status: true },
    });

    const isCountdownActive = Boolean(
      state?.countdownEndsAt && state.countdownEndsAt.getTime() > now.getTime(),
    );
    const isRoundActive =
      !isCountdownActive &&
      !state?.isPaused &&
      state?.status === (`ROUND_${roundNumber}_ACTIVE` as any) &&
      round?.status !== 'COMPLETED' &&
      Boolean(!state?.deadlineAt || state.deadlineAt.getTime() > now.getTime());

    let isAlreadySubmitted = false;
    if (round) {
      const progress = await this.prisma.teamRoundProgress.findUnique({
        where: { teamId_roundId: { teamId: teamUser.id, roundId: round.id } },
        select: { participationStatus: true },
      });
      isAlreadySubmitted =
        progress?.participationStatus === 'SUBMITTED' ||
        progress?.participationStatus === 'DISQUALIFIED';
    }

    if (!isRoundActive || isAlreadySubmitted) {
      return {
        recorded: false,
        ignored: true,
        lockStatus: currentLockStatus,
        warningCount: session?.warningCount || 0,
        incidentCount: 0,
        message: 'Round is not active or already submitted; event ignored.',
      };
    }

    // 2. Respect copy monitoring policy
    if (dto.eventType === 'COPY_EVENT' && !policy.monitorCopyEvents) {
      return {
        recorded: false,
        ignored: true,
        lockStatus: currentLockStatus,
        warningCount: session?.warningCount || 0,
        incidentCount: 0,
        message: 'Copy event monitoring is disabled.',
      };
    }

    // 3. Idempotency & rapid-burst deduplication (suppress duplicate events from one physical tab switch)
    if (dto.idempotencyKey) {
      const existing = await this.prisma.proctoringIncident.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return {
          recorded: false,
          duplicate: true,
          lockStatus: currentLockStatus,
          warningCount: session?.warningCount || 0,
          incidentCount: 0,
          message: 'Duplicate monitoring event suppressed.',
        };
      }
    }

    const recentDuplicate = await this.prisma.proctoringIncident.findFirst({
      where: {
        teamId: teamUser.id,
        participantId,
        roundNumber,
        eventType: dto.eventType,
        createdAt: { gte: new Date(now.getTime() - 2000) },
      },
      select: { id: true },
    });
    if (recentDuplicate) {
      return {
        recorded: false,
        duplicate: true,
        lockStatus: currentLockStatus,
        warningCount: session?.warningCount || 0,
        incidentCount: 0,
        message: 'Rapid duplicate monitoring event suppressed.',
      };
    }

    // 4. Confidence classification
    const isPrimaryHiddenSignal =
      dto.eventType === 'TAB_SWITCH' || dto.eventType === 'PAGE_HIDDEN';
    const isBlurSignal = dto.eventType === 'WINDOW_BLUR';
    const confidence = isPrimaryHiddenSignal
      ? 'HIGH'
      : isBlurSignal
      ? 'LOW'
      : 'INFO';

    let newLockStatus: ProctoringLockStatus = currentLockStatus;
    let newWarningCount = session?.warningCount || 0;
    let lockReason = session?.lockReason || null;

    if (isPrimaryHiddenSignal && currentLockStatus === 'ACTIVE') {
      newWarningCount += 1;

      if (policy.strictModeEnabled && newWarningCount >= policy.maxWarningsBeforeLock) {
        newLockStatus = 'LOCKED_PENDING_REVIEW';
        lockReason = `Confirmed ${dto.eventType} detected during Round ${roundNumber} under strict proctoring policy.`;
      } else if (newWarningCount >= policy.autoRevokeThreshold) {
        newLockStatus = 'LOCKED_PENDING_REVIEW';
        lockReason = `Maximum focus warning threshold (${newWarningCount}/${policy.autoRevokeThreshold}) reached in Round ${roundNumber}.`;
      }
    }

    // 5. Persist incident record
    const incident = await this.prisma.proctoringIncident.create({
      data: {
        teamId: teamUser.id,
        participantId,
        sessionId: teamUser.sessionId || null,
        roundNumber,
        questionId: dto.questionId || null,
        arenaType: dto.arenaType || null,
        eventType: dto.eventType,
        confidence,
        idempotencyKey: dto.idempotencyKey || null,
        lockStatusAtEvent: newLockStatus,
        reviewStatus: newLockStatus === 'LOCKED_PENDING_REVIEW' ? 'PENDING' : 'WARNED',
        details: {
          details: dto.details || null,
          participantName: teamUser.activeParticipant?.fullName,
          teamName: teamUser.teamName,
          teamCode: teamUser.teamCode,
        },
      },
    });

    // 6. Update session lock state if changed or warning count incremented
    if (session && (newLockStatus !== currentLockStatus || newWarningCount !== session.warningCount)) {
      await this.prisma.teamSession.update({
        where: { id: session.id },
        data: {
          lockStatus: newLockStatus,
          warningCount: newWarningCount,
          lastIncidentId: incident.id,
          ...(newLockStatus !== currentLockStatus
            ? { lockedAt: now, lockReason }
            : {}),
        },
      });
    }

    // 7. Record activity log for primary or lock-triggering incidents
    if (isPrimaryHiddenSignal || newLockStatus !== currentLockStatus) {
      await this.prisma.activityLog.create({
        data: {
          actorType: 'TEAM',
          actorId: teamUser.id,
          action:
            newLockStatus === 'LOCKED_PENDING_REVIEW'
              ? 'PROCTORING_LOCK_TRIGGERED'
              : 'PROCTORING_INCIDENT_RECORDED',
          description: `Participant "${teamUser.activeParticipant?.fullName || 'Contestant'}" (${teamUser.teamName}) triggered ${dto.eventType} in Round ${roundNumber}. Lock status: ${newLockStatus}.`,
          metadata: {
            incidentId: incident.id,
            roundNumber,
            participantId,
            participantName: teamUser.activeParticipant?.fullName,
            teamName: teamUser.teamName,
            eventType: dto.eventType,
            confidence,
            lockStatus: newLockStatus,
          },
        },
      });
    }

    const mappedIncident: ProctoringIncidentDto = {
      ...this.mapIncident(incident),
      teamCode: teamUser.teamCode,
      teamName: teamUser.teamName,
      participantName: teamUser.activeParticipant?.fullName,
      participantEmail: teamUser.activeParticipant?.email,
      sessionStatus: session?.status || 'ACTIVE',
    };

    // 8. Push real-time SSE notification to Administrators
    this.emitAdminEvent('NEW_INCIDENT', mappedIncident);

    const totalCount = await this.prisma.proctoringIncident.count({
      where: { teamId: teamUser.id, participantId },
    });

    return {
      recorded: true,
      lockStatus: newLockStatus,
      warningCount: newWarningCount,
      incidentCount: totalCount,
      incident: mappedIncident,
      message:
        newLockStatus === 'LOCKED_PENDING_REVIEW'
          ? 'Workspace access temporarily locked pending administrator review.'
          : 'Monitoring event recorded.',
    };
  }

  /**
   * Admin: List structured incident summaries grouped by participant with filters.
   */
  async listAdminIncidents(filters: {
    roundNumber?: number;
    teamId?: string;
    participantId?: string;
    lockStatus?: string;
    date?: string;
  }): Promise<AdminProctoringSummaryItemDto[]> {
    const whereClause: any = {};
    if (filters.roundNumber) whereClause.roundNumber = Number(filters.roundNumber);
    if (filters.teamId) whereClause.teamId = filters.teamId;
    if (filters.participantId) whereClause.participantId = filters.participantId;
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00.000Z`);
      const end = new Date(`${filters.date}T23:59:59.999Z`);
      if (!isNaN(start.getTime())) {
        whereClause.createdAt = { gte: start, lte: end };
      }
    }

    const incidents = await this.prisma.proctoringIncident.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    if (incidents.length === 0) return [];

    const teamIds = Array.from(new Set(incidents.map((i) => i.teamId)));
    const participantIds = Array.from(new Set(incidents.map((i) => i.participantId)));

    const [teams, participants, sessions] = await Promise.all([
      this.prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, teamCode: true, teamName: true, status: true },
      }),
      this.prisma.participant.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, fullName: true, email: true },
      }),
      this.prisma.teamSession.findMany({
        where: { participantId: { in: participantIds } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          participantId: true,
          status: true,
          lockStatus: true,
          lockReason: true,
          lockedAt: true,
          warningCount: true,
        },
      }),
    ]);

    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const participantMap = new Map(participants.map((p) => [p.id, p]));
    const sessionByParticipant = new Map<string, (typeof sessions)[0]>();
    for (const s of sessions) {
      if (!sessionByParticipant.has(s.participantId)) {
        sessionByParticipant.set(s.participantId, s);
      }
    }

    const grouped = new Map<string, AdminProctoringSummaryItemDto>();

    for (const inc of incidents) {
      const key = `${inc.teamId}::${inc.participantId}`;
      const team = teamMap.get(inc.teamId);
      const part = participantMap.get(inc.participantId);
      const sess = sessionByParticipant.get(inc.participantId);

      const mappedInc: ProctoringIncidentDto = {
        ...this.mapIncident(inc),
        teamCode: team?.teamCode,
        teamName: team?.teamName,
        participantName: part?.fullName,
        participantEmail: part?.email,
        sessionStatus: sess?.status || null,
      };

      if (!grouped.has(key)) {
        const isDisqualified = team?.status === 'DISQUALIFIED';
        const lockStatus: ProctoringLockStatus = isDisqualified
          ? 'BLOCKED'
          : ((sess?.lockStatus as ProctoringLockStatus) || 'ACTIVE');

        grouped.set(key, {
          participantId: inc.participantId,
          participantName: part?.fullName || (inc.details as any)?.participantName || 'Participant',
          participantEmail: part?.email || '',
          teamId: inc.teamId,
          teamCode: team?.teamCode || (inc.details as any)?.teamCode || '',
          teamName: team?.teamName || (inc.details as any)?.teamName || 'Unknown Team',
          sessionId: sess?.id || inc.sessionId || null,
          sessionStatus: sess?.status || null,
          lockStatus,
          isDisqualified,
          lockReason: sess?.lockReason || null,
          lockedAt: sess?.lockedAt ? sess.lockedAt.toISOString() : null,
          warningCount: sess?.warningCount || 0,
          incidentCount: 0,
          latestIncident: mappedInc,
          incidents: [],
        });
      }

      const entry = grouped.get(key)!;
      entry.incidents.push(mappedInc);
      entry.incidentCount = entry.incidents.length;
    }

    let results = Array.from(grouped.values());
    if (filters.lockStatus && filters.lockStatus !== 'ALL') {
      results = results.filter((r) => r.lockStatus === filters.lockStatus);
    }

    return results;
  }

  /**
   * Admin: Retrieve proctoring audit logs.
   */
  async listAuditLogs(teamId?: string): Promise<ProctoringAuditLogDto[]> {
    const logs = await this.prisma.proctoringAuditLog.findMany({
      where: teamId ? { teamId } : {},
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    if (logs.length === 0) return [];

    const teamIds = Array.from(new Set(logs.map((l) => l.teamId)));
    const participantIds = Array.from(
      new Set(logs.map((l) => l.participantId).filter((x): x is string => Boolean(x))),
    );

    const [teams, participants] = await Promise.all([
      this.prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, teamName: true },
      }),
      this.prisma.participant.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, fullName: true },
      }),
    ]);

    const teamMap = new Map(teams.map((t) => [t.id, t.teamName]));
    const partMap = new Map(participants.map((p) => [p.id, p.fullName]));

    return logs.map((l) => ({
      id: l.id,
      adminId: l.adminId,
      adminEmail: l.adminEmail,
      adminName: l.adminName,
      teamId: l.teamId,
      teamName: teamMap.get(l.teamId) || l.teamId,
      participantId: l.participantId,
      participantName: l.participantId ? partMap.get(l.participantId) || l.participantId : null,
      action: l.action,
      reason: l.reason,
      previousState: l.previousState,
      newState: l.newState,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Admin: Perform an authorized proctoring review action (Warn, Unlock, Keep Locked, Block, Disqualify).
   */
  async performAdminAction(
    admin: AuthAdminUser,
    dto: AdminProctoringActionDto,
  ): Promise<{ success: boolean; lockStatus: ProctoringLockStatus; message: string }> {
    const restrictiveActions = ['KEEP_LOCKED', 'BLOCK_PARTICIPANT', 'DISQUALIFY_TEAM'];
    if (restrictiveActions.includes(dto.action) && (!dto.reason || !dto.reason.trim())) {
      throw new BadRequestException(
        `A documented reason is required for administrative action: ${dto.action}`,
      );
    }

    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    const targetSession = dto.sessionId
      ? await this.prisma.teamSession.findUnique({ where: { id: dto.sessionId } })
      : dto.participantId
      ? await this.prisma.teamSession.findFirst({
          where: { teamId: dto.teamId, participantId: dto.participantId },
          orderBy: { createdAt: 'desc' },
        })
      : await this.prisma.teamSession.findFirst({
          where: { teamId: dto.teamId },
          orderBy: { createdAt: 'desc' },
        });

    const previousState = targetSession?.lockStatus || 'ACTIVE';
    let newState: ProctoringLockStatus = previousState as ProctoringLockStatus;
    let newReviewStatus = 'PENDING';
    let message = 'Administrative action recorded.';

    if (dto.action === 'ISSUE_WARNING') {
      newReviewStatus = 'WARNED';
      if (targetSession) {
        await this.prisma.teamSession.update({
          where: { id: targetSession.id },
          data: {
            warningCount: { increment: 1 },
          },
        });
      }
      message = 'Formal proctoring warning issued to participant.';
    } else if (dto.action === 'UNLOCK') {
      newState = 'ACTIVE';
      newReviewStatus = 'UNLOCKED';
      if (dto.participantId) {
        await this.prisma.teamSession.updateMany({
          where: { teamId: dto.teamId, participantId: dto.participantId, status: 'ACTIVE' },
          data: {
            lockStatus: 'ACTIVE',
            lockReason: null,
            lockedAt: null,
          },
        });
      } else if (targetSession) {
        await this.prisma.teamSession.update({
          where: { id: targetSession.id },
          data: {
            lockStatus: 'ACTIVE',
            lockReason: null,
            lockedAt: null,
          },
        });
      }
      message = 'Participant workspace unlocked. Contestant may resume competition.';
    } else if (dto.action === 'KEEP_LOCKED') {
      newState = 'LOCKED_PENDING_REVIEW';
      newReviewStatus = 'KEPT_LOCKED';
      if (targetSession) {
        await this.prisma.teamSession.update({
          where: { id: targetSession.id },
          data: {
            lockStatus: 'LOCKED_PENDING_REVIEW',
            lockReason: dto.reason?.trim() || 'Kept locked by administrator.',
            lockedAt: targetSession.lockedAt || new Date(),
          },
        });
      }
      message = 'Participant workspace remains locked pending further review.';
    } else if (dto.action === 'BLOCK_PARTICIPANT') {
      newState = 'BLOCKED';
      newReviewStatus = 'BLOCKED';
      await this.prisma.teamSession.updateMany({
        where: {
          teamId: dto.teamId,
          ...(dto.participantId ? { participantId: dto.participantId } : {}),
        },
        data: {
          lockStatus: 'BLOCKED',
          lockReason: dto.reason?.trim() || 'Blocked by administrator due to proctoring violation.',
          lockedAt: new Date(),
        },
      });
      message = 'Participant blocked from workspace access. Existing submissions preserved.';
    } else if (dto.action === 'DISQUALIFY_TEAM') {
      newState = 'BLOCKED';
      newReviewStatus = 'DISQUALIFIED';
      const targetRoundNumber = dto.roundNumber || (await this.getActiveRoundNumber()) || 1;
      const round = await this.prisma.competitionRound.findUnique({
        where: { roundNumber: targetRoundNumber },
      });

      if (round) {
        await this.prisma.teamRoundProgress.upsert({
          where: { teamId_roundId: { teamId: dto.teamId, roundId: round.id } },
          update: { participationStatus: 'DISQUALIFIED' },
          create: {
            teamId: dto.teamId,
            roundId: round.id,
            eligibilityStatus: 'ELIGIBLE',
            participationStatus: 'DISQUALIFIED',
          },
        });
      }

      await this.prisma.teamSession.updateMany({
        where: { teamId: dto.teamId },
        data: {
          lockStatus: 'BLOCKED',
          lockReason: dto.reason?.trim() || `Team disqualified from Round ${targetRoundNumber}.`,
          lockedAt: new Date(),
        },
      });
      message = `Team "${team.teamName}" disqualified from Round ${targetRoundNumber}. All submissions and audit logs preserved.`;
    }

    // Update pending incidents' reviewStatus
    await this.prisma.proctoringIncident.updateMany({
      where: {
        teamId: dto.teamId,
        ...(dto.participantId ? { participantId: dto.participantId } : {}),
        reviewStatus: 'PENDING',
      },
      data: { reviewStatus: newReviewStatus },
    });

    // Record immutable audit trail
    const auditLog = await this.prisma.proctoringAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.fullName,
        teamId: dto.teamId,
        participantId: dto.participantId || null,
        sessionId: targetSession?.id || null,
        action: dto.action,
        reason: dto.reason?.trim() || null,
        previousState,
        newState,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: `PROCTORING_${dto.action}`,
        description: `Admin ${admin.email} executed ${dto.action} on Team "${team.teamName}" (${previousState} → ${newState}). Reason: ${dto.reason || 'N/A'}`,
        metadata: {
          auditLogId: auditLog.id,
          teamId: dto.teamId,
          participantId: dto.participantId,
          action: dto.action,
          previousState,
          newState,
          reason: dto.reason,
        },
      },
    });

    this.emitAdminEvent('ACTION_TAKEN', {
      teamId: dto.teamId,
      participantId: dto.participantId,
      action: dto.action,
      lockStatus: newState,
    });

    return {
      success: true,
      lockStatus: newState,
      message,
    };
  }

  private async getActiveRoundNumber(): Promise<number | null> {
    const state = await this.prisma.competitionState.findUnique({ where: { id: 'global' } });
    return state?.currentRoundNumber || null;
  }

  private mapIncident(inc: any): ProctoringIncidentDto {
    return {
      id: inc.id,
      teamId: inc.teamId,
      participantId: inc.participantId,
      sessionId: inc.sessionId,
      roundNumber: inc.roundNumber,
      questionId: inc.questionId,
      arenaType: inc.arenaType,
      eventType: inc.eventType,
      confidence: inc.confidence,
      lockStatusAtEvent: inc.lockStatusAtEvent,
      reviewStatus: inc.reviewStatus,
      details: inc.details,
      createdAt: inc.createdAt.toISOString(),
    };
  }
}
