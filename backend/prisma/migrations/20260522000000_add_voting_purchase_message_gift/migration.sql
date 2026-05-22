-- Live alert popup: buyer message + emoji-boost gift type feed the realtime
-- popup queue (lion roar, rocket SFX, flame, lightning, crown glow).
ALTER TABLE "voting_purchases" ADD COLUMN "buyer_message" TEXT;
ALTER TABLE "voting_purchases" ADD COLUMN "gift_type" TEXT;
