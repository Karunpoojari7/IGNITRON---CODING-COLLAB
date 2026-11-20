-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `team_code` VARCHAR(191) NOT NULL,
    `team_name` VARCHAR(191) NOT NULL,
    `institution` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NOT NULL DEFAULT '',
    `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_demo` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'DISQUALIFIED', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teams_team_code_key`(`team_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `participants` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `student_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `participants_email_key`(`email`),
    INDEX `participants_team_id_idx`(`team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ORGANIZER', 'JUDGE') NOT NULL DEFAULT 'ORGANIZER',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_accounts_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_rounds` (
    `id` VARCHAR(191) NOT NULL,
    `round_number` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `duration_minutes` INTEGER NOT NULL,
    `maximum_marks` DECIMAL(6, 2) NOT NULL,
    `status` ENUM('UPCOMING', 'ACTIVE', 'PAUSED', 'COMPLETED') NOT NULL DEFAULT 'UPCOMING',
    `is_leaderboard_published` BOOLEAN NOT NULL DEFAULT false,
    `leaderboard_published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `competition_rounds_round_number_key`(`round_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_round_progress` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NOT NULL,
    `eligibility_status` ENUM('PENDING', 'ELIGIBLE', 'INELIGIBLE') NOT NULL DEFAULT 'PENDING',
    `participation_status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'DISQUALIFIED', 'TIMED_OUT') NOT NULL DEFAULT 'NOT_STARTED',
    `score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `score_breakdown` JSON NULL,
    `started_at` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `evaluated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `team_round_progress_team_id_idx`(`team_id`),
    INDEX `team_round_progress_round_id_idx`(`round_id`),
    UNIQUE INDEX `team_round_progress_team_id_round_id_key`(`team_id`, `round_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissions` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL,
    `source_code` LONGTEXT NOT NULL,
    `stdin` TEXT NULL,
    `stdout` LONGTEXT NULL,
    `stderr` LONGTEXT NULL,
    `compile_output` LONGTEXT NULL,
    `execution_time` DECIMAL(8, 4) NULL,
    `memory_usage` INTEGER NULL,
    `submission_status` ENUM('PENDING', 'EVALUATING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'EVALUATED') NOT NULL DEFAULT 'PENDING',
    `score` DECIMAL(6, 2) NULL,
    `judge0_token` VARCHAR(191) NULL,
    `is_test_run` BOOLEAN NOT NULL DEFAULT false,
    `question_id` VARCHAR(191) NULL,
    `test_case_results` JSON NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `evaluated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `submissions_team_id_idx`(`team_id`),
    INDEX `submissions_round_id_idx`(`round_id`),
    INDEX `submissions_question_id_idx`(`question_id`),
    INDEX `submissions_submission_status_idx`(`submission_status`),
    INDEX `submissions_is_test_run_idx`(`is_test_run`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `evaluator_id` VARCHAR(191) NULL,
    `team_id` VARCHAR(191) NULL,
    `round_number` INTEGER NULL,
    `total_score` DECIMAL(6, 2) NOT NULL,
    `criteria_scores` JSON NULL,
    `feedback` TEXT NULL,
    `evaluated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `evaluations_submission_id_idx`(`submission_id`),
    INDEX `evaluations_evaluator_id_idx`(`evaluator_id`),
    INDEX `evaluations_team_id_idx`(`team_id`),
    INDEX `evaluations_round_number_idx`(`round_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actor_type` ENUM('SYSTEM', 'ADMIN', 'TEAM') NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_actor_type_actor_id_idx`(`actor_type`, `actor_id`),
    INDEX `activity_logs_action_idx`(`action`),
    INDEX `activity_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `participant_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'ENDED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `termination_reason` ENUM('USER_LOGOUT', 'TIMEOUT', 'ADMIN_REVOKED', 'DISPLACED') NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `login_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `logout_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `team_sessions_team_id_status_idx`(`team_id`, `status`),
    INDEX `team_sessions_participant_id_status_idx`(`participant_id`, `status`),
    INDEX `team_sessions_last_activity_at_idx`(`last_activity_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_state` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `status` ENUM('STANDBY', 'ROUND_1_ACTIVE', 'ROUND_1_EVALUATION', 'ROUND_2_ACTIVE', 'ROUND_2_EVALUATION', 'ROUND_3_ACTIVE', 'FINAL_EVALUATION', 'COMPLETED') NOT NULL DEFAULT 'STANDBY',
    `current_round_number` INTEGER NULL,
    `is_paused` BOOLEAN NOT NULL DEFAULT false,
    `started_at` DATETIME(3) NULL,
    `deadline_at` DATETIME(3) NULL,
    `paused_at` DATETIME(3) NULL,
    `remaining_duration_seconds` INTEGER NULL,
    `total_duration_seconds` INTEGER NULL,
    `countdown_ends_at` DATETIME(3) NULL,
    `countdown_seconds` INTEGER NULL DEFAULT 5,
    `pre_round_announced_round` INTEGER NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_drafts` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NOT NULL,
    `case_number` INTEGER NOT NULL DEFAULT 1,
    `source_code` LONGTEXT NOT NULL,
    `language` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `last_edited_by_participant_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workspace_drafts_team_id_idx`(`team_id`),
    INDEX `workspace_drafts_round_id_idx`(`round_id`),
    UNIQUE INDEX `workspace_drafts_team_id_round_id_case_number_key`(`team_id`, `round_id`, `case_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `published_at` DATETIME(3) NULL,
    `author_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `announcements_is_published_published_at_idx`(`is_published`, `published_at`),
    INDEX `announcements_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NOT NULL,
    `type` ENUM('MCQ', 'BUG_HUNT', 'CODING_CASE') NOT NULL DEFAULT 'MCQ',
    `order_number` INTEGER NOT NULL,
    `case_number` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `starter_code` LONGTEXT NULL,
    `language` VARCHAR(191) NULL,
    `marks` DECIMAL(6, 2) NOT NULL DEFAULT 2.00,
    `options` JSON NULL,
    `correct_option` INTEGER NULL,
    `explanation` TEXT NULL,
    `sample_test_cases` JSON NULL,
    `hidden_test_cases` JSON NULL,
    `planted_bugs` JSON NULL,
    `rubric` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `questions_round_id_idx`(`round_id`),
    INDEX `questions_type_idx`(`type`),
    UNIQUE INDEX `questions_round_id_order_number_key`(`round_id`, `order_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_mcq_answers` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `selected_option` INTEGER NULL,
    `is_flagged` BOOLEAN NOT NULL DEFAULT false,
    `saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `team_mcq_answers_team_id_idx`(`team_id`),
    INDEX `team_mcq_answers_question_id_idx`(`question_id`),
    UNIQUE INDEX `team_mcq_answers_team_id_question_id_key`(`team_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_bug_reports` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `bug_key` VARCHAR(191) NOT NULL,
    `selected_text` TEXT NULL,
    `line_number` INTEGER NULL,
    `identified_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `team_bug_reports_team_id_question_id_idx`(`team_id`, `question_id`),
    UNIQUE INDEX `team_bug_reports_team_id_question_id_bug_key_key`(`team_id`, `question_id`, `bug_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `participants` ADD CONSTRAINT `participants_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_round_progress` ADD CONSTRAINT `team_round_progress_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_round_progress` ADD CONSTRAINT `team_round_progress_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_evaluator_id_fkey` FOREIGN KEY (`evaluator_id`) REFERENCES `admin_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_sessions` ADD CONSTRAINT `team_sessions_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_sessions` ADD CONSTRAINT `team_sessions_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_drafts` ADD CONSTRAINT `workspace_drafts_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_drafts` ADD CONSTRAINT `workspace_drafts_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `admin_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_mcq_answers` ADD CONSTRAINT `team_mcq_answers_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_mcq_answers` ADD CONSTRAINT `team_mcq_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_bug_reports` ADD CONSTRAINT `team_bug_reports_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_bug_reports` ADD CONSTRAINT `team_bug_reports_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

