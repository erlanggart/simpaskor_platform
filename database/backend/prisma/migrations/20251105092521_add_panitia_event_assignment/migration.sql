-- CreateTable
CREATE TABLE "panitia_event_assignments" (
    "id" TEXT NOT NULL,
    "panitia_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panitia_event_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "panitia_event_assignments_panitia_id_is_active_idx" ON "panitia_event_assignments"("panitia_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "panitia_event_assignments_panitia_id_event_id_key" ON "panitia_event_assignments"("panitia_id", "event_id");

-- AddForeignKey
ALTER TABLE "panitia_event_assignments" ADD CONSTRAINT "panitia_event_assignments_panitia_id_fkey" FOREIGN KEY ("panitia_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panitia_event_assignments" ADD CONSTRAINT "panitia_event_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
