-- ============================================================================
-- Initial Database Setup for Simpaskor Platform
-- ============================================================================
-- 
-- IMPORTANT NOTE:
-- This file is for REFERENCE ONLY and is NOT used in the normal setup.
-- 
-- The database schema is managed by Prisma ORM.
-- To setup the database, use these Prisma commands instead:
--
--   1. npx prisma generate       # Generate Prisma Client
--   2. npx prisma db push         # Push schema to database
--   3. npx prisma db seed         # Seed initial data
--
-- OR for production with migrations:
--
--   1. npx prisma migrate dev     # Create and apply migration
--   2. npx prisma db seed         # Seed initial data
--
-- Schema is defined in: backend/prisma/schema.prisma
-- Seed data is defined in: backend/prisma/seed.ts
--
-- ============================================================================

-- Create database extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MANUAL DATABASE SETUP (if needed)
-- ============================================================================
-- If you need to manually create the database without Prisma:

-- Create database
-- CREATE DATABASE simpaskor_db;

-- Connect to database
-- \c simpaskor_db;

-- Create ENUM types
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'PANITIA', 'JURI', 'PESERTA', 'PELATIH');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- ============================================================================
-- NOTE: All other tables and relationships are automatically created by Prisma
-- when you run: npx prisma db push
-- 
-- To view the complete schema, see: backend/prisma/schema.prisma
-- ============================================================================

-- For seeding data, run:
-- cd backend && npm run seed
-- 
-- This will create:
-- - 5 default user accounts (SuperAdmin, Panitia, Juri, Peserta, Pelatih)
-- - School categories (SD, SMP, SMA, PURNA)
-- - Assessment categories (PBB, KOMANDAN, VARIASI, FORMASI, KOSTUM_MAKEUP)
-- - Sample event coupons
-- - Sample event
--
-- ============================================================================