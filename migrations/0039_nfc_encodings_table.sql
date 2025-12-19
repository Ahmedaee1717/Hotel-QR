-- Migration: NFC Encodings Audit Log
-- Purpose: Track all NFC wristband encoding activities for audit and troubleshooting
-- Date: 2025-12-19

-- Create nfc_encodings table to log all encoding attempts
CREATE TABLE IF NOT EXISTS nfc_encodings (
  encoding_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  pass_id INTEGER NOT NULL,
  nfc_id TEXT NOT NULL,
  staff_name TEXT,
  device_info TEXT,
  encoding_result TEXT DEFAULT 'success', -- 'success' or 'failed'
  error_message TEXT,
  encoded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_nfc_encodings_property ON nfc_encodings(property_id);
CREATE INDEX IF NOT EXISTS idx_nfc_encodings_pass ON nfc_encodings(pass_id);
CREATE INDEX IF NOT EXISTS idx_nfc_encodings_date ON nfc_encodings(encoded_at DESC);
