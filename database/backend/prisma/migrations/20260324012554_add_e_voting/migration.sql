-- CreateEnum
CREATE TYPE "VotingMode" AS ENUM ('TEAM', 'PERSONAL');

-- CreateEnum
CREATE TYPE "VotingPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "event_voting_configs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "price_per_vote" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_voting_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_categories" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mode" "VotingMode" NOT NULL DEFAULT 'TEAM',
    "position" TEXT,
    "school_category_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_votes_per_voter" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voting_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_nominees" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "group_id" TEXT,
    "nominee_name" TEXT NOT NULL,
    "nominee_photo" TEXT,
    "nominee_subtitle" TEXT,
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voting_nominees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_votes" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "nominee_id" TEXT NOT NULL,
    "purchase_id" TEXT,
    "voter_name" TEXT,
    "voter_email" TEXT,
    "voter_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voting_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_purchases" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_phone" TEXT,
    "vote_count" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "purchase_code" TEXT NOT NULL,
    "status" "VotingPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "used_votes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voting_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_voting_configs_event_id_key" ON "event_voting_configs"("event_id");

-- CreateIndex
CREATE INDEX "voting_categories_config_id_idx" ON "voting_categories"("config_id");

-- CreateIndex
CREATE INDEX "voting_nominees_category_id_idx" ON "voting_nominees"("category_id");

-- CreateIndex
CREATE INDEX "voting_votes_category_id_idx" ON "voting_votes"("category_id");

-- CreateIndex
CREATE INDEX "voting_votes_nominee_id_idx" ON "voting_votes"("nominee_id");

-- CreateIndex
CREATE INDEX "voting_votes_voter_email_category_id_idx" ON "voting_votes"("voter_email", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "voting_purchases_purchase_code_key" ON "voting_purchases"("purchase_code");

-- CreateIndex
CREATE INDEX "voting_purchases_event_id_idx" ON "voting_purchases"("event_id");

-- CreateIndex
CREATE INDEX "voting_purchases_buyer_email_idx" ON "voting_purchases"("buyer_email");

-- CreateIndex
CREATE INDEX "voting_purchases_purchase_code_idx" ON "voting_purchases"("purchase_code");

-- AddForeignKey
ALTER TABLE "event_voting_configs" ADD CONSTRAINT "event_voting_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_categories" ADD CONSTRAINT "voting_categories_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "event_voting_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_nominees" ADD CONSTRAINT "voting_nominees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "voting_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_votes" ADD CONSTRAINT "voting_votes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "voting_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_votes" ADD CONSTRAINT "voting_votes_nominee_id_fkey" FOREIGN KEY ("nominee_id") REFERENCES "voting_nominees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_votes" ADD CONSTRAINT "voting_votes_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "voting_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_purchases" ADD CONSTRAINT "voting_purchases_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
