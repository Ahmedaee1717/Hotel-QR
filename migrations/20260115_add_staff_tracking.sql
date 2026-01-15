-- Migration: Add staff tracking to alacarte_vouchers
-- Purpose: Track which front-desk staff member created each booking for upsell incentives

-- Add created_by_staff_id column to track staff member
ALTER TABLE alacarte_vouchers 
ADD COLUMN created_by_staff_id INTEGER REFERENCES users(user_id);

-- Create index for staff performance queries
CREATE INDEX IF NOT EXISTS idx_alacarte_vouchers_staff 
ON alacarte_vouchers(created_by_staff_id);

-- Create index for staff + date queries (for reporting)
CREATE INDEX IF NOT EXISTS idx_alacarte_vouchers_staff_date 
ON alacarte_vouchers(created_by_staff_id, reservation_date);
