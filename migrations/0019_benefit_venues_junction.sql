-- Migration 0019: Support multiple venues per benefit
-- Allows admins to link multiple restaurants, bars, or activities to a single benefit

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS benefit_venues (
  benefit_venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  benefit_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  custom_cta_text TEXT DEFAULT 'View Details',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (benefit_id) REFERENCES tier_benefits(benefit_id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES hotel_offerings(offering_id) ON DELETE CASCADE,
  
  UNIQUE(benefit_id, venue_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_benefit_venues_benefit ON benefit_venues(benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_venues_venue ON benefit_venues(venue_id);
