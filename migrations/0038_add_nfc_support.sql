-- Add NFC support to digital passes
ALTER TABLE digital_passes ADD COLUMN nfc_id TEXT UNIQUE;
ALTER TABLE digital_passes ADD COLUMN nfc_enabled INTEGER DEFAULT 1;
ALTER TABLE digital_passes ADD COLUMN nfc_last_used DATETIME;

-- Create NFC verification log table
CREATE TABLE IF NOT EXISTS nfc_verifications (
  verification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  pass_id INTEGER NOT NULL,
  nfc_id TEXT NOT NULL,
  verification_location TEXT,
  verified_by INTEGER,
  verification_result TEXT DEFAULT 'success',
  device_info TEXT,
  verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_nfc_verifications_pass ON nfc_verifications(pass_id);
CREATE INDEX IF NOT EXISTS idx_nfc_verifications_nfc_id ON nfc_verifications(nfc_id);
CREATE INDEX IF NOT EXISTS idx_nfc_verifications_date ON nfc_verifications(verified_at);

-- Add NFC to pass_verifications table for unified tracking
ALTER TABLE pass_verifications ADD COLUMN verification_method TEXT DEFAULT 'qr';
-- verification_method can be: 'qr', 'face', 'nfc', 'manual'
