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
    // Attempt non-blocking initial connection probe so backend bootstrap is never stalled
    void this.probeInitialConnection();
  }

  private async probeInitialConnection(): Promise<void> {
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout (3s)')), 3000),
        ),
      ]);
      this.isConnected = true;
      this.logger.log('Database connection established successfully.');
      await this.ensureSchemaCompatibility();
    } catch (error) {
      this.isConnected = false;
      const message =
        error instanceof Error ? error.message : 'Database unreachable';
      this.logger.warn(
        `Initial database connection unavailable: ${message}. Operating in offline/degraded mode until database is reachable.`,
      );
    }
  }

  /**
   * Automatically verifies and adds any missing schema columns/tables on boot.
   * Ensures production databases (e.g. Render MySQL) are fully compatible even
   * when CI/CD pre-deploy migration hooks are not available.
   */
  private async ensureSchemaCompatibility(): Promise<void> {
    try {
      this.logger.log('Checking database schema compatibility...');

      // 1. Ensure core tables exist
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`team_mcq_answers\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`team_id\` VARCHAR(191) NOT NULL,
          \`question_id\` VARCHAR(191) NOT NULL,
          \`selected_option\` INTEGER NULL,
          \`is_flagged\` BOOLEAN NOT NULL DEFAULT false,
          \`saved_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL,
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `).catch(() => {});

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`team_bug_reports\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`team_id\` VARCHAR(191) NOT NULL,
          \`question_id\` VARCHAR(191) NOT NULL,
          \`line_number\` INTEGER NULL,
          \`explanation\` TEXT NOT NULL,
          \`suggested_fix\` TEXT NULL,
          \`status\` VARCHAR(191) NOT NULL DEFAULT 'REPORTED',
          \`submitted_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL,
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `).catch(() => {});

      // 2. Ensure critical columns exist across tables
      await this.ensureColumn('team_mcq_answers', 'is_flagged', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('team_mcq_answers', 'selected_option', 'INTEGER NULL');

      await this.ensureColumn('submissions', 'is_test_run', 'BOOLEAN NOT NULL DEFAULT false');
      await this.ensureColumn('submissions', 'question_id', 'VARCHAR(191) NULL');
      await this.ensureColumn('submissions', 'test_case_results', 'JSON NULL');
      await this.ensureColumn('submissions', 'execution_time_ms', 'INTEGER NULL');
      await this.ensureColumn('submissions', 'memory_used_kb', 'INTEGER NULL');
      await this.ensureColumn('submissions', 'error_type', 'VARCHAR(191) NULL');

      await this.ensureColumn('questions', 'planted_bugs', 'JSON NULL');
      await this.ensureColumn('questions', 'options', 'JSON NULL');
      await this.ensureColumn('questions', 'correct_option', 'INTEGER NULL');
      await this.ensureColumn('questions', 'starter_code', 'TEXT NULL');
      await this.ensureColumn('questions', 'reference_solution', 'TEXT NULL');
      await this.ensureColumn('questions', 'test_cases', 'JSON NULL');

      await this.ensureColumn('competition_state', 'countdown_ends_at', 'DATETIME(3) NULL');
      await this.ensureColumn('competition_state', 'countdown_duration_secs', 'INTEGER NULL');
      await this.ensureColumn('competition_state', 'countdown_target_round', 'INTEGER NULL');

      await this.ensureColumn('evaluations', 'team_id', 'VARCHAR(191) NULL');
      await this.ensureColumn('evaluations', 'round_number', 'INTEGER NULL');
      await this.ensureColumn('evaluations', 'criteria_scores', 'JSON NULL');

      await this.ensureColumn('workspace_drafts', 'case_number', 'INTEGER NOT NULL DEFAULT 1');
      await this.ensureColumn('team_round_progress', 'score_breakdown', 'JSON NULL');
      await this.ensureColumn('competition_rounds', 'is_leaderboard_published', 'BOOLEAN NOT NULL DEFAULT false');

      this.logger.log('Database schema compatibility verified successfully.');
    } catch (err: any) {
      this.logger.warn(`Schema compatibility verification warning: ${err?.message || err}`);
    }
  }

  private async ensureColumn(tableName: string, columnName: string, columnDef: string): Promise<void> {
    try {
      const cols: any[] = await this.$queryRawUnsafe(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        tableName,
        columnName,
      );
      if (!cols || cols.length === 0) {
        this.logger.log(`Applying missing column \`${tableName}.${columnName}\`...`);
        await this.$executeRawUnsafe(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`,
        );
        this.logger.log(`Successfully added column \`${tableName}.${columnName}\`.`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not add column \`${tableName}.${columnName}\`: ${err?.message || err}`);
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
