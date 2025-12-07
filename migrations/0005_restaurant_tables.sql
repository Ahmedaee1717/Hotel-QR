-- Migration 0005: Restaurant Table Management & Scheduling System
-- Allows hotels to create table layouts and guests to book specific tables with time slots

-- Restaurant Table Layouts
CREATE TABLE IF NOT EXISTS restaurant_tables (
  table_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL, -- Links to hotel_offerings where offering_type = 'restaurant'
  table_number TEXT NOT NULL,
  table_name TEXT, -- e.g., "Beachview Table 5", "Corner Booth A"
  capacity INTEGER NOT NULL DEFAULT 2, -- Number of seats
  position_x INTEGER, -- X coordinate for visual layout (in pixels or grid units)
  position_y INTEGER, -- Y coordinate for visual layout
  width INTEGER DEFAULT 100, -- Visual width for display
  height INTEGER DEFAULT 100, -- Visual height for display
  shape TEXT DEFAULT 'rectangle', -- 'rectangle', 'circle', 'square' for visual rendering
  table_type TEXT DEFAULT 'standard', -- 'standard', 'booth', 'bar', 'outdoor', 'vip'
  features TEXT, -- JSON: ["window_view", "beachfront", "quiet", "highchair_available"]
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id),
  UNIQUE(offering_id, table_number)
);

-- Restaurant Dining Sessions (Time Slots)
CREATE TABLE IF NOT EXISTS dining_sessions (
  session_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL, -- e.g., "07:00", "19:30"
  session_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'brunch', 'snack'
  duration_minutes INTEGER DEFAULT 90, -- How long guests have the table
  max_capacity INTEGER, -- Total restaurant capacity for this session
  current_bookings INTEGER DEFAULT 0, -- Track how many seats are booked
  status TEXT DEFAULT 'available', -- 'available', 'full', 'closed'
  notes TEXT, -- e.g., "Special buffet menu today"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id)
);

-- Table Reservations
CREATE TABLE IF NOT EXISTS table_reservations (
  reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  table_id INTEGER NOT NULL,
  guest_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  
  -- Reservation details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  num_guests INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  
  -- Guest preferences
  special_requests TEXT,
  dietary_requirements TEXT,
  occasion TEXT, -- 'birthday', 'anniversary', 'celebration'
  
  -- Status tracking
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
  checked_in_at DATETIME,
  completed_at DATETIME,
  
  -- Notifications
  confirmation_sent INTEGER DEFAULT 0,
  reminder_sent INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME,
  
  FOREIGN KEY (session_id) REFERENCES dining_sessions(session_id),
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(table_id),
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Restaurant Layout Configurations (for saving entire floor plans)
CREATE TABLE IF NOT EXISTS restaurant_layouts (
  layout_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  layout_name TEXT NOT NULL,
  layout_data TEXT NOT NULL, -- JSON: Complete table positions, dimensions, metadata
  canvas_width INTEGER DEFAULT 1000,
  canvas_height INTEGER DEFAULT 800,
  background_image TEXT, -- URL to floor plan image
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id)
);

-- Session Templates (for recurring schedules)
CREATE TABLE IF NOT EXISTS session_templates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  template_name TEXT NOT NULL, -- e.g., "Standard Breakfast Schedule"
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. NULL for all days
  session_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_interval_minutes INTEGER DEFAULT 30, -- Generate slots every 30 minutes
  slot_duration_minutes INTEGER DEFAULT 90, -- Each booking lasts 90 minutes
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id)
);

-- Add columns to offering_bookings for table reservations
-- (extending existing table from migration 0004)
-- Note: num_guests column already exists in offering_bookings
ALTER TABLE offering_bookings ADD COLUMN table_id INTEGER;
ALTER TABLE offering_bookings ADD COLUMN session_id INTEGER;
ALTER TABLE offering_bookings ADD COLUMN dietary_requirements TEXT;
ALTER TABLE offering_bookings ADD COLUMN checked_in INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_offering ON restaurant_tables(offering_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dining_sessions_date ON dining_sessions(offering_id, session_date, status);
CREATE INDEX IF NOT EXISTS idx_table_reservations_session ON table_reservations(session_id, status);
CREATE INDEX IF NOT EXISTS idx_table_reservations_table ON table_reservations(table_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_table_reservations_guest ON table_reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_offering ON session_templates(offering_id, is_active);
