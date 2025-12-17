-- Migration: All-Inclusive Digital Pass System
-- Date: 2025-12-17
-- Purpose: Replace physical wristbands with fraud-proof digital verification

-- ============================================
-- TABLE 1: Tier Definitions (Per Property)
-- ============================================
CREATE TABLE all_inclusive_tiers (
  tier_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  tier_code TEXT NOT NULL, -- standard, premium, vip, diamond (system identifier)
  tier_display_name TEXT NOT NULL, -- "Gold Club", "Diamond Elite" (display name)
  tier_color TEXT NOT NULL DEFAULT '#3B82F6', -- Badge color (hex)
  tier_icon TEXT DEFAULT 'fa-star', -- Font Awesome icon
  tier_description TEXT, -- What's included
  tier_features TEXT, -- JSON array: ["premium_drinks", "vip_lounge", "priority_dining"]
  access_locations TEXT, -- JSON array: restaurant IDs, area names
  daily_upgrade_price REAL DEFAULT 0, -- Cost to upgrade per day
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, tier_code)
);

-- Default tiers for demonstration (will be created per property via admin)
-- Properties can customize these completely

-- ============================================
-- TABLE 2: Digital Passes (Guest Passes)
-- ============================================
CREATE TABLE digital_passes (
  pass_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_reference TEXT UNIQUE NOT NULL, -- PASS-1234567890-ABCDE (unique identifier)
  
  -- Guest Information
  primary_guest_name TEXT NOT NULL,
  primary_guest_photo_url TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  room_number TEXT, -- Can be null for day passes
  
  -- Pass Details
  tier_id INTEGER NOT NULL, -- Links to all_inclusive_tiers
  pass_status TEXT DEFAULT 'active', -- active, expired, deactivated, suspended
  num_adults INTEGER DEFAULT 1,
  num_children INTEGER DEFAULT 0,
  
  -- Validity Period
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  -- Tracking
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  issued_by_user_id INTEGER, -- Admin who created pass
  issued_by_name TEXT,
  deactivated_at DATETIME,
  deactivated_by TEXT,
  deactivation_reason TEXT,
  
  -- Security
  qr_secret TEXT NOT NULL, -- Secret for rotating QR generation
  last_verified_at DATETIME,
  total_verifications INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT, -- Admin notes
  special_access TEXT, -- JSON: custom access rules
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (tier_id) REFERENCES all_inclusive_tiers(tier_id)
);

-- Index for fast lookups
CREATE INDEX idx_digital_passes_property ON digital_passes(property_id);
CREATE INDEX idx_digital_passes_status ON digital_passes(pass_status);
CREATE INDEX idx_digital_passes_dates ON digital_passes(valid_from, valid_until);
CREATE INDEX idx_digital_passes_reference ON digital_passes(pass_reference);

-- ============================================
-- TABLE 3: Pass Family Members (Children/Companions)
-- ============================================
CREATE TABLE pass_family_members (
  member_id INTEGER PRIMARY KEY AUTOINCREMENT,
  pass_id INTEGER NOT NULL,
  member_name TEXT NOT NULL,
  member_type TEXT DEFAULT 'adult', -- adult, child, infant
  member_age INTEGER,
  member_photo_url TEXT,
  relationship TEXT, -- spouse, child, parent, companion
  is_primary INTEGER DEFAULT 0, -- 1 if this is the primary guest
  special_needs TEXT, -- Allergies, dietary restrictions, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id) ON DELETE CASCADE
);

CREATE INDEX idx_pass_family_members_pass ON pass_family_members(pass_id);

-- ============================================
-- TABLE 4: Pass Verifications (Fraud Detection Log)
-- ============================================
CREATE TABLE pass_verifications (
  verification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_id INTEGER NOT NULL,
  
  -- Staff Who Verified
  staff_user_id INTEGER,
  staff_name TEXT,
  
  -- Verification Details
  verification_location TEXT NOT NULL, -- restaurant_entry, bar, pool, spa, vip_lounge, beach
  verification_location_name TEXT, -- "Steakhouse Restaurant", "Rooftop Bar"
  verification_result TEXT NOT NULL, -- valid, expired, wrong_tier, deactivated, fraud_attempt
  verification_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Guest Info at Time of Verification
  guest_name TEXT,
  room_number TEXT,
  tier_name TEXT,
  
  -- Fraud Detection
  device_info TEXT, -- Staff device fingerprint
  gps_coordinates TEXT, -- Lat/long if available
  fraud_flags TEXT, -- JSON: ["simultaneous_scan", "old_pass_reuse"]
  
  -- Result Details
  denial_reason TEXT, -- Why access was denied
  notes TEXT, -- Staff notes
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id)
);

CREATE INDEX idx_pass_verifications_property ON pass_verifications(property_id);
CREATE INDEX idx_pass_verifications_pass ON pass_verifications(pass_id);
CREATE INDEX idx_pass_verifications_timestamp ON pass_verifications(verification_timestamp);
CREATE INDEX idx_pass_verifications_result ON pass_verifications(verification_result);

-- ============================================
-- TABLE 5: Fraud Alerts (Automated Detection)
-- ============================================
CREATE TABLE pass_fraud_alerts (
  alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_id INTEGER NOT NULL,
  
  -- Alert Details
  alert_type TEXT NOT NULL, -- simultaneous_scan, old_pass_reuse, excessive_scans, counterfeit_attempt
  alert_severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  alert_description TEXT NOT NULL,
  alert_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Evidence
  evidence_data TEXT, -- JSON: verification IDs, locations, timestamps
  
  -- Resolution
  resolved INTEGER DEFAULT 0,
  resolved_at DATETIME,
  resolved_by_user_id INTEGER,
  resolved_by_name TEXT,
  resolution_notes TEXT,
  action_taken TEXT, -- pass_deactivated, warning_issued, false_alarm
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id)
);

CREATE INDEX idx_pass_fraud_alerts_property ON pass_fraud_alerts(property_id);
CREATE INDEX idx_pass_fraud_alerts_resolved ON pass_fraud_alerts(resolved);
CREATE INDEX idx_pass_fraud_alerts_severity ON pass_fraud_alerts(alert_severity);

-- ============================================
-- TABLE 6: Verification Locations (Per Property)
-- ============================================
CREATE TABLE verification_locations (
  location_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  location_code TEXT NOT NULL, -- restaurant_main, bar_rooftop, pool_adults, spa_premium
  location_name TEXT NOT NULL, -- "Main Restaurant", "Rooftop Bar"
  location_type TEXT NOT NULL, -- restaurant, bar, pool, spa, beach, activity, vip_lounge
  required_tier_codes TEXT, -- JSON array: ["premium", "vip", "diamond"] (null = all tiers)
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  description TEXT,
  operating_hours TEXT, -- JSON: {"monday": "08:00-22:00", ...}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, location_code)
);

CREATE INDEX idx_verification_locations_property ON verification_locations(property_id);

-- ============================================
-- TABLE 7: Pass Upgrade History (Revenue Tracking)
-- ============================================
CREATE TABLE pass_upgrades (
  upgrade_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_id INTEGER NOT NULL,
  
  -- Upgrade Details
  from_tier_id INTEGER,
  to_tier_id INTEGER NOT NULL,
  upgrade_date DATE NOT NULL,
  upgrade_duration_days INTEGER DEFAULT 1, -- How many days upgraded
  
  -- Pricing
  daily_rate REAL NOT NULL,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
  
  -- Processing
  processed_by_user_id INTEGER,
  processed_by_name TEXT,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Notes
  notes TEXT,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id),
  FOREIGN KEY (from_tier_id) REFERENCES all_inclusive_tiers(tier_id),
  FOREIGN KEY (to_tier_id) REFERENCES all_inclusive_tiers(tier_id)
);

CREATE INDEX idx_pass_upgrades_property ON pass_upgrades(property_id);
CREATE INDEX idx_pass_upgrades_pass ON pass_upgrades(pass_id);
CREATE INDEX idx_pass_upgrades_date ON pass_upgrades(upgrade_date);
