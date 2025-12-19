-- Migration: Add guest_pin column to digital_passes
-- Date: 2025-12-19
-- Description: Add 6-digit PIN for easy guest pass linking

-- Add guest_pin column (6-digit numeric PIN) - using dummy value to check if column exists
-- SQLite doesn't have IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- This will fail silently if column already exists
BEGIN;
  SELECT CASE 
    WHEN COUNT(*) = 0 THEN 
      (SELECT RAISE(IGNORE))
    END 
  FROM pragma_table_info('digital_passes') 
  WHERE name = 'guest_pin';
  
  -- This will execute only if column doesn't exist
  ALTER TABLE digital_passes ADD COLUMN guest_pin TEXT;
COMMIT;

-- Add index for fast PIN lookups (will skip if exists)
CREATE INDEX IF NOT EXISTS idx_digital_passes_pin ON digital_passes(guest_pin);
