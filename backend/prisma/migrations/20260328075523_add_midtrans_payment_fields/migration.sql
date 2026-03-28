/*
  Warnings:

  - A unique constraint covering the columns `[midtrans_order_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[midtrans_order_id]` on the table `ticket_purchases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[midtrans_order_id]` on the table `voting_purchases` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RegistrationPaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "midtrans_order_id" TEXT,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_type" TEXT,
ADD COLUMN     "snap_token" TEXT;

-- AlterTable
ALTER TABLE "ticket_purchases" ADD COLUMN     "midtrans_order_id" TEXT,
ADD COLUMN     "payment_type" TEXT,
ADD COLUMN     "snap_token" TEXT;

-- AlterTable
ALTER TABLE "voting_purchases" ADD COLUMN     "midtrans_order_id" TEXT,
ADD COLUMN     "payment_type" TEXT,
ADD COLUMN     "snap_token" TEXT;

-- CreateTable
CREATE TABLE "registration_payments" (
    "id" TEXT NOT NULL,
    "participation_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "RegistrationPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "midtrans_order_id" TEXT,
    "snap_token" TEXT,
    "payment_type" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registration_payments_participation_id_key" ON "registration_payments"("participation_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_payments_midtrans_order_id_key" ON "registration_payments"("midtrans_order_id");

-- CreateIndex
CREATE INDEX "registration_payments_participation_id_idx" ON "registration_payments"("participation_id");

-- CreateIndex
CREATE INDEX "registration_payments_event_id_idx" ON "registration_payments"("event_id");

-- CreateIndex
CREATE INDEX "registration_payments_user_id_idx" ON "registration_payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_midtrans_order_id_key" ON "orders"("midtrans_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_purchases_midtrans_order_id_key" ON "ticket_purchases"("midtrans_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "voting_purchases_midtrans_order_id_key" ON "voting_purchases"("midtrans_order_id");

-- AddForeignKey
ALTER TABLE "registration_payments" ADD CONSTRAINT "registration_payments_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "event_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
