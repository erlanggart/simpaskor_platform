-- Add Mitra role and referral commission tracking.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MITRA';

CREATE TYPE "MitraCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

CREATE TABLE "mitra_profiles" (
	"id" TEXT NOT NULL,
	"user_id" TEXT NOT NULL,
	"referral_code" TEXT NOT NULL,
	"commission_per_event" INTEGER NOT NULL DEFAULT 200000,
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "mitra_profiles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "events" ADD COLUMN "mitra_profile_id" TEXT;

CREATE TABLE "mitra_commissions" (
	"id" TEXT NOT NULL,
	"mitra_profile_id" TEXT NOT NULL,
	"event_id" TEXT NOT NULL,
	"referral_code" TEXT NOT NULL,
	"amount" INTEGER NOT NULL DEFAULT 200000,
	"status" "MitraCommissionStatus" NOT NULL DEFAULT 'PENDING',
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "mitra_commissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mitra_profiles_user_id_key" ON "mitra_profiles"("user_id");
CREATE UNIQUE INDEX "mitra_profiles_referral_code_key" ON "mitra_profiles"("referral_code");
CREATE INDEX "mitra_profiles_referral_code_idx" ON "mitra_profiles"("referral_code");
CREATE UNIQUE INDEX "mitra_commissions_event_id_key" ON "mitra_commissions"("event_id");
CREATE INDEX "mitra_commissions_mitra_profile_id_idx" ON "mitra_commissions"("mitra_profile_id");
CREATE INDEX "mitra_commissions_status_idx" ON "mitra_commissions"("status");

ALTER TABLE "mitra_profiles"
	ADD CONSTRAINT "mitra_profiles_user_id_fkey"
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "events"
	ADD CONSTRAINT "events_mitra_profile_id_fkey"
	FOREIGN KEY ("mitra_profile_id") REFERENCES "mitra_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mitra_commissions"
	ADD CONSTRAINT "mitra_commissions_mitra_profile_id_fkey"
	FOREIGN KEY ("mitra_profile_id") REFERENCES "mitra_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mitra_commissions"
	ADD CONSTRAINT "mitra_commissions_event_id_fkey"
	FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
