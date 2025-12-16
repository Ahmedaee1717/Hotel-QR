-- Migration: Add check-in tracking to beach bookings
-- Date: 2025-12-16
-- Purpose: Track staff member who checked in each beach booking

ALTER TABLE beach_bookings ADD COLUMN checked_in_by TEXT;

-- This column stores the name of the staff member who performed the check-in
-- Used by: /api/staff/beach/check-in endpoint
-- Security: Only accessible with 'beach_checkin' permission
