-- Migration: Add support for 9 languages (top Red Sea Egypt tourists)
-- Languages: English, Arabic, German, Russian, Polish, Italian, French, Czech, Ukrainian

-- Add language columns to hotel_offerings table
ALTER TABLE hotel_offerings ADD COLUMN title_de TEXT; -- German
ALTER TABLE hotel_offerings ADD COLUMN title_ru TEXT; -- Russian
ALTER TABLE hotel_offerings ADD COLUMN title_pl TEXT; -- Polish
ALTER TABLE hotel_offerings ADD COLUMN title_it TEXT; -- Italian
ALTER TABLE hotel_offerings ADD COLUMN title_fr TEXT; -- French
ALTER TABLE hotel_offerings ADD COLUMN title_cs TEXT; -- Czech
ALTER TABLE hotel_offerings ADD COLUMN title_uk TEXT; -- Ukrainian

ALTER TABLE hotel_offerings ADD COLUMN short_description_de TEXT;
ALTER TABLE hotel_offerings ADD COLUMN short_description_ru TEXT;
ALTER TABLE hotel_offerings ADD COLUMN short_description_pl TEXT;
ALTER TABLE hotel_offerings ADD COLUMN short_description_it TEXT;
ALTER TABLE hotel_offerings ADD COLUMN short_description_fr TEXT;
ALTER TABLE hotel_offerings ADD COLUMN short_description_cs TEXT;
ALTER TABLE hotel_offerings ADD COLUMN short_description_uk TEXT;

ALTER TABLE hotel_offerings ADD COLUMN full_description_de TEXT;
ALTER TABLE hotel_offerings ADD COLUMN full_description_ru TEXT;
ALTER TABLE hotel_offerings ADD COLUMN full_description_pl TEXT;
ALTER TABLE hotel_offerings ADD COLUMN full_description_it TEXT;
ALTER TABLE hotel_offerings ADD COLUMN full_description_fr TEXT;
ALTER TABLE hotel_offerings ADD COLUMN full_description_cs TEXT;
ALTER TABLE hotel_offerings ADD COLUMN full_description_uk TEXT;

-- Add language columns to vendor_activities table (if it exists)
-- ALTER TABLE vendor_activities ADD COLUMN title_de TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN title_ru TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN title_pl TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN title_it TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN title_fr TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN title_cs TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN title_uk TEXT;

-- ALTER TABLE vendor_activities ADD COLUMN short_description_de TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN short_description_ru TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN short_description_pl TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN short_description_it TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN short_description_fr TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN short_description_cs TEXT;
-- ALTER TABLE vendor_activities ADD COLUMN short_description_uk TEXT;

-- Add language columns to properties table for branding
ALTER TABLE properties ADD COLUMN tagline_de TEXT;
ALTER TABLE properties ADD COLUMN tagline_ru TEXT;
ALTER TABLE properties ADD COLUMN tagline_pl TEXT;
ALTER TABLE properties ADD COLUMN tagline_it TEXT;
ALTER TABLE properties ADD COLUMN tagline_fr TEXT;
ALTER TABLE properties ADD COLUMN tagline_cs TEXT;
ALTER TABLE properties ADD COLUMN tagline_uk TEXT;
