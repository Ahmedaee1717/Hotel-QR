-- Migration: Add service section support
-- Add show_service column to properties table

ALTER TABLE properties ADD COLUMN show_service INTEGER DEFAULT 1;

-- Update existing section orders to include service section
UPDATE properties 
SET homepage_section_order = '["restaurants","events","spa","service","activities"]' 
WHERE homepage_section_order = '["restaurants","events","spa","activities"]' 
OR homepage_section_order IS NULL;
