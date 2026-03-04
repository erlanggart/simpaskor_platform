-- AlterTable
ALTER TABLE "juara_categories" ADD COLUMN     "rank_count" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "juara_ranks" (
    "id" TEXT NOT NULL,
    "juara_category_id" TEXT NOT NULL,
    "start_rank" INTEGER NOT NULL,
    "end_rank" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "juara_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "juara_ranks_juara_category_id_idx" ON "juara_ranks"("juara_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "juara_ranks_juara_category_id_order_key" ON "juara_ranks"("juara_category_id", "order");

-- AddForeignKey
ALTER TABLE "juara_ranks" ADD CONSTRAINT "juara_ranks_juara_category_id_fkey" FOREIGN KEY ("juara_category_id") REFERENCES "juara_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
