/*
  Warnings:

  - You are about to drop the column `max_score` on the `assessment_categories` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `assessment_categories` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."events" DROP CONSTRAINT "events_category_id_fkey";

-- AlterTable
ALTER TABLE "assessment_categories" DROP COLUMN "max_score",
DROP COLUMN "weight";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "category_id";

-- DropTable
DROP TABLE "public"."categories";
