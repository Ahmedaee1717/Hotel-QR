-- Seed knowledge base for chatbot
-- Enable chatbot for property 1
UPDATE properties SET 
  chatbot_enabled = 1,
  chatbot_greeting_en = 'Hi! How can I help you today?',
  chatbot_name = 'Hotel Assistant'
WHERE property_id = 1;

-- Insert sample knowledge base documents
INSERT OR IGNORE INTO chatbot_documents (document_id, property_id, title, content, document_type, is_active)
VALUES
(1, 1, 'Hotel Overview', 'Paradise Resort & Spa is a luxury 5-star resort located in Hurghada, Egypt on the beautiful Red Sea. We offer world-class diving, spa treatments, restaurants, and activities for all ages.', 'general', 1),
(2, 1, 'Dining Options', 'We have multiple dining options: Main Restaurant (international buffet, open 7am-10pm), Beach Grill (seafood and grills, 12pm-11pm), Italian Restaurant (authentic Italian cuisine, 6pm-11pm). All restaurants accept reservations.', 'amenity', 1),
(3, 1, 'Spa Services', 'Our Serenity Spa offers massage therapy, facials, body treatments, and wellness programs. Open daily 9am-9pm. Advance booking recommended. Popular treatments: Hot Stone Massage (60 min, $80), Thai Massage (90 min, $100), Aromatherapy Facial (45 min, $60).', 'amenity', 1),
(4, 1, 'Water Activities', 'We offer scuba diving, snorkeling, jet skiing, parasailing, and banana boat rides. Our PADI-certified dive center offers beginner courses and advanced dives to famous Red Sea sites. Snorkeling equipment available for rent.', 'amenity', 1),
(5, 1, 'Check-in Policy', 'Check-in time is 3:00 PM and check-out is 12:00 PM. Early check-in and late check-out available upon request subject to availability. Valid ID and credit card required at check-in.', 'policy', 1),
(6, 1, 'Beach Access', 'Private beach open 6am-8pm daily. Beach towels provided. Sunbeds and umbrellas available free of charge. Watersports equipment rentals available. Beach bar serves drinks and snacks 10am-6pm.', 'amenity', 1),
(7, 1, 'Gym and Fitness', 'Fitness center open 24/7 with modern cardio and strength equipment. Free weights, treadmills, ellipticals available. Complimentary water and towels. Personal training available upon request.', 'amenity', 1),
(8, 1, 'Kids Club', 'Kids Club for ages 4-12 open daily 9am-5pm. Activities include arts & crafts, games, swimming, and outdoor play. Supervised by trained staff. Free for resort guests.', 'amenity', 1);

-- Create chunks from documents (split into searchable pieces)
INSERT OR IGNORE INTO chatbot_chunks (chunk_id, document_id, property_id, chunk_text, chunk_index)
VALUES
-- Hotel Overview chunks
(1, 1, 1, 'Paradise Resort & Spa is a luxury 5-star resort located in Hurghada, Egypt on the beautiful Red Sea.', 0),
(2, 1, 1, 'We offer world-class diving, spa treatments, restaurants, and activities for all ages.', 1),

-- Dining chunks
(3, 2, 1, 'Main Restaurant offers international buffet open 7am-10pm daily.', 0),
(4, 2, 1, 'Beach Grill serves seafood and grills open 12pm-11pm.', 1),
(5, 2, 1, 'Italian Restaurant offers authentic Italian cuisine 6pm-11pm. All restaurants accept reservations.', 2),

-- Spa chunks
(6, 3, 1, 'Serenity Spa offers massage therapy, facials, body treatments, and wellness programs. Open daily 9am-9pm.', 0),
(7, 3, 1, 'Hot Stone Massage 60 minutes costs $80. Thai Massage 90 minutes costs $100.', 1),
(8, 3, 1, 'Aromatherapy Facial 45 minutes costs $60. Advance booking recommended for all spa treatments.', 2),

-- Water Activities chunks
(9, 4, 1, 'We offer scuba diving, snorkeling, jet skiing, parasailing, and banana boat rides.', 0),
(10, 4, 1, 'Our PADI-certified dive center offers beginner courses and advanced dives to famous Red Sea dive sites.', 1),
(11, 4, 1, 'Snorkeling equipment available for rent at the beach.', 2),

-- Check-in Policy chunks
(12, 5, 1, 'Check-in time is 3:00 PM and check-out time is 12:00 PM.', 0),
(13, 5, 1, 'Early check-in and late check-out available upon request subject to availability.', 1),
(14, 5, 1, 'Valid ID and credit card required at check-in.', 2),

-- Beach Access chunks
(15, 6, 1, 'Private beach open 6am-8pm daily. Beach towels provided free of charge.', 0),
(16, 6, 1, 'Sunbeds and umbrellas available free of charge for all guests.', 1),
(17, 6, 1, 'Beach bar serves drinks and snacks 10am-6pm. Watersports equipment rentals available.', 2),

-- Gym chunks
(18, 7, 1, 'Fitness center open 24/7 with modern cardio and strength equipment.', 0),
(19, 7, 1, 'Free weights, treadmills, ellipticals available. Complimentary water and towels provided.', 1),
(20, 7, 1, 'Personal training sessions available upon request at additional cost.', 2),

-- Kids Club chunks
(21, 8, 1, 'Kids Club for ages 4-12 open daily 9am-5pm with trained staff supervision.', 0),
(22, 8, 1, 'Activities include arts & crafts, games, swimming, and outdoor play.', 1),
(23, 8, 1, 'Kids Club is completely free for all resort guests.', 2);
