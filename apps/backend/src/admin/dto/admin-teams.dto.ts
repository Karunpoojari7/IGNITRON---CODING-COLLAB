import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TeamStatus, BulkTeamActionType } from '@ignitron/shared';

export class ParticipantInputDto {
  @IsString()
  @IsNotEmpty({ message: 'Participant full name is required' })
  fullName!: string;

  @IsEmail({}, { message: 'A valid participant email is required' })
  @IsNotEmpty({ message: 'Participant email is required' })
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  studentId?: string;
}

export class CreateTeamDto {
  @IsString()
  @IsOptional()
  teamCode?: string;

  @IsString()
  @IsNotEmpty({ message: 'Team name is required' })
  teamName!: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'A team must have exactly 2 participants' })
  @ArrayMaxSize(2, { message: 'A team must have exactly 2 participants' })
  @ValidateNested({ each: true })
  @Type(() => ParticipantInputDto)
  participants!: ParticipantInputDto[];
}

export class UpdateParticipantDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  studentId?: string;
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  teamName?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(['ACTIVE', 'DISQUALIFIED', 'WITHDRAWN'] as const)
  @IsOptional()
  status?: TeamStatus;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateParticipantDto)
  participants?: UpdateParticipantDto[];
}

export class ToggleTeamStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class BulkTeamActionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one team must be selected' })
  @IsString({ each: true })
  teamIds!: string[];

  @IsEnum(['ACTIVATE', 'DEACTIVATE', 'DELETE', 'REVOKE_SESSIONS'] as const, {
    message: 'Action must be ACTIVATE, DEACTIVATE, DELETE, or REVOKE_SESSIONS',
  })
  action!: BulkTeamActionType;
}

