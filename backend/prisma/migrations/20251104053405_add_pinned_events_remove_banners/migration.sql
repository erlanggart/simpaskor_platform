/*
  Warnings:

  - You are about to drop the `banners` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned_order" INTEGER;

-- DropTable
DROP TABLE "public"."banners";
