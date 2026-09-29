-- Voice concierge (OpenAI Realtime over WebRTC): per-call log for caps and cost, and a channel marker on chat messages.
-- Additive only. Applied to production D1 (webapp-production) on 2026-09-29.
CREATE TABLE IF NOT EXISTS voice_sessions (
  voice_session_id TEXT PRIMARY KEY,
  property_id      INTEGER NOT NULL,
  conversation_id  INTEGER,
  session_id       TEXT,                       -- the guest chat session id
  model            TEXT,
  voice            TEXT,
  lang             TEXT,
  ip               TEXT,
  started_at       TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at         TEXT,
  seconds          INTEGER,
  guest_turns      INTEGER NOT NULL DEFAULT 0,
  ai_turns         INTEGER NOT NULL DEFAULT 0,
  ended_reason     TEXT
);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_started ON voice_sessions(property_id, started_at);
ALTER TABLE chatbot_messages ADD COLUMN channel TEXT;   -- 'voice' for spoken turns, NULL for typed
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES ('voice_enabled', '1', 'Guest voice concierge (talk to the AI) on/off');
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES ('voice_model', 'gpt-realtime-2.1-mini', 'OpenAI Realtime model for the voice concierge');
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES ('voice_daily_minutes', '300', 'Voice concierge: max talk minutes per day (all guests)');
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES ('voice_max_session_seconds', '300', 'Voice concierge: max length of one call');
