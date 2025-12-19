-- Migration: Enhanced Tier Benefits System
-- Date: 2025-12-19
-- Purpose: Add granular tier benefit management with venue-specific access

-- ============================================
-- TABLE: Tier Benefits (Granular Feature Control)
-- ============================================
CREATE TABLE IF NOT EXISTS tier_benefits (
  benefit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  
  -- Benefit Type
  benefit_category TEXT NOT NULL, -- dining, drinks, recreation, services, amenities
  benefit_type TEXT NOT NULL, -- restaurant_access, bar_access, spa_service, activity, room_service
  
  -- Venue/Service Specification
  venue_id INTEGER, -- Links to hotel_offerings table (for restaurants, bars, activities)
  venue_name TEXT, -- Custom name if not linked to offering
  
  -- Access Rules
  access_level TEXT NOT NULL, -- unlimited, limited, excluded, special_hours
  quantity_limit INTEGER, -- NULL = unlimited, else daily/stay limit
  time_restrictions TEXT, -- JSON: {"days": ["monday", "tuesday"], "hours": "18:00-23:00"}
  
  -- Benefit Details
  benefit_title TEXT NOT NULL, -- "Unlimited Buffet Access", "2 À La Carte Meals Per Day"
  benefit_description TEXT, -- Detailed description for guests
  
  -- Pricing & Upsell
  included INTEGER DEFAULT 1, -- 1 = included, 0 = available for upgrade
  upgrade_price REAL DEFAULT 0, -- Per-use or daily upgrade cost
  
  -- Display
  icon TEXT DEFAULT 'fa-check-circle',
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tier_id) REFERENCES all_inclusive_tiers(tier_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (venue_id) REFERENCES hotel_offerings(offering_id)
);

CREATE INDEX idx_tier_benefits_tier ON tier_benefits(tier_id);
CREATE INDEX idx_tier_benefits_property ON tier_benefits(property_id);
CREATE INDEX idx_tier_benefits_category ON tier_benefits(benefit_category);
CREATE INDEX idx_tier_benefits_venue ON tier_benefits(venue_id);

-- ============================================
-- TABLE: Benefit Templates (Quick Setup)
-- ============================================
CREATE TABLE IF NOT EXISTS tier_benefit_templates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL, -- "Basic All-Inclusive", "Premium Plus", "Ultra Luxury"
  template_description TEXT,
  template_tier_level INTEGER DEFAULT 1, -- 1 = basic, 2 = premium, 3 = ultra
  benefits_json TEXT NOT NULL, -- JSON array of benefit definitions
  is_system_template INTEGER DEFAULT 0, -- System templates can't be deleted
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert system templates for quick tier creation
INSERT INTO tier_benefit_templates (template_name, template_description, template_tier_level, benefits_json, is_system_template) VALUES 
('Basic All-Inclusive', 'Standard all-inclusive package with essential amenities', 1, '[
  {"category": "dining", "type": "buffet_access", "title": "Unlimited Buffet Meals", "access_level": "unlimited"},
  {"category": "drinks", "type": "local_alcoholic", "title": "Local Alcoholic Drinks", "access_level": "limited", "time_restrictions": "08:00-23:00"},
  {"category": "drinks", "type": "soft_drinks", "title": "Soft Drinks & Water", "access_level": "unlimited"},
  {"category": "recreation", "type": "pool_access", "title": "Pool & Beach Access", "access_level": "unlimited"},
  {"category": "recreation", "type": "basic_activities", "title": "Basic Water Sports", "access_level": "limited"}
]', 1),

('Premium All-Inclusive', 'Enhanced package with à la carte dining and premium drinks', 2, '[
  {"category": "dining", "type": "buffet_access", "title": "Unlimited Buffet Meals", "access_level": "unlimited"},
  {"category": "dining", "type": "a_la_carte", "title": "2 À La Carte Dinners Per Stay", "access_level": "limited", "quantity_limit": 2},
  {"category": "drinks", "type": "premium_alcoholic", "title": "Premium & Imported Drinks", "access_level": "unlimited", "time_restrictions": "10:00-01:00"},
  {"category": "services", "type": "room_service", "title": "Limited Room Service", "access_level": "limited", "quantity_limit": 1},
  {"category": "recreation", "type": "premium_activities", "title": "Premium Recreation", "access_level": "unlimited"},
  {"category": "amenities", "type": "minibar", "title": "Daily Minibar Refresh", "access_level": "unlimited"}
]', 1),

('Ultra All-Inclusive', 'Luxury experience with unlimited access to all venues and services', 3, '[
  {"category": "dining", "type": "buffet_access", "title": "Unlimited Buffet Meals", "access_level": "unlimited"},
  {"category": "dining", "type": "a_la_carte", "title": "Unlimited À La Carte Dining", "access_level": "unlimited"},
  {"category": "drinks", "type": "top_shelf", "title": "Top-Shelf & Imported Liquor", "access_level": "unlimited"},
  {"category": "services", "type": "room_service", "title": "24/7 Room Service", "access_level": "unlimited"},
  {"category": "services", "type": "concierge", "title": "Personal Concierge", "access_level": "unlimited"},
  {"category": "services", "type": "late_checkout", "title": "Guaranteed Late Checkout (4 PM)", "access_level": "unlimited"},
  {"category": "services", "type": "spa_credit", "title": "$100 Daily Spa Credit", "access_level": "limited", "quantity_limit": 100},
  {"category": "amenities", "type": "premium_minibar", "title": "Premium Minibar (Unlimited)", "access_level": "unlimited"},
  {"category": "services", "type": "butler", "title": "Butler Service", "access_level": "unlimited"}
]', 1);

-- ============================================
-- TABLE: Benefit Usage Tracking (For Limited Benefits)
-- ============================================
CREATE TABLE IF NOT EXISTS tier_benefit_usage (
  usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_id INTEGER NOT NULL,
  benefit_id INTEGER NOT NULL,
  
  -- Usage Details
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_at_venue_id INTEGER, -- If used at specific venue
  used_quantity INTEGER DEFAULT 1,
  
  -- Staff Tracking
  verified_by_user_id INTEGER,
  verified_by_name TEXT,
  
  -- Notes
  notes TEXT,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id),
  FOREIGN KEY (benefit_id) REFERENCES tier_benefits(benefit_id),
  FOREIGN KEY (used_at_venue_id) REFERENCES hotel_offerings(offering_id)
);

CREATE INDEX idx_tier_benefit_usage_pass ON tier_benefit_usage(pass_id);
CREATE INDEX idx_tier_benefit_usage_benefit ON tier_benefit_usage(benefit_id);
CREATE INDEX idx_tier_benefit_usage_date ON tier_benefit_usage(used_at);
