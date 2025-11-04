/*
  Warnings:

  - You are about to drop the column `assigned_to_email` on the `event_coupons` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `event_coupons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "event_coupons" DROP COLUMN "assigned_to_email",
DROP COLUMN "expires_at";
