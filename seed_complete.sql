-- Complete seed data for testing tier benefits with venue links

-- Ensure property exists
INSERT OR IGNORE INTO properties (property_id, name, slug, timezone) 
VALUES (1, 'Paradise Resort', 'paradise-resort', 'UTC');

-- Add restaurant offerings
INSERT OR IGNORE INTO hotel_offerings (
  offering_id, property_id, offering_type, title_en, title_ar,
  short_description_en, short_description_ar,
  full_description_en, images,
  price, currency, price_type,
  duration_minutes, capacity_per_slot, requires_booking,
  cuisine_type, meal_type, location, status, is_featured, display_order
) VALUES
-- Main Restaurant - Breakfast Buffet
(1, 1, 'restaurant', 'Sunrise Breakfast Buffet', 'بوفيه الإفطار',
 'All-you-can-eat breakfast buffet', 'بوفيه إفطار مفتوح',
 'Start your day with our extensive breakfast buffet featuring international cuisine, fresh fruits, pastries, and made-to-order omelets.',
 '["https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800"]',
 25.00, 'USD', 'per_person',
 120, 100, 0,
 'international', 'breakfast', 'Main Restaurant - Ground Floor', 'active', 1, 1),

-- Beachside Restaurant - Lunch
(2, 1, 'restaurant', 'Azure Beach Grill', 'مطعم أزور بيتش',
 'Mediterranean cuisine by the beach', 'مأكولات متوسطية على الشاطئ',
 'Enjoy fresh seafood and Mediterranean dishes with stunning ocean views. Perfect for a relaxing lunch experience.',
 '["https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800"]',
 45.00, 'USD', 'per_person',
 90, 40, 1,
 'mediterranean', 'lunch', 'Beachside Terrace', 'active', 1, 2),

-- Fine Dining - Dinner
(3, 1, 'restaurant', 'Le Jardin Fine Dining', 'مطعم لو جاردان',
 'Exclusive fine dining experience', 'تجربة طعام فاخرة',
 'Our signature restaurant offering exquisite French-inspired cuisine in an elegant garden setting. Reservations required.',
 '["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"]',
 85.00, 'USD', 'per_person',
 150, 30, 1,
 'french', 'dinner', 'Garden Restaurant - 2nd Floor', 'active', 1, 3),

-- Poolside Bar
(4, 1, 'restaurant', 'Sunset Poolside Bar', 'بار حمام السباحة',
 'Refreshing drinks by the pool', 'مشروبات منعشة بجانب حمام السباحة',
 'Enjoy tropical cocktails, fresh juices, and light snacks while lounging by our infinity pool with ocean views.',
 '["https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800"]',
 15.00, 'USD', 'per_drink',
 60, 50, 0,
 'bar', 'drinks', 'Pool Deck', 'active', 1, 4);

-- Add activity offerings
INSERT OR IGNORE INTO hotel_offerings (
  offering_id, property_id, offering_type, title_en, title_ar,
  short_description_en, full_description_en,
  images, price, currency, price_type,
  duration_minutes, capacity_per_slot, requires_booking,
  location, status, display_order
) VALUES
(5, 1, 'activity', 'Scuba Diving Experience', 'تجربة الغوص',
 'Discover the underwater world',
 'Join our professional dive instructors for an unforgettable scuba diving experience. Equipment and instruction included. Suitable for beginners and experienced divers.',
 '["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"]',
 120.00, 'USD', 'per_person',
 120, 8, 1,
 'Private Beach - Dive Center', 'active', 5),

(6, 1, 'activity', 'Sunset Yoga Session', 'جلسة يوغا',
 'Relaxing yoga by the beach',
 'Start or end your day with a peaceful yoga session on our private beach. All levels welcome. Mats provided.',
 '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"]',
 0.00, 'USD', 'free',
 60, 20, 0,
 'Beach Pavilion', 'active', 6),

(7, 1, 'spa', 'Serenity Spa Massage', 'جلسة تدليك',
 'Relaxing full-body massage',
 'Indulge in a 60-minute therapeutic massage using aromatic oils. Choose from Swedish, deep tissue, or aromatherapy massage.',
 '["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800"]',
 90.00, 'USD', 'per_person',
 60, 4, 1,
 'Serenity Spa - Pool Level', 'active', 7);
