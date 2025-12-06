-- Resort Activity Booking Platform - Initial Schema Migration
-- Created: 2025-12-06

-- Properties (Hotels/Resorts)
CREATE TABLE IF NOT EXISTS properties (
  property_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  default_language TEXT DEFAULT 'en',
  supported_languages TEXT DEFAULT '["en","ar"]',
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  room_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  room_number TEXT NOT NULL,
  room_type TEXT DEFAULT 'standard',
  qr_code_data TEXT UNIQUE NOT NULL,
  qr_code_url TEXT,
  current_guest_id INTEGER,
  check_in_date DATE,
  check_out_date DATE,
  status TEXT DEFAULT 'vacant',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, room_number)
);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
  guest_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  room_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en',
  marketing_consent INTEGER DEFAULT 0,
  session_token TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  parent_category_id INTEGER,
  FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  category_id INTEGER,
  logo_url TEXT,
  cover_images TEXT,
  contact_person TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  certifications TEXT,
  safety_rating REAL DEFAULT 5.0,
  commission_rate REAL DEFAULT 15.0,
  payment_methods TEXT DEFAULT '["cash","card","pay_at_vendor"]',
  working_hours TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Vendor_Properties (Many-to-Many)
CREATE TABLE IF NOT EXISTS vendor_properties (
  vendor_property_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  is_featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  custom_commission_rate REAL,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(vendor_id, property_id)
);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  short_description_en TEXT,
  short_description_ar TEXT,
  full_description_en TEXT,
  full_description_ar TEXT,
  images TEXT,
  duration_minutes INTEGER NOT NULL,
  capacity_per_slot INTEGER DEFAULT 1,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  price_type TEXT DEFAULT 'per_person',
  requirements TEXT,
  includes TEXT,
  cancellation_policy_hours INTEGER DEFAULT 24,
  status TEXT DEFAULT 'active',
  is_featured INTEGER DEFAULT 0,
  popularity_score INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Availability_Schedule
CREATE TABLE IF NOT EXISTS availability_schedule (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  day_of_week INTEGER,
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slots_available INTEGER DEFAULT 1,
  is_recurring INTEGER DEFAULT 1,
  valid_from DATE,
  valid_until DATE,
  FOREIGN KEY (activity_id) REFERENCES activities(activity_id)
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_reference TEXT UNIQUE NOT NULL,
  guest_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  activity_id INTEGER NOT NULL,
  vendor_id INTEGER NOT NULL,
  booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  activity_date DATE NOT NULL,
  activity_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  num_participants INTEGER DEFAULT 1,
  total_price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  commission_amount REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_transaction_id TEXT,
  payment_link_sent INTEGER DEFAULT 0,
  booking_status TEXT DEFAULT 'pending',
  guest_notes TEXT,
  vendor_notes TEXT,
  waiver_signed INTEGER DEFAULT 0,
  waiver_signature_url TEXT,
  confirmation_sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  payment_gateway TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending',
  payment_date DATETIME,
  refund_amount REAL DEFAULT 0,
  refund_date DATETIME,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
);

-- Users (Admin/Staff)
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  property_id INTEGER,
  permissions TEXT,
  last_login DATETIME,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Waivers
CREATE TABLE IF NOT EXISTS waivers (
  waiver_id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  content_en TEXT NOT NULL,
  content_ar TEXT,
  version INTEGER DEFAULT 1,
  is_required INTEGER DEFAULT 1,
  effective_date DATE DEFAULT (date('now')),
  FOREIGN KEY (activity_id) REFERENCES activities(activity_id)
);

-- Analytics_Events
CREATE TABLE IF NOT EXISTS analytics_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  guest_id INTEGER,
  event_type TEXT NOT NULL,
  entity_id INTEGER,
  metadata TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_qr_code ON rooms(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_guests_session ON guests(session_token);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_activities_vendor ON activities(vendor_id);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor ON bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_activity ON bookings(activity_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(activity_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_analytics_property ON analytics_events(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
