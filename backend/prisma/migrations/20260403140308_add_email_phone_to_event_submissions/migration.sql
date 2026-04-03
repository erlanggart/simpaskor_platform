/*
  Warnings:

  - Added the required column `email` to the `event_submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "event_submissions" ADD COLUMN     "created_user_id" TEXT,
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT;

-- Update existing rows
UPDATE "event_submissions" SET "email" = 'unknown@placeholder.com' WHERE "email" = '';

-- Remove default
ALTER TABLE "event_submissions" ALTER COLUMN "email" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "event_submissions_email_idx" ON "event_submissions"("email");
