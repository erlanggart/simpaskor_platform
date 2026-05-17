-- CreateEnum
CREATE TYPE "TransactionSourceType" AS ENUM ('TICKET', 'VOTING');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RevenueShareStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_WITHDRAWN', 'WITHDRAWN', 'CANCELLED');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "source_type" "TransactionSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_code" TEXT,
    "gross_amount" DECIMAL(14,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PAID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_shares" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "gross_amount" DECIMAL(14,2) NOT NULL,
    "platform_share_percent" DECIMAL(5,2) NOT NULL,
    "panitia_share_percent" DECIMAL(5,2) NOT NULL,
    "platform_amount" DECIMAL(14,2) NOT NULL,
    "panitia_amount" DECIMAL(14,2) NOT NULL,
    "withdrawn_panitia_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "RevenueShareStatus" NOT NULL DEFAULT 'AVAILABLE',
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_items" (
    "id" TEXT NOT NULL,
    "withdrawal_id" TEXT NOT NULL,
    "revenue_share_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_source_type_source_id_key" ON "transactions"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "transactions_event_id_paid_at_idx" ON "transactions"("event_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_shares_transaction_id_key" ON "revenue_shares"("transaction_id");

-- CreateIndex
CREATE INDEX "revenue_shares_event_id_status_created_at_idx" ON "revenue_shares"("event_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_items_withdrawal_id_revenue_share_id_key" ON "withdrawal_items"("withdrawal_id", "revenue_share_id");

-- CreateIndex
CREATE INDEX "withdrawal_items_withdrawal_id_idx" ON "withdrawal_items"("withdrawal_id");

-- CreateIndex
CREATE INDEX "withdrawal_items_revenue_share_id_idx" ON "withdrawal_items"("revenue_share_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_shares" ADD CONSTRAINT "revenue_shares_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_shares" ADD CONSTRAINT "revenue_shares_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_items" ADD CONSTRAINT "withdrawal_items_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "disbursements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_items" ADD CONSTRAINT "withdrawal_items_revenue_share_id_fkey" FOREIGN KEY ("revenue_share_id") REFERENCES "revenue_shares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill paid ticket purchases into the immutable transaction ledger.
INSERT INTO "transactions" (
    "id",
    "event_id",
    "source_type",
    "source_id",
    "source_code",
    "gross_amount",
    "paid_at",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    'txn_ticket_' || tp."id",
    tp."event_id",
    'TICKET'::"TransactionSourceType",
    tp."id",
    tp."ticket_code",
    ROUND(tp."total_amount"::numeric, 2),
    COALESCE(tp."paid_at", tp."updated_at", tp."created_at"),
    'PAID'::"TransactionStatus",
    tp."created_at",
    CURRENT_TIMESTAMP
FROM "ticket_purchases" tp
WHERE tp."status" IN ('PAID', 'USED')
    AND tp."total_amount" > 0
ON CONFLICT ("source_type", "source_id") DO NOTHING;

-- Backfill paid voting purchases into the immutable transaction ledger.
INSERT INTO "transactions" (
    "id",
    "event_id",
    "source_type",
    "source_id",
    "source_code",
    "gross_amount",
    "paid_at",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    'txn_voting_' || vp."id",
    vp."event_id",
    'VOTING'::"TransactionSourceType",
    vp."id",
    vp."purchase_code",
    ROUND(vp."total_amount"::numeric, 2),
    COALESCE(vp."paid_at", vp."updated_at", vp."created_at"),
    'PAID'::"TransactionStatus",
    vp."created_at",
    CURRENT_TIMESTAMP
FROM "voting_purchases" vp
WHERE vp."status" = 'PAID'
    AND vp."total_amount" > 0
ON CONFLICT ("source_type", "source_id") DO NOTHING;

-- Backfill per-transaction revenue shares using the event share percentage that
-- is currently configured. Future transactions will persist the exact share at
-- payment time from application code.
INSERT INTO "revenue_shares" (
    "id",
    "transaction_id",
    "event_id",
    "gross_amount",
    "platform_share_percent",
    "panitia_share_percent",
    "platform_amount",
    "panitia_amount",
    "withdrawn_panitia_amount",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    'rs_' || t."id",
    t."id",
    t."event_id",
    t."gross_amount",
    share."platform_percent",
    100 - share."platform_percent",
    ROUND(t."gross_amount" * share."platform_percent" / 100),
    t."gross_amount" - ROUND(t."gross_amount" * share."platform_percent" / 100),
    0,
    'AVAILABLE'::"RevenueShareStatus",
    t."created_at",
    CURRENT_TIMESTAMP
FROM "transactions" t
JOIN "events" e ON e."id" = t."event_id"
CROSS JOIN LATERAL (
    SELECT COALESCE(
        e."platform_share_percent"::numeric,
        CASE WHEN e."package_tier" = 'TICKETING_VOTING' THEN 25::numeric ELSE 15::numeric END
    ) AS "platform_percent"
) share
ON CONFLICT ("transaction_id") DO NOTHING;

-- Reconstruct withdrawal item allocations for previously approved/transferred
-- disbursements so legacy withdrawals no longer make old revenue count as active.
DO $$
DECLARE
    d RECORD;
    s RECORD;
    remaining NUMERIC(14,2);
    available NUMERIC(14,2);
    item_amount NUMERIC(14,2);
    new_withdrawn NUMERIC(14,2);
BEGIN
    FOR d IN
        SELECT *
        FROM "disbursements"
        WHERE "status" IN ('APPROVED', 'TRANSFERRED')
        ORDER BY COALESCE("processed_at", "transferred_at", "created_at"), "created_at", "id"
    LOOP
        remaining := ROUND(d."amount"::numeric, 2);

        FOR s IN
            SELECT *
            FROM "revenue_shares"
            WHERE "event_id" = d."event_id"
                AND "status" IN ('AVAILABLE', 'PARTIALLY_WITHDRAWN')
                AND "panitia_amount" - "withdrawn_panitia_amount" > 0
            ORDER BY "created_at", "id"
        LOOP
            EXIT WHEN remaining <= 0;

            available := s."panitia_amount" - s."withdrawn_panitia_amount";
            item_amount := LEAST(remaining, available);
            new_withdrawn := s."withdrawn_panitia_amount" + item_amount;

            INSERT INTO "withdrawal_items" (
                "id",
                "withdrawal_id",
                "revenue_share_id",
                "amount",
                "created_at"
            ) VALUES (
                'wi_' || SUBSTRING(MD5(d."id" || s."id") FROM 1 FOR 24),
                d."id",
                s."id",
                item_amount,
                COALESCE(d."processed_at", d."transferred_at", d."created_at")
            )
            ON CONFLICT ("withdrawal_id", "revenue_share_id") DO NOTHING;

            UPDATE "revenue_shares"
            SET
                "withdrawn_panitia_amount" = new_withdrawn,
                "status" = CASE
                    WHEN new_withdrawn >= "panitia_amount" THEN 'WITHDRAWN'::"RevenueShareStatus"
                    ELSE 'PARTIALLY_WITHDRAWN'::"RevenueShareStatus"
                END,
                "withdrawn_at" = CASE
                    WHEN new_withdrawn >= "panitia_amount" THEN COALESCE(d."processed_at", d."transferred_at", d."created_at")
                    ELSE "withdrawn_at"
                END,
                "updated_at" = CURRENT_TIMESTAMP
            WHERE "id" = s."id";

            remaining := remaining - item_amount;
        END LOOP;
    END LOOP;
END $$;
