-- Track who requested each email (account name + user id) for the Mail page.
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "recipient_name" TEXT;
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
