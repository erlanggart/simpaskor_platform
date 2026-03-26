/*
  Warnings:

  - You are about to drop the column `criteria` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `event_participations` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `events` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[event_id,assessment_category_id,jury_id,participant_id]` on the table `evaluations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assessment_category_id` to the `evaluations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `school_category_id` to the `event_participations` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."evaluations_event_id_jury_id_participant_id_key";

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "criteria",
ADD COLUMN     "assessment_category_id" TEXT NOT NULL,
ADD COLUMN     "max_score" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "event_participations" DROP COLUMN "score",
ADD COLUMN     "school_category_id" TEXT NOT NULL,
ADD COLUMN     "school_name" TEXT,
ADD COLUMN     "team_name" TEXT,
ADD COLUMN     "total_score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "category",
DROP COLUMN "level";

-- CreateTable
CREATE TABLE "school_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "weight" DECIMAL(5,2),
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_assessment_categories" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "assessment_category_id" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "custom_max_score" INTEGER,
    "custom_weight" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_assessment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_categories_name_key" ON "school_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_categories_name_key" ON "assessment_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_assessment_categories_event_id_assessment_category_id_key" ON "event_assessment_categories"("event_id", "assessment_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_event_id_assessment_category_id_jury_id_partici_key" ON "evaluations"("event_id", "assessment_category_id", "jury_id", "participant_id");

-- AddForeignKey
ALTER TABLE "event_assessment_categories" ADD CONSTRAINT "event_assessment_categories_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_assessment_categories" ADD CONSTRAINT "event_assessment_categories_assessment_category_id_fkey" FOREIGN KEY ("assessment_category_id") REFERENCES "assessment_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_school_category_id_fkey" FOREIGN KEY ("school_category_id") REFERENCES "school_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_assessment_category_id_fkey" FOREIGN KEY ("assessment_category_id") REFERENCES "assessment_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
