-- À La Carte Voucher System
-- Integrated with existing tier_benefits and hotel_offerings

-- 1. Restaurant Menu Items with Costs
CREATE TABLE IF NOT EXISTS alacarte_menu_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  restaurant_id INTEGER NOT NULL,
  category TEXT NOT NULL,                 -- 'salad', 'starter', 'main', 'dessert'
  item_name TEXT NOT NULL,
  item_name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  cost_to_hotel DECIMAL(10,2) NOT NULL,   -- What it costs the kitchen
  is_premium INTEGER DEFAULT 0,           -- Premium items (ribeye, lobster)
  is_available INTEGER DEFAULT 1,
  allergens TEXT,                         -- JSON array: ["dairy", "nuts"]
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (restaurant_id) REFERENCES hotel_offerings(offering_id)
);

CREATE INDEX IF NOT EXISTS idx_alacarte_menu_restaurant ON alacarte_menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_alacarte_menu_category ON alacarte_menu_items(category);

-- 2. Tier Dining Limits (extends existing tier_benefits)
CREATE TABLE IF NOT EXISTS tier_alacarte_limits (
  limit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_id INTEGER NOT NULL,
  meals_per_stay INTEGER DEFAULT 0,      -- How many vouchers per stay?
  max_cost_per_meal DECIMAL(10,2),       -- €30, €50, €999 (unlimited)
  eligible_restaurants TEXT,              -- JSON array of restaurant IDs, or ["*"] for all
  time_restrictions TEXT,                 -- JSON: {"exclude_peak_hours": false, "weekends_only": false}
  preorder_required INTEGER DEFAULT 1,    -- Must pre-order? (0 = walk-in allowed)
  preorder_hours_before INTEGER DEFAULT 4, -- Must order 4+ hours before
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tier_id) REFERENCES all_inclusive_tiers(tier_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_limits_tier ON tier_alacarte_limits(tier_id);

-- 3. Guest Vouchers (tracks usage)
CREATE TABLE IF NOT EXISTS alacarte_vouchers (
  voucher_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_id INTEGER NOT NULL,
  voucher_code TEXT UNIQUE NOT NULL,      -- MEAL-20251225-0047
  
  -- Tier tracking
  tier_id INTEGER NOT NULL,
  meal_number INTEGER NOT NULL,           -- "This is meal 1 of 3"
  max_cost DECIMAL(10,2),                 -- Tier limit for this meal
  
  -- Reservation details
  restaurant_id INTEGER NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER DEFAULT 1,
  table_number TEXT,
  
  -- Pre-order details (JSON for flexibility)
  preorder_items TEXT,                    -- JSON: {"salad": "Caesar", "main": "Ribeye", ...}
  preorder_item_ids TEXT,                 -- JSON: [12, 45, 78, 92] (item_id references)
  special_requests TEXT,
  
  -- Cost tracking
  total_cost DECIMAL(10,2),               -- Sum of all item costs
  overage_amount DECIMAL(10,2) DEFAULT 0, -- Amount over tier limit
  overage_paid INTEGER DEFAULT 0,         -- Did guest pay the difference?
  
  -- Status tracking
  status TEXT DEFAULT 'pending',          -- pending/confirmed/checked_in/completed/no_show/cancelled
  checked_in_at DATETIME,
  checked_in_by TEXT,                     -- Staff member who verified
  completed_at DATETIME,
  cancelled_at DATETIME,
  cancellation_reason TEXT,
  
  -- QR code for verification
  qr_code TEXT UNIQUE,                    -- One-time use QR code
  qr_used INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id),
  FOREIGN KEY (tier_id) REFERENCES all_inclusive_tiers(tier_id),
  FOREIGN KEY (restaurant_id) REFERENCES hotel_offerings(offering_id)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_pass ON alacarte_vouchers(pass_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON alacarte_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_restaurant_date ON alacarte_vouchers(restaurant_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_qr ON alacarte_vouchers(qr_code);

-- 4. Pre-order Cutoff Times (per restaurant)
CREATE TABLE IF NOT EXISTS alacarte_preorder_cutoffs (
  cutoff_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  restaurant_id INTEGER NOT NULL,
  meal_service TEXT NOT NULL,             -- 'lunch', 'dinner'
  service_time TIME NOT NULL,             -- e.g., '19:30' for dinner
  cutoff_hours_before INTEGER DEFAULT 4,  -- Must order 4 hours before
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (restaurant_id) REFERENCES hotel_offerings(offering_id)
);

CREATE INDEX IF NOT EXISTS idx_cutoffs_restaurant ON alacarte_preorder_cutoffs(restaurant_id);

-- 5. Kitchen Prep Dashboard Data (aggregate view)
CREATE TABLE IF NOT EXISTS alacarte_kitchen_prep (
  prep_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  restaurant_id INTEGER NOT NULL,
  prep_date DATE NOT NULL,
  meal_service TEXT NOT NULL,             -- 'lunch' or 'dinner'
  
  -- Aggregated data (updated when vouchers created/cancelled)
  total_guests INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Item quantities (JSON)
  item_quantities TEXT,                   -- {"ribeye": 8, "sea_bass": 5, "risotto": 3}
  
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (restaurant_id) REFERENCES hotel_offerings(offering_id),
  UNIQUE(restaurant_id, prep_date, meal_service)
);

CREATE INDEX IF NOT EXISTS idx_kitchen_prep_date ON alacarte_kitchen_prep(prep_date);
