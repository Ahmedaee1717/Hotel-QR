-- Add À La Carte voucher settings to tier configuration
-- This allows admins to configure which tiers get à la carte vouchers and how many

ALTER TABLE all_inclusive_tiers ADD COLUMN alacarte_meals_per_stay INTEGER DEFAULT 0;
-- Number of à la carte meals included (0 = not eligible)

ALTER TABLE all_inclusive_tiers ADD COLUMN alacarte_eligible_restaurants TEXT;
-- JSON array of restaurant offering_ids: ["2","3"] or null for all à la carte restaurants

ALTER TABLE all_inclusive_tiers ADD COLUMN alacarte_premium_surcharge REAL DEFAULT 0;
-- Extra charge for premium items (0 = included, or price per premium item)

-- Example tier settings:
-- Basic Tier: 0 meals (not eligible)
-- Premium Tier: 2 meals per stay, restaurants [2,3], no premium surcharge
-- VIP Tier: 4 meals per stay, all restaurants, premium included
