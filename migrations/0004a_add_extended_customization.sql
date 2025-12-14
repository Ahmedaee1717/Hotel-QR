-- Add extended customization columns to properties table
ALTER TABLE properties ADD COLUMN tagline TEXT;
ALTER TABLE properties ADD COLUMN hero_image_effect TEXT DEFAULT 'none';
ALTER TABLE properties ADD COLUMN hero_overlay_opacity INTEGER DEFAULT 30;
