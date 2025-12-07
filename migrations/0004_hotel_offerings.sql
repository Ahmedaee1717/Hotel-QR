-- Migration 0004: Hotel Offerings System
-- Allows hotels to add their own offerings: restaurants, events, activities

-- Add QR code to properties table (one QR per hotel)
-- Note: SQLite doesn't support adding UNIQUE constraint via ALTER TABLE
-- We'll create unique index separately
ALTER TABLE properties ADD COLUMN qr_code_data TEXT;
ALTER TABLE properties ADD COLUMN qr_code_url TEXT;

-- Create unique indexes for QR code data
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_qr_code ON properties(qr_code_data) WHERE qr_code_data IS NOT NULL;

-- Registration code columns (may already exist from previous migration)
-- Using IF NOT EXISTS pattern via try-catch in app code

-- Hotel Offerings (restaurants, events, buffets, etc.)
CREATE TABLE IF NOT EXISTS hotel_offerings (
  offering_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  offering_type TEXT NOT NULL, -- 'restaurant', 'event', 'spa', 'activity', 'service'
  title_en TEXT NOT NULL,
  title_ar TEXT,
  short_description_en TEXT,
  short_description_ar TEXT,
  full_description_en TEXT,
  full_description_ar TEXT,
  images TEXT, -- JSON array of image URLs
  
  -- Pricing
  price REAL,
  currency TEXT DEFAULT 'USD',
  price_type TEXT DEFAULT 'per_person', -- 'per_person', 'per_booking', 'per_table', 'free'
  
  -- Scheduling
  duration_minutes INTEGER,
  capacity_per_slot INTEGER,
  requires_booking INTEGER DEFAULT 0, -- 0 = walk-in, 1 = booking required
  
  -- Restaurant specific
  cuisine_type TEXT, -- 'italian', 'asian', 'mediterranean', etc.
  meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'buffet', 'a_la_carte'
  
  -- Event specific
  event_date DATE,
  event_start_time TIME,
  event_end_time TIME,
  is_recurring INTEGER DEFAULT 0,
  recurrence_pattern TEXT, -- JSON: {"frequency": "weekly", "days": [0,6]}
  
  -- Additional details
  location TEXT, -- 'Beachside', 'Pool Area', 'Main Restaurant', etc.
  dress_code TEXT,
  age_restriction INTEGER,
  special_requirements TEXT,
  includes TEXT, -- JSON array
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'draft', 'full'
  is_featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Offering Availability Schedule
CREATE TABLE IF NOT EXISTS offering_schedule (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slots_available INTEGER DEFAULT 1,
  is_recurring INTEGER DEFAULT 1,
  valid_from DATE,
  valid_until DATE,
  
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id)
);

-- Offering Bookings (extends main bookings table concept)
CREATE TABLE IF NOT EXISTS offering_bookings (
  booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_reference TEXT UNIQUE NOT NULL,
  guest_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  offering_id INTEGER NOT NULL,
  
  booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  duration_minutes INTEGER,
  
  num_guests INTEGER DEFAULT 1,
  table_number TEXT,
  special_requests TEXT,
  
  total_price REAL,
  currency TEXT DEFAULT 'USD',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  
  booking_status TEXT DEFAULT 'confirmed', -- 'confirmed', 'completed', 'cancelled', 'no_show'
  
  confirmation_sent_at DATETIME,
  reminder_sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME,
  
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hotel_offerings_property ON hotel_offerings(property_id, status);
CREATE INDEX IF NOT EXISTS idx_hotel_offerings_type ON hotel_offerings(offering_type, status);
CREATE INDEX IF NOT EXISTS idx_offering_schedule_offering ON offering_schedule(offering_id);
CREATE INDEX IF NOT EXISTS idx_offering_bookings_guest ON offering_bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_offering_bookings_property ON offering_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_offering_bookings_date ON offering_bookings(reservation_date);
