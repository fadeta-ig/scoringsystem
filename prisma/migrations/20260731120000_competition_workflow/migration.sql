-- Replace the generic scoreboard model with the fixed competition workflow.
-- Existing development teams/scenes/scores are intentionally removed; the new
-- preliminary roster is populated by prisma/seed.mjs after this migration.

DROP TABLE `active_scenes`;
DROP TABLE `bracket_nodes`;
DROP TABLE `score_entries`;
DROP TABLE `members`;
DROP TABLE `scenes`;
DROP TABLE `score_presets`;
DROP TABLE `competition_units`;

ALTER TABLE `events` DROP FOREIGN KEY `events_logoAssetId_fkey`;
DROP INDEX `events_logoAssetId_fkey` ON `events`;
DROP TABLE `assets`;
DROP TABLE `teams`;

ALTER TABLE `events`
    DROP COLUMN `logoAssetId`,
    DROP COLUMN `theme`;

CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `bannerColor` VARCHAR(191) NOT NULL,
    `preliminarySession` INTEGER NOT NULL,
    `displayOrder` INTEGER NOT NULL,
    `preliminaryScore` INTEGER NULL,
    `completionSeconds` INTEGER NULL,
    `isSessionWinner` BOOLEAN NOT NULL DEFAULT false,
    `finalOrder` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `teams_eventId_idx`(`eventId`),
    INDEX `teams_eventId_preliminarySession_idx`(`eventId`, `preliminarySession`),
    UNIQUE INDEX `teams_eventId_preliminarySession_displayOrder_key`(`eventId`, `preliminarySession`, `displayOrder`),
    UNIQUE INDEX `teams_eventId_finalOrder_key`(`eventId`, `finalOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `competition_states` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `stage` ENUM('PRELIMINARY', 'FINAL_SESSION_1', 'FINAL_SESSION_2', 'FINAL_SESSION_3', 'FINAL_COMPLETE', 'GRAND_FINAL', 'FINISHED') NOT NULL DEFAULT 'PRELIMINARY',
    `currentQuestion` INTEGER NOT NULL DEFAULT 1,
    `grandFinalTeamId` VARCHAR(191) NULL,
    `grandPrize` INTEGER NOT NULL DEFAULT 0,
    `grandDecisionPending` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `competition_states_eventId_key`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `competition_actions` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `kind` ENUM('FINAL_S1_RESULT', 'FINAL_S2_RESULT', 'FINAL_S3_RESULT', 'JURY_SELECTION', 'START_GRAND_FINAL', 'GRAND_DECISION', 'GRAND_RESULT') NOT NULL,
    `stage` ENUM('PRELIMINARY', 'FINAL_SESSION_1', 'FINAL_SESSION_2', 'FINAL_SESSION_3', 'FINAL_COMPLETE', 'GRAND_FINAL', 'FINISHED') NOT NULL,
    `questionNumber` INTEGER NULL,
    `actorTeamId` VARCHAR(191) NULL,
    `targetTeamId` VARCHAR(191) NULL,
    `amount` INTEGER NULL,
    `outcome` ENUM('CORRECT', 'WRONG') NULL,
    `answerMode` ENUM('SELF', 'PASS') NULL,
    `description` VARCHAR(191) NOT NULL,
    `stateBefore` JSON NOT NULL,
    `stateAfter` JSON NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revertedAt` DATETIME(3) NULL,

    INDEX `competition_actions_eventId_createdAt_idx`(`eventId`, `createdAt`),
    INDEX `competition_actions_eventId_revertedAt_idx`(`eventId`, `revertedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `score_deltas` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `actionId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `score_deltas_eventId_idx`(`eventId`),
    INDEX `score_deltas_actionId_idx`(`actionId`),
    INDEX `score_deltas_teamId_idx`(`teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `teams`
    ADD CONSTRAINT `teams_eventId_fkey`
    FOREIGN KEY (`eventId`) REFERENCES `events`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `competition_states`
    ADD CONSTRAINT `competition_states_eventId_fkey`
    FOREIGN KEY (`eventId`) REFERENCES `events`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `competition_states`
    ADD CONSTRAINT `competition_states_grandFinalTeamId_fkey`
    FOREIGN KEY (`grandFinalTeamId`) REFERENCES `teams`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `competition_actions`
    ADD CONSTRAINT `competition_actions_eventId_fkey`
    FOREIGN KEY (`eventId`) REFERENCES `events`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `competition_actions`
    ADD CONSTRAINT `competition_actions_actorTeamId_fkey`
    FOREIGN KEY (`actorTeamId`) REFERENCES `teams`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `competition_actions`
    ADD CONSTRAINT `competition_actions_targetTeamId_fkey`
    FOREIGN KEY (`targetTeamId`) REFERENCES `teams`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `competition_actions`
    ADD CONSTRAINT `competition_actions_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `admin_users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `score_deltas`
    ADD CONSTRAINT `score_deltas_eventId_fkey`
    FOREIGN KEY (`eventId`) REFERENCES `events`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `score_deltas`
    ADD CONSTRAINT `score_deltas_actionId_fkey`
    FOREIGN KEY (`actionId`) REFERENCES `competition_actions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `score_deltas`
    ADD CONSTRAINT `score_deltas_teamId_fkey`
    FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
