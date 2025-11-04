-- AlterTable
ALTER TABLE "events" ADD COLUMN     "coupon_id" TEXT;

-- CreateTable
CREATE TABLE "event_coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_by_id" TEXT,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by_admin_id" TEXT NOT NULL,
    "assigned_to_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_coupons_code_key" ON "event_coupons"("code");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "event_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coupons" ADD CONSTRAINT "event_coupons_used_by_id_fkey" FOREIGN KEY ("used_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coupons" ADD CONSTRAINT "event_coupons_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
