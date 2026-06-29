-- AlterTable: add geolocation fields to user_sessions
ALTER TABLE "user_sessions"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "accuracy" DOUBLE PRECISION,
  ADD COLUMN "location_label" TEXT,
  ADD COLUMN "location_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "location_at" TIMESTAMP(3);

-- CreateTable: activity_logs
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "method" TEXT,
    "path" TEXT,
    "status_code" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
