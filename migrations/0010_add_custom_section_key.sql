-- Migration 0010: Add custom_section_key to hotel_offerings
-- Allows offerings to be assigned to custom sections like "Amenities", "Fitness", etc.

-- Add custom_section_key column to hotel_offerings table
ALTER TABLE hotel_offerings ADD COLUMN custom_section_key TEXT;

-- Create index for better query performance when filtering by section
CREATE INDEX IF NOT EXISTS idx_hotel_offerings_custom_section ON hotel_offerings(custom_section_key) WHERE custom_section_key IS NOT NULL;

-- Add comment
-- This column stores the section key (e.g., 'amenities', 'fitness') for custom sections
-- When offering_type is 'custom', this determines which custom section it appears in
