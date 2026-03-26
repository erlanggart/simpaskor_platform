-- CreateEnum
CREATE TYPE "JuaraCategoryType" AS ENUM ('UTAMA', 'UMUM', 'CUSTOM');

-- CreateTable
CREATE TABLE "juara_categories" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" "JuaraCategoryType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "juara_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "juara_category_assessments" (
    "id" TEXT NOT NULL,
    "juara_category_id" TEXT NOT NULL,
    "assessment_category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "juara_category_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "juara_categories_event_id_idx" ON "juara_categories"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "juara_categories_event_id_type_name_key" ON "juara_categories"("event_id", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "juara_category_assessments_juara_category_id_assessment_cat_key" ON "juara_category_assessments"("juara_category_id", "assessment_category_id");

-- AddForeignKey
ALTER TABLE "juara_category_assessments" ADD CONSTRAINT "juara_category_assessments_juara_category_id_fkey" FOREIGN KEY ("juara_category_id") REFERENCES "juara_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
