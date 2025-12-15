-- Add enable_booking column to hotel_offerings for restaurant booking control
ALTER TABLE hotel_offerings ADD COLUMN enable_booking INTEGER DEFAULT 1;

-- Enable booking for all existing restaurants
UPDATE hotel_offerings SET enable_booking = 1 WHERE offering_type = 'restaurant';
