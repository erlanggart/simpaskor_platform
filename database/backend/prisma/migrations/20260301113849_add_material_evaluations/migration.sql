-- CreateTable
CREATE TABLE "material_evaluations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "jury_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "score_category_name" TEXT,
    "is_skipped" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "material_evaluations_event_id_material_id_jury_id_participa_key" ON "material_evaluations"("event_id", "material_id", "jury_id", "participant_id");

-- AddForeignKey
ALTER TABLE "material_evaluations" ADD CONSTRAINT "material_evaluations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_evaluations" ADD CONSTRAINT "material_evaluations_jury_id_fkey" FOREIGN KEY ("jury_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
