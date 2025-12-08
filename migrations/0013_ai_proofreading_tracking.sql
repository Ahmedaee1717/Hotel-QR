-- AI Proofreading Rate Limiting Table
-- Tracks proofreading usage per user to enforce daily limits

CREATE TABLE IF NOT EXISTS ai_proofreading_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'vendor')),
    request_count INTEGER DEFAULT 0,
    last_request_time DATETIME,
    usage_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, user_type, usage_date)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proofreading_user_date ON ai_proofreading_usage(user_id, user_type, usage_date);

-- Table to log all proofreading requests for analytics
CREATE TABLE IF NOT EXISTS ai_proofreading_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'vendor')),
    original_text TEXT NOT NULL,
    proofread_text TEXT NOT NULL,
    text_length INTEGER NOT NULL,
    model_used TEXT DEFAULT 'gpt-5-nano',
    processing_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_proofreading_logs_date ON ai_proofreading_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_proofreading_logs_user ON ai_proofreading_logs(user_id, user_type);
