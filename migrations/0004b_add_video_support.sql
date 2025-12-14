-- Add video_url field to activities table
ALTER TABLE activities ADD COLUMN video_url TEXT;

-- Add video_url field to hotel_offerings table
ALTER TABLE hotel_offerings ADD COLUMN video_url TEXT;
