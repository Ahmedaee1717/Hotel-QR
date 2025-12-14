-- Fix beach tables that failed to create

-- Drop existing partial tables if any
DROP TABLE IF EXISTS beach_bookings;
DROP TABLE IF EXISTS beach_spots;
DROP TABLE IF EXISTS beach_zones;
DROP TABLE IF EXISTS beach_settings;

-- 1. Beach Settings (Property-level configuration)
CREATE TABLE beach_settings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER UNIQUE NOT NULL,
  
  -- Enable/disable feature
  beach_booking_enabled INTEGER DEFAULT 0,
  
  -- Beach map image
  beach_map_image_url TEXT,
  beach_map_width INTEGER DEFAULT 1000,
  beach_map_height INTEGER DEFAULT 600,
  
  -- Operating hours
  opening_time TIME DEFAULT '08:00',
  closing_time TIME DEFAULT '18:00',
  
  -- Booking rules
  advance_booking_days INTEGER DEFAULT 7,
  max_booking_duration_hours INTEGER DEFAULT 12,
  allow_same_day_booking INTEGER DEFAULT 1,
  require_room_number INTEGER DEFAULT 0,
  
  -- Pricing defaults
  default_price_full_day REAL DEFAULT 0,
  default_price_half_day REAL DEFAULT 0,
  default_price_hourly REAL DEFAULT 0,
  free_for_hotel_guests INTEGER DEFAULT 1,
  
  -- Notifications
  send_confirmation_email INTEGER DEFAULT 1,
  send_reminder_sms INTEGER DEFAULT 0,
  
  -- UI customization columns
  card_title TEXT DEFAULT 'Beach Paradise',
  card_subtitle TEXT DEFAULT 'Your Exclusive Beach Experience',
  feature1_text TEXT DEFAULT 'Premium Beach Spots',
  feature2_text TEXT DEFAULT 'All-Day Comfort',
  feature3_text TEXT DEFAULT 'Complimentary Service',
  umbrellas_label TEXT DEFAULT 'Beach Umbrellas',
  umbrellas_desc TEXT DEFAULT 'Shaded comfort zones',
  cabanas_label TEXT DEFAULT 'Luxury Cabanas',
  cabanas_desc TEXT DEFAULT 'Private retreat spaces',
  loungers_label TEXT DEFAULT 'Sun Loungers',
  loungers_desc TEXT DEFAULT 'Relaxation essentials',
  daybeds_label TEXT DEFAULT 'Daybeds',
  daybeds_desc TEXT DEFAULT 'Ultimate comfort',
  button_text TEXT DEFAULT 'Book Your Spot',
  bg_color_from TEXT DEFAULT '#0ea5e9',
  bg_color_to TEXT DEFAULT '#06b6d4',
  text_color TEXT DEFAULT '#ffffff',
  button_color_from TEXT DEFAULT '#f97316',
  button_color_to TEXT DEFAULT '#ea580c',
  button_text_color TEXT DEFAULT '#ffffff',
  traffic_light_text_color TEXT DEFAULT '#ffffff',
  time_slots TEXT DEFAULT '[]',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Beach Zones (Different areas of the beach)
CREATE TABLE beach_zones (
  zone_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'standard',
  description TEXT,
  boundary_coordinates TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Beach Spots (Individual umbrellas/cabanas/loungers)
CREATE TABLE beach_spots (
  spot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  zone_id INTEGER NOT NULL,
  spot_number TEXT NOT NULL,
  spot_type TEXT NOT NULL,
  
  -- Position on beach map
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  
  -- Capacity and amenities
  max_capacity INTEGER DEFAULT 2,
  has_umbrella INTEGER DEFAULT 1,
  has_table INTEGER DEFAULT 0,
  has_wifi INTEGER DEFAULT 0,
  has_waiter_service INTEGER DEFAULT 0,
  
  -- Pricing
  price_full_day REAL DEFAULT 0,
  price_half_day REAL DEFAULT 0,
  price_hourly REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Availability
  is_active INTEGER DEFAULT 1,
  is_premium INTEGER DEFAULT 0,
  maintenance_mode INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Beach Bookings
CREATE TABLE beach_bookings (
  beach_booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_reference TEXT UNIQUE NOT NULL,
  property_id INTEGER NOT NULL,
  spot_id INTEGER NOT NULL,
  guest_id INTEGER,
  
  -- Guest info
  guest_name TEXT NOT NULL,
  guest_room_number TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  
  -- Booking details
  booking_date DATE NOT NULL,
  slot_type TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  num_guests INTEGER DEFAULT 2,
  
  -- Pricing
  total_price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Status
  booking_status TEXT DEFAULT 'confirmed',
  payment_status TEXT DEFAULT 'pending',
  
  -- QR Code
  qr_code_data TEXT,
  qr_code_url TEXT,
  
  -- Notes
  special_requests TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  checked_in_at DATETIME,
  checked_out_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME
);

-- Create indexes for performance
CREATE INDEX idx_beach_zones_property ON beach_zones(property_id);
CREATE INDEX idx_beach_spots_property ON beach_spots(property_id);
CREATE INDEX idx_beach_spots_zone ON beach_spots(zone_id);
CREATE INDEX idx_beach_bookings_property ON beach_bookings(property_id);
CREATE INDEX idx_beach_bookings_spot ON beach_bookings(spot_id);
CREATE INDEX idx_beach_bookings_date ON beach_bookings(booking_date);
CREATE INDEX idx_beach_bookings_reference ON beach_bookings(booking_reference);

-- Insert initial beach settings for property 1
INSERT INTO beach_settings (property_id, beach_booking_enabled, free_for_hotel_guests) 
VALUES (1, 0, 1);
