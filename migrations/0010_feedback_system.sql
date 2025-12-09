-- Feedback Forms Table
CREATE TABLE IF NOT EXISTS feedback_forms (
  form_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  form_name TEXT NOT NULL,
  form_description TEXT,
  form_type TEXT DEFAULT 'feedback', -- 'feedback', 'survey', 'complaint'
  is_active INTEGER DEFAULT 1,
  require_room_number INTEGER DEFAULT 0,
  require_guest_name INTEGER DEFAULT 0,
  require_email INTEGER DEFAULT 0,
  require_phone INTEGER DEFAULT 0,
  thank_you_message TEXT DEFAULT 'Thank you for your feedback!',
  qr_code_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Feedback Form Questions Table
CREATE TABLE IF NOT EXISTS feedback_questions (
  question_id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'text', 'textarea', 'rating', 'scale', 'multiple_choice', 'yes_no', 'nps'
  is_required INTEGER DEFAULT 1,
  options TEXT, -- JSON array for multiple choice options
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES feedback_forms(form_id) ON DELETE CASCADE
);

-- Feedback Submissions Table
CREATE TABLE IF NOT EXISTS feedback_submissions (
  submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  room_number TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  submission_source TEXT DEFAULT 'web', -- 'web', 'chatbot', 'qr'
  session_id TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sentiment_score REAL, -- -1 to 1 (negative to positive)
  sentiment_label TEXT, -- 'positive', 'neutral', 'negative', 'urgent'
  is_urgent INTEGER DEFAULT 0,
  is_read INTEGER DEFAULT 0,
  admin_notes TEXT,
  FOREIGN KEY (form_id) REFERENCES feedback_forms(form_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Feedback Answers Table
CREATE TABLE IF NOT EXISTS feedback_answers (
  answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer_text TEXT,
  answer_numeric REAL, -- For ratings, scales, NPS
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES feedback_submissions(submission_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES feedback_questions(question_id)
);

-- AI Insights Table
CREATE TABLE IF NOT EXISTS feedback_insights (
  insight_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  submission_id INTEGER,
  insight_type TEXT NOT NULL, -- 'urgent', 'trend', 'recommendation', 'alert'
  title TEXT NOT NULL,
  description TEXT,
  action_suggested TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (submission_id) REFERENCES feedback_submissions(submission_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_forms_property ON feedback_forms(property_id);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_form ON feedback_questions(form_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_form ON feedback_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_property ON feedback_submissions(property_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_urgent ON feedback_submissions(is_urgent, is_read);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_submission ON feedback_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_feedback_insights_property ON feedback_insights(property_id);
CREATE INDEX IF NOT EXISTS idx_feedback_insights_priority ON feedback_insights(priority, is_resolved);
