import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  CompetitionStatus,
  CompetitionStateDto,
  ShortlistingTeamItem,
  ShortlistSubmissionResult,
  TeamCompetitionStatusDto,
  TeamQualificationAnnouncement,
  TeamWinnerAnnouncement,
  CompetitionActivityLogItem,
  OFFICIAL_ROUNDS_CONFIG,
  LeaderboardResponseDto,
  LeaderboardEntryDto,
  AuthUser,
  CompetitionRoundCardItem,
  RoundSummaryDto,
  ParticipantRoundStatus,
  SynchronizedCountdownDto,
} from '@ignitron/shared';
import { PrismaService } from '../database/prisma.service';
import {
  RoundControlDto,
  ShortlistSubmissionDto,
  GenerateDemoDataDto,
  BackendPublishLeaderboardDto,
} from './dto/competition.dto';

@Injectable()
export class CompetitionService implements OnModuleInit {
  private readonly logger = new Logger(CompetitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.getOrCreateGlobalState();
  }

  /**
   * Retrieves or initializes the single authoritative global competition state
   */
  async getOrCreateGlobalState() {
    let state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    if (!state) {
      state = await this.prisma.competitionState.create({
        data: {
          id: 'global',
          status: 'STANDBY',
          isPaused: false,
        },
      });
      this.logger.log('Authoritative global competition state initialized: STANDBY');
    }

    return state;
  }

  /**
   * Returns authoritative global state with server timer and statistics
   */
  async getCompetitionState(): Promise<CompetitionStateDto> {
    let state = await this.getOrCreateGlobalState();
    const now = new Date();

    let currentRoundName: string | null = null;
    let eligibleTeamsCount = 0;
    let participatingTeamsCount = 0;
    let completedTeamsCount = 0;

    const totalTeamsCount = await this.prisma.team.count();

    const dbRounds = await this.prisma.competitionRound.findMany({
      orderBy: { roundNumber: 'asc' },
      include: {
        teamProgress: true,
      },
    });

    const roundsSummary: RoundSummaryDto[] = dbRounds.map((r) => {
      const eligible = r.teamProgress.filter((tp) => tp.eligibilityStatus === 'ELIGIBLE').length;
      const participating = r.teamProgress.filter(
        (tp) => tp.participationStatus === 'IN_PROGRESS' || tp.participationStatus === 'SUBMITTED',
      ).length;
      const completed = r.teamProgress.filter(
        (tp) => tp.participationStatus === 'SUBMITTED',
      ).length;

      // Find if next round has shortlisted teams from this round
      const nextRound = dbRounds.find((nr) => nr.roundNumber === r.roundNumber + 1);
      const nextEligible = nextRound
        ? nextRound.teamProgress.filter((tp) => tp.eligibilityStatus === 'ELIGIBLE').length
        : 0;

      return {
        roundNumber: r.roundNumber,
        name: r.name,
        description: r.description,
        durationMinutes: r.durationMinutes,
        maximumMarks: Number(r.maximumMarks),
        status: (r.status as any) || 'UPCOMING',
        eligibleCount: eligible,
        participatingCount: participating,
        completedCount: completed,
        shortlistedCount: nextEligible,
        isShortlistFinalized: nextEligible > 0,
      };
    });

    if (state.currentRoundNumber) {
      const currentRound = dbRounds.find((r) => r.roundNumber === state.currentRoundNumber);
      if (currentRound) {
        currentRoundName = currentRound.name;
        eligibleTeamsCount = currentRound.teamProgress.filter(
          (tp) => tp.eligibilityStatus === 'ELIGIBLE',
        ).length;
        participatingTeamsCount = currentRound.teamProgress.filter(
          (tp) => tp.participationStatus === 'IN_PROGRESS' || tp.participationStatus === 'SUBMITTED',
        ).length;
        completedTeamsCount = currentRound.teamProgress.filter(
          (tp) => tp.participationStatus === 'SUBMITTED',
        ).length;
      }
    } else {
      eligibleTeamsCount = await this.prisma.team.count({ where: { isActive: true } });
    }

    // Determine valid transitions from current state
    const validTransitions = this.getValidTransitions(state.status, state.isPaused);

    // Calculate real-time remaining duration if active and not paused
    let currentRemainingDuration = state.remainingDurationSeconds;
    if (state.deadlineAt && !state.isPaused) {
      currentRemainingDuration = Math.max(
        0,
        Math.floor((state.deadlineAt.getTime() - now.getTime()) / 1000),
      );
    }

    // Server-authoritative countdown check & auto-launch
    let countdownDto: SynchronizedCountdownDto | null = null;
    if (state.countdownEndsAt) {
      if (state.countdownEndsAt.getTime() > now.getTime()) {
        const remainingMs = state.countdownEndsAt.getTime() - now.getTime();
        const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
        const targetRoundNumber = state.preRoundAnnouncedRound || 1;

        countdownDto = {
          active: true,
          roundNumber: targetRoundNumber,
          startedAt: new Date(state.countdownEndsAt.getTime() - (state.countdownSeconds || 5) * 1000).toISOString(),
          endsAt: state.countdownEndsAt.toISOString(),
          remainingSeconds,
          durationSeconds: state.countdownSeconds || 5,
        };
      } else {
        // Countdown expired! Trigger synchronized live round launch
        const targetRound = state.preRoundAnnouncedRound || (state.status === 'STANDBY' ? 1 : state.status === 'ROUND_1_EVALUATION' ? 2 : 3);
        await this.launchRoundFromCountdown(targetRound, state.countdownEndsAt);
        const refreshedState = await this.prisma.competitionState.findUnique({ where: { id: 'global' } });
        if (refreshedState) {
          state = refreshedState;
        }
      }
    }

    return {
      id: state.id,
      status: state.status as CompetitionStatus,
      currentRoundNumber: state.currentRoundNumber,
      currentRoundName,
      isPaused: state.isPaused,
      startedAt: state.startedAt ? state.startedAt.toISOString() : null,
      deadlineAt: state.deadlineAt ? state.deadlineAt.toISOString() : null,
      pausedAt: state.pausedAt ? state.pausedAt.toISOString() : null,
      remainingDurationSeconds: currentRemainingDuration,
      totalDurationSeconds: state.totalDurationSeconds,
      serverTime: now.toISOString(),
      totalTeamsCount,
      eligibleTeamsCount,
      participatingTeamsCount,
      completedTeamsCount,
      validTransitions,
      rounds: roundsSummary,
      announcedRoundNumber: state.preRoundAnnouncedRound,
      announcedAt: state.updatedAt ? state.updatedAt.toISOString() : null,
      countdown: countdownDto,
    };
  }

  /**
   * Defines allowed state machine transitions to prevent invalid sequences
   */
  private getValidTransitions(status: string, isPaused: boolean): string[] {
    switch (status) {
      case 'STANDBY':
        return ['START_ROUND_1', 'ANNOUNCE_ROUND', 'START_COUNTDOWN', 'CANCEL_COUNTDOWN', 'RESET_COMPETITION'];
      case 'ROUND_1_ACTIVE':
        return isPaused
          ? ['RESUME_ROUND', 'END_ROUND', 'RESET_COMPETITION']
          : ['PAUSE_ROUND', 'END_ROUND', 'RESET_COMPETITION'];
      case 'ROUND_1_EVALUATION':
        return ['START_ROUND_2', 'ANNOUNCE_ROUND', 'START_COUNTDOWN', 'CANCEL_COUNTDOWN', 'RESET_COMPETITION'];
      case 'ROUND_2_ACTIVE':
        return isPaused
          ? ['RESUME_ROUND', 'END_ROUND', 'RESET_COMPETITION']
          : ['PAUSE_ROUND', 'END_ROUND', 'RESET_COMPETITION'];
      case 'ROUND_2_EVALUATION':
        return ['START_ROUND_3', 'ANNOUNCE_ROUND', 'START_COUNTDOWN', 'CANCEL_COUNTDOWN', 'RESET_COMPETITION'];
      case 'ROUND_3_ACTIVE':
        return isPaused
          ? ['RESUME_ROUND', 'END_ROUND', 'RESET_COMPETITION']
          : ['PAUSE_ROUND', 'END_ROUND', 'RESET_COMPETITION'];
      case 'FINAL_EVALUATION':
        return ['COMPLETE_COMPETITION', 'RESET_COMPETITION'];
      case 'COMPLETED':
        return ['RESET_COMPETITION'];
      default:
        return ['RESET_COMPETITION'];
    }
  }

  async healSchema(): Promise<void> {
    await this.prisma.ensureSchemaCompatibility();
  }

  /**
   * Executes atomic administrator round control actions
   */
  async executeRoundControl(dto: RoundControlDto, adminId: string) {
    try {
      return await this.executeRoundControlInternal(dto, adminId);
    } catch (err: any) {
      if (
        err?.message?.includes('does not exist in the current database') ||
        err?.message?.includes('Unknown column')
      ) {
        this.logger.warn('Schema mismatch detected in executeRoundControl. Executing self-healing...');
        await this.prisma.ensureSchemaCompatibility();
        return await this.executeRoundControlInternal(dto, adminId);
      }
      throw err;
    }
  }

  private async executeRoundControlInternal(dto: RoundControlDto, adminId: string) {
    const state = await this.getOrCreateGlobalState();
    const now = new Date();

    return await this.prisma.$transaction(async (tx) => {
      // Re-verify current state inside transaction to prevent duplicate concurrency
      const currentState = await tx.competitionState.findUnique({
        where: { id: 'global' },
      });

      if (!currentState) {
        throw new NotFoundException('Global competition state record missing');
      }

      switch (dto.action) {
        case 'ANNOUNCE_ROUND': {
          const targetRoundNumber = dto.roundNumber || (currentState.status === 'STANDBY' ? 1 : currentState.status === 'ROUND_1_EVALUATION' ? 2 : 3);
          const round = await tx.competitionRound.findUnique({
            where: { roundNumber: targetRoundNumber },
          });
          if (!round) throw new NotFoundException(`Round ${targetRoundNumber} definition not found`);

          if (targetRoundNumber === 2 && currentState.status !== 'ROUND_1_EVALUATION') {
            throw new BadRequestException('Cannot announce Round 2 until Round 1 evaluation has been reached.');
          }
          if (targetRoundNumber === 3 && currentState.status !== 'ROUND_2_EVALUATION') {
            throw new BadRequestException('Cannot announce Round 3 until Round 2 evaluation has been reached.');
          }

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              preRoundAnnouncedRound: targetRoundNumber,
              countdownEndsAt: null,
            },
          });

          try {
            await tx.announcement.create({
              data: {
                title: `GET READY! Round ${targetRoundNumber}: ${round.name}`,
                message: `GET READY!\nRound ${targetRoundNumber}: ${round.name} is about to begin.\nPlease prepare your team.`,
                priority: 'URGENT',
                isPublished: true,
                publishedAt: now,
                authorId: (await tx.adminAccount.findUnique({ where: { id: adminId } })) ? adminId : null,
              },
            });
          } catch (annErr: any) {
            this.logger.warn(`Announcement warning on ANNOUNCE_ROUND: ${annErr?.message || annErr}`);
          }

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ANNOUNCE_ROUND',
              description: `Admin announced upcoming Round ${targetRoundNumber}: ${round.name}.`,
              metadata: { roundNumber: targetRoundNumber },
            },
          });

          return { message: `Round ${targetRoundNumber} announced successfully to eligible teams.` };
        }

        case 'START_COUNTDOWN': {
          const targetRoundNumber = dto.roundNumber || currentState.preRoundAnnouncedRound || (currentState.status === 'STANDBY' ? 1 : currentState.status === 'ROUND_1_EVALUATION' ? 2 : 3);
          const round = await tx.competitionRound.findUnique({
            where: { roundNumber: targetRoundNumber },
          });
          if (!round) throw new NotFoundException(`Round ${targetRoundNumber} definition not found`);

          if (targetRoundNumber === 2) {
            const eligibleR2Count = await tx.teamRoundProgress.count({
              where: { roundId: round.id, eligibilityStatus: 'ELIGIBLE' },
            });
            if (eligibleR2Count === 0) {
              throw new BadRequestException('Cannot start Round 2 countdown: No teams shortlisted and marked ELIGIBLE.');
            }
          } else if (targetRoundNumber === 3) {
            const eligibleR3Count = await tx.teamRoundProgress.count({
              where: { roundId: round.id, eligibilityStatus: 'ELIGIBLE' },
            });
            if (eligibleR3Count === 0) {
              throw new BadRequestException('Cannot start Round 3 countdown: No finalists shortlisted and marked ELIGIBLE.');
            }
          }

          if (currentState.countdownEndsAt && currentState.countdownEndsAt.getTime() > now.getTime()) {
            throw new BadRequestException('A synchronized countdown is already in progress.');
          }

          const countdownSec = dto.countdownDurationSeconds && [5, 10].includes(dto.countdownDurationSeconds)
            ? dto.countdownDurationSeconds
            : 5;
          const endsAt = new Date(now.getTime() + countdownSec * 1000);

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              countdownEndsAt: endsAt,
              countdownSeconds: countdownSec,
              preRoundAnnouncedRound: targetRoundNumber,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'START_COUNTDOWN',
              description: `Admin initiated ${countdownSec}-second synchronized countdown for Round ${targetRoundNumber}.`,
              metadata: { roundNumber: targetRoundNumber, countdownSeconds: countdownSec, endsAt: endsAt.toISOString() },
            },
          });

          return {
            message: `Synchronized ${countdownSec}s countdown started for Round ${targetRoundNumber}.`,
            countdownEndsAt: endsAt.toISOString(),
            countdownSeconds: countdownSec,
          };
        }

        case 'CANCEL_COUNTDOWN': {
          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              countdownEndsAt: null,
              countdownSeconds: 5,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'CANCEL_COUNTDOWN',
              description: 'Admin cancelled synchronized countdown.',
            },
          });

          return { message: 'Synchronized countdown cancelled.' };
        }

        case 'START_ROUND_1': {
          if (currentState.status !== 'STANDBY') {
            throw new BadRequestException(
              `Cannot start Round 1 from state "${currentState.status}". Must be in STANDBY.`,
            );
          }

          const r1 = await tx.competitionRound.findUnique({
            where: { roundNumber: 1 },
          });
          if (!r1) throw new NotFoundException('Round 1 definition not found');

          // Duration in seconds (30 minutes = 1800s)
          const durationSeconds = r1.durationMinutes * 60;
          const deadline = new Date(now.getTime() + durationSeconds * 1000);

          // All active teams with complete participant records (>=2) are eligible for Round 1
          const activeTeams = await tx.team.findMany({
            where: {
              isActive: true,
              participants: { some: {} },
            },
            include: { participants: true },
          });

          for (const team of activeTeams) {
            await tx.teamRoundProgress.upsert({
              where: {
                teamId_roundId: {
                  teamId: team.id,
                  roundId: r1.id,
                },
              },
              update: {
                eligibilityStatus: 'ELIGIBLE',
                participationStatus: 'NOT_STARTED',
              },
              create: {
                teamId: team.id,
                roundId: r1.id,
                eligibilityStatus: 'ELIGIBLE',
                participationStatus: 'NOT_STARTED',
                score: 0,
              },
            });
          }

          // Update Competition Round status
          await tx.competitionRound.update({
            where: { id: r1.id },
            data: { status: 'ACTIVE' },
          });

          // Update Global State
          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'ROUND_1_ACTIVE',
              currentRoundNumber: 1,
              isPaused: false,
              startedAt: now,
              deadlineAt: deadline,
              pausedAt: null,
              totalDurationSeconds: durationSeconds,
              remainingDurationSeconds: durationSeconds,
              countdownEndsAt: null,
              preRoundAnnouncedRound: null,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_1_STARTED',
              description: `Admin started Round 1: MCQ Arena (${activeTeams.length} teams eligible)`,
              metadata: { roundNumber: 1, eligibleCount: activeTeams.length },
            },
          });

          const author = await tx.adminAccount.findUnique({ where: { id: adminId } });
          try {
            await tx.announcement.create({
              data: {
                title: 'Round 1: MCQ Arena has Begun!',
                message: 'Round 1 has officially started. All participating teams may now access the MCQ Arena to answer 15 competition questions.',
                priority: 'HIGH',
                isPublished: true,
                publishedAt: now,
                authorId: author ? adminId : null,
              },
            });
          } catch (annErr: any) {
            this.logger.warn(`Announcement warning on START_ROUND_1: ${annErr?.message || annErr}`);
          }

          return { message: 'Round 1 successfully started' };
        }

        case 'PAUSE_ROUND': {
          if (
            !['ROUND_1_ACTIVE', 'ROUND_2_ACTIVE', 'ROUND_3_ACTIVE'].includes(
              currentState.status,
            )
          ) {
            throw new BadRequestException('Cannot pause when no round is active');
          }
          if (currentState.isPaused) {
            throw new BadRequestException('Active round is already paused');
          }

          const remainingSeconds = currentState.deadlineAt
            ? Math.max(
                0,
                Math.floor(
                  (currentState.deadlineAt.getTime() - now.getTime()) / 1000,
                ),
              )
            : 0;

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              isPaused: true,
              pausedAt: now,
              remainingDurationSeconds: remainingSeconds,
            },
          });

          if (currentState.currentRoundNumber) {
            await tx.competitionRound.update({
              where: { roundNumber: currentState.currentRoundNumber },
              data: { status: 'PAUSED' },
            });
          }

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_PAUSED',
              description: `Admin paused Round ${currentState.currentRoundNumber} with ${remainingSeconds}s remaining`,
              metadata: {
                roundNumber: currentState.currentRoundNumber,
                remainingSeconds,
              },
            },
          });

          try {
            await tx.announcement.create({
              data: {
                title: `Tournament Paused: Round ${currentState.currentRoundNumber || ''}`,
                message: `Competition Round ${currentState.currentRoundNumber || ''} has been temporarily paused by the administrators. Timers and active arena workspaces are held.`,
                priority: 'URGENT',
                isPublished: true,
                publishedAt: now,
                authorId: (await tx.adminAccount.findUnique({ where: { id: adminId } })) ? adminId : null,
              },
            });
          } catch (annErr: any) {
            this.logger.warn(`Announcement warning on PAUSE_ROUND: ${annErr?.message || annErr}`);
          }

          return { message: 'Round paused successfully' };
        }

        case 'RESUME_ROUND': {
          if (
            !['ROUND_1_ACTIVE', 'ROUND_2_ACTIVE', 'ROUND_3_ACTIVE'].includes(
              currentState.status,
            )
          ) {
            throw new BadRequestException('Cannot resume when no round is active');
          }
          if (!currentState.isPaused) {
            throw new BadRequestException('Round is not currently paused');
          }

          const remainingSeconds = currentState.remainingDurationSeconds || 0;
          const newDeadline = new Date(now.getTime() + remainingSeconds * 1000);

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              isPaused: false,
              pausedAt: null,
              deadlineAt: newDeadline,
            },
          });

          if (currentState.currentRoundNumber) {
            await tx.competitionRound.update({
              where: { roundNumber: currentState.currentRoundNumber },
              data: { status: 'ACTIVE' },
            });
          }

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_RESUMED',
              description: `Admin resumed Round ${currentState.currentRoundNumber}`,
              metadata: {
                roundNumber: currentState.currentRoundNumber,
                newDeadline: newDeadline.toISOString(),
              },
            },
          });

          try {
            await tx.announcement.create({
              data: {
                title: `Tournament Resumed: Round ${currentState.currentRoundNumber || ''}`,
                message: `Competition Round ${currentState.currentRoundNumber || ''} has resumed. Teams may continue working in their respective arenas.`,
                priority: 'HIGH',
                isPublished: true,
                publishedAt: now,
                authorId: (await tx.adminAccount.findUnique({ where: { id: adminId } })) ? adminId : null,
              },
            });
          } catch (annErr: any) {
            this.logger.warn(`Announcement warning on RESUME_ROUND: ${annErr?.message || annErr}`);
          }

          return { message: 'Round resumed successfully' };
        }

        case 'END_ROUND': {
          const currentRoundNumber =
            currentState.currentRoundNumber ||
            (currentState.status === 'ROUND_1_ACTIVE'
              ? 1
              : currentState.status === 'ROUND_2_ACTIVE'
              ? 2
              : 3);
          return await this.concludeRoundInTx(tx, currentRoundNumber, 'ADMIN_MANUAL', adminId);
        }

        case 'START_ROUND_2': {
          if (currentState.status !== 'ROUND_1_EVALUATION') {
            throw new BadRequestException(
              `Cannot start Round 2 from state "${currentState.status}". Must be in ROUND_1_EVALUATION.`,
            );
          }

          const r2 = await tx.competitionRound.findUnique({
            where: { roundNumber: 2 },
          });
          if (!r2) throw new NotFoundException('Round 2 definition not found');

          // Verify that shortlisting has been conducted (at least 1 team eligible for R2)
          const eligibleR2Count = await tx.teamRoundProgress.count({
            where: {
              roundId: r2.id,
              eligibilityStatus: 'ELIGIBLE',
            },
          });

          if (eligibleR2Count === 0) {
            throw new BadRequestException(
              'Cannot start Round 2: No teams have been shortlisted and marked ELIGIBLE for Round 2.',
            );
          }

          const durationSeconds = r2.durationMinutes * 60; // 40 minutes = 2400s
          const deadline = new Date(now.getTime() + durationSeconds * 1000);

          await tx.competitionRound.update({
            where: { id: r2.id },
            data: { status: 'ACTIVE' },
          });

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'ROUND_2_ACTIVE',
              currentRoundNumber: 2,
              isPaused: false,
              startedAt: now,
              deadlineAt: deadline,
              pausedAt: null,
              totalDurationSeconds: durationSeconds,
              remainingDurationSeconds: durationSeconds,
              countdownEndsAt: null,
              preRoundAnnouncedRound: null,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_2_STARTED',
              description: `Admin started Round 2: Bug Hunt Arena (${eligibleR2Count} qualified teams)`,
              metadata: { roundNumber: 2, qualifiedCount: eligibleR2Count },
            },
          });

          await tx.announcement.create({
            data: {
              title: 'Round 2: Bug Hunt Arena has Begun!',
              message: `Round 2: Bug Hunt Arena has officially started for ${eligibleR2Count} qualified teams. Enter your coding workspace to debug the token bucket rate limiter.`,
              priority: 'HIGH',
              isPublished: true,
              publishedAt: now,
              authorId: (await tx.adminAccount.findUnique({ where: { id: adminId } })) ? adminId : null,
            },
          });

          return { message: 'Round 2 successfully started' };
        }

        case 'START_ROUND_3': {
          if (currentState.status !== 'ROUND_2_EVALUATION') {
            throw new BadRequestException(
              `Cannot start Round 3 from state "${currentState.status}". Must be in ROUND_2_EVALUATION.`,
            );
          }

          const r3 = await tx.competitionRound.findUnique({
            where: { roundNumber: 3 },
          });
          if (!r3) throw new NotFoundException('Round 3 definition not found');

          // Verify that shortlisting has been conducted (at least 1 team eligible for R3)
          const eligibleR3Count = await tx.teamRoundProgress.count({
            where: {
              roundId: r3.id,
              eligibilityStatus: 'ELIGIBLE',
            },
          });

          if (eligibleR3Count === 0) {
            throw new BadRequestException(
              'Cannot start Round 3: No finalists have been shortlisted and marked ELIGIBLE for Round 3.',
            );
          }

          const durationSeconds = r3.durationMinutes * 60; // 60 minutes = 3600s
          const deadline = new Date(now.getTime() + durationSeconds * 1000);

          await tx.competitionRound.update({
            where: { id: r3.id },
            data: { status: 'ACTIVE' },
          });

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'ROUND_3_ACTIVE',
              currentRoundNumber: 3,
              isPaused: false,
              startedAt: now,
              deadlineAt: deadline,
              pausedAt: null,
              totalDurationSeconds: durationSeconds,
              remainingDurationSeconds: durationSeconds,
              countdownEndsAt: null,
              preRoundAnnouncedRound: null,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_3_STARTED',
              description: `Admin started Round 3: Final Coding (${eligibleR3Count} finalist teams)`,
              metadata: { roundNumber: 3, qualifiedCount: eligibleR3Count },
            },
          });

          try {
            await tx.announcement.create({
              data: {
                title: 'Round 3: Final Coding Relay has Begun!',
                message: `Round 3: Final Coding Relay is officially live for ${eligibleR3Count} finalist teams! Conquer all 3 problem cases to claim tournament victory.`,
                priority: 'HIGH',
                isPublished: true,
                publishedAt: now,
                authorId: (await tx.adminAccount.findUnique({ where: { id: adminId } })) ? adminId : null,
              },
            });
          } catch (annErr: any) {
            this.logger.warn(`Announcement warning on START_ROUND_3: ${annErr?.message || annErr}`);
          }

          return { message: 'Round 3: Final Coding successfully started' };
        }

        case 'COMPLETE_COMPETITION': {
          if (currentState.status !== 'FINAL_EVALUATION') {
            throw new BadRequestException(
              `Cannot complete competition from state "${currentState.status}". Must be in FINAL_EVALUATION.`,
            );
          }

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'COMPLETED',
              isPaused: false,
              deadlineAt: null,
              remainingDurationSeconds: null,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'COMPETITION_COMPLETED',
              description: 'Admin officially concluded IGNITRON 2K26 Competition',
              metadata: { completedAt: now.toISOString() },
            },
          });

          return { message: 'IGNITRON 2K26 Competition marked COMPLETED' };
        }

        case 'RESET_COMPETITION': {
          // Verify Super Admin authorization
          const requestingAdmin = await tx.adminAccount.findUnique({
            where: { id: adminId },
          });
          if (requestingAdmin && requestingAdmin.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only a SUPER_ADMIN is authorized to perform a competition reset.');
          }

          const resetType = dto.resetType || 'FULL_RESET';

          // Option A: Reset Demo Teams Only
          if (resetType === 'DEMO_ONLY') {
            const deleted = await tx.team.deleteMany({
              where: { isDemo: true },
            });

            await tx.activityLog.create({
              data: {
                actorType: 'ADMIN',
                actorId: adminId,
                action: 'DEMO_TEAMS_RESET',
                description: `Admin removed ${deleted.count} simulated demo teams. Genuine registered teams preserved.`,
                metadata: { resetType: 'DEMO_ONLY', deletedCount: deleted.count },
              },
            });

            return {
              message: `Demo teams successfully cleared (${deleted.count} simulated teams removed). Genuine registered teams preserved.`,
            };
          }

          // Option B: Full Progress Reset
          if (resetType === 'FULL_RESET') {
            // Reset all rounds to UPCOMING
            await tx.competitionRound.updateMany({
              data: {
                status: 'UPCOMING',
                isLeaderboardPublished: false,
                leaderboardPublishedAt: null,
              },
            });

            // Reset all team round progress records
            await tx.teamRoundProgress.deleteMany({});

            // Reset Global State to STANDBY
            await tx.competitionState.update({
              where: { id: 'global' },
              data: {
                status: 'STANDBY',
                currentRoundNumber: null,
                isPaused: false,
                startedAt: null,
                deadlineAt: null,
                pausedAt: null,
                remainingDurationSeconds: null,
                totalDurationSeconds: null,
                countdownEndsAt: null,
                countdownSeconds: 5,
                preRoundAnnouncedRound: null,
              },
            });

            await tx.activityLog.create({
              data: {
                actorType: 'ADMIN',
                actorId: adminId,
                action: 'COMPETITION_RESET',
                description: 'Admin reset competition to STANDBY (All Progress Cleared)',
                metadata: { resetType: 'FULL_RESET' },
              },
            });

            return { message: 'Competition state successfully reset to STANDBY' };
          }

          // Option C: Complete Competition Reset (NEW)
          if (resetType === 'COMPLETE_RESET') {
            // 1. Reset all rounds to UPCOMING and unpublish leaderboards
            await tx.competitionRound.updateMany({
              data: {
                status: 'UPCOMING',
                isLeaderboardPublished: false,
                leaderboardPublishedAt: null,
              },
            });

            // 2. Reset all team round progress records
            await tx.teamRoundProgress.deleteMany({});

            // 3. Reset Global State to STANDBY
            await tx.competitionState.update({
              where: { id: 'global' },
              data: {
                status: 'STANDBY',
                currentRoundNumber: null,
                isPaused: false,
                startedAt: null,
                deadlineAt: null,
                pausedAt: null,
                remainingDurationSeconds: null,
                totalDurationSeconds: null,
                countdownEndsAt: null,
                countdownSeconds: 5,
                preRoundAnnouncedRound: null,
              },
            });

            // 4. Identify and archive previous round-specific announcements
            const roundSpecificAnnouncements = await tx.announcement.findMany({
              where: {
                OR: [
                  { title: { contains: 'Round' } },
                  { title: { contains: 'ROUND' } },
                  { title: { contains: 'Tournament Paused' } },
                  { title: { contains: 'TOURNAMENT PAUSED' } },
                  { title: { contains: 'Tournament Resumed' } },
                  { title: { contains: 'TOURNAMENT RESUMED' } },
                  { title: { contains: 'Winner' } },
                  { title: { contains: 'WINNER' } },
                  { title: { contains: 'GET READY!' } },
                  { message: { contains: 'ROUND CONCLUDED' } },
                  { message: { contains: 'Round Concluded' } },
                  { message: { contains: 'All arena inputs are locked' } },
                  { message: { contains: 'is about to begin' } },
                  { message: { contains: 'has officially started' } },
                  { message: { contains: 'paused by competition administrators' } },
                  { message: { contains: 'tournament has been resumed' } },
                  { message: { contains: 'Official Winner Declared' } },
                  { message: { contains: 'All participating teams may now access the MCQ Arena' } },
                  { message: { contains: 'Enter your coding workspace to debug' } },
                  { message: { contains: 'Final Coding Relay is officially live' } },
                  { message: { contains: 'Submissions and workspace access for this round are now closed' } },
                ],
              },
            });

            if (roundSpecificAnnouncements.length > 0) {
              await tx.activityLog.create({
                data: {
                  actorType: 'ADMIN',
                  actorId: adminId,
                  action: 'ANNOUNCEMENTS_ARCHIVED',
                  description: `Archived and cleared ${roundSpecificAnnouncements.length} round-specific announcements during complete competition reset`,
                  metadata: {
                    archivedCount: roundSpecificAnnouncements.length,
                    announcementIds: roundSpecificAnnouncements.map((a) => a.id),
                    titles: roundSpecificAnnouncements.map((a) => a.title),
                  },
                },
              });

              await tx.announcement.deleteMany({
                where: {
                  id: { in: roundSpecificAnnouncements.map((a) => a.id) },
                },
              });
            }

            // 5. Clear team round answers, bug reports, and drafts
            await tx.teamMcqAnswer.deleteMany({});
            await tx.teamBugReport.deleteMany({});
            await tx.workspaceDraft.deleteMany({});

            // 5b. Archive and clear active competition evaluations and submissions
            const evalCount = await tx.evaluation.count();
            const subCount = await tx.submission.count();

            if (subCount > 0 || evalCount > 0) {
              await tx.activityLog.create({
                data: {
                  actorType: 'ADMIN',
                  actorId: adminId,
                  action: 'SUBMISSIONS_ARCHIVED',
                  description: `Archived and cleared ${subCount} submissions and ${evalCount} evaluations during complete competition reset`,
                  metadata: {
                    resetType: 'COMPLETE_RESET',
                    clearedSubmissionsCount: subCount,
                    clearedEvaluationsCount: evalCount,
                  },
                },
              });

              // Delete child evaluation records first due to foreign key constraints
              await tx.evaluation.deleteMany({});
              // Delete submission records
              await tx.submission.deleteMany({});
            }

            // 6. End active team sessions to prevent displacement locks
            await tx.teamSession.updateMany({
              where: { status: 'ACTIVE' },
              data: {
                status: 'ENDED',
                terminationReason: 'ADMIN_REVOKED',
                logoutAt: now,
              },
            });

            // 7. Log Complete Competition Reset in ActivityLog
            await tx.activityLog.create({
              data: {
                actorType: 'ADMIN',
                actorId: adminId,
                action: 'COMPETITION_RESET',
                description: 'Admin performed complete competition reset to STANDBY (All Progress & Round Announcements Cleared)',
                metadata: {
                  resetType: 'COMPLETE_RESET',
                  clearedAnnouncementsCount: roundSpecificAnnouncements.length,
                },
              },
            });

            return {
              message: 'Competition progression has returned to STANDBY. Previous round announcements and participant notifications have been cleared.',
            };
          }

          throw new BadRequestException(`Unsupported resetType: ${resetType}`);
        }

        default:
          throw new BadRequestException(`Unsupported action: ${dto.action}`);
      }
    });
  }

  /**
   * Retrieves teams eligible for shortlisting into the target round (Round 2 or Round 3)
   */
  async getShortlistingTeams(targetRoundNumber: number): Promise<ShortlistingTeamItem[]> {
    if (![2, 3].includes(targetRoundNumber)) {
      throw new BadRequestException('Shortlisting only applies to Round 2 or Round 3');
    }

    const prevRoundNumber = targetRoundNumber - 1;
    const prevRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: prevRoundNumber },
    });
    const targetRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: targetRoundNumber },
    });

    if (!prevRound || !targetRound) {
      throw new NotFoundException('Required competition rounds not found');
    }

    // Ensure all active teams have a Round 1 progress record if shortlisting into Round 2
    if (prevRoundNumber === 1) {
      const activeTeams = await this.prisma.team.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      for (const t of activeTeams) {
        await this.prisma.teamRoundProgress.upsert({
          where: { teamId_roundId: { teamId: t.id, roundId: prevRound.id } },
          update: {},
          create: {
            teamId: t.id,
            roundId: prevRound.id,
            eligibilityStatus: 'ELIGIBLE',
            participationStatus: 'NOT_STARTED',
            score: 0,
          },
        });
      }
    }

    // Get all teams that participated/were eligible in previous round
    const prevProgress = await this.prisma.teamRoundProgress.findMany({
      where: {
        roundId: prevRound.id,
        eligibilityStatus: 'ELIGIBLE',
      },
      include: {
        team: {
          include: {
            participants: true,
            roundProgress: {
              where: { roundId: targetRound.id },
            },
          },
        },
      },
      orderBy: {
        score: 'desc',
      },
    });

    return prevProgress.map((p, index) => {
      const targetProgress = p.team.roundProgress[0];
      return {
        teamId: p.team.id,
        teamCode: p.team.teamCode,
        teamName: p.team.teamName,
        institution: p.team.institution,
        isDemo: p.team.isDemo,
        participants: p.team.participants.map((pt) => ({
          fullName: pt.fullName,
          email: pt.email,
        })),
        currentRoundEligibility: p.eligibilityStatus,
        nextRoundEligibility: targetProgress
          ? targetProgress.eligibilityStatus
          : 'PENDING',
        participationStatus: p.participationStatus,
        score: Number(p.score),
        rank: index + 1,
      };
    });
  }

  /**
   * Submits shortlisting decision, marking chosen teams as ELIGIBLE for target round
   */
  async submitShortlisting(
    dto: ShortlistSubmissionDto,
    adminId: string,
  ): Promise<ShortlistSubmissionResult> {
    const targetRoundNumber = dto.roundNumber;
    if (![2, 3].includes(targetRoundNumber)) {
      throw new BadRequestException('Shortlisting only applies to Round 2 or Round 3');
    }

    const prevRoundNumber = targetRoundNumber - 1;
    const prevRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: prevRoundNumber },
    });
    const targetRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: targetRoundNumber },
    });

    if (!prevRound || !targetRound) {
      throw new NotFoundException('Required competition rounds not found');
    }

    // Ensure all active teams have a Round 1 progress record if shortlisting into Round 2
    if (prevRoundNumber === 1) {
      const activeTeams = await this.prisma.team.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      for (const t of activeTeams) {
        await this.prisma.teamRoundProgress.upsert({
          where: { teamId_roundId: { teamId: t.id, roundId: prevRound.id } },
          update: {},
          create: {
            teamId: t.id,
            roundId: prevRound.id,
            eligibilityStatus: 'ELIGIBLE',
            participationStatus: 'NOT_STARTED',
            score: 0,
          },
        });
      }
    }

    const qualifiedSet = new Set(dto.qualifiedTeamIds);

    // Get all teams from previous round
    const prevProgress = await this.prisma.teamRoundProgress.findMany({
      where: {
        roundId: prevRound.id,
        eligibilityStatus: 'ELIGIBLE',
      },
      select: { teamId: true },
    });

    if (prevProgress.length === 0) {
      throw new BadRequestException('No eligible teams found in previous round to shortlist');
    }

    let qualifiedCount = 0;
    let disqualifiedCount = 0;

    const activityLog = await this.prisma.$transaction(async (tx) => {
      for (const item of prevProgress) {
        const isQualified = qualifiedSet.has(item.teamId);
        if (isQualified) qualifiedCount++;
        else disqualifiedCount++;

        await tx.teamRoundProgress.upsert({
          where: {
            teamId_roundId: {
              teamId: item.teamId,
              roundId: targetRound.id,
            },
          },
          update: {
            eligibilityStatus: isQualified ? 'ELIGIBLE' : 'INELIGIBLE',
            participationStatus: 'NOT_STARTED',
          },
          create: {
            teamId: item.teamId,
            roundId: targetRound.id,
            eligibilityStatus: isQualified ? 'ELIGIBLE' : 'INELIGIBLE',
            participationStatus: 'NOT_STARTED',
            score: 0,
          },
        });
      }

      return await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: `SHORTLISTING_ROUND_${targetRoundNumber}`,
          description: `Admin shortlisted ${qualifiedCount} teams for Round ${targetRoundNumber} (${disqualifiedCount} not qualified)`,
          metadata: {
            targetRoundNumber,
            qualifiedCount,
            disqualifiedCount,
            qualifiedTeamIds: dto.qualifiedTeamIds,
            notes: dto.notes,
          },
        },
      });
    });

    // Create broadcast announcement idempotently
    const author = await this.prisma.adminAccount.findUnique({ where: { id: adminId } });
    const announcementTitle = `📢 Round ${targetRoundNumber} Shortlisting Results Finalized`;
    const existingAnn = await this.prisma.announcement.findFirst({
      where: { title: announcementTitle },
    });
    if (!existingAnn) {
      await this.prisma.announcement.create({
        data: {
          title: announcementTitle,
          message: `Official shortlisting for Round ${targetRoundNumber} (${targetRound.name}) has been finalized. ${qualifiedCount} teams have qualified to proceed. Individual qualification status is now live on contestant dashboards.`,
          priority: 'HIGH',
          isPublished: true,
          publishedAt: new Date(),
          authorId: author ? adminId : null,
        },
      });
    }

    return {
      roundNumber: targetRoundNumber,
      totalProcessed: prevProgress.length,
      qualifiedCount,
      disqualifiedCount,
      activityLogId: activityLog.id,
    };
  }

  /**
   * Retrieves specific competition progression status for an authenticated team
   */
  async getTeamCompetitionStatus(teamId: string): Promise<TeamCompetitionStatusDto> {
    const [team, state, rounds] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: teamId },
        include: {
          participants: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              studentId: true,
              isActive: true,
            },
          },
          sessions: {
            where: { status: 'ACTIVE' },
            include: {
              participant: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          roundProgress: {
            include: { round: true },
            orderBy: { round: { roundNumber: 'asc' } },
          },
        },
      }),
      this.getOrCreateGlobalState(),
      this.prisma.competitionRound.findMany({
        orderBy: { roundNumber: 'asc' },
      }),
    ]);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const now = new Date();
    let currentRound: any = null;
    let eligibilityStatus: any = 'PENDING';
    let participationStatus: any = 'NOT_STARTED';

    if (state.currentRoundNumber) {
      const activeRound = rounds.find((r) => r.roundNumber === state.currentRoundNumber);
      if (activeRound) {
        currentRound = {
          roundNumber: activeRound.roundNumber,
          name: activeRound.name,
          description: activeRound.description,
          durationMinutes: activeRound.durationMinutes,
          maximumMarks: Number(activeRound.maximumMarks),
        };

        const progress = team.roundProgress.find((p) => p.roundId === activeRound.id);
        if (progress) {
          eligibilityStatus = progress.eligibilityStatus;
          participationStatus = progress.participationStatus;
        } else {
          // If Round 1 and no record yet, but team is active -> Eligible
          if (state.currentRoundNumber === 1 && team.isActive) {
            eligibilityStatus = 'ELIGIBLE';
          }
        }
      }
    }

    const isEligible = eligibilityStatus === 'ELIGIBLE';

    let currentRemainingDuration = state.remainingDurationSeconds;
    if (state.deadlineAt && !state.isPaused) {
      currentRemainingDuration = Math.max(
        0,
        Math.floor((state.deadlineAt.getTime() - now.getTime()) / 1000),
      );
    }

    const roundHistory = team.roundProgress.map((p) => ({
      roundNumber: p.round.roundNumber,
      roundName: p.round.name,
      eligibilityStatus: p.eligibilityStatus,
      participationStatus: p.participationStatus,
      score: Number(p.score),
      startedAt: p.startedAt ? p.startedAt.toISOString() : null,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
      evaluatedAt: p.evaluatedAt ? p.evaluatedAt.toISOString() : null,
    }));

    // Active participant from live session
    const activeSession = team.sessions?.find((s) => s.status === 'ACTIVE');
    const activeParticipant = activeSession?.participant
      ? {
          id: activeSession.participant.id,
          fullName: activeSession.participant.fullName,
          email: activeSession.participant.email,
        }
      : null;

    // Build official 3 round cards
    const officialRounds = [
      {
        roundNumber: 1,
        name: 'Round 1: MCQ Arena',
        description: 'Fast-paced multiple choice screening covering CS fundamentals and DSA.',
        durationMinutes: 30,
        maximumMarks: 30,
      },
      {
        roundNumber: 2,
        name: 'Round 2: Bug Hunt Arena',
        description: 'Find and fix edge case logic bugs and debugging puzzles.',
        durationMinutes: 40,
        maximumMarks: 100,
      },
      {
        roundNumber: 3,
        name: 'Round 3: Final Coding',
        description: 'Solve hard algorithmic challenges in full IDE workspace.',
        durationMinutes: 60,
        maximumMarks: 100,
      },
    ];

    const roundCards: CompetitionRoundCardItem[] = officialRounds.map((def) => {
      const dbRound = rounds.find((r) => r.roundNumber === def.roundNumber);
      const prog = team.roundProgress.find((p) => p.round.roundNumber === def.roundNumber);

      let teamEligibility: any = 'PENDING';
      if (prog) {
        teamEligibility = prog.eligibilityStatus;
      } else if (def.roundNumber === 1 && team.isActive) {
        teamEligibility = 'ELIGIBLE';
      }

      const pStatus: any = prog?.participationStatus || 'NOT_STARTED';
      const isCurrent = state.currentRoundNumber === def.roundNumber;

      const isCurrentActive =
        isCurrent &&
        teamEligibility === 'ELIGIBLE' &&
        ((def.roundNumber === 1 && state.status === 'ROUND_1_ACTIVE') ||
          (def.roundNumber === 2 && state.status === 'ROUND_2_ACTIVE') ||
          (def.roundNumber === 3 && state.status === 'ROUND_3_ACTIVE'));

      let cardStatus: ParticipantRoundStatus = 'LOCKED';
      if (teamEligibility === 'INELIGIBLE') {
        cardStatus = 'NOT_QUALIFIED';
      } else if (
        (state.currentRoundNumber && state.currentRoundNumber > def.roundNumber) ||
        state.status === 'COMPLETED'
      ) {
        cardStatus = 'COMPLETED';
      } else if (pStatus === 'SUBMITTED') {
        cardStatus = 'SUBMITTED';
      } else if (isCurrentActive) {
        if (pStatus === 'IN_PROGRESS') {
          cardStatus = 'ACTIVE';
        } else {
          cardStatus = 'AVAILABLE';
        }
      } else {
        cardStatus = 'LOCKED';
      }

      const isScorePublished = dbRound?.isLeaderboardPublished ?? false;
      const score = isScorePublished && prog?.score !== null && prog?.score !== undefined ? Number(prog.score) : null;

      return {
        roundNumber: def.roundNumber,
        name: (dbRound?.name || def.name).replace(/\bBoss\b/gi, '').replace(/\s+/g, ' ').trim(),
        description: (dbRound?.description || def.description).replace(/\bBoss\b/gi, '').replace(/\s+/g, ' ').trim(),
        durationMinutes: dbRound?.durationMinutes || def.durationMinutes,
        maximumMarks: dbRound ? Number(dbRound.maximumMarks) : def.maximumMarks,
        status: cardStatus,
        teamEligibility,
        participationStatus: pStatus,
        isCurrent,
        score,
        isScorePublished,
      };
    });

    // Check reset timestamp
    const lastResetLog = await this.prisma.activityLog.findFirst({
      where: { action: { in: ['COMPETITION_RESET', 'COMPETITION_PROGRESS_RESET'] } },
      orderBy: { createdAt: 'desc' },
    });
    const lastResetAt = lastResetLog?.createdAt || new Date(0);

    // 1. Authoritative Qualification Announcement
    let qualificationAnnouncement: TeamQualificationAnnouncement | null = null;
    const r3ShortlistLog = await this.prisma.activityLog.findFirst({
      where: {
        action: 'SHORTLISTING_ROUND_3',
        createdAt: { gt: lastResetAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    const r2ShortlistLog = await this.prisma.activityLog.findFirst({
      where: {
        action: 'SHORTLISTING_ROUND_2',
        createdAt: { gt: lastResetAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (r3ShortlistLog) {
      const r3Prog = team.roundProgress.find((p) => p.round.roundNumber === 3);
      if (r3Prog) {
        const isQualified = r3Prog.eligibilityStatus === 'ELIGIBLE';
        qualificationAnnouncement = {
          id: `qual-r3-${team.id}-${r3ShortlistLog.id}`,
          type: isQualified ? 'QUALIFIED' : 'ELIMINATED',
          roundNumber: 2,
          roundName: 'Round 2: Bug Hunt Arena',
          targetRoundNumber: 3,
          targetRoundName: 'Round 3: Final Coding',
          title: isQualified
            ? '🎉 Congratulations! You Qualified for Round 3!'
            : 'Round 2 Results: Not Shortlisted',
          message: isQualified
            ? `Congratulations Team ${team.teamName}! Your performance in Round 2: Bug Hunt Arena has earned you a qualification ticket to Round 3: Final Coding Relay. Get ready to build!`
            : `Thank you for competing in Round 2: Bug Hunt Arena. You were not shortlisted for the final round. You gave it your best. Come back stronger!`,
          announcedAt: r3ShortlistLog.createdAt.toISOString(),
        };
      }
    } else if (r2ShortlistLog) {
      const r2Prog = team.roundProgress.find((p) => p.round.roundNumber === 2);
      if (r2Prog) {
        const isQualified = r2Prog.eligibilityStatus === 'ELIGIBLE';
        qualificationAnnouncement = {
          id: `qual-r2-${team.id}-${r2ShortlistLog.id}`,
          type: isQualified ? 'QUALIFIED' : 'ELIMINATED',
          roundNumber: 1,
          roundName: 'Round 1: MCQ Arena',
          targetRoundNumber: 2,
          targetRoundName: 'Round 2: Bug Hunt Arena',
          title: isQualified
            ? '🎉 Congratulations! You Qualified for Round 2!'
            : 'Round 1 Results: Not Shortlisted',
          message: isQualified
            ? `Congratulations Team ${team.teamName}! You successfully cleared the Round 1 MCQ screening and qualified for Round 2: Bug Hunt Arena. Prepare your workspace!`
            : `Thank you for participating in Round 1: MCQ Arena. You were not shortlisted for Round 2. You gave it your best. Come back stronger!`,
          announcedAt: r2ShortlistLog.createdAt.toISOString(),
        };
      }
    }

    // 2. Authoritative Winner Declaration Announcement
    let winnerAnnouncement: TeamWinnerAnnouncement | null = null;
    const winnerLog = await this.prisma.activityLog.findFirst({
      where: {
        action: 'OFFICIAL_WINNER_DECLARED',
        createdAt: { gt: lastResetAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (winnerLog) {
      const winnerData = winnerLog.metadata as any;
      const isWinner = winnerData?.teamId === team.id;
      winnerAnnouncement = {
        id: `winner-${winnerLog.id}`,
        type: isWinner ? 'GRAND_WINNER' : 'COMPLETED',
        isWinner,
        winnerTeamName: winnerData?.teamName || 'Champion Team',
        winnerTeamCode: winnerData?.teamCode || '',
        winnerScore: Number(winnerData?.totalScore || 0),
        institution: winnerData?.institution || null,
        title: isWinner
          ? '🏆 Grand Champions of IGNITRON 2K26!'
          : 'IGNITRON 2K26 Concluded: Official Results',
        message: isWinner
          ? `VICTORY! Team ${team.teamName} has officially been crowned the Champions of IGNITRON 2K26 with a tournament-winning score of ${winnerData?.totalScore} points!`
          : `The championship has concluded. Congratulations to Champions Team ${winnerData?.teamName} (${winnerData?.teamCode}) with ${winnerData?.totalScore} pts. Thank you Team ${team.teamName} for competing with dedication and passion!`,
        declaredAt: winnerData?.declaredAt || winnerLog.createdAt.toISOString(),
      };
    }

    return {
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      institution: team.institution,
      participants: team.participants.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone ?? undefined,
        studentId: p.studentId ?? undefined,
        isActive: p.isActive,
      })),
      activeParticipant,
      competitionStatus: state.status as CompetitionStatus,
      currentRound,
      eligibilityStatus,
      participationStatus,
      isEligible,
      deadlineAt: state.deadlineAt ? state.deadlineAt.toISOString() : null,
      serverTime: now.toISOString(),
      isPaused: state.isPaused,
      remainingDurationSeconds: currentRemainingDuration,
      roundHistory,
      roundCards,
      qualificationAnnouncement,
      winnerAnnouncement,
    };
  }

  /**
   * Retrieves leaderboard entries with privacy and publish-state controls
   */
  async getLeaderboard(user?: AuthUser, roundNumber?: number): Promise<LeaderboardResponseDto> {
    const isAdmin = user?.type === 'ADMIN';

    // Specific round leaderboard
    if (roundNumber) {
      const round = await this.prisma.competitionRound.findUnique({
        where: { roundNumber },
      });

      if (!round) {
        return {
          roundNumber,
          isPublished: false,
          publishedAt: null,
          entries: [],
        };
      }

      // If not admin and round leaderboard not published, do not expose scores
      if (!isAdmin && !round.isLeaderboardPublished) {
        return {
          roundNumber,
          isPublished: false,
          publishedAt: null,
          entries: [],
        };
      }

      const progressList = await this.prisma.teamRoundProgress.findMany({
        where: {
          roundId: round.id,
          team: { isActive: true },
        },
        include: {
          team: true,
        },
        orderBy: [
          { score: 'desc' },
          { submittedAt: 'asc' },
        ],
      });

      const entries: LeaderboardEntryDto[] = progressList.map((p, idx) => ({
        rank: idx + 1,
        teamId: isAdmin ? p.team.id : undefined,
        teamCode: p.team.teamCode,
        teamName: p.team.teamName,
        institution: p.team.institution,
        score: Number(p.score),
        roundScores: {
          [round.roundNumber]: Number(p.score),
        },
      }));

      return {
        roundNumber,
        isPublished: round.isLeaderboardPublished,
        publishedAt: round.leaderboardPublishedAt?.toISOString() || null,
        entries,
      };
    }

    // Overall tournament leaderboard
    const allRounds = await this.prisma.competitionRound.findMany({
      orderBy: { roundNumber: 'asc' },
    });

    const isAnyPublished = allRounds.some((r) => r.isLeaderboardPublished);

    // If not admin and no rounds are published, return unpublished
    if (!isAdmin && !isAnyPublished) {
      return {
        roundNumber: null,
        isPublished: false,
        publishedAt: null,
        entries: [],
      };
    }

    const teams = await this.prisma.team.findMany({
      where: { isActive: true },
      include: {
        roundProgress: {
          include: { round: true },
        },
      },
    });

    const rankedTeams = teams.map((team) => {
      let totalScore = 0;
      const roundScores: Record<number, number> = {};

      for (const p of team.roundProgress) {
        // Non-admin only gets scores from published rounds
        if (isAdmin || p.round.isLeaderboardPublished) {
          const sc = Number(p.score) || 0;
          totalScore += sc;
          roundScores[p.round.roundNumber] = sc;
        }
      }

      return {
        teamId: isAdmin ? team.id : undefined,
        teamCode: team.teamCode,
        teamName: team.teamName,
        institution: team.institution,
        score: totalScore,
        roundScores,
      };
    });

    rankedTeams.sort((a, b) => b.score - a.score);

    const entries: LeaderboardEntryDto[] = rankedTeams.map((t, idx) => ({
      rank: idx + 1,
      teamId: t.teamId,
      teamCode: t.teamCode,
      teamName: t.teamName,
      institution: t.institution,
      score: t.score,
      roundScores: t.roundScores,
    }));

    const latestPublishedAt = allRounds
      .filter((r) => r.isLeaderboardPublished && r.leaderboardPublishedAt)
      .sort(
        (a, b) =>
          (b.leaderboardPublishedAt?.getTime() || 0) -
          (a.leaderboardPublishedAt?.getTime() || 0),
      )[0]?.leaderboardPublishedAt;

    const lastResetLog = await this.prisma.activityLog.findFirst({
      where: { action: 'COMPETITION_RESET' },
      orderBy: { createdAt: 'desc' },
    });

    const compState = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    let winnerTeam: any = null;
    if (compState && compState.status !== 'STANDBY') {
      const winnerLog = await this.prisma.activityLog.findFirst({
        where: { action: 'OFFICIAL_WINNER_DECLARED' },
        orderBy: { createdAt: 'desc' },
      });
      if (winnerLog && (!lastResetLog || winnerLog.createdAt > lastResetLog.createdAt)) {
        winnerTeam = (winnerLog.metadata as any) || null;
      }
    }

    return {
      roundNumber: null,
      isPublished: isAnyPublished,
      publishedAt: latestPublishedAt?.toISOString() || null,
      entries,
      winnerTeam,
    } as any;
  }

  /**
   * Admin declares official tournament winner after all 3 rounds are evaluated
   */
  async declareWinner(dto: { teamId: string; notes?: string }, adminId: string) {
    if (!dto?.teamId) {
      throw new BadRequestException('teamId is required to declare official winner');
    }

    const [team, state, rounds] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: dto.teamId },
        include: {
          participants: true,
          roundProgress: {
            include: { round: true },
          },
        },
      }),
      this.getOrCreateGlobalState(),
      this.prisma.competitionRound.findMany({
        orderBy: { roundNumber: 'asc' },
      }),
    ]);

    if (!team) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }

    // Verify round completion / evaluation status
    const r3 = rounds.find((r) => r.roundNumber === 3);
    const isRound3Concluded =
      r3?.status === 'COMPLETED' ||
      state.status === 'FINAL_EVALUATION' ||
      state.status === 'COMPLETED';
    if (!isRound3Concluded) {
      throw new BadRequestException(
        'Cannot declare official winner until Round 3 has concluded and final evaluation is reached.',
      );
    }

    // Calculate official total score across rounds
    const totalScore = team.roundProgress.reduce((sum, p) => sum + Number(p.score), 0);
    const now = new Date();

    const winnerData = {
      teamId: team.id,
      teamName: team.teamName,
      teamCode: team.teamCode,
      institution: team.institution,
      totalScore,
      notes: dto.notes || null,
      declaredAt: now.toISOString(),
      participants: team.participants.map((p) => p.fullName),
    };

    // 1. Audit log
    await this.prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'OFFICIAL_WINNER_DECLARED',
        description: `Admin officially declared ${team.teamName} (${team.teamCode}) as Champion of IGNITRON 2K26 with ${totalScore} pts`,
        metadata: winnerData,
      },
    });

    // 2. Official broadcast announcement
    const author = await this.prisma.adminAccount.findUnique({ where: { id: adminId } });
    await this.prisma.announcement.create({
      data: {
        title: `🏆 Official Winner Declared: Team ${team.teamName}!`,
        message: `Congratulations to ${team.teamName} (${team.teamCode}) from ${team.institution || 'Verified College'} for claiming victory in the IGNITRON 2K26 Code Relay Championship with an outstanding score of ${totalScore} points!`,
        priority: 'URGENT',
        isPublished: true,
        publishedAt: now,
        authorId: author ? adminId : null,
      },
    });

    return {
      message: `Team ${team.teamName} officially declared tournament winner!`,
      winner: winnerData,
    };
  }

  /**
   * Publishes or unpublishes the leaderboard (Admin only)
   */
  async publishLeaderboard(dto: BackendPublishLeaderboardDto, adminId: string) {
    const publishedAt = dto.isPublished ? new Date() : null;

    if (dto.roundNumber) {
      await this.prisma.competitionRound.updateMany({
        where: { roundNumber: dto.roundNumber },
        data: {
          isLeaderboardPublished: dto.isPublished,
          leaderboardPublishedAt: publishedAt,
        },
      });
    } else {
      await this.prisma.competitionRound.updateMany({
        data: {
          isLeaderboardPublished: dto.isPublished,
          leaderboardPublishedAt: publishedAt,
        },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminId,
        action: dto.isPublished ? 'LEADERBOARD_PUBLISHED' : 'LEADERBOARD_UNPUBLISHED',
        description: `Admin ${dto.isPublished ? 'published' : 'unpublished'} leaderboard${dto.roundNumber ? ` for Round ${dto.roundNumber}` : ' for all rounds'}`,
        metadata: { roundNumber: dto.roundNumber, isPublished: dto.isPublished },
      },
    });

    return {
      message: `Leaderboard ${dto.isPublished ? 'published' : 'unpublished'} successfully`,
      isPublished: dto.isPublished,
    };
  }

  /**
   * Retrieves recent competition activity logs
   */
  async getRecentActivityLogs(limit = 25): Promise<CompetitionActivityLogItem[]> {
    const logs = await this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((l) => ({
      id: l.id,
      actorType: l.actorType,
      actorId: l.actorId,
      action: l.action,
      description: l.description,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Generates a realistic set of labeled demonstration teams with scores for professor demos
   */
  async generateDemoData(dto: GenerateDemoDataDto, adminId: string) {
    const count = dto.count || 20;
    const demoColleges = [
      'Indian Institute of Technology',
      'National Institute of Technology',
      'Birla Institute of Technology',
      'Delhi Technological University',
      'Vellore Institute of Technology',
    ];

    const demoNames = [
      'Byte Bandits', 'Kernel Panic', 'Cyber Knights', 'Quantum Coders', 'Null Pointers',
      'Binary Beasts', 'Stack Overflow', 'Algo Wizards', 'Syntax Sorcerers', 'Bug Busters',
      'Code Crusaders', 'Runtime Rebels', 'Logic Lords', 'Bit Shifters', 'Data Dragons',
      'Pixel Pioneers', 'Lambda Legends', 'Exception Handlers', 'Recursion Riders', 'Terminal Titans',
    ];

    const saltRounds = 10;
    const demoPassword = 'DemoTeam@2026';
    const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

    const createdTeams = [];

    await this.prisma.$transaction(async (tx) => {
      // First clean up any previous demo teams and their dependent records
      const demoTeamIds = (
        await tx.team.findMany({
          where: { isDemo: true },
          select: { id: true },
        })
      ).map((t) => t.id);

      if (demoTeamIds.length > 0) {
        await tx.submission.deleteMany({
          where: { teamId: { in: demoTeamIds } },
        });
        await tx.teamRoundProgress.deleteMany({
          where: { teamId: { in: demoTeamIds } },
        });
        await tx.teamSession.deleteMany({
          where: { teamId: { in: demoTeamIds } },
        });
        await tx.participant.deleteMany({
          where: { teamId: { in: demoTeamIds } },
        });
        await tx.team.deleteMany({
          where: { id: { in: demoTeamIds } },
        });
      }

      for (let i = 0; i < count; i++) {
        const teamNum = (i + 1).toString().padStart(2, '0');
        const teamCode = `DEMO-${teamNum}`;
        const teamName = demoNames[i] || `Demo Team ${teamNum}`;
        const college = demoColleges[i % demoColleges.length];

        const p1Name = `Contestant Alpha ${teamNum}`;
        const p1Email = `alpha_${teamNum}@demo.ignitron.local`;
        const p2Name = `Contestant Beta ${teamNum}`;
        const p2Email = `beta_${teamNum}@demo.ignitron.local`;

        const team = await tx.team.create({
          data: {
            teamCode,
            teamName,
            institution: college,
            passwordHash,
            mustChangePassword: false, // pre-cleared for easy demo logins
            isActive: true,
            isDemo: true,
            participants: {
              create: [
                { fullName: p1Name, email: p1Email, studentId: `STU-A${teamNum}` },
                { fullName: p2Name, email: p2Email, studentId: `STU-B${teamNum}` },
              ],
            },
          },
        });

        createdTeams.push({
          teamId: team.id,
          teamCode: team.teamCode,
          teamName: team.teamName,
          credentials: { password: demoPassword },
        });
      }

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'DEMO_DATA_GENERATED',
          description: `Admin seeded ${count} demonstration teams (DEMO-01 to DEMO-${count.toString().padStart(2, '0')})`,
          metadata: { count },
        },
      });
    });

    return {
      message: `Successfully seeded ${count} demonstration teams`,
      teamsCount: createdTeams.length,
      demoPassword,
    };
  }

  /**
   * Updates round duration before launch or with explicit confirmation during live execution
   */
  async updateRoundDuration(
    roundNumber: number,
    durationMinutes: number,
    confirmLiveAdjustment = false,
    adminId: string,
  ): Promise<{ success: boolean; roundNumber: number; durationMinutes: number; message: string }> {
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
      throw new BadRequestException('Round duration must be an integer between 1 and 240 minutes.');
    }

    const round = await this.prisma.competitionRound.findUnique({
      where: { roundNumber },
    });
    if (!round) {
      throw new NotFoundException(`Round ${roundNumber} does not exist.`);
    }

    const state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    const isRoundActive =
      (state?.currentRoundNumber === roundNumber && state?.status?.includes('ACTIVE')) ||
      round.status === 'ACTIVE';

    if (isRoundActive && !confirmLiveAdjustment) {
      throw new BadRequestException(
        `Round ${roundNumber} is currently LIVE. Live timer adjustment requires explicit confirmation.`,
      );
    }

    const oldDuration = round.durationMinutes;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.competitionRound.update({
        where: { id: round.id },
        data: { durationMinutes },
      });

      if (isRoundActive && state?.deadlineAt) {
        const deltaSeconds = (durationMinutes - oldDuration) * 60;
        const newDeadline = new Date(state.deadlineAt.getTime() + deltaSeconds * 1000);
        const remainingSeconds = Math.max(0, Math.floor((newDeadline.getTime() - now.getTime()) / 1000));

        await tx.competitionState.update({
          where: { id: 'global' },
          data: {
            deadlineAt: newDeadline,
            totalDurationSeconds: durationMinutes * 60,
            remainingDurationSeconds: remainingSeconds,
          },
        });

        await tx.activityLog.create({
          data: {
            actorType: 'ADMIN',
            actorId: adminId,
            action: 'LIVE_TIMER_ADJUSTMENT',
            description: `Admin adjusted live timer for Round ${roundNumber} from ${oldDuration}m to ${durationMinutes}m. New deadline: ${newDeadline.toISOString()}`,
            metadata: { roundNumber, oldDuration, newDuration: durationMinutes, deltaSeconds },
          },
        });
      } else {
        await tx.activityLog.create({
          data: {
            actorType: 'ADMIN',
            actorId: adminId,
            action: 'UPDATE_ROUND_DURATION',
            description: `Admin changed Round ${roundNumber} duration from ${oldDuration}m to ${durationMinutes}m.`,
            metadata: { roundNumber, oldDuration, newDuration: durationMinutes },
          },
        });
      }
    });

    return {
      success: true,
      roundNumber,
      durationMinutes,
      message: `Round ${roundNumber} duration successfully updated to ${durationMinutes} minutes.`,
    };
  }

  /**
   * Synchronized launch triggered automatically when countdown hits zero
   */
  async launchRoundFromCountdown(roundNumber: number, startedAt: Date, adminId = 'system') {
    const round = await this.prisma.competitionRound.findUnique({
      where: { roundNumber },
    });
    if (!round) return;

    const durationSeconds = round.durationMinutes * 60;
    const deadline = new Date(startedAt.getTime() + durationSeconds * 1000);
    const statusMap: Record<number, CompetitionStatus> = {
      1: 'ROUND_1_ACTIVE',
      2: 'ROUND_2_ACTIVE',
      3: 'ROUND_3_ACTIVE',
    };

    await this.prisma.$transaction(async (tx) => {
      if (roundNumber === 1) {
        const activeTeams = await tx.team.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        for (const t of activeTeams) {
          await tx.teamRoundProgress.upsert({
            where: { teamId_roundId: { teamId: t.id, roundId: round.id } },
            update: { eligibilityStatus: 'ELIGIBLE', participationStatus: 'NOT_STARTED' },
            create: { teamId: t.id, roundId: round.id, eligibilityStatus: 'ELIGIBLE', participationStatus: 'NOT_STARTED', score: 0 },
          });
        }
      }

      await tx.competitionRound.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });

      await tx.competitionState.update({
        where: { id: 'global' },
        data: {
          status: statusMap[roundNumber] || 'ROUND_1_ACTIVE',
          currentRoundNumber: roundNumber,
          isPaused: false,
          startedAt,
          deadlineAt: deadline,
          pausedAt: null,
          totalDurationSeconds: durationSeconds,
          remainingDurationSeconds: durationSeconds,
          countdownEndsAt: null,
          preRoundAnnouncedRound: null,
        },
      });

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: `ROUND_${roundNumber}_STARTED`,
          description: `Round ${roundNumber}: ${round.name} started live automatically via synchronized countdown.`,
          metadata: { roundNumber, durationMinutes: round.durationMinutes },
        },
      });
    });
  }

  /**
   * Evaluates server deadline and automatically concludes active round if time has reached 00:00.
   * Concurrency-safe: only one transaction will transition the round.
   */
  async autoConcludeActiveRoundIfExpired(): Promise<boolean> {
    const now = new Date();
    const state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    if (!state || state.isPaused || !state.deadlineAt) {
      return false;
    }

    if (!['ROUND_1_ACTIVE', 'ROUND_2_ACTIVE', 'ROUND_3_ACTIVE'].includes(state.status)) {
      return false;
    }

    if (now.getTime() < state.deadlineAt.getTime()) {
      return false;
    }

    const currentRoundNumber =
      state.currentRoundNumber ||
      (state.status === 'ROUND_1_ACTIVE' ? 1 : state.status === 'ROUND_2_ACTIVE' ? 2 : 3);

    try {
      this.logger.log(
        `[Server Deadline Reached] Round ${currentRoundNumber} deadline (${state.deadlineAt.toISOString()}) expired at ${now.toISOString()}. Auto-concluding round...`,
      );
      await this.concludeRoundInternal(currentRoundNumber, 'SERVER_DEADLINE', 'system-timer');
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to auto-conclude expired Round ${currentRoundNumber}: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Concludes a round inside an isolated transaction.
   */
  async concludeRoundInternal(
    currentRoundNumber: number,
    reason: 'ADMIN_MANUAL' | 'SERVER_DEADLINE',
    adminId = 'system',
  ): Promise<{ message: string; nextStatus: string }> {
    return await this.prisma.$transaction(async (tx) => {
      return await this.concludeRoundInTx(tx, currentRoundNumber, reason, adminId);
    });
  }

  /**
   * Core transactional logic for concluding a round:
   * 1. Updates round status to COMPLETED
   * 2. Auto-captures and finalizes unsubmitted work for all eligible teams
   * 3. Transitions global state to evaluation
   * 4. Logs audit trail and publishes system announcement
   */
  private async concludeRoundInTx(
    tx: any,
    currentRoundNumber: number,
    reason: 'ADMIN_MANUAL' | 'SERVER_DEADLINE',
    adminId = 'system',
  ) {
    const currentState = await tx.competitionState.findUnique({
      where: { id: 'global' },
    });

    if (!currentState) {
      throw new NotFoundException('Global competition state record missing');
    }

    let nextStatus: CompetitionStatus;
    if (currentState.status === 'ROUND_1_ACTIVE') {
      nextStatus = 'ROUND_1_EVALUATION';
    } else if (currentState.status === 'ROUND_2_ACTIVE') {
      nextStatus = 'ROUND_2_EVALUATION';
    } else if (currentState.status === 'ROUND_3_ACTIVE') {
      nextStatus = 'FINAL_EVALUATION';
    } else {
      // Already concluded or transitioned by a concurrent process
      return {
        message: `Round ${currentRoundNumber} is already in state "${currentState.status}".`,
        nextStatus: currentState.status,
      };
    }

    const now = new Date();
    const currentRound = await tx.competitionRound.findUnique({
      where: { roundNumber: currentRoundNumber },
    });

    if (currentRound) {
      await tx.competitionRound.update({
        where: { id: currentRound.id },
        data: { status: 'COMPLETED' },
      });

      // Automatic submission of unsent work for all eligible teams in this round
      if (currentRoundNumber === 1) {
        const eligibleR1 = await tx.teamRoundProgress.findMany({
          where: { roundId: currentRound.id, eligibilityStatus: 'ELIGIBLE' },
        });
        const r1Questions = await tx.question.findMany({
          where: { roundId: currentRound.id, type: 'MCQ' },
          select: { id: true, correctOption: true, marks: true },
        });

        for (const prog of eligibleR1) {
          if (prog.participationStatus === 'SUBMITTED') {
            continue;
          }

          const existingSub = await tx.submission.findFirst({
            where: { teamId: prog.teamId, roundId: currentRound.id, isTestRun: false },
            select: { id: true },
          });
          if (existingSub) {
            continue;
          }

          let savedAnswers: Array<{ questionId: string; selectedOption: number | null }> = [];
          try {
            savedAnswers = await tx.teamMcqAnswer.findMany({
              where: { teamId: prog.teamId },
              select: { questionId: true, selectedOption: true },
            });
          } catch {
            savedAnswers = [];
          }

          const validAnswers = savedAnswers.filter(
            (a) => a.selectedOption !== null && a.selectedOption !== undefined,
          );

          if (validAnswers.length === 0) {
            await tx.teamRoundProgress.update({
              where: { id: prog.id },
              data: {
                participationStatus: 'SUBMITTED',
                score: 0,
                scoreBreakdown: {
                  totalQuestions: r1Questions.length,
                  answeredCount: 0,
                  correctCount: 0,
                  autoSubmit: true,
                  noAnswers: true,
                },
                submittedAt: now,
                evaluatedAt: now,
              },
            });
            continue;
          }

          let correctCount = 0;
          for (const ans of validAnswers) {
            const q = r1Questions.find((item: any) => item.id === ans.questionId);
            if (q && q.correctOption !== null && ans.selectedOption === q.correctOption) {
              correctCount++;
            }
          }
          const score = correctCount * 2.0;

          await tx.submission.create({
            data: {
              teamId: prog.teamId,
              roundId: currentRound.id,
              sourceCode: JSON.stringify(validAnswers),
              language: 'json',
              score,
              submissionStatus: 'EVALUATED',
              submittedAt: now,
              evaluatedAt: now,
              isTestRun: false,
              testCaseResults: {
                totalQuestions: r1Questions.length,
                answeredCount: validAnswers.length,
                correctCount,
                autoSubmit: true,
              },
            },
          });

          await tx.teamRoundProgress.update({
            where: { id: prog.id },
            data: {
              participationStatus: 'SUBMITTED',
              score,
              scoreBreakdown: {
                totalQuestions: r1Questions.length,
                answeredCount: validAnswers.length,
                correctCount,
                autoSubmit: true,
              },
              submittedAt: now,
              evaluatedAt: now,
            },
          });
        }

        const r2 = await tx.competitionRound.findUnique({ where: { roundNumber: 2 } });
        if (r2) {
          for (const prog of eligibleR1) {
            await tx.teamRoundProgress.upsert({
              where: {
                teamId_roundId: {
                  teamId: prog.teamId,
                  roundId: r2.id,
                },
              },
              update: {
                eligibilityStatus: 'ELIGIBLE',
              },
              create: {
                teamId: prog.teamId,
                roundId: r2.id,
                eligibilityStatus: 'ELIGIBLE',
                participationStatus: 'NOT_STARTED',
                score: 0,
              },
            });
          }
        }
      } else if (currentRoundNumber === 2) {
        const eligibleR2 = await tx.teamRoundProgress.findMany({
          where: { roundId: currentRound.id, eligibilityStatus: 'ELIGIBLE' },
        });
        const r2Question = await tx.question.findFirst({
          where: { roundId: currentRound.id },
        });

        for (const prog of eligibleR2) {
          if (prog.participationStatus === 'SUBMITTED') {
            continue;
          }

          const existingSub = await tx.submission.findFirst({
            where: { teamId: prog.teamId, roundId: currentRound.id, isTestRun: false },
            select: { id: true },
          });

          if (!existingSub) {
            const draft = await tx.workspaceDraft.findUnique({
              where: {
                teamId_roundId_caseNumber: {
                  teamId: prog.teamId,
                  roundId: currentRound.id,
                  caseNumber: 1,
                },
              },
            });
            if (draft && draft.sourceCode.trim().length > 0) {
              await tx.submission.create({
                data: {
                  teamId: prog.teamId,
                  roundId: currentRound.id,
                  questionId: r2Question?.id || null,
                  sourceCode: draft.sourceCode,
                  language: draft.language,
                  submissionStatus: 'PENDING',
                  submittedAt: now,
                  isTestRun: false,
                  testCaseResults: { autoSubmit: true },
                },
              });
            }
          }

          await tx.teamRoundProgress.update({
            where: { id: prog.id },
            data: {
              participationStatus: 'SUBMITTED',
              submittedAt: now,
            },
          });
        }
      } else if (currentRoundNumber === 3) {
        const eligibleR3 = await tx.teamRoundProgress.findMany({
          where: { roundId: currentRound.id, eligibilityStatus: 'ELIGIBLE' },
        });
        const r3Questions = await tx.question.findMany({
          where: { roundId: currentRound.id },
        });

        for (const prog of eligibleR3) {
          if (prog.participationStatus === 'SUBMITTED') {
            continue;
          }

          for (const cNum of [1, 2, 3]) {
            const q = r3Questions.find((item: any) => item.caseNumber === cNum);
            if (!q) continue;

            const existingSub = await tx.submission.findFirst({
              where: {
                teamId: prog.teamId,
                roundId: currentRound.id,
                questionId: q.id,
                isTestRun: false,
              },
              select: { id: true },
            });

            if (!existingSub) {
              const draft = await tx.workspaceDraft.findUnique({
                where: {
                  teamId_roundId_caseNumber: {
                    teamId: prog.teamId,
                    roundId: currentRound.id,
                    caseNumber: cNum,
                  },
                },
              });
              if (draft && draft.sourceCode.trim().length > 0) {
                await tx.submission.create({
                  data: {
                    teamId: prog.teamId,
                    roundId: currentRound.id,
                    questionId: q.id,
                    sourceCode: draft.sourceCode,
                    language: draft.language,
                    submissionStatus: 'PENDING',
                    submittedAt: now,
                    isTestRun: false,
                    testCaseResults: { autoSubmit: true },
                  },
                });
              }
            }
          }

          await tx.teamRoundProgress.update({
            where: { id: prog.id },
            data: {
              participationStatus: 'SUBMITTED',
              submittedAt: now,
            },
          });
        }
      }
    }

    await tx.competitionState.update({
      where: { id: 'global' },
      data: {
        status: nextStatus,
        isPaused: false,
        deadlineAt: now,
        remainingDurationSeconds: 0,
        countdownEndsAt: null,
        preRoundAnnouncedRound: null,
      },
    });

    await tx.activityLog.create({
      data: {
        actorType: reason === 'SERVER_DEADLINE' ? 'SYSTEM' : 'ADMIN',
        actorId: adminId,
        action: reason === 'SERVER_DEADLINE' ? 'ROUND_AUTO_CONCLUDED' : 'ROUND_ENDED',
        description: reason === 'SERVER_DEADLINE'
          ? `Round ${currentRoundNumber} automatically concluded as server countdown reached 00:00. Automatically captured latest participant drafts. Entered ${nextStatus}.`
          : `Admin ended Round ${currentRoundNumber}. Automatically captured latest participant drafts. Entered ${nextStatus}.`,
        metadata: {
          endedRound: currentRoundNumber,
          nextStatus,
          reason,
        },
      },
    });

    try {
      await tx.announcement.create({
        data: {
          title: `ROUND CONCLUDED`,
          message: `ROUND CONCLUDED\n\nYour latest work has been safely recorded. All arena inputs are locked and evaluation is now in progress.\nYour submission will now be evaluated.\nPlease return to your dashboard and wait for the results.`,
          priority: 'URGENT',
          isPublished: true,
          publishedAt: now,
          authorId: (await tx.adminAccount.findUnique({ where: { id: adminId } })) ? adminId : null,
        },
      });
    } catch (annErr: any) {
      this.logger.warn(`Announcement warning on round conclusion: ${annErr?.message || annErr}`);
    }

    return {
      message: `Round ${currentRoundNumber} concluded. Entered ${nextStatus}.`,
      nextStatus,
    };
  }
}

