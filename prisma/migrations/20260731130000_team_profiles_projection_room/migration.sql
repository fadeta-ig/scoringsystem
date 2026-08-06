-- Add team photos and explicit operator control over the public projection.
ALTER TABLE `teams`
    ADD COLUMN `photoPath` VARCHAR(191) NULL AFTER `name`;

ALTER TABLE `competition_states`
    ADD COLUMN `projectionMode` ENUM(
        'LIVE',
        'LEADERBOARD',
        'SESSION_RESULT',
        'PRELIMINARY_RESULTS',
        'QUALIFIERS',
        'BREAK',
        'WINNER'
    ) NOT NULL DEFAULT 'LIVE' AFTER `grandDecisionPending`,
    ADD COLUMN `projectionSession` INTEGER NULL AFTER `projectionMode`,
    ADD COLUMN `projectionMessage` VARCHAR(191) NULL AFTER `projectionSession`;
