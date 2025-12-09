-- Chat Feedback System - AI-powered feedback extraction from conversations
-- This table stores feedback/complaints detected by AI in chatbot conversations

CREATE TABLE IF NOT EXISTS chat_feedback (
  feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  conversation_id INTEGER,
  guest_message TEXT NOT NULL,
  bot_response TEXT,
  
  -- AI Analysis
  sentiment_label TEXT, -- 'positive', 'negative', 'complaint', 'urgent'
  sentiment_score REAL, -- -1 to 1
  is_complaint INTEGER DEFAULT 0,
  is_urgent INTEGER DEFAULT 0,
  
  -- Structured Feedback (AI-extracted)
  complaint_category TEXT, -- 'room', 'service', 'food', 'staff', 'cleanliness', 'amenities', 'other'
  complaint_summary TEXT, -- AI-generated summary
  guest_name TEXT,
  room_number TEXT,
  issue_description TEXT, -- What went wrong
  guest_expectation TEXT, -- What guest expected
  suggested_resolution TEXT, -- What guest wants
  
  -- Metadata
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_resolved INTEGER DEFAULT 0,
  admin_notes TEXT,
  resolved_at DATETIME,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(conversation_id)
);

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_chat_feedback_property ON chat_feedback(property_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_urgent ON chat_feedback(property_id, is_urgent);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_unresolved ON chat_feedback(property_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_category ON chat_feedback(complaint_category);
