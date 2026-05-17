-- Store the nominee selected when a paid vote package is purchased.
ALTER TABLE "voting_purchases" ADD COLUMN "category_id" TEXT;
ALTER TABLE "voting_purchases" ADD COLUMN "nominee_id" TEXT;

CREATE INDEX "voting_purchases_category_id_idx" ON "voting_purchases"("category_id");
CREATE INDEX "voting_purchases_nominee_id_idx" ON "voting_purchases"("nominee_id");
