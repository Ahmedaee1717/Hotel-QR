-- Save My Stay: Guest Mood Check & Feedback System
-- This feature prevents negative reviews by catching unhappy guests BEFORE checkout

-- Daily mood check responses
CREATE TABLE IF NOT EXISTS guest_mood_checks (
  mood_check_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_reference TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  room_number TEXT,
  
  -- Check-in details
  check_date DATE NOT NULL,
  stay_day INTEGER NOT NULL, -- Day 1, Day 2, etc.
  
  -- Mood rating
  mood_score INTEGER NOT NULL, -- 1=unhappy, 2=okay, 3=happy
  mood_emoji TEXT NOT NULL, -- '😟', '😐', '😊'
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  device_info TEXT,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(pass_reference, check_date) -- One check per day per guest
);

-- Detailed feedback (both positive and negative)
CREATE TABLE IF NOT EXISTS guest_feedback (
  feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
  mood_check_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  pass_reference TEXT NOT NULL,
  
  -- Guest info
  guest_name TEXT NOT NULL,
  room_number TEXT,
  
  -- Feedback type
  feedback_type TEXT NOT NULL, -- 'positive', 'negative', 'urgent'
  mood_score INTEGER NOT NULL,
  
  -- Feedback content
  categories TEXT, -- JSON array: ["food", "service", "room"]
  custom_comment TEXT,
  
  -- Response tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'acknowledged', 'resolved'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_to TEXT,
  
  -- Response details
  responded_at DATETIME,
  responded_by TEXT,
  response_notes TEXT,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (mood_check_id) REFERENCES guest_mood_checks(mood_check_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Review requests (for happy guests)
CREATE TABLE IF NOT EXISTS review_requests (
  request_id INTEGER PRIMARY KEY AUTOINCREMENT,
  mood_check_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  pass_reference TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  
  -- Review platform
  platform TEXT NOT NULL, -- 'tripadvisor', 'google', 'booking'
  platform_url TEXT,
  
  -- Tracking
  clicked BOOLEAN DEFAULT 0,
  clicked_at DATETIME,
  review_submitted BOOLEAN DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (mood_check_id) REFERENCES guest_mood_checks(mood_check_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Feedback analytics
CREATE TABLE IF NOT EXISTS feedback_analytics (
  analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  date DATE NOT NULL,
  
  -- Daily mood stats
  total_checks INTEGER DEFAULT 0,
  happy_count INTEGER DEFAULT 0,
  okay_count INTEGER DEFAULT 0,
  unhappy_count INTEGER DEFAULT 0,
  
  -- Response metrics
  avg_response_time_minutes INTEGER,
  resolved_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  
  -- Review conversion
  review_requests_sent INTEGER DEFAULT 0,
  reviews_submitted INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_checks_property_date ON guest_mood_checks(property_id, check_date);
CREATE INDEX IF NOT EXISTS idx_mood_checks_pass ON guest_mood_checks(pass_reference);
CREATE INDEX IF NOT EXISTS idx_feedback_property_status ON guest_feedback(property_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON guest_feedback(priority, status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON guest_feedback(created_at);
