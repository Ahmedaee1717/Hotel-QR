-- Migration: Add guest_pin column to digital_passes
-- Date: 2025-12-19
-- Description: Add 6-digit PIN for easy guest pass linking

-- Add guest_pin column (6-digit numeric PIN)
ALTER TABLE digital_passes ADD COLUMN guest_pin TEXT;

-- Add index for fast PIN lookups
CREATE INDEX idx_digital_passes_pin ON digital_passes(guest_pin);

-- Add guest_access_token if not exists (for guest portal access)
-- This column should already exist from previous migrations, but adding for safety
ALTER TABLE digital_passes ADD COLUMN guest_access_token TEXT;

-- Add verification_preference if not exists
ALTER TABLE digital_passes ADD COLUMN verification_preference TEXT DEFAULT 'qr';
