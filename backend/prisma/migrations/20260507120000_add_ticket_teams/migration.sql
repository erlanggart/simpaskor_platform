-- CreateTable
CREATE TABLE "ticket_teams" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "school_name" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_teams_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ticket_attendees" ADD COLUMN "ticket_team_id" TEXT;

-- CreateIndex
CREATE INDEX "ticket_teams_event_id_idx" ON "ticket_teams"("event_id");

-- CreateIndex
CREATE INDEX "ticket_attendees_ticket_team_id_idx" ON "ticket_attendees"("ticket_team_id");

-- AddForeignKey
ALTER TABLE "ticket_teams" ADD CONSTRAINT "ticket_teams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attendees" ADD CONSTRAINT "ticket_attendees_ticket_team_id_fkey" FOREIGN KEY ("ticket_team_id") REFERENCES "ticket_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
