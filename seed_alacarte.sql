-- Sample Data for À La Carte Voucher System

-- 1. Configure tier limits for existing tiers
-- Gold Tier (tier_id=1): 2 meals, €50 limit
INSERT OR REPLACE INTO tier_alacarte_limits 
(limit_id, tier_id, meals_per_stay, max_cost_per_meal, eligible_restaurants, preorder_required, preorder_hours_before) 
VALUES 
(1, 1, 2, 50.00, '["*"]', 1, 4);

-- Silver Tier (tier_id=2): 1 meal, €30 limit (if exists)
INSERT OR IGNORE INTO tier_alacarte_limits 
(tier_id, meals_per_stay, max_cost_per_meal, eligible_restaurants, preorder_required, preorder_hours_before) 
VALUES 
(2, 1, 30.00, '["*"]', 1, 6);

-- Platinum/Ultra Tier (tier_id=3): Unlimited, no cost limit (if exists)
INSERT OR IGNORE INTO tier_alacarte_limits 
(tier_id, meals_per_stay, max_cost_per_meal, eligible_restaurants, preorder_required, preorder_hours_before) 
VALUES 
(3, 999, 999.00, '["*"]', 0, 2);

-- 2. Sample menu items for "Le Jardin" restaurant (offering_id from hotel_offerings)
-- Assuming Le Jardin has offering_id around 1-5, let's use offering_id=1

-- SALADS
INSERT INTO alacarte_menu_items 
(property_id, restaurant_id, category, item_name, description, cost_to_hotel, display_order) 
VALUES
(1, 1, 'salad', 'Caesar Salad', 'Classic romaine with parmesan and croutons', 6.00, 1),
(1, 1, 'salad', 'Greek Salad', 'Tomatoes, cucumber, feta, olives', 5.50, 2),
(1, 1, 'salad', 'Caprese Salad', 'Fresh mozzarella, tomatoes, basil', 7.00, 3);

-- STARTERS
INSERT INTO alacarte_menu_items 
(property_id, restaurant_id, category, item_name, description, cost_to_hotel, display_order) 
VALUES
(1, 1, 'starter', 'Shrimp Cocktail', 'Jumbo shrimp with cocktail sauce', 12.00, 1),
(1, 1, 'starter', 'Bruschetta', 'Toasted bread with tomatoes and basil', 5.00, 2),
(1, 1, 'starter', 'French Onion Soup', 'Rich beef broth with caramelized onions', 8.00, 3),
(1, 1, 'starter', 'Calamari Fritti', 'Crispy fried squid with aioli', 10.00, 4);

-- MAIN COURSES
INSERT INTO alacarte_menu_items 
(property_id, restaurant_id, category, item_name, description, cost_to_hotel, is_premium, display_order) 
VALUES
(1, 1, 'main', 'Grilled Ribeye Steak', '12oz prime ribeye with herb butter', 22.00, 1, 1),
(1, 1, 'main', 'Pan-Seared Sea Bass', 'Mediterranean sea bass with lemon', 18.00, 1, 2),
(1, 1, 'main', 'Lobster Thermidor', 'Whole lobster in creamy sauce', 35.00, 1, 3),
(1, 1, 'main', 'Chicken Piccata', 'Lemon caper sauce with angel hair', 12.00, 0, 4),
(1, 1, 'main', 'Mushroom Risotto', 'Creamy arborio rice with porcini', 8.00, 0, 5),
(1, 1, 'main', 'Grilled Salmon', 'Atlantic salmon with dill cream', 16.00, 0, 6);

-- DESSERTS
INSERT INTO alacarte_menu_items 
(property_id, restaurant_id, category, item_name, description, cost_to_hotel, display_order) 
VALUES
(1, 1, 'dessert', 'Tiramisu', 'Classic Italian coffee-soaked dessert', 6.00, 1),
(1, 1, 'dessert', 'Crème Brûlée', 'Vanilla custard with caramelized sugar', 7.00, 2),
(1, 1, 'dessert', 'Chocolate Lava Cake', 'Warm molten chocolate center', 8.00, 3),
(1, 1, 'dessert', 'Fresh Fruit Platter', 'Seasonal tropical fruits', 5.00, 4);

-- 3. Configure pre-order cutoff times
-- Le Jardin dinner service at 7:30 PM, must order by 3:30 PM (4 hours before)
INSERT INTO alacarte_preorder_cutoffs 
(property_id, restaurant_id, meal_service, service_time, cutoff_hours_before) 
VALUES
(1, 1, 'dinner', '19:30', 4),
(1, 1, 'lunch', '13:00', 4);
