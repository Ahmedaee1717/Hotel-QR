-- My Perfect Week: Visual Stay Planner
-- This migration creates tables for the timeline/planner feature

-- Guest stay plans (one per guest stay)
CREATE TABLE IF NOT EXISTS guest_stay_plans (
  plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  total_nights INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
);

-- Individual timeline items (activities, bookings, custom events)
CREATE TABLE IF NOT EXISTS timeline_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  item_type TEXT NOT NULL, -- 'booking', 'activity', 'dining', 'event', 'custom'
  reference_id INTEGER, -- Links to booking_id, offering_id, etc. (NULL for custom items)
  item_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  icon TEXT DEFAULT '📅', -- Emoji icon for display
  color TEXT DEFAULT 'blue', -- Color coding: blue, green, purple, orange, gray
  status TEXT DEFAULT 'planned', -- 'planned', 'confirmed', 'completed', 'cancelled'
  is_suggested BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES guest_stay_plans(plan_id) ON DELETE CASCADE
);

-- Smart suggestions for guests
CREATE TABLE IF NOT EXISTS timeline_suggestions (
  suggestion_id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  offering_id INTEGER NOT NULL,
  suggested_date DATE NOT NULL,
  suggested_time TIME NOT NULL,
  reason_code TEXT NOT NULL, -- 'tier_included', 'weather_perfect', 'popular', 'balance', 'time_sensitive'
  reason_text TEXT NOT NULL, -- Human-readable reason (e.g., "☀️ Perfect diving weather")
  relevance_score INTEGER DEFAULT 50, -- 0-100, higher = more relevant
  is_dismissed BOOLEAN DEFAULT 0,
  is_accepted BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES guest_stay_plans(plan_id) ON DELETE CASCADE,
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id) ON DELETE CASCADE
);

-- Analytics tracking for week planner usage
CREATE TABLE IF NOT EXISTS week_planner_analytics (
  analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'view', 'add_item', 'edit_item', 'delete_item', 'accept_suggestion', 'dismiss_suggestion', 'booking_click'
  item_type TEXT, -- 'dining', 'activity', 'beach', 'event', 'custom'
  offering_id INTEGER,
  metadata TEXT, -- JSON for additional context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stay_plans_guest ON guest_stay_plans(guest_id);
CREATE INDEX IF NOT EXISTS idx_stay_plans_property ON guest_stay_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_timeline_items_plan ON timeline_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_timeline_items_date ON timeline_items(item_date);
CREATE INDEX IF NOT EXISTS idx_timeline_items_status ON timeline_items(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_plan ON timeline_suggestions(plan_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_accepted ON timeline_suggestions(is_accepted);
CREATE INDEX IF NOT EXISTS idx_analytics_guest ON week_planner_analytics(guest_id);
CREATE INDEX IF NOT EXISTS idx_analytics_action ON week_planner_analytics(action_type);
