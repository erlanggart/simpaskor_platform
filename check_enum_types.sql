-- Query untuk mengecek ENUM types di PostgreSQL
-- Jalankan query ini di HeidiSQL atau pgAdmin

-- 1. Cek semua ENUM types yang ada
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('UserRole', 'UserStatus')
ORDER BY t.typname, e.enumsortorder;

-- 2. Cek struktur tabel users
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Cek nilai ENUM role yang ada
SELECT DISTINCT role FROM users;

-- 4. Cek nilai ENUM status yang ada
SELECT DISTINCT status FROM users;
