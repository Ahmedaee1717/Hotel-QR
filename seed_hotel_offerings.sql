-- Seed data for hotel offerings

-- Update property with QR code
UPDATE properties SET 
  qr_code_data = 'paradise-resort-main-qr',
  qr_code_url = '/hotel/paradise-resort'
WHERE property_id = 1;

-- Add restaurant offerings
INSERT INTO hotel_offerings (
  property_id, offering_type, title_en, title_ar,
  short_description_en, short_description_ar,
  full_description_en, images,
  price, currency, price_type,
  duration_minutes, capacity_per_slot, requires_booking,
  cuisine_type, meal_type, location, status, is_featured, display_order
) VALUES
-- Main Restaurant - Breakfast Buffet
(1, 'restaurant', 'Sunrise Breakfast Buffet', 'بوفيه الإفطار',
 'All-you-can-eat breakfast buffet', 'بوفيه إفطار مفتوح',
 'Start your day with our extensive breakfast buffet featuring international cuisine, fresh fruits, pastries, and made-to-order omelets.',
 '["https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800"]',
 25.00, 'USD', 'per_person',
 120, 100, 0,
 'international', 'breakfast', 'Main Restaurant - Ground Floor', 'active', 1, 1),

-- Beachside Restaurant - Lunch
(1, 'restaurant', 'Azure Beach Grill', 'مطعم أزور بيتش',
 'Mediterranean cuisine by the beach', 'مأكولات متوسطية على الشاطئ',
 'Enjoy fresh seafood and Mediterranean dishes with stunning ocean views. Perfect for a relaxing lunch experience.',
 '["https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800"]',
 45.00, 'USD', 'per_person',
 90, 40, 1,
 'mediterranean', 'lunch', 'Beachside Terrace', 'active', 1, 2),

-- Fine Dining - Dinner
(1, 'restaurant', 'Le Jardin Fine Dining', 'مطعم لو جاردان',
 'Exclusive fine dining experience', 'تجربة طعام فاخرة',
 'Our signature restaurant offering exquisite French-inspired cuisine in an elegant garden setting. Reservations required.',
 '["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"]',
 85.00, 'USD', 'per_person',
 150, 30, 1,
 'french', 'dinner', 'Garden Restaurant - 2nd Floor', 'active', 1, 3);

-- Add event offerings
INSERT INTO hotel_offerings (
  property_id, offering_type, title_en, title_ar,
  short_description_en, full_description_en,
  images, price, currency, price_type,
  duration_minutes, capacity_per_slot, requires_booking,
  event_date, event_start_time, event_end_time,
  is_recurring, location, dress_code, status, is_featured, display_order
) VALUES
-- Christmas Gala Dinner
(1, 'event', 'Christmas Gala Dinner 2025', 'عشاء الكريسماس الفاخر',
 'Festive celebration with live music', 
 'Join us for an unforgettable Christmas celebration featuring a 5-course gourmet menu, live jazz band, and spectacular decorations. Includes welcome champagne and festive entertainment.',
 '["https://images.unsplash.com/photo-1482575832494-771f74bf6857?w=800"]',
 150.00, 'USD', 'per_person',
 240, 80, 1,
 '2025-12-25', '19:00', '23:00',
 0, 'Grand Ballroom', 'formal', 'active', 1, 10),

-- Weekly Beach BBQ
(1, 'event', 'Friday Beach BBQ Night', 'ليلة الشواء على الشاطئ',
 'Weekly beach barbecue under the stars',
 'Every Friday evening, enjoy a lavish BBQ buffet on the beach with live entertainment, bonfire, and stunning sunset views.',
 '["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800"]',
 60.00, 'USD', 'per_person',
 180, 120, 1,
 NULL, '18:00', '21:00',
 1, 'Private Beach Area', 'casual', 'active', 1, 11),

-- New Year's Eve Celebration
(1, 'event', 'New Year''s Eve Celebration 2026', 'احتفال رأس السنة',
 'Ring in the new year with style',
 'Spectacular New Year''s Eve party featuring gourmet dinner, unlimited beverages, live DJ, fireworks display, and celebration until 2 AM.',
 '["https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800"]',
 250.00, 'USD', 'per_person',
 360, 150, 1,
 '2025-12-31', '20:00', '02:00',
 0, 'Rooftop Terrace', 'cocktail', 'active', 1, 12);

-- Add spa offerings  
INSERT INTO hotel_offerings (
  property_id, offering_type, title_en, title_ar,
  short_description_en, full_description_en,
  images, price, currency, price_type,
  duration_minutes, capacity_per_slot, requires_booking,
  location, status, display_order
) VALUES
(1, 'spa', 'Couples Massage Package', 'جلسة تدليك للأزواج',
 'Relaxing massage for two',
 'Indulge in a romantic couples massage experience with aromatherapy oils, followed by herbal tea in our relaxation lounge.',
 '["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800"]',
 180.00, 'USD', 'per_booking',
 90, 3, 1,
 'Serenity Spa - Pool Level', 'active', 20);

-- Add restaurant schedules
INSERT INTO offering_schedule (offering_id, day_of_week, start_time, end_time, slots_available, is_recurring)
VALUES
-- Breakfast buffet - Daily 6:00-10:30
(1, 0, '06:00', '10:30', 100, 1),
(1, 1, '06:00', '10:30', 100, 1),
(1, 2, '06:00', '10:30', 100, 1),
(1, 3, '06:00', '10:30', 100, 1),
(1, 4, '06:00', '10:30', 100, 1),
(1, 5, '06:00', '10:30', 100, 1),
(1, 6, '06:00', '10:30', 100, 1),

-- Beach Grill - Daily 12:00-16:00
(2, 0, '12:00', '16:00', 40, 1),
(2, 1, '12:00', '16:00', 40, 1),
(2, 2, '12:00', '16:00', 40, 1),
(2, 3, '12:00', '16:00', 40, 1),
(2, 4, '12:00', '16:00', 40, 1),
(2, 5, '12:00', '16:00', 40, 1),
(2, 6, '12:00', '16:00', 40, 1),

-- Fine Dining - Daily except Monday 18:00-22:00
(3, 0, '18:00', '22:00', 30, 1),
(3, 2, '18:00', '22:00', 30, 1),
(3, 3, '18:00', '22:00', 30, 1),
(3, 4, '18:00', '22:00', 30, 1),
(3, 5, '18:00', '22:00', 30, 1),
(3, 6, '18:00', '22:00', 30, 1);
