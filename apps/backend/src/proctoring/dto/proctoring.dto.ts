import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import {
  ProctoringEventType,
  ProctoringAdminActionType,
} from '@ignitron/shared';

export class RecordProctoringEventInputDto {
  @IsInt()
  @Min(1)
  @Max(3)
  roundNumber!: number;

  @IsIn(['TAB_SWITCH', 'PAGE_HIDDEN', 'WINDOW_BLUR', 'COPY_EVENT', 'RETURNED_TO_TAB'])
  eventType!: ProctoringEventType;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsString()
  @IsOptional()
  questionId?: string;

  @IsString()
  @IsOptional()
  arenaType?: string;

  @IsString()
  @IsOptional()
  details?: string;
}

export class UpdateProctoringPolicyInputDto {
  @IsBoolean()
  @IsOptional()
  strictModeEnabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxWarningsBeforeLock?: number;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  autoRevokeThreshold?: number;

  @IsBoolean()
  @IsOptional()
  monitorCopyEvents?: boolean;
}

export class AdminProctoringActionInputDto {
  @IsString()
  teamId!: string;

  @IsString()
  @IsOptional()
  participantId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsInt()
  @IsOptional()
  roundNumber?: number;

  @IsIn(['ISSUE_WARNING', 'UNLOCK', 'KEEP_LOCKED', 'BLOCK_PARTICIPANT', 'DISQUALIFY_TEAM'])
  action!: ProctoringAdminActionType;

  @IsString()
  @IsOptional()
  reason?: string;
}
