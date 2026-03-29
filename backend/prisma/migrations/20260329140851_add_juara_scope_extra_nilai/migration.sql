-- AlterEnum
ALTER TYPE "ExtraNilaiScope" ADD VALUE 'JUARA';

-- AlterTable
ALTER TABLE "extra_nilai" ADD COLUMN     "juara_category_id" TEXT;
