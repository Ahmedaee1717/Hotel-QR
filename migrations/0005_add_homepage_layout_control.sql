-- Add homepage layout control and hotel map
ALTER TABLE properties ADD COLUMN hotel_map_url TEXT;
ALTER TABLE properties ADD COLUMN homepage_section_order TEXT DEFAULT '["restaurants","events","spa","activities"]';
ALTER TABLE properties ADD COLUMN show_restaurants INTEGER DEFAULT 1;
ALTER TABLE properties ADD COLUMN show_events INTEGER DEFAULT 1;
ALTER TABLE properties ADD COLUMN show_spa INTEGER DEFAULT 1;
ALTER TABLE properties ADD COLUMN show_activities INTEGER DEFAULT 1;
ALTER TABLE properties ADD COLUMN show_hotel_map INTEGER DEFAULT 0;
