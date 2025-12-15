-- Add room_number column to guests table for easy reference
ALTER TABLE guests ADD COLUMN room_number TEXT;

-- Add room_number column to table_reservations for quick lookup
ALTER TABLE table_reservations ADD COLUMN room_number TEXT;

-- Create index for faster room number searches
CREATE INDEX IF NOT EXISTS idx_table_reservations_room_number ON table_reservations(room_number);
CREATE INDEX IF NOT EXISTS idx_guests_room_number ON guests(room_number);
