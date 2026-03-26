/*
  Warnings:

  - Added the required column `school_category_id` to the `participation_groups` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."event_participations" DROP CONSTRAINT "event_participations_school_category_id_fkey";

-- AlterTable
ALTER TABLE "event_participations" ADD COLUMN     "supporting_doc" TEXT,
ALTER COLUMN "school_category_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "juknis_url" TEXT,
ADD COLUMN     "wizard_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wizard_step" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "participation_groups" ADD COLUMN     "member_data" TEXT,
ADD COLUMN     "member_names" TEXT,
ADD COLUMN     "school_category_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "jury_event_assignments" (
    "id" TEXT NOT NULL,
    "jury_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jury_event_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jury_assigned_categories" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "assessment_category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jury_assigned_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jury_event_assignments_jury_id_status_idx" ON "jury_event_assignments"("jury_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "jury_event_assignments_jury_id_event_id_key" ON "jury_event_assignments"("jury_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "jury_assigned_categories_assignment_id_assessment_category__key" ON "jury_assigned_categories"("assignment_id", "assessment_category_id");

-- AddForeignKey
ALTER TABLE "jury_event_assignments" ADD CONSTRAINT "jury_event_assignments_jury_id_fkey" FOREIGN KEY ("jury_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jury_event_assignments" ADD CONSTRAINT "jury_event_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jury_assigned_categories" ADD CONSTRAINT "jury_assigned_categories_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "jury_event_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jury_assigned_categories" ADD CONSTRAINT "jury_assigned_categories_assessment_category_id_fkey" FOREIGN KEY ("assessment_category_id") REFERENCES "assessment_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_school_category_id_fkey" FOREIGN KEY ("school_category_id") REFERENCES "school_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_groups" ADD CONSTRAINT "participation_groups_school_category_id_fkey" FOREIGN KEY ("school_category_id") REFERENCES "school_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
