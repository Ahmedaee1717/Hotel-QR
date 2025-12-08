-- Beach Booking System Migration
-- Adds comprehensive beach spot booking functionality for resort hotels

-- 1. Beach Settings (Property-level configuration)
CREATE TABLE IF NOT EXISTS beach_settings (
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
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- 2. Beach Zones (Different areas of the beach)
CREATE TABLE IF NOT EXISTS beach_zones (
  zone_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'standard',
  description TEXT,
  boundary_coordinates TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- 3. Beach Spots (Individual umbrellas/cabanas/loungers)
CREATE TABLE IF NOT EXISTS beach_spots (
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (zone_id) REFERENCES beach_zones(zone_id) ON DELETE CASCADE
);

-- 4. Beach Bookings
CREATE TABLE IF NOT EXISTS beach_bookings (
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
  cancelled_at DATETIME,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (spot_id) REFERENCES beach_spots(spot_id),
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_beach_zones_property ON beach_zones(property_id);
CREATE INDEX IF NOT EXISTS idx_beach_spots_property ON beach_spots(property_id);
CREATE INDEX IF NOT EXISTS idx_beach_spots_zone ON beach_spots(zone_id);
CREATE INDEX IF NOT EXISTS idx_beach_bookings_property ON beach_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_beach_bookings_spot ON beach_bookings(spot_id);
CREATE INDEX IF NOT EXISTS idx_beach_bookings_date ON beach_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_beach_bookings_reference ON beach_bookings(booking_reference);
