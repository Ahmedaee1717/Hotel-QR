-- Add custom dining privileges message for tiers
-- This allows admins to customize the message shown to guests when they have à la carte dining

ALTER TABLE all_inclusive_tiers ADD COLUMN alacarte_privileges_message TEXT;

-- Set default message for existing tiers
UPDATE all_inclusive_tiers 
SET alacarte_privileges_message = 'As a valued {tier_name} member, you have {remaining_meals} {meal_text} included in your stay. Simply select your preferred restaurant below and reserve your table. Your meal will be charged to your all-inclusive package.'
WHERE alacarte_meals_per_stay > 0;
