-- AlterTable
ALTER TABLE `competition_state` ADD COLUMN `countdown_ends_at` DATETIME(3) NULL,
    ADD COLUMN `countdown_seconds` INTEGER NULL DEFAULT 5,
    ADD COLUMN `pre_round_announced_round` INTEGER NULL,
    MODIFY `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    ALTER COLUMN `updated_at` DROP DEFAULT;
