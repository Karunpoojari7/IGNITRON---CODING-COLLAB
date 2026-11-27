import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class RunBugHuntTestInputDto {
  @IsString()
  questionId!: string;

  @IsString()
  sourceCode!: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sampleIndex?: number;

  @IsString()
  @IsOptional()
  customStdin?: string;
}
