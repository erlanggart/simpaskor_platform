-- CreateTable
CREATE TABLE "participation_groups" (
    "id" TEXT NOT NULL,
    "participation_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "team_members" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participation_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "participation_groups" ADD CONSTRAINT "participation_groups_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "event_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
