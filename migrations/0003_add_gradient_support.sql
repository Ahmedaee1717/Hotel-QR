-- Add gradient support to properties table
ALTER TABLE properties ADD COLUMN use_gradient INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN gradient_direction TEXT DEFAULT '135deg';
