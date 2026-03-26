/*
  Warnings:

  - You are about to drop the `panitia_event_assignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."panitia_event_assignments" DROP CONSTRAINT "panitia_event_assignments_event_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."panitia_event_assignments" DROP CONSTRAINT "panitia_event_assignments_panitia_id_fkey";

-- DropTable
DROP TABLE "public"."panitia_event_assignments";
