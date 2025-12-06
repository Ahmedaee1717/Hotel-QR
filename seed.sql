-- Seed Data for Resort Activity Booking Platform
-- This file contains sample data for development and testing

-- Insert Default Property
INSERT OR IGNORE INTO properties (property_id, name, slug, brand_logo_url, primary_color, secondary_color, default_language, supported_languages, currency, timezone, contact_email, contact_phone, address, status)
VALUES (1, 'Paradise Resort & Spa', 'paradise-resort', '/static/images/logo.png', '#0EA5E9', '#10B981', 'en', '["en","ar"]', 'USD', 'Africa/Cairo', 'info@paradiseresort.com', '+20 123 456 7890', 'Red Sea, Hurghada, Egypt', 'active');

-- Insert Categories
INSERT OR IGNORE INTO categories (category_id, name_en, name_ar, slug, icon_name, display_order) VALUES
(1, 'Water Sports', 'الرياضات المائية', 'water-sports', 'fa-water', 1),
(2, 'Diving & Snorkeling', 'الغوص والسنوركل', 'diving-snorkeling', 'fa-mask-snorkel', 2),
(3, 'Spa & Wellness', 'السبا والعافية', 'spa-wellness', 'fa-spa', 3),
(4, 'Safari & Tours', 'السفاري والجولات', 'safari-tours', 'fa-binoculars', 4),
(5, 'Restaurants & Dining', 'المطاعم وتناول الطعام', 'restaurants-dining', 'fa-utensils', 5),
(6, 'Kids Club', 'نادي الأطفال', 'kids-club', 'fa-child', 6);

-- Insert Sample Vendors (password: 'vendor123' hashed with bcrypt)
INSERT OR IGNORE INTO vendors (vendor_id, business_name, slug, description_en, description_ar, category_id, email, phone, password_hash, certifications, safety_rating, commission_rate, payment_methods, working_hours, status) VALUES
(1, 'Aqua Dive Centre', 'aqua-dive-centre', 'Professional diving center with PADI certified instructors. Explore the beautiful Red Sea coral reefs.', 'مركز غوص احترافي مع مدربين معتمدين من PADI. استكشف الشعاب المرجانية الجميلة في البحر الأحمر.', 2, 'dive@paradiseresort.com', '+20 123 456 7891', '$2b$10$rZ8LhZxF5E7MqM8pZ9xPq.8pqKhH7qJ9pMxZ7qJ9pMxZ7qJ9pMxZ7', '[{"name":"PADI 5 Star Dive Center","issuer":"PADI","expiry_date":"2026-12-31"}]', 4.9, 20.0, '["stripe","pay_at_vendor"]', '{"monday":"08:00-18:00","tuesday":"08:00-18:00","wednesday":"08:00-18:00","thursday":"08:00-18:00","friday":"08:00-18:00","saturday":"08:00-18:00","sunday":"Closed"}', 'active'),
(2, 'Serenity Spa', 'serenity-spa', 'Luxury spa offering massage, facials, and wellness treatments in a tranquil setting.', 'سبا فاخر يقدم التدليك والعناية بالبشرة وعلاجات العافية في بيئة هادئة.', 3, 'spa@paradiseresort.com', '+20 123 456 7892', '$2b$10$rZ8LhZxF5E7MqM8pZ9xPq.8pqKhH7qJ9pMxZ7qJ9pMxZ7qJ9pMxZ7', '[{"name":"International Spa Association Member","issuer":"ISPA","expiry_date":"2026-12-31"}]', 4.8, 15.0, '["stripe","pay_at_vendor"]', '{"monday":"09:00-21:00","tuesday":"09:00-21:00","wednesday":"09:00-21:00","thursday":"09:00-21:00","friday":"09:00-21:00","saturday":"09:00-21:00","sunday":"10:00-20:00"}', 'active'),
(3, 'Desert Safari Adventures', 'desert-safari-adventures', 'Experience authentic Bedouin culture with our desert safari tours, camel rides, and stargazing.', 'اختبر الثقافة البدوية الأصيلة مع جولات السفاري الصحراوية وركوب الجمال ومراقبة النجوم.', 4, 'safari@paradiseresort.com', '+20 123 456 7893', '$2b$10$rZ8LhZxF5E7MqM8pZ9xPq.8pqKhH7qJ9pMxZ7qJ9pMxZ7qJ9pMxZ7', '[{"name":"Licensed Tour Operator","issuer":"Egyptian Tourism Authority","expiry_date":"2026-12-31"}]', 4.7, 18.0, '["stripe","pay_at_vendor"]', '{"monday":"06:00-22:00","tuesday":"06:00-22:00","wednesday":"06:00-22:00","thursday":"06:00-22:00","friday":"06:00-22:00","saturday":"06:00-22:00","sunday":"06:00-22:00"}', 'active');

-- Link Vendors to Property
INSERT OR IGNORE INTO vendor_properties (vendor_id, property_id, is_featured, display_order, status) VALUES
(1, 1, 1, 1, 'active'),
(2, 1, 1, 2, 'active'),
(3, 1, 0, 3, 'active');

-- Insert Sample Activities
INSERT OR IGNORE INTO activities (activity_id, vendor_id, category_id, title_en, title_ar, short_description_en, short_description_ar, full_description_en, full_description_ar, images, duration_minutes, capacity_per_slot, price, currency, price_type, requirements, includes, cancellation_policy_hours, status, is_featured, popularity_score) VALUES
(1, 1, 2, 'Beginner Diving Lesson', 'درس الغوص للمبتدئين', 'Perfect for first-time divers. Learn basics in pool then explore shallow reef.', 'مثالي للغواصين لأول مرة. تعلم الأساسيات في المسبح ثم استكشف الشعاب الضحلة.', 'Start your diving journey with a professional PADI instructor. Begin with pool training to learn essential skills, then venture into the beautiful Red Sea to explore colorful coral reefs and tropical fish. All equipment included.', 'ابدأ رحلة الغوص الخاصة بك مع مدرب PADI محترف. ابدأ بالتدريب في المسبح لتعلم المهارات الأساسية، ثم انطلق إلى البحر الأحمر الجميل لاستكشاف الشعاب المرجانية الملونة والأسماك الاستوائية. جميع المعدات مشمولة.', '["/static/images/diving-1.jpg","/static/images/diving-2.jpg"]', 180, 4, 80.00, 'USD', 'per_person', '{"age_min":12,"age_max":null,"health_restrictions":["No heart conditions","No respiratory issues"],"skill_level":"beginner"}', '["All diving equipment","Underwater photos","Insurance","Refreshments"]', 24, 'active', 1, 150),
(2, 1, 2, 'Advanced Open Water Dive', 'غوص المياه المفتوحة المتقدم', 'For certified divers. Explore deeper reefs and shipwrecks.', 'للغواصين المعتمدين. استكشف الشعاب الأعمق وحطام السفن.', 'Two-dive adventure for certified divers. Visit famous dive sites including coral gardens and a historic shipwreck. See diverse marine life including rays, moray eels, and reef sharks. PADI Advanced certification or equivalent required.', 'مغامرة غوص مزدوجة للغواصين المعتمدين. قم بزيارة مواقع الغوص الشهيرة بما في ذلك حدائق المرجان وحطام سفينة تاريخية. شاهد الحياة البحرية المتنوعة بما في ذلك الراي اللساع وثعابين موراي وأسماك القرش المرجانية. شهادة PADI المتقدمة أو ما يعادلها مطلوبة.', '["/static/images/advanced-diving-1.jpg"]', 240, 6, 120.00, 'USD', 'per_person', '{"age_min":15,"age_max":null,"certifications":["PADI Advanced Open Water or equivalent"],"skill_level":"advanced"}', '["All diving equipment","Dive computer","Underwater photos","Boat transfer","Lunch box"]', 48, 'active', 1, 95),
(3, 2, 3, 'Swedish Massage', 'تدليك سويدي', 'Relaxing full-body massage using long, flowing strokes.', 'تدليك الجسم الكامل المريح باستخدام حركات طويلة وانسيابية.', 'Experience ultimate relaxation with our signature Swedish massage. Our skilled therapists use gentle, flowing strokes to release tension, improve circulation, and promote deep relaxation. Perfect after a day in the sun.', 'اختبر الاسترخاء الكامل مع تدليكنا السويدي المميز. يستخدم معالجونا المهرة ضربات لطيفة وانسيابية لتخفيف التوتر وتحسين الدورة الدموية وتعزيز الاسترخاء العميق. مثالي بعد يوم في الشمس.', '["/static/images/spa-1.jpg","/static/images/spa-2.jpg"]', 60, 1, 70.00, 'USD', 'per_person', '{"age_min":16,"age_max":null,"health_restrictions":["Not suitable during pregnancy","Inform therapist of injuries"],"skill_level":"none"}', '["Aromatherapy oils","Towels","Herbal tea","Relaxation music"]', 24, 'active', 1, 180),
(4, 2, 3, 'Hot Stone Therapy', 'علاج الحجر الساخن', 'Deep tissue massage using heated volcanic stones.', 'تدليك الأنسجة العميقة باستخدام الحجارة البركانية الساخنة.', 'Melt away stress with our hot stone therapy. Smooth, heated volcanic stones are placed on key points of the body to warm and relax muscles, allowing deeper therapeutic massage. Combines heat therapy with expert massage techniques.', 'تخلص من التوتر مع علاج الحجر الساخن. توضع الحجارة البركانية الملساء الساخنة على نقاط رئيسية في الجسم لتدفئة العضلات واسترخائها، مما يسمح بتدليك علاجي أعمق. يجمع بين العلاج الحراري وتقنيات التدليك الخبيرة.', '["/static/images/hotstone-1.jpg"]', 90, 1, 95.00, 'USD', 'per_person', '{"age_min":18,"age_max":null,"health_restrictions":["Not for pregnant women","Not with skin conditions","No recent surgery"],"skill_level":"none"}', '["Volcanic stones","Aromatherapy oils","Towels","Herbal tea"]', 24, 'active', 0, 75),
(5, 3, 4, 'Sunset Desert Safari', 'سفاري الصحراء عند الغروب', 'Jeep safari through desert dunes with traditional dinner.', 'سفاري بالجيب عبر الكثبان الصحراوية مع عشاء تقليدي.', 'Embark on an unforgettable desert adventure! Ride in a 4x4 jeep across golden sand dunes, visit a traditional Bedouin village, enjoy camel rides, watch the stunning sunset, and feast on authentic Egyptian BBQ dinner under the stars with live entertainment.', 'انطلق في مغامرة صحراوية لا تُنسى! اركب سيارة جيب 4x4 عبر الكثبان الرملية الذهبية، وقم بزيارة قرية بدوية تقليدية، واستمتع بركوب الجمال، وشاهد غروب الشمس المذهل، وتناول عشاء BBQ مصري أصيل تحت النجوم مع ترفيه حي.', '["/static/images/safari-1.jpg","/static/images/safari-2.jpg","/static/images/safari-3.jpg"]', 300, 15, 65.00, 'USD', 'per_person', '{"age_min":5,"age_max":null,"health_restrictions":["Not suitable for back problems","Not for pregnant women"],"skill_level":"none"}', '["Hotel pickup & dropoff","4x4 jeep ride","Camel ride","BBQ dinner","Soft drinks","Live entertainment","Guide"]', 48, 'active', 1, 200),
(6, 3, 4, 'Quad Biking Adventure', 'مغامرة دراجات الكواد', 'Thrilling quad bike ride through desert terrain.', 'رحلة مثيرة بدراجة الكواد عبر التضاريس الصحراوية.', 'Feel the adrenaline rush as you ride your own quad bike through the desert landscape. Navigate sandy trails, climb dunes, and experience the thrill of off-road adventure. Suitable for beginners with full safety briefing and equipment provided.', 'اشعر باندفاع الأدرينالين أثناء قيادة دراجة الكواد الخاصة بك عبر المناظر الطبيعية الصحراوية. تنقل عبر المسارات الرملية، واصعد الكثبان، واختبر إثارة المغامرة على الطرق الوعرة. مناسب للمبتدئين مع إحاطة أمنية كاملة ومعدات متوفرة.', '["/static/images/quad-1.jpg"]', 120, 8, 45.00, 'USD', 'per_person', '{"age_min":16,"age_max":null,"health_restrictions":["Valid driver license","No serious injuries"],"skill_level":"beginner"}', '["Quad bike","Helmet & goggles","Safety briefing","Guide","Insurance"]', 24, 'active', 0, 110);

-- Insert Sample Availability Schedules
-- Diving activities: Monday to Saturday, 8 AM and 2 PM
INSERT OR IGNORE INTO availability_schedule (activity_id, day_of_week, start_time, end_time, slots_available, is_recurring) VALUES
(1, 1, '08:00', '11:00', 4, 1), (1, 1, '14:00', '17:00', 4, 1),
(1, 2, '08:00', '11:00', 4, 1), (1, 2, '14:00', '17:00', 4, 1),
(1, 3, '08:00', '11:00', 4, 1), (1, 3, '14:00', '17:00', 4, 1),
(1, 4, '08:00', '11:00', 4, 1), (1, 4, '14:00', '17:00', 4, 1),
(1, 5, '08:00', '11:00', 4, 1), (1, 5, '14:00', '17:00', 4, 1),
(1, 6, '08:00', '11:00', 4, 1), (1, 6, '14:00', '17:00', 4, 1);

INSERT OR IGNORE INTO availability_schedule (activity_id, day_of_week, start_time, end_time, slots_available, is_recurring) VALUES
(2, 1, '07:00', '11:00', 6, 1), (2, 1, '13:00', '17:00', 6, 1),
(2, 2, '07:00', '11:00', 6, 1), (2, 2, '13:00', '17:00', 6, 1),
(2, 3, '07:00', '11:00', 6, 1), (2, 3, '13:00', '17:00', 6, 1),
(2, 4, '07:00', '11:00', 6, 1), (2, 4, '13:00', '17:00', 6, 1),
(2, 5, '07:00', '11:00', 6, 1), (2, 5, '13:00', '17:00', 6, 1),
(2, 6, '07:00', '11:00', 6, 1), (2, 6, '13:00', '17:00', 6, 1);

-- Spa activities: Daily, hourly slots from 9 AM to 8 PM
INSERT OR IGNORE INTO availability_schedule (activity_id, day_of_week, start_time, end_time, slots_available, is_recurring) VALUES
(3, 0, '09:00', '10:00', 1, 1), (3, 0, '10:30', '11:30', 1, 1), (3, 0, '12:00', '13:00', 1, 1),
(3, 0, '13:30', '14:30', 1, 1), (3, 0, '15:00', '16:00', 1, 1), (3, 0, '16:30', '17:30', 1, 1),
(3, 0, '18:00', '19:00', 1, 1), (3, 0, '19:30', '20:30', 1, 1),
(3, 1, '09:00', '10:00', 1, 1), (3, 1, '10:30', '11:30', 1, 1), (3, 1, '12:00', '13:00', 1, 1),
(3, 1, '13:30', '14:30', 1, 1), (3, 1, '15:00', '16:00', 1, 1), (3, 1, '16:30', '17:30', 1, 1),
(3, 1, '18:00', '19:00', 1, 1), (3, 1, '19:30', '20:30', 1, 1),
(3, 2, '09:00', '10:00', 1, 1), (3, 2, '10:30', '11:30', 1, 1), (3, 2, '12:00', '13:00', 1, 1),
(3, 2, '13:30', '14:30', 1, 1), (3, 2, '15:00', '16:00', 1, 1), (3, 2, '16:30', '17:30', 1, 1),
(3, 2, '18:00', '19:00', 1, 1), (3, 2, '19:30', '20:30', 1, 1),
(3, 3, '09:00', '10:00', 1, 1), (3, 3, '10:30', '11:30', 1, 1), (3, 3, '12:00', '13:00', 1, 1),
(3, 3, '13:30', '14:30', 1, 1), (3, 3, '15:00', '16:00', 1, 1), (3, 3, '16:30', '17:30', 1, 1),
(3, 3, '18:00', '19:00', 1, 1), (3, 3, '19:30', '20:30', 1, 1),
(3, 4, '09:00', '10:00', 1, 1), (3, 4, '10:30', '11:30', 1, 1), (3, 4, '12:00', '13:00', 1, 1),
(3, 4, '13:30', '14:30', 1, 1), (3, 4, '15:00', '16:00', 1, 1), (3, 4, '16:30', '17:30', 1, 1),
(3, 4, '18:00', '19:00', 1, 1), (3, 4, '19:30', '20:30', 1, 1),
(3, 5, '09:00', '10:00', 1, 1), (3, 5, '10:30', '11:30', 1, 1), (3, 5, '12:00', '13:00', 1, 1),
(3, 5, '13:30', '14:30', 1, 1), (3, 5, '15:00', '16:00', 1, 1), (3, 5, '16:30', '17:30', 1, 1),
(3, 5, '18:00', '19:00', 1, 1), (3, 5, '19:30', '20:30', 1, 1),
(3, 6, '10:00', '11:00', 1, 1), (3, 6, '11:30', '12:30', 1, 1), (3, 6, '13:00', '14:00', 1, 1),
(3, 6, '14:30', '15:30', 1, 1), (3, 6, '16:00', '17:00', 1, 1), (3, 6, '17:30', '18:30', 1, 1),
(3, 6, '19:00', '20:00', 1, 1);

-- Safari activities: Daily, morning and evening
INSERT OR IGNORE INTO availability_schedule (activity_id, day_of_week, start_time, end_time, slots_available, is_recurring) VALUES
(5, 0, '14:00', '19:00', 15, 1), (5, 1, '14:00', '19:00', 15, 1), (5, 2, '14:00', '19:00', 15, 1),
(5, 3, '14:00', '19:00', 15, 1), (5, 4, '14:00', '19:00', 15, 1), (5, 5, '14:00', '19:00', 15, 1),
(5, 6, '14:00', '19:00', 15, 1);

INSERT OR IGNORE INTO availability_schedule (activity_id, day_of_week, start_time, end_time, slots_available, is_recurring) VALUES
(6, 0, '08:00', '10:00', 8, 1), (6, 0, '16:00', '18:00', 8, 1),
(6, 1, '08:00', '10:00', 8, 1), (6, 1, '16:00', '18:00', 8, 1),
(6, 2, '08:00', '10:00', 8, 1), (6, 2, '16:00', '18:00', 8, 1),
(6, 3, '08:00', '10:00', 8, 1), (6, 3, '16:00', '18:00', 8, 1),
(6, 4, '08:00', '10:00', 8, 1), (6, 4, '16:00', '18:00', 8, 1),
(6, 5, '08:00', '10:00', 8, 1), (6, 5, '16:00', '18:00', 8, 1),
(6, 6, '08:00', '10:00', 8, 1), (6, 6, '16:00', '18:00', 8, 1);

-- Insert Sample Rooms with QR Codes
INSERT OR IGNORE INTO rooms (room_id, property_id, room_number, room_type, qr_code_data, status) VALUES
(1, 1, '101', 'standard', 'qr-101-f8d3c2a1-9b7e-4f5d-8c3a-1e2f3d4c5b6a', 'vacant'),
(2, 1, '102', 'standard', 'qr-102-a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'vacant'),
(3, 1, '103', 'deluxe', 'qr-103-12345678-90ab-cdef-1234-567890abcdef', 'vacant'),
(4, 1, '201', 'suite', 'qr-201-abcdefgh-ijkl-mnop-qrst-uvwxyz123456', 'vacant'),
(5, 1, '202', 'suite', 'qr-202-zyxwvuts-rqpo-nmlk-jihg-fedcba987654', 'vacant'),
(6, 1, '301', 'villa', 'qr-301-11111111-2222-3333-4444-555555555555', 'vacant'),
(7, 1, '302', 'villa', 'qr-302-99999999-8888-7777-6666-555555555555', 'vacant'),
(8, 1, '103', 'standard', 'qr-104-aabbccdd-eeff-0011-2233-445566778899', 'vacant'),
(9, 1, '105', 'standard', 'qr-105-ffeeddcc-bbaa-9988-7766-554433221100', 'vacant'),
(10, 1, '106', 'deluxe', 'qr-106-10203040-5060-7080-90a0-b0c0d0e0f010', 'vacant');

-- Insert Admin User (password: 'admin123' hashed with bcrypt)
INSERT OR IGNORE INTO users (user_id, email, password_hash, first_name, last_name, role, property_id, permissions, status) VALUES
(1, 'admin@paradiseresort.com', '$2b$10$rZ8LhZxF5E7MqM8pZ9xPq.8pqKhH7qJ9pMxZ7qJ9pMxZ7qJ9pMxZ7', 'Admin', 'User', 'property_admin', 1, '["all"]', 'active');
