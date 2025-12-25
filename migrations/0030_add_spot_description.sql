-- Add description field to beach_spots for admin notes like "Premium spot requires extra charge"
ALTER TABLE beach_spots ADD COLUMN spot_description TEXT;
