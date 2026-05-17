-- Add active toggle so nominees can be disabled instead of deleted after publish.
ALTER TABLE "voting_nominees" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
