-- Migration: Add guest_pin column to digital_passes
-- Date: 2025-12-19
-- Description: Add 6-digit PIN for easy guest pass linking

-- Add guest_pin column
ALTER TABLE digital_passes ADD COLUMN guest_pin TEXT;

-- Add index for fast PIN lookups
CREATE INDEX IF NOT EXISTS idx_digital_passes_pin ON digital_passes(guest_pin);
