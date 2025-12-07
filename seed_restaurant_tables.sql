-- Seed data for restaurant tables and scheduling

-- ====================================
-- SUNRISE BREAKFAST BUFFET (Offering ID: 1)
-- ====================================

-- Create tables for breakfast buffet (large open seating area)
INSERT INTO restaurant_tables (offering_id, table_number, table_name, capacity, position_x, position_y, width, height, shape, table_type, features) VALUES
-- Window section (6 tables)
(1, 'W1', 'Window Table 1', 4, 50, 100, 120, 80, 'rectangle', 'standard', '["window_view"]'),
(1, 'W2', 'Window Table 2', 4, 200, 100, 120, 80, 'rectangle', 'standard', '["window_view"]'),
(1, 'W3', 'Window Table 3', 6, 350, 100, 140, 90, 'rectangle', 'standard', '["window_view", "family_friendly"]'),
(1, 'W4', 'Window Table 4', 4, 520, 100, 120, 80, 'rectangle', 'standard', '["window_view"]'),
(1, 'W5', 'Window Table 5', 2, 670, 100, 100, 70, 'square', 'standard', '["window_view", "couples"]'),
(1, 'W6', 'Window Table 6', 2, 800, 100, 100, 70, 'square', 'standard', '["window_view", "couples"]'),

-- Center section (8 tables)
(1, 'C1', 'Center Table 1', 4, 50, 250, 120, 80, 'rectangle', 'standard', '[]'),
(1, 'C2', 'Center Table 2', 4, 200, 250, 120, 80, 'rectangle', 'standard', '[]'),
(1, 'C3', 'Center Table 3', 8, 350, 250, 160, 120, 'rectangle', 'standard', '["family_friendly", "highchair_available"]'),
(1, 'C4', 'Center Table 4', 4, 540, 250, 120, 80, 'rectangle', 'standard', '[]'),
(1, 'C5', 'Center Table 5', 6, 50, 400, 140, 90, 'rectangle', 'standard', '["family_friendly"]'),
(1, 'C6', 'Center Table 6', 6, 220, 400, 140, 90, 'rectangle', 'standard', '["family_friendly"]'),
(1, 'C7', 'Center Table 7', 4, 390, 400, 120, 80, 'rectangle', 'standard', '[]'),
(1, 'C8', 'Center Table 8', 4, 540, 400, 120, 80, 'rectangle', 'standard', '[]'),

-- Quiet corner (4 tables)
(1, 'Q1', 'Quiet Corner 1', 2, 720, 250, 100, 70, 'square', 'standard', '["quiet"]'),
(1, 'Q2', 'Quiet Corner 2', 2, 820, 250, 100, 70, 'square', 'standard', '["quiet"]'),
(1, 'Q3', 'Quiet Corner 3', 2, 720, 360, 100, 70, 'square', 'standard', '["quiet"]'),
(1, 'Q4', 'Quiet Corner 4', 2, 820, 360, 100, 70, 'square', 'standard', '["quiet"]');

-- ====================================
-- AZURE BEACH GRILL (Offering ID: 2)
-- ====================================

-- Beachfront tables
INSERT INTO restaurant_tables (offering_id, table_number, table_name, capacity, position_x, position_y, width, height, shape, table_type, features) VALUES
-- Beachfront premium (6 tables)
(2, 'BF1', 'Beachfront 1', 2, 50, 80, 100, 70, 'circle', 'outdoor', '["beachfront", "couples", "sunset_view"]'),
(2, 'BF2', 'Beachfront 2', 2, 180, 80, 100, 70, 'circle', 'outdoor', '["beachfront", "couples", "sunset_view"]'),
(2, 'BF3', 'Beachfront 3', 4, 310, 80, 120, 80, 'rectangle', 'outdoor', '["beachfront", "sunset_view"]'),
(2, 'BF4', 'Beachfront 4', 4, 460, 80, 120, 80, 'rectangle', 'outdoor', '["beachfront", "sunset_view"]'),
(2, 'BF5', 'Beachfront 5', 2, 610, 80, 100, 70, 'circle', 'outdoor', '["beachfront", "couples", "sunset_view"]'),
(2, 'BF6', 'Beachfront 6', 2, 740, 80, 100, 70, 'circle', 'outdoor', '["beachfront", "couples", "sunset_view"]'),

-- Covered terrace (6 tables)
(2, 'T1', 'Terrace 1', 4, 50, 220, 120, 80, 'rectangle', 'outdoor', '["covered"]'),
(2, 'T2', 'Terrace 2', 4, 200, 220, 120, 80, 'rectangle', 'outdoor', '["covered"]'),
(2, 'T3', 'Terrace 3', 6, 350, 220, 140, 90, 'rectangle', 'outdoor', '["covered", "family_friendly"]'),
(2, 'T4', 'Terrace 4', 4, 520, 220, 120, 80, 'rectangle', 'outdoor', '["covered"]'),
(2, 'T5', 'Terrace 5', 2, 670, 220, 100, 70, 'square', 'outdoor', '["covered", "couples"]'),
(2, 'T6', 'Terrace 6', 2, 800, 220, 100, 70, 'square', 'outdoor', '["covered", "couples"]');

-- ====================================
-- LE JARDIN FINE DINING (Offering ID: 3)
-- ====================================

-- Intimate fine dining setup
INSERT INTO restaurant_tables (offering_id, table_number, table_name, capacity, position_x, position_y, width, height, shape, table_type, features) VALUES
-- VIP section (4 tables)
(3, 'V1', 'VIP Table 1', 2, 100, 100, 110, 75, 'circle', 'vip', '["private", "couples", "romantic"]'),
(3, 'V2', 'VIP Table 2', 2, 250, 100, 110, 75, 'circle', 'vip', '["private", "couples", "romantic"]'),
(3, 'V3', 'VIP Table 3', 4, 400, 100, 130, 90, 'rectangle', 'vip', '["private", "garden_view"]'),
(3, 'V4', 'VIP Table 4', 2, 560, 100, 110, 75, 'circle', 'vip', '["private", "couples", "romantic"]'),

-- Garden view (6 tables)
(3, 'G1', 'Garden View 1', 2, 100, 250, 100, 70, 'circle', 'standard', '["garden_view", "couples"]'),
(3, 'G2', 'Garden View 2', 2, 230, 250, 100, 70, 'circle', 'standard', '["garden_view", "couples"]'),
(3, 'G3', 'Garden View 3', 4, 360, 250, 120, 80, 'rectangle', 'standard', '["garden_view"]'),
(3, 'G4', 'Garden View 4', 4, 510, 250, 120, 80, 'rectangle', 'standard', '["garden_view"]'),
(3, 'G5', 'Garden View 5', 2, 660, 250, 100, 70, 'circle', 'standard', '["garden_view", "couples"]'),
(3, 'G6', 'Garden View 6', 2, 790, 250, 100, 70, 'circle', 'standard', '["garden_view", "couples"]'),

-- Chef's table (special)
(3, 'CT', "Chef's Table", 6, 300, 400, 200, 100, 'rectangle', 'vip', '["chefs_table", "exclusive", "kitchen_view"]');

-- ====================================
-- SESSION TEMPLATES (Recurring Schedules)
-- ====================================

-- Sunrise Breakfast Buffet - Daily 6:00-10:30 (30-minute slots)
INSERT INTO session_templates (offering_id, template_name, day_of_week, session_type, start_time, end_time, slot_interval_minutes, slot_duration_minutes) VALUES
(1, 'Daily Breakfast Service', NULL, 'breakfast', '06:00', '10:30', 30, 90);

-- Azure Beach Grill - Daily lunch 12:00-16:00 (30-minute slots)
INSERT INTO session_templates (offering_id, template_name, day_of_week, session_type, start_time, end_time, slot_interval_minutes, slot_duration_minutes) VALUES
(2, 'Daily Lunch Service', NULL, 'lunch', '12:00', '16:00', 30, 120);

-- Le Jardin - Dinner except Monday 18:00-22:00 (15-minute slots)
INSERT INTO session_templates (offering_id, template_name, day_of_week, session_type, start_time, end_time, slot_interval_minutes, slot_duration_minutes) VALUES
(3, 'Sunday Dinner', 0, 'dinner', '18:00', '22:00', 15, 150),
(3, 'Tuesday Dinner', 2, 'dinner', '18:00', '22:00', 15, 150),
(3, 'Wednesday Dinner', 3, 'dinner', '18:00', '22:00', 15, 150),
(3, 'Thursday Dinner', 4, 'dinner', '18:00', '22:00', 15, 150),
(3, 'Friday Dinner', 5, 'dinner', '18:00', '22:00', 15, 150),
(3, 'Saturday Dinner', 6, 'dinner', '18:00', '22:00', 15, 150);

-- ====================================
-- SAMPLE DINING SESSIONS FOR NEXT 7 DAYS
-- ====================================

-- Generate sample sessions for today and tomorrow
-- Breakfast at Sunrise Buffet
INSERT INTO dining_sessions (offering_id, session_date, session_time, session_type, duration_minutes, max_capacity, status) VALUES
(1, date('now'), '06:00', 'breakfast', 90, 80, 'available'),
(1, date('now'), '06:30', 'breakfast', 90, 80, 'available'),
(1, date('now'), '07:00', 'breakfast', 90, 80, 'available'),
(1, date('now'), '07:30', 'breakfast', 90, 80, 'available'),
(1, date('now'), '08:00', 'breakfast', 90, 80, 'available'),
(1, date('now'), '08:30', 'breakfast', 90, 80, 'available'),
(1, date('now'), '09:00', 'breakfast', 90, 80, 'available'),
(1, date('now'), '09:30', 'breakfast', 90, 80, 'available'),
(1, date('now'), '10:00', 'breakfast', 90, 80, 'available'),

-- Tomorrow's breakfast
(1, date('now', '+1 day'), '06:00', 'breakfast', 90, 80, 'available'),
(1, date('now', '+1 day'), '07:00', 'breakfast', 90, 80, 'available'),
(1, date('now', '+1 day'), '08:00', 'breakfast', 90, 80, 'available'),
(1, date('now', '+1 day'), '09:00', 'breakfast', 90, 80, 'available'),

-- Lunch at Beach Grill (today)
(2, date('now'), '12:00', 'lunch', 120, 40, 'available'),
(2, date('now'), '12:30', 'lunch', 120, 40, 'available'),
(2, date('now'), '13:00', 'lunch', 120, 40, 'available'),
(2, date('now'), '13:30', 'lunch', 120, 40, 'available'),
(2, date('now'), '14:00', 'lunch', 120, 40, 'available'),

-- Dinner at Le Jardin (today)
(3, date('now'), '18:00', 'dinner', 150, 30, 'available'),
(3, date('now'), '19:00', 'dinner', 150, 30, 'available'),
(3, date('now'), '20:00', 'dinner', 150, 30, 'available'),
(3, date('now'), '21:00', 'dinner', 150, 30, 'available');
