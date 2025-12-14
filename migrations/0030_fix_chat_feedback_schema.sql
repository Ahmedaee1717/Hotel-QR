-- Fix chat_feedback table schema
-- Drop old table and recreate with correct structure

DROP TABLE IF EXISTS chat_feedback;

-- Recreate with correct schema
CREATE TABLE chat_feedback (
  feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  conversation_id INTEGER,
  guest_message TEXT NOT NULL,
  bot_response TEXT,
  
  -- AI Analysis
  sentiment_label TEXT,
  sentiment_score REAL,
  is_complaint INTEGER DEFAULT 0,
  is_urgent INTEGER DEFAULT 0,
  
  -- Structured Feedback (AI-extracted)
  complaint_category TEXT,
  complaint_summary TEXT,
  guest_name TEXT,
  room_number TEXT,
  issue_description TEXT,
  guest_expectation TEXT,
  suggested_resolution TEXT,
  
  -- Metadata
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_resolved INTEGER DEFAULT 0,
  admin_notes TEXT,
  resolved_at DATETIME,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(conversation_id)
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_chat_feedback_property ON chat_feedback(property_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_urgent ON chat_feedback(property_id, is_urgent);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_unresolved ON chat_feedback(property_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_category ON chat_feedback(complaint_category);
