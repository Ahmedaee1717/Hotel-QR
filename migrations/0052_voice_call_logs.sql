-- Voice Call Logs Table
-- Stores transcripts and metadata from AI voice assistant calls

CREATE TABLE IF NOT EXISTS voice_call_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_reference TEXT,
  guest_name TEXT,
  room_number TEXT,
  service_type_id INTEGER,
  transcript TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  call_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(service_type_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_call_logs_property ON voice_call_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_timestamp ON voice_call_logs(call_timestamp);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_pass ON voice_call_logs(pass_reference);
