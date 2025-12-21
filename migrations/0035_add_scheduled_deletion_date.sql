-- Add scheduled_deletion_date column to digital_passes table
-- This column stores when biometric data should be auto-deleted (24h after checkout)
-- Used for GDPR/BIPA compliance

-- ALTER TABLE digital_passes ADD COLUMN scheduled_deletion_date DATETIME;

-- Create index for efficient auto-deletion queries
CREATE INDEX IF NOT EXISTS idx_scheduled_deletion ON digital_passes(scheduled_deletion_date) 
WHERE scheduled_deletion_date IS NOT NULL AND (face_embedding IS NOT NULL OR face_photo_url IS NOT NULL);
