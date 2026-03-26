-- Migration: Create Materials Schema
-- Creates the event_materials table with denormalized JSON structure
-- for better read performance (many judges reading simultaneously)

-- CreateTable
CREATE TABLE "event_materials" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_assessment_category_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "score_categories" JSONB NOT NULL DEFAULT '[]',
    "school_category_ids" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_materials_event_id_event_assessment_category_id_numbe_key" ON "event_materials"("event_id", "event_assessment_category_id", "number");

-- AddForeignKey
ALTER TABLE "event_materials" ADD CONSTRAINT "event_materials_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
