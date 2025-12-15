-- Restaurant Waitlist Table
CREATE TABLE IF NOT EXISTS restaurant_waitlist (
  waitlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  guest_name TEXT NOT NULL,
  phone_number TEXT,
  number_of_guests INTEGER NOT NULL,
  party_size_preference TEXT, -- e.g., "2-4", "5+"
  special_requests TEXT,
  priority INTEGER DEFAULT 0, -- 0=normal, 1=priority, 2=VIP
  status TEXT DEFAULT 'waiting', -- waiting, seated, cancelled, no_show
  estimated_wait_minutes INTEGER,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notified_at DATETIME,
  seated_at DATETIME,
  cancelled_at DATETIME,
  table_number TEXT,
  notes TEXT,
  created_by TEXT DEFAULT 'staff' -- staff, online, kiosk
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_offering ON restaurant_waitlist(offering_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON restaurant_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_added ON restaurant_waitlist(added_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_offering_status ON restaurant_waitlist(offering_id, status);
