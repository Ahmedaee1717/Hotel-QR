-- Create biometric_consent_signatures table for digital consent tracking
-- Required for GDPR Article 7 and BIPA Section 15 compliance
-- Stores guest signatures captured at front desk during face enrollment

CREATE TABLE IF NOT EXISTS biometric_consent_signatures (
  consent_id INTEGER PRIMARY KEY AUTOINCREMENT,
  pass_id INTEGER NOT NULL,
  property_id TEXT NOT NULL,
  signature_data TEXT NOT NULL, -- Base64 PNG of signature
  consent_language TEXT DEFAULT 'en', -- en, es, fr, de, zh
  consent_timestamp DATETIME NOT NULL,
  consent_given_by TEXT DEFAULT 'guest', -- 'guest' or 'guardian' (for minors)
  staff_witness_id TEXT, -- Email of staff member who witnessed consent
  consent_text_version TEXT DEFAULT 'v1.0', -- Version of consent text shown
  consent_withdrawn INTEGER DEFAULT 0,
  consent_withdrawn_at DATETIME,
  withdrawal_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_consent_pass ON biometric_consent_signatures(pass_id);
CREATE INDEX IF NOT EXISTS idx_consent_property ON biometric_consent_signatures(property_id);
CREATE INDEX IF NOT EXISTS idx_consent_timestamp ON biometric_consent_signatures(consent_timestamp);
CREATE INDEX IF NOT EXISTS idx_consent_withdrawn ON biometric_consent_signatures(consent_withdrawn, consent_withdrawn_at);

-- Add enrollment_staff_id column to digital_passes for tracking who performed enrollment
ALTER TABLE digital_passes ADD COLUMN enrollment_staff_id TEXT;
CREATE INDEX IF NOT EXISTS idx_enrollment_staff ON digital_passes(enrollment_staff_id);
