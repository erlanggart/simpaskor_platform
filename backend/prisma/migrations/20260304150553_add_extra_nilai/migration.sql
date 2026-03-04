-- CreateEnum
CREATE TYPE "ExtraNilaiType" AS ENUM ('PUNISHMENT', 'POINPLUS');

-- CreateEnum
CREATE TYPE "ExtraNilaiScope" AS ENUM ('GENERAL', 'CATEGORY');

-- CreateTable
CREATE TABLE "extra_nilai" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "type" "ExtraNilaiType" NOT NULL,
    "scope" "ExtraNilaiScope" NOT NULL,
    "assessment_category_id" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extra_nilai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extra_nilai_event_id_participant_id_idx" ON "extra_nilai"("event_id", "participant_id");

-- CreateIndex
CREATE INDEX "extra_nilai_event_id_type_idx" ON "extra_nilai"("event_id", "type");
