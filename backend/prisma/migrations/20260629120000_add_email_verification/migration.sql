-- Add email verification token columns used by the role-selection email gate.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verify_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verify_token_expiry" TIMESTAMP(3);

-- Existing accounts predate this feature and are already trusted; mark them
-- verified so the new gate doesn't lock them out of their dashboards.
UPDATE "users" SET "email_verified" = true WHERE "email_verified" = false;
