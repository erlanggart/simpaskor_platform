-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_fee_transactions" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT,
    "event_id" TEXT,
    "event_title" TEXT,
    "event_slug" TEXT,
    "midtrans_order_id" TEXT NOT NULL,
    "base_amount" DOUBLE PRECISION NOT NULL,
    "admin_fee" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER,
    "vote_count" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "payment_type" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_fee_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_fee_transactions_midtrans_order_id_key" ON "admin_fee_transactions"("midtrans_order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_fee_transactions_source_idx" ON "admin_fee_transactions"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_fee_transactions_event_id_idx" ON "admin_fee_transactions"("event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_fee_transactions_paid_at_idx" ON "admin_fee_transactions"("paid_at");
