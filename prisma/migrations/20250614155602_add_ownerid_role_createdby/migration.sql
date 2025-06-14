/*
  Warnings:

  - Added the required column `createdById` to the `Board` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `OrganizationMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `board` ADD COLUMN `createdById` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `organization` ADD COLUMN `ownerId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `organizationmember` ADD COLUMN `role` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Organization` ADD CONSTRAINT `Organization_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Board` ADD CONSTRAINT `Board_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
