-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'PAID', 'USED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "event_ticket_configs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "sales_start_date" TIMESTAMP(3),
    "sales_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_ticket_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_purchases" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_phone" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_ticket_configs_event_id_key" ON "event_ticket_configs"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_purchases_ticket_code_key" ON "ticket_purchases"("ticket_code");

-- CreateIndex
CREATE INDEX "ticket_purchases_event_id_idx" ON "ticket_purchases"("event_id");

-- CreateIndex
CREATE INDEX "ticket_purchases_buyer_email_idx" ON "ticket_purchases"("buyer_email");

-- CreateIndex
CREATE INDEX "ticket_purchases_ticket_code_idx" ON "ticket_purchases"("ticket_code");

-- AddForeignKey
ALTER TABLE "event_ticket_configs" ADD CONSTRAINT "event_ticket_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_purchases" ADD CONSTRAINT "ticket_purchases_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_purchases" ADD CONSTRAINT "ticket_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
