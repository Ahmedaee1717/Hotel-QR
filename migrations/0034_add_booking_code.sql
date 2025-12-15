-- Add booking_code column to beach_bookings for easier check-in
ALTER TABLE beach_bookings ADD COLUMN booking_code TEXT;
CREATE INDEX idx_beach_bookings_code ON beach_bookings(booking_code);
