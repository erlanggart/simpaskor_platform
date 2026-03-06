/*
  Warnings:

  - You are about to drop the column `latitude` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "province" TEXT;
