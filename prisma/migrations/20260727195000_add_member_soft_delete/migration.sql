-- AlterTable
ALTER TABLE `members`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `deletedAt` DATETIME(3) NULL;
