/*
  Warnings:

  - You are about to drop the column `first_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `users` table. All the data in the column will be lost.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new 'name' column as nullable first
ALTER TABLE "users" ADD COLUMN "name" TEXT;

-- Step 2: Populate 'name' by concatenating first_name and last_name
UPDATE "users" SET "name" = CONCAT("first_name", ' ', "last_name");

-- Step 3: Make 'name' column NOT NULL
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
