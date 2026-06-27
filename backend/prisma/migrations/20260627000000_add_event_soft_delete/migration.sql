-- Soft delete (trash) support for events
ALTER TABLE "events" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "deleted_by_id" TEXT;

-- Index to keep "exclude trashed" list queries fast
CREATE INDEX "events_deleted_at_idx" ON "events"("deleted_at");
