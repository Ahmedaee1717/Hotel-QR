-- Add linked_venues column to tier_benefits table
ALTER TABLE tier_benefits ADD COLUMN linked_venues TEXT;

-- This column will store a JSON array of venue objects
-- Example: [{"id": 1, "name": "Lobby Bar", "type": "bar", "cta": "View Details"}]
