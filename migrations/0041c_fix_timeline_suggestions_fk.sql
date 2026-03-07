-- Fix timeline_suggestions foreign key to reference guest_stay_plans instead of guest_stay_plans_old
-- This is a follow-up to 0041_fix_my_perfect_week_fk.sql

-- Drop the old table
DROP TABLE IF EXISTS timeline_suggestions;

-- Recreate with correct foreign key
CREATE TABLE timeline_suggestions (
  suggestion_id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  offering_id INTEGER NOT NULL,
  suggested_date DATE NOT NULL,
  suggested_time TIME NOT NULL,
  reason_code TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 50,
  is_dismissed BOOLEAN DEFAULT 0,
  is_accepted BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES guest_stay_plans(plan_id) ON DELETE CASCADE,
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id) ON DELETE CASCADE
);

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_suggestions_plan ON timeline_suggestions(plan_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_accepted ON timeline_suggestions(is_accepted);
