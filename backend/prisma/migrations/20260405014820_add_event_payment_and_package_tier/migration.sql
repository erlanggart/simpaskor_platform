-- CreateEnum
CREATE TYPE "EventPaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "package_tier" "PackageTier",
ADD COLUMN     "payment_status" TEXT;

-- CreateTable
CREATE TABLE "event_payments" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_tier" "PackageTier" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "EventPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "midtrans_order_id" TEXT,
    "snap_token" TEXT,
    "payment_type" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_payments_event_id_key" ON "event_payments"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_payments_midtrans_order_id_key" ON "event_payments"("midtrans_order_id");

-- CreateIndex
CREATE INDEX "event_payments_event_id_idx" ON "event_payments"("event_id");

-- CreateIndex
CREATE INDEX "event_payments_user_id_idx" ON "event_payments"("user_id");

-- AddForeignKey
ALTER TABLE "event_payments" ADD CONSTRAINT "event_payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
