-- Indexes for the live-transaction monitor.
-- Without these, /api/admin/transactions/live degenerates to N full table
-- scans because Prisma `count({where: {status}})` and `orderBy: updatedAt`
-- have no index to use. With them, every count/sort becomes an O(log n)
-- index lookup instead.

-- TICKET PURCHASES
CREATE INDEX IF NOT EXISTS "ticket_purchases_status_paid_at_idx"
    ON "ticket_purchases" ("status", "paid_at");
CREATE INDEX IF NOT EXISTS "ticket_purchases_updated_at_idx"
    ON "ticket_purchases" ("updated_at");

-- VOTING PURCHASES
CREATE INDEX IF NOT EXISTS "voting_purchases_status_paid_at_idx"
    ON "voting_purchases" ("status", "paid_at");
CREATE INDEX IF NOT EXISTS "voting_purchases_updated_at_idx"
    ON "voting_purchases" ("updated_at");

-- REGISTRATION PAYMENTS
CREATE INDEX IF NOT EXISTS "registration_payments_status_paid_at_idx"
    ON "registration_payments" ("status", "paid_at");
CREATE INDEX IF NOT EXISTS "registration_payments_updated_at_idx"
    ON "registration_payments" ("updated_at");

-- EVENT PAYMENTS
CREATE INDEX IF NOT EXISTS "event_payments_status_paid_at_idx"
    ON "event_payments" ("status", "paid_at");
CREATE INDEX IF NOT EXISTS "event_payments_updated_at_idx"
    ON "event_payments" ("updated_at");

-- ORDERS
CREATE INDEX IF NOT EXISTS "orders_status_paid_at_idx"
    ON "orders" ("status", "paid_at");
CREATE INDEX IF NOT EXISTS "orders_updated_at_idx"
    ON "orders" ("updated_at");
