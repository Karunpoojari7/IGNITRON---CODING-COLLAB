import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.initDatabaseConnection();
  }

  private async initDatabaseConnection(): Promise<void> {
    try {
      this.logger.log('Establishing database connection...');
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Database connection established successfully.');
      await this.ensureSchemaCompatibility();
    } catch (error) {
      this.isConnected = false;
      const message =
        error instanceof Error ? error.message : 'Database unreachable';
      this.logger.warn(
        `Database connection warning: ${message}. Operating in degraded mode until reachable.`,
      );
    }
  }

  /**
   * Automatically verifies and creates any missing schema columns/tables on boot.
   * Ensures production databases (e.g. Render MySQL/TiDB Cloud) are fully compatible
   * even when CI/CD pre-deploy migration hooks are not run.
   */
  public async ensureSchemaCompatibility(): Promise<void> {
    try {
      this.logger.log('Checking database schema compatibility...');

      // 1. Ensure core auxiliary tables exist
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`team_mcq_answers\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`team_id\` VARCHAR(191) NOT NULL,
          \`question_id\` VARCHAR(191) NOT NULL,
          \`selected_option\` INTEGER NULL,
          \`is_flagged\` BOOLEAN NOT NULL DEFAULT false,
          \`saved_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`team_mcq_answers_team_id_question_id_key\` (\`team_id\`, \`question_id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `).catch(() => {});

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`team_bug_reports\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`team_id\` VARCHAR(191) NOT NULL,
          \`question_id\` VARCHAR(191) NOT NULL,
          \`bug_key\` VARCHAR(191) NOT NULL,
          \`selected_text\` TEXT NULL,
          \`line_number\` INTEGER NULL,
          \`identified_by\` VARCHAR(191) NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`team_bug_reports_team_id_question_id_bug_key_key\` (\`team_id\`, \`question_id\`, \`bug_key\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `).catch(() => {});

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`announcements\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`title\` VARCHAR(191) NOT NULL,
          \`message\` TEXT NOT NULL,
          \`priority\` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
          \`is_published\` BOOLEAN NOT NULL DEFAULT false,
          \`published_at\` DATETIME(3) NULL,
          \`author_id\` VARCHAR(191) NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `).catch(() => {});

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`workspace_drafts\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`team_id\` VARCHAR(191) NOT NULL,
          \`round_id\` VARCHAR(191) NOT NULL,
          \`case_number\` INTEGER NOT NULL DEFAULT 1,
          \`source_code\` LONGTEXT NOT NULL,
          \`language\` VARCHAR(191) NOT NULL,
          \`version\` INTEGER NOT NULL DEFAULT 1,
          \`last_edited_by_participant_id\` VARCHAR(191) NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`workspace_drafts_team_id_round_id_case_number_key\` (\`team_id\`, \`round_id\`, \`case_number\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `).catch(() => {});

      // 2. Ensure columns exist on team_mcq_answers
      await this.ensureColumn('team_mcq_answers', 'selected_option', 'INTEGER NULL');
      await this.ensureColumn('team_mcq_answers', 'is_flagged', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('team_mcq_answers', 'saved_at', 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');
      await this.ensureColumn('team_mcq_answers', 'updated_at', 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)');

      // 3. Ensure columns exist on team_bug_reports
      await this.ensureColumn('team_bug_reports', 'bug_key', 'VARCHAR(191) NOT NULL DEFAULT \'\'');
      await this.ensureColumn('team_bug_reports', 'selected_text', 'TEXT NULL');
      await this.ensureColumn('team_bug_reports', 'line_number', 'INTEGER NULL');
      await this.ensureColumn('team_bug_reports', 'identified_by', 'VARCHAR(191) NULL');
      await this.ensureColumn('team_bug_reports', 'created_at', 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');

      // 4. Ensure columns exist on announcements
      await this.ensureColumn('announcements', 'priority', 'VARCHAR(191) NOT NULL DEFAULT \'NORMAL\'');
      await this.ensureColumn('announcements', 'is_published', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('announcements', 'published_at', 'DATETIME(3) NULL');
      await this.ensureColumn('announcements', 'author_id', 'VARCHAR(191) NULL');
      await this.ensureColumn('announcements', 'created_at', 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');
      await this.ensureColumn('announcements', 'updated_at', 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)');

      // 5. Ensure columns exist on submissions
      await this.ensureColumn('submissions', 'stdin', 'TEXT NULL');
      await this.ensureColumn('submissions', 'stdout', 'LONGTEXT NULL');
      await this.ensureColumn('submissions', 'stderr', 'LONGTEXT NULL');
      await this.ensureColumn('submissions', 'compile_output', 'LONGTEXT NULL');
      await this.ensureColumn('submissions', 'execution_time', 'DECIMAL(8,4) NULL');
      await this.ensureColumn('submissions', 'memory_usage', 'INTEGER NULL');
      await this.ensureColumn('submissions', 'submission_status', 'VARCHAR(191) NOT NULL DEFAULT \'PENDING\'');
      await this.ensureColumn('submissions', 'score', 'DECIMAL(6,2) NULL');
      await this.ensureColumn('submissions', 'judge0_token', 'VARCHAR(191) NULL');
      await this.ensureColumn('submissions', 'is_test_run', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('submissions', 'question_id', 'VARCHAR(191) NULL');
      await this.ensureColumn('submissions', 'test_case_results', 'JSON NULL');
      await this.ensureColumn('submissions', 'submitted_at', 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');
      await this.ensureColumn('submissions', 'evaluated_at', 'DATETIME(3) NULL');

      // 6. Ensure columns exist on questions
      await this.ensureColumn('questions', 'type', 'VARCHAR(191) NOT NULL DEFAULT \'MCQ\'');
      await this.ensureColumn('questions', 'order_number', 'INTEGER NOT NULL DEFAULT 1');
      await this.ensureColumn('questions', 'case_number', 'INTEGER NULL');
      await this.ensureColumn('questions', 'starter_code', 'LONGTEXT NULL');
      await this.ensureColumn('questions', 'language', 'VARCHAR(191) NULL');
      await this.ensureColumn('questions', 'marks', 'DECIMAL(6,2) NOT NULL DEFAULT 2.00');
      await this.ensureColumn('questions', 'options', 'JSON NULL');
      await this.ensureColumn('questions', 'correct_option', 'INTEGER NULL');
      await this.ensureColumn('questions', 'explanation', 'TEXT NULL');
      await this.ensureColumn('questions', 'sample_test_cases', 'JSON NULL');
      await this.ensureColumn('questions', 'hidden_test_cases', 'JSON NULL');
      await this.ensureColumn('questions', 'planted_bugs', 'JSON NULL');
      await this.ensureColumn('questions', 'rubric', 'JSON NULL');
      await this.ensureColumn('questions', 'is_active', 'BOOLEAN NOT NULL DEFAULT true');

      // 7. Ensure columns exist on competition_state
      await this.ensureColumn('competition_state', 'status', 'VARCHAR(191) NOT NULL DEFAULT \'STANDBY\'');
      await this.ensureColumn('competition_state', 'current_round_number', 'INTEGER NULL');
      await this.ensureColumn('competition_state', 'is_paused', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('competition_state', 'started_at', 'DATETIME(3) NULL');
      await this.ensureColumn('competition_state', 'deadline_at', 'DATETIME(3) NULL');
      await this.ensureColumn('competition_state', 'paused_at', 'DATETIME(3) NULL');
      await this.ensureColumn('competition_state', 'remaining_duration_seconds', 'INTEGER NULL');
      await this.ensureColumn('competition_state', 'total_duration_seconds', 'INTEGER NULL');
      await this.ensureColumn('competition_state', 'countdown_ends_at', 'DATETIME(3) NULL');
      await this.ensureColumn('competition_state', 'countdown_seconds', 'INTEGER NULL DEFAULT 5');
      await this.ensureColumn('competition_state', 'pre_round_announced_round', 'INTEGER NULL');

      // 8. Ensure columns exist on evaluations
      await this.ensureColumn('evaluations', 'team_id', 'VARCHAR(191) NULL');
      await this.ensureColumn('evaluations', 'round_number', 'INTEGER NULL');
      await this.ensureColumn('evaluations', 'criteria_scores', 'JSON NULL');
      await this.ensureColumn('evaluations', 'feedback', 'TEXT NULL');
      await this.ensureColumn('evaluations', 'evaluator_id', 'VARCHAR(191) NULL');

      // 9. Ensure columns exist on workspace_drafts
      await this.ensureColumn('workspace_drafts', 'case_number', 'INTEGER NOT NULL DEFAULT 1');
      await this.ensureColumn('workspace_drafts', 'version', 'INTEGER NOT NULL DEFAULT 1');
      await this.ensureColumn('workspace_drafts', 'last_edited_by_participant_id', 'VARCHAR(191) NULL');

      // 10. Ensure columns exist on team_round_progress
      await this.ensureColumn('team_round_progress', 'score_breakdown', 'JSON NULL');
      await this.ensureColumn('team_round_progress', 'eligibility_status', 'VARCHAR(191) NOT NULL DEFAULT \'PENDING\'');
      await this.ensureColumn('team_round_progress', 'participation_status', 'VARCHAR(191) NOT NULL DEFAULT \'NOT_STARTED\'');
      await this.ensureColumn('team_round_progress', 'started_at', 'DATETIME(3) NULL');
      await this.ensureColumn('team_round_progress', 'submitted_at', 'DATETIME(3) NULL');
      await this.ensureColumn('team_round_progress', 'evaluated_at', 'DATETIME(3) NULL');

      // 11. Ensure columns exist on competition_rounds
      await this.ensureColumn('competition_rounds', 'is_leaderboard_published', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('competition_rounds', 'leaderboard_published_at', 'DATETIME(3) NULL');

      // 12. Ensure columns exist on teams
      await this.ensureColumn('teams', 'must_change_password', 'BOOLEAN NOT NULL DEFAULT true');
      await this.ensureColumn('teams', 'is_demo', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('teams', 'last_login_at', 'DATETIME(3) NULL');

      this.logger.log('Database schema compatibility verified successfully.');
    } catch (err: any) {
      this.logger.warn(`Schema compatibility verification warning: ${err?.message || err}`);
    }
  }

  private async ensureColumn(tableName: string, columnName: string, columnDef: string): Promise<void> {
    try {
      await this.$executeRawUnsafe(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`,
      );
      this.logger.log(`Successfully added missing column \`${tableName}.${columnName}\`.`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes('Duplicate column') ||
        msg.includes('1060') ||
        msg.includes('already exists')
      ) {
        return;
      }
      this.logger.warn(`Notice for column \`${tableName}.${columnName}\`: ${msg}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('Database connection disconnected cleanly.');
    } catch (error) {
      this.logger.error('Error during database disconnection:', error);
    }
  }

  /**
   * Probes active connectivity to the MySQL database instance.
   * Enforces a 2.5s timeout and catches errors cleanly without throwing.
   */
  async ping(): Promise<boolean> {
    try {
      await Promise.race([
        this.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 2500),
        ),
      ]);
      this.isConnected = true;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
