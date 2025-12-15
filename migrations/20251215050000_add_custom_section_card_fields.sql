-- Add subtitle, description, and link_url fields to custom_sections for homepage cards

ALTER TABLE custom_sections ADD COLUMN subtitle_en TEXT;
ALTER TABLE custom_sections ADD COLUMN subtitle_ar TEXT;
ALTER TABLE custom_sections ADD COLUMN description_en TEXT;
ALTER TABLE custom_sections ADD COLUMN description_ar TEXT;
ALTER TABLE custom_sections ADD COLUMN link_url TEXT;
