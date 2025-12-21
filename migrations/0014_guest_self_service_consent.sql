-- Migration: Guest Self-Service Consent & Mobile Wallet Pass
-- Purpose: Allow guests to choose between Face Recognition or QR/Wallet Pass
-- Date: 2025-12-17
-- Compliance: GDPR/BIPA - Guest autonomy and choice

-- Add guest preference and consent fields
-- ALTER TABLE digital_passes ADD COLUMN verification_preference TEXT DEFAULT 'qr';
-- Possible values: 'face', 'qr', 'both'

-- ALTER TABLE digital_passes ADD COLUMN guest_consent_method TEXT;
-- How consent was obtained: 'check-in-kiosk', 'mobile-app', 'self-service-portal', 'staff-assisted'

-- ALTER TABLE digital_passes ADD COLUMN wallet_pass_generated INTEGER DEFAULT 0;
-- Flag to track if Apple Wallet / Google Pay pass has been generated

-- ALTER TABLE digital_passes ADD COLUMN wallet_pass_url TEXT;
-- URL to download the wallet pass (.pkpass for iOS, .json for Google Pay)

-- ALTER TABLE digital_passes ADD COLUMN guest_access_token TEXT;
-- Secure token for guest self-service portal (hashed)

-- ALTER TABLE digital_passes ADD COLUMN guest_portal_accessed_at DATETIME;
-- Last time guest accessed their self-service portal

-- ALTER TABLE digital_passes ADD COLUMN qr_code_displayed INTEGER DEFAULT 1;
-- Whether to show QR code (always enabled unless guest explicitly requests face-only)

-- Create guest consent change log
CREATE TABLE IF NOT EXISTS guest_consent_changes (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pass_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    
    -- What changed
    old_preference TEXT, -- 'face', 'qr', 'both'
    new_preference TEXT,
    
    -- Change details
    change_reason TEXT, -- 'initial_choice', 'guest_switched', 'consent_withdrawn', 'privacy_concern'
    changed_by TEXT DEFAULT 'guest', -- 'guest', 'staff', 'admin', 'automated'
    
    -- Compliance tracking
    ip_address TEXT,
    user_agent TEXT,
    consent_explicitly_given INTEGER DEFAULT 1,
    
    -- Timestamps
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_guest_consent_changes_pass ON guest_consent_changes(pass_id);
CREATE INDEX idx_guest_consent_changes_timestamp ON guest_consent_changes(changed_at);

-- Create wallet pass generation log
CREATE TABLE IF NOT EXISTS wallet_pass_generations (
    generation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pass_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    
    -- Pass details
    pass_type TEXT NOT NULL, -- 'apple_wallet', 'google_pay'
    pass_file_url TEXT,
    
    -- Generation metadata
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    downloaded_at DATETIME,
    revoked_at DATETIME,
    
    -- Tracking
    download_count INTEGER DEFAULT 0,
    last_verified_at DATETIME,
    
    FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
);

-- Create index for wallet pass lookups
CREATE INDEX idx_wallet_pass_pass ON wallet_pass_generations(pass_id);
CREATE INDEX idx_wallet_pass_type ON wallet_pass_generations(pass_type);

-- Update biometric_audit_log to track preference changes
-- (Already exists from 0013_biometric_gdpr_compliance.sql, no changes needed)

-- Add guest portal session tracking
CREATE TABLE IF NOT EXISTS guest_portal_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pass_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    
    -- Session details
    access_token TEXT NOT NULL, -- Hashed token
    session_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_expires_at DATETIME,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Actions performed
    actions_performed TEXT, -- JSON array of actions: ['viewed_pass', 'downloaded_wallet', 'withdrew_consent']
    
    -- Security
    ip_address TEXT,
    user_agent TEXT,
    
    FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
);

-- Create index for session lookups
CREATE INDEX idx_guest_portal_sessions_token ON guest_portal_sessions(access_token);
CREATE INDEX idx_guest_portal_sessions_pass ON guest_portal_sessions(pass_id);
