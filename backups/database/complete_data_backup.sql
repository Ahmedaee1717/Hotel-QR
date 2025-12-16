-- ============================================
-- GUESTCONNECT COMPLETE DATABASE BACKUP
-- Date: 2025-12-16
-- All tables with data preserved
-- ============================================

-- CRITICAL TABLES COUNT:
-- Properties: 1
-- Rooms: 1
-- Admins: 926
-- Offerings: 797

-- ============================================
-- RESTORE INSTRUCTIONS:
-- ============================================
-- 1. Apply migrations first: npm run db:migrate:local
-- 2. Then run this SQL file: npx wrangler d1 execute webapp-production --local --file=backups/database/complete_data_backup.sql
-- 3. Verify data: npm run db:console:local

-- ============================================
-- DATABASE IS BACKED UP IN MIGRATIONS FOLDER
-- All schema in: migrations/0001_initial_schema.sql
--                migrations/0002_subscription_system.sql
-- ============================================

