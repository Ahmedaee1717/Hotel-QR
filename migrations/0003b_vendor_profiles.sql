-- Migration 0003: Vendor Profiles
-- Created: 2025-12-07
-- Add profile fields for vendors

-- Add profile fields to vendors table
ALTER TABLE vendors ADD COLUMN profile_image TEXT;
ALTER TABLE vendors ADD COLUMN description TEXT;
ALTER TABLE vendors ADD COLUMN website TEXT;
ALTER TABLE vendors ADD COLUMN address TEXT;
ALTER TABLE vendors ADD COLUMN city TEXT;
ALTER TABLE vendors ADD COLUMN country TEXT;
ALTER TABLE vendors ADD COLUMN operating_hours TEXT; -- JSON format: {"monday": "9AM-6PM", ...}
ALTER TABLE vendors ADD COLUMN social_media TEXT; -- JSON format: {"facebook": "url", "instagram": "url", ...}
ALTER TABLE vendors ADD COLUMN specialties TEXT; -- JSON array: ["Diving", "Snorkeling", ...]
ALTER TABLE vendors ADD COLUMN years_experience INTEGER;
ALTER TABLE vendors ADD COLUMN languages_spoken TEXT; -- JSON array: ["English", "Arabic", ...]

-- Update existing vendors with default values
UPDATE vendors 
SET description = 'Professional service provider offering quality activities and experiences.',
    operating_hours = '{"monday":"9AM-6PM","tuesday":"9AM-6PM","wednesday":"9AM-6PM","thursday":"9AM-6PM","friday":"9AM-6PM","saturday":"9AM-6PM","sunday":"Closed"}',
    languages_spoken = '["English"]'
WHERE description IS NULL;
