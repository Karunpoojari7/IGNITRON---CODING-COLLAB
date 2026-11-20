-- ==============================================================================
-- IGNITRON 2K26 — DATABASE INITIALIZATION SEED SCRIPT
-- Database: MySQL 8.0+
-- Description: Core seed data for official rounds, admin account, and global state
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Initialize Global Competition State Machine
INSERT INTO `competition_state` (
    `id`,
    `status`,
    `current_round_number`,
    `is_paused`,
    `countdown_seconds`,
    `updated_at`
) VALUES (
    'global',
    'STANDBY',
    NULL,
    0,
    5,
    NOW(3)
) ON DUPLICATE KEY UPDATE
    `updated_at` = NOW(3);

-- 2. Seed Official Competition Rounds (Rounds 1, 2, and 3)
INSERT INTO `competition_rounds` (
    `id`,
    `round_number`,
    `name`,
    `description`,
    `duration_minutes`,
    `maximum_marks`,
    `status`,
    `is_leaderboard_published`,
    `created_at`,
    `updated_at`
) VALUES
(
    'round-1-mcq',
    1,
    'MCQ Arena',
    'Round 1 of IGNITRON 2K26 Code Relay: Fast-paced algorithmic multiple-choice questions assessing core computer science and programming fundamentals.',
    30,
    30.00,
    'UPCOMING',
    0,
    NOW(3),
    NOW(3)
),
(
    'round-2-bug-hunt',
    2,
    'Bug Hunt Arena',
    'Round 2 of IGNITRON 2K26 Code Relay: Code debugging and error isolation challenges across multiple programming languages.',
    40,
    100.00,
    'UPCOMING',
    0,
    NOW(3),
    NOW(3)
),
(
    'round-3-final-boss',
    3,
    'Final Boss Coding',
    'Round 3 of IGNITRON 2K26 Code Relay: Complex multi-stage team code relay programming challenge against timed test suites.',
    60,
    100.00,
    'UPCOMING',
    0,
    NOW(3),
    NOW(3)
)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `duration_minutes` = VALUES(`duration_minutes`),
    `maximum_marks` = VALUES(`maximum_marks`),
    `updated_at` = NOW(3);

-- 3. Seed Default System Administrator
-- Email: admin@ignitron.local
-- Default Password: admin@123 (Change in production via ADMIN_PASSWORD environment variable)
INSERT INTO `admin_accounts` (
    `id`,
    `full_name`,
    `email`,
    `password_hash`,
    `role`,
    `is_active`,
    `created_at`,
    `updated_at`
) VALUES (
    'admin_default_bootstrap',
    'IGNITRON System Administrator',
    'admin@ignitron.local',
    '$2b$10$0R.cqg/3CZ9Euy96jHCAfuVeRv9XXt/P7w.vg6ojREgf2KFCiDiKa',
    'SUPER_ADMIN',
    1,
    NOW(3),
    NOW(3)
) ON DUPLICATE KEY UPDATE
    `is_active` = 1,
    `updated_at` = NOW(3);

-- 4. Seed Verified Team: "Code Hunters" (IGN-4DD6)
INSERT INTO `teams` (
    `id`,
    `team_code`,
    `team_name`,
    `institution`,
    `password_hash`,
    `must_change_password`,
    `is_active`,
    `is_demo`,
    `status`,
    `created_at`,
    `updated_at`
) VALUES (
    'team_code_hunters_seed',
    'IGN-4DD6',
    'Code Hunters',
    'GM university',
    '$2b$10$x6CJ.hqcDixBYK1nXVTAwOQC/PPdgYBq97RHxHajROb2.g2/MkCki',
    0,
    1,
    0,
    'ACTIVE',
    NOW(3),
    NOW(3)
) ON DUPLICATE KEY UPDATE
    `team_name` = VALUES(`team_name`),
    `institution` = VALUES(`institution`),
    `updated_at` = NOW(3);

-- Participants for "Code Hunters"
INSERT INTO `participants` (
    `id`,
    `team_id`,
    `full_name`,
    `email`,
    `phone`,
    `student_id`,
    `is_active`,
    `created_at`,
    `updated_at`
) VALUES
(
    'part_spoorthi_mo',
    'team_code_hunters_seed',
    'Spoorthi M O',
    'spoorthi.mo@gmu.ac.in',
    NULL,
    NULL,
    1,
    NOW(3),
    NOW(3)
),
(
    'part_sanjana',
    'team_code_hunters_seed',
    'Sanjana',
    'sanjana@gmu.ac.in',
    NULL,
    NULL,
    1,
    NOW(3),
    NOW(3)
)
ON DUPLICATE KEY UPDATE
    `full_name` = VALUES(`full_name`),
    `updated_at` = NOW(3);

SET FOREIGN_KEY_CHECKS = 1;
