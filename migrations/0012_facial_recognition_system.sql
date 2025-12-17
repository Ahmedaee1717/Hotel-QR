-- Migration: Facial Recognition System for All-Inclusive Digital Passes
-- Purpose: Add facial recognition capabilities to prevent pass fraud and sharing
-- Date: 2025-12-17

-- Add face embedding storage to digital passes
ALTER TABLE digital_passes ADD COLUMN face_embedding TEXT;
ALTER TABLE digital_passes ADD COLUMN face_embedding_version TEXT DEFAULT 'face-api-v1';
ALTER TABLE digital_passes ADD COLUMN face_photo_url TEXT;
ALTER TABLE digital_passes ADD COLUMN face_enrolled_at DATETIME;

-- Update pass verifications to track verification method
ALTER TABLE pass_verifications ADD COLUMN verification_method TEXT DEFAULT 'qr';
-- Possible values: 'qr', 'face', 'qr+face'

ALTER TABLE pass_verifications ADD COLUMN face_match_score REAL;
-- Score 0.0-1.0, where 1.0 = perfect match

ALTER TABLE pass_verifications ADD COLUMN face_verification_status TEXT;
-- Possible values: 'matched', 'no_match', 'manual_override', 'skipped'

-- Add family member face recognition support
ALTER TABLE pass_family_members ADD COLUMN face_embedding TEXT;
ALTER TABLE pass_family_members ADD COLUMN face_photo_url TEXT;
ALTER TABLE pass_family_members ADD COLUMN face_enrolled_at DATETIME;

-- Create face recognition settings table
CREATE TABLE IF NOT EXISTS face_recognition_settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    
    -- Feature flags
    face_recognition_enabled INTEGER DEFAULT 0,
    require_face_for_vip INTEGER DEFAULT 0,
    require_face_for_premium INTEGER DEFAULT 0,
    
    -- Matching thresholds
    match_threshold REAL DEFAULT 0.6,
    -- 0.6 = 60% confidence required for match
    
    manual_review_threshold REAL DEFAULT 0.5,
    -- 0.5-0.6 = requires manual staff review
    
    -- Privacy settings
    auto_delete_after_checkout INTEGER DEFAULT 1,
    retain_embeddings_days INTEGER DEFAULT 0,
    
    -- Face recognition provider
    provider TEXT DEFAULT 'face-api-js',
    -- Options: 'face-api-js', 'aws-rekognition', 'azure-face', 'google-vision'
    
    provider_config TEXT,
    -- JSON config for cloud providers (API keys, regions, etc.)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Create fraud alerts table for failed face verifications
CREATE TABLE IF NOT EXISTS face_verification_fraud_alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    pass_id INTEGER,
    
    -- Alert details
    alert_type TEXT NOT NULL,
    -- 'face_mismatch', 'multiple_attempts', 'suspicious_pattern'
    
    severity TEXT DEFAULT 'medium',
    -- 'low', 'medium', 'high', 'critical'
    
    attempted_location TEXT,
    attempted_by_staff TEXT,
    
    -- Face comparison details
    stored_face_url TEXT,
    captured_face_url TEXT,
    match_score REAL,
    
    -- Pass details at time of alert
    pass_reference TEXT,
    guest_name TEXT,
    room_number TEXT,
    tier_code TEXT,
    
    -- Resolution
    alert_status TEXT DEFAULT 'pending',
    -- 'pending', 'investigating', 'resolved', 'false_positive'
    
    resolved_at DATETIME,
    resolved_by TEXT,
    resolution_notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (property_id) REFERENCES properties(property_id),
    FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id)
);

-- Create index for faster fraud alert queries
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_property ON face_verification_fraud_alerts(property_id, alert_status, created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_pass ON face_verification_fraud_alerts(pass_id);

-- Insert default settings for property 1
INSERT INTO face_recognition_settings (property_id, face_recognition_enabled, match_threshold, manual_review_threshold)
VALUES (1, 1, 0.6, 0.5)
ON CONFLICT DO NOTHING;

-- Comments for documentation
-- face_embedding: JSON array of 128 face descriptor values from face-api.js
-- face_embedding_version: Tracks which model version generated the embedding (for future upgrades)
-- verification_method: Tracks how the guest was verified (QR only, Face only, or both)
-- face_match_score: 0.0-1.0 confidence score (higher = better match)
-- match_threshold: Minimum score required for automatic approval (default 0.6 = 60%)
-- manual_review_threshold: Score below this triggers staff review (default 0.5 = 50%)
