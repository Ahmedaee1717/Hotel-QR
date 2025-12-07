-- Add layout and design customization columns to properties table
ALTER TABLE properties ADD COLUMN layout_style TEXT DEFAULT 'modern';
ALTER TABLE properties ADD COLUMN hero_image_url TEXT;
ALTER TABLE properties ADD COLUMN accent_color TEXT DEFAULT '#F59E0B';
ALTER TABLE properties ADD COLUMN font_family TEXT DEFAULT 'inter';
ALTER TABLE properties ADD COLUMN button_style TEXT DEFAULT 'rounded';
ALTER TABLE properties ADD COLUMN card_style TEXT DEFAULT 'shadow';
ALTER TABLE properties ADD COLUMN header_style TEXT DEFAULT 'transparent';
