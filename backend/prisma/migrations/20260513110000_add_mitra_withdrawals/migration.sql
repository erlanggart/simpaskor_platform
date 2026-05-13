-- CreateTable
CREATE TABLE "mitra_withdrawals" (
    "id" TEXT NOT NULL,
    "mitra_profile_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "notes" TEXT,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "processed_by_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "transfer_proof" TEXT,
    "transferred_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mitra_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mitra_withdrawals_mitra_profile_id_idx" ON "mitra_withdrawals"("mitra_profile_id");

-- CreateIndex
CREATE INDEX "mitra_withdrawals_requested_by_id_idx" ON "mitra_withdrawals"("requested_by_id");

-- CreateIndex
CREATE INDEX "mitra_withdrawals_status_idx" ON "mitra_withdrawals"("status");

-- AddForeignKey
ALTER TABLE "mitra_withdrawals" ADD CONSTRAINT "mitra_withdrawals_mitra_profile_id_fkey" FOREIGN KEY ("mitra_profile_id") REFERENCES "mitra_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitra_withdrawals" ADD CONSTRAINT "mitra_withdrawals_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitra_withdrawals" ADD CONSTRAINT "mitra_withdrawals_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
