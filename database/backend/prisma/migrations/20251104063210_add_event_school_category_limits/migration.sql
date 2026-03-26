-- CreateTable
CREATE TABLE "event_school_category_limits" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "school_category_id" TEXT NOT NULL,
    "max_participants" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_school_category_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_school_category_limits_event_id_school_category_id_key" ON "event_school_category_limits"("event_id", "school_category_id");

-- AddForeignKey
ALTER TABLE "event_school_category_limits" ADD CONSTRAINT "event_school_category_limits_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_school_category_limits" ADD CONSTRAINT "event_school_category_limits_school_category_id_fkey" FOREIGN KEY ("school_category_id") REFERENCES "school_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
