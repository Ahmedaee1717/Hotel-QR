-- Test data to link venues to the "Snack at bar" benefit
-- This demonstrates the new many-to-many relationship

-- First, find the benefit_id for "Snack at bar"
-- Assuming it's benefit_id = 1 (adjust if needed)

-- Link multiple venues to this benefit
INSERT OR IGNORE INTO benefit_venues (benefit_id, venue_id, display_order, custom_cta_text)
VALUES 
  -- Link to Sunset Poolside Bar (offering_id = 4)
  (1, 4, 1, 'View Bar Menu'),
  
  -- Link to Azure Beach Grill (offering_id = 2)
  (1, 2, 2, 'View Restaurant'),
  
  -- Link to Le Jardin Fine Dining (offering_id = 3)
  (1, 3, 3, 'Explore Fine Dining');

-- Note: The benefit_id might be different in your database
-- To find the correct benefit_id, run:
-- SELECT benefit_id, benefit_title FROM tier_benefits WHERE benefit_title LIKE '%Snack%';
