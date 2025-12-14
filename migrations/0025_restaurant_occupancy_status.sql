-- Add manual occupancy status for restaurants
ALTER TABLE hotel_offerings ADD COLUMN occupancy_status TEXT DEFAULT 'moderate';
ALTER TABLE hotel_offerings ADD COLUMN occupancy_status_updated_at DATETIME;
ALTER TABLE hotel_offerings ADD COLUMN occupancy_status_updated_by TEXT;
