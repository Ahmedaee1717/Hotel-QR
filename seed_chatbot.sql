-- Enable chatbot for Paradise Resort
UPDATE properties SET chatbot_enabled = 1, chatbot_name = 'Paradise Assistant', chatbot_greeting_en = 'Welcome to Paradise Resort! How can I help you today?' WHERE property_id = 1;

-- Sample FAQ document
INSERT INTO chatbot_documents (property_id, title, content, document_type) VALUES (
  1,
  'Check-in and Check-out Information',
  'Check-in time is at 3:00 PM. Early check-in is subject to availability and may incur additional charges. Check-out time is 11:00 AM. Late check-out can be arranged for a fee of $50 per hour, subject to availability. You will need a valid ID and credit card for check-in. We accept major credit cards including Visa, Mastercard, and American Express.',
  'faq'
);

INSERT INTO chatbot_documents (property_id, title, content, document_type) VALUES (
  1,
  'Dining Options',
  'Our resort features three restaurants. The main buffet restaurant serves breakfast from 7 AM to 11 AM, lunch from 12 PM to 3 PM, and dinner from 6 PM to 10 PM. The Italian restaurant requires reservations and is open for dinner only from 6 PM to 10 PM. Our beachside grill is open from 11 AM to 6 PM for casual dining. All meals are included in the all-inclusive package. Room service is available 24/7 with a delivery fee.',
  'faq'
);

INSERT INTO chatbot_documents (property_id, title, content, document_type) VALUES (
  1,
  'Pool and Beach Information',
  'We have two main pools. The family pool is heated and open from 8 AM to 8 PM. The adults-only pool includes a swim-up bar and is open from 9 AM to 7 PM. Our private beach has complimentary loungers and umbrellas. Beach towels are provided at the pool towel station. Water sports are available at the beach including snorkeling, kayaking, and paddleboarding. Scuba diving trips can be arranged through our activities desk.',
  'faq'
);

INSERT INTO chatbot_documents (property_id, title, content, document_type) VALUES (
  1,
  'Spa and Wellness',
  'Our luxury spa offers massages, facials, body treatments, and beauty services. Spa hours are 9 AM to 8 PM daily. Reservations are required and can be made at the spa reception or through your room phone. The fitness center is open 24 hours and includes modern cardio equipment, free weights, and yoga mats. Daily yoga classes are held at 7 AM at the beach pavilion.',
  'faq'
);

INSERT INTO chatbot_documents (property_id, title, content, document_type) VALUES (
  1,
  'WiFi and Internet',
  'High-speed WiFi is complimentary throughout the resort including all rooms, restaurants, pools, and public areas. To connect, select "Paradise_Guest_WiFi" and use the password provided at check-in. For any connection issues, please contact the front desk. Business center services including printing and scanning are available at the lobby.',
  'faq'
);

INSERT INTO chatbot_documents (property_id, title, content, document_type) VALUES (
  1,
  'Kids Activities and Babysitting',
  'Our Kids Club welcomes children aged 4 to 12 and is open from 9 AM to 5 PM daily. Activities include arts and crafts, games, treasure hunts, and movie time. The club is supervised by trained staff and is complimentary for guests. Babysitting services are available upon request for $25 per hour with advance notice of 24 hours. Please contact the concierge to arrange.',
  'faq'
);
