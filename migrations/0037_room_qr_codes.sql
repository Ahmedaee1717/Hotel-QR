-- Migration: Add unique QR codes for each room
-- Purpose: Each room gets a unique QR code for guest auto-detection
-- Created: 2025-12-18

-- Add room_qr_code column to rooms table
-- ALTER TABLE rooms ADD COLUMN room_qr_code TEXT;

-- Create unique index for fast QR code lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_qr_code ON rooms(room_qr_code);
