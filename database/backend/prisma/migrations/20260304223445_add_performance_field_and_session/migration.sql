-- CreateTable
CREATE TABLE "performance_fields" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_sessions" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_checks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_fields_event_id_idx" ON "performance_fields"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_fields_event_id_name_key" ON "performance_fields"("event_id", "name");

-- CreateIndex
CREATE INDEX "performance_sessions_field_id_status_idx" ON "performance_sessions"("field_id", "status");

-- CreateIndex
CREATE INDEX "performance_sessions_participant_id_idx" ON "performance_sessions"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_checks_session_id_material_id_key" ON "material_checks"("session_id", "material_id");

-- AddForeignKey
ALTER TABLE "performance_sessions" ADD CONSTRAINT "performance_sessions_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "performance_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_checks" ADD CONSTRAINT "material_checks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "performance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
