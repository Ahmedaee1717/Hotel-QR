-- Create table for active guest dining sessions (separate from time slot sessions)
CREATE TABLE IF NOT EXISTS guest_dining_sessions (
  session_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  guest_name TEXT,
  number_of_guests INTEGER NOT NULL,
  table_number TEXT NOT NULL,
  
  -- Session timing
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  
  -- Status and source
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  source TEXT, -- 'walk-in', 'reservation', 'waitlist'
  
  -- Guest details
  phone_number TEXT,
  special_requests TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guest_dining_offering ON guest_dining_sessions(offering_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_dining_table ON guest_dining_sessions(table_number, session_date);
CREATE INDEX IF NOT EXISTS idx_guest_dining_date ON guest_dining_sessions(session_date, status);
