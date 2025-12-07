-- Migration 0002: Hotel Registration Codes, Callback Requests, and Image Support
-- Created: 2025-12-07

-- Add registration code to properties for vendor linking
ALTER TABLE properties ADD COLUMN registration_code TEXT;
ALTER TABLE properties ADD COLUMN registration_code_expires_at DATETIME;

-- Create index for registration code uniqueness
CREATE UNIQUE INDEX idx_properties_registration_code ON properties(registration_code) WHERE registration_code IS NOT NULL;

-- Create callback requests table
CREATE TABLE IF NOT EXISTS callback_requests (
  request_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER,
  property_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_time TEXT, -- 'morning', 'afternoon', 'evening', 'anytime'
  message TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'completed', 'cancelled'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  contacted_at DATETIME,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Create index on callback requests
CREATE INDEX idx_callback_requests_property ON callback_requests(property_id, status);
CREATE INDEX idx_callback_requests_status ON callback_requests(status, created_at);

-- Add image storage fields to activities (Cloudflare R2 keys)
-- Images are already stored as JSON array, but we'll track upload metadata
CREATE TABLE IF NOT EXISTS activity_images (
  image_id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  r2_key TEXT, -- Cloudflare R2 object key
  display_order INTEGER DEFAULT 0,
  caption TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_images_activity ON activity_images(activity_id, display_order);

-- Update vendor_properties to track registration code used
ALTER TABLE vendor_properties ADD COLUMN registration_code_used TEXT;
ALTER TABLE vendor_properties ADD COLUMN joined_via TEXT DEFAULT 'admin'; -- 'admin' or 'registration_code'

-- Generate registration codes for existing properties
UPDATE properties 
SET registration_code = UPPER(SUBSTR(HEX(RANDOMBLOB(4)), 1, 8)),
    registration_code_expires_at = DATETIME('now', '+30 days')
WHERE registration_code IS NULL;
