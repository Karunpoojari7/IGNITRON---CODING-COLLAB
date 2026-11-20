-- AlterTable
ALTER TABLE `questions` ADD COLUMN `planted_bugs` JSON NULL;

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
ALTER TABLE `team_bug_reports` ADD CONSTRAINT `team_bug_reports_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_bug_reports` ADD CONSTRAINT `team_bug_reports_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
