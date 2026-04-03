-- CreateEnum
CREATE TYPE "GuideRole" AS ENUM ('PANITIA', 'JURI', 'PESERTA');

-- CreateEnum
CREATE TYPE "EventSubmissionStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "role" "GuideRole" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_slides" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_submissions" (
    "id" TEXT NOT NULL,
    "nama_panitia" TEXT NOT NULL,
    "nama_event" TEXT NOT NULL,
    "lokasi_event" TEXT NOT NULL,
    "nama_instansi" TEXT NOT NULL,
    "package_tier" "PackageTier" NOT NULL,
    "status" "EventSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guides_role_idx" ON "guides"("role");

-- CreateIndex
CREATE INDEX "guide_slides_guide_id_idx" ON "guide_slides"("guide_id");

-- CreateIndex
CREATE INDEX "event_submissions_status_idx" ON "event_submissions"("status");

-- CreateIndex
CREATE INDEX "event_submissions_package_tier_idx" ON "event_submissions"("package_tier");

-- AddForeignKey
ALTER TABLE "guide_slides" ADD CONSTRAINT "guide_slides_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
