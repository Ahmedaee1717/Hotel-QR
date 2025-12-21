-- Add default mood check forms for the existing feedback system

-- Insert Happy Mood Check Form
INSERT OR IGNORE INTO feedback_forms (
  form_id, property_id, form_name, form_description, form_type,
  is_active, require_room_number, require_guest_name,
  thank_you_message, created_at
) VALUES (
  9001, 1, 'Daily Mood Check - Happy (😊)', 
  'Guest reported a great day - collect positive feedback', 
  'mood_happy',
  1, 0, 0,
  'Thank you for your wonderful feedback! We''re thrilled you''re enjoying your stay!',
  CURRENT_TIMESTAMP
);

-- Insert Okay Mood Check Form  
INSERT OR IGNORE INTO feedback_forms (
  form_id, property_id, form_name, form_description, form_type,
  is_active, require_room_number, require_guest_name,
  thank_you_message, created_at
) VALUES (
  9002, 1, 'Daily Mood Check - Okay (😐)', 
  'Guest reported an okay day - neutral feedback', 
  'mood_okay',
  1, 0, 0,
  'Thank you for sharing your thoughts with us.',
  CURRENT_TIMESTAMP
);

-- Insert Unhappy Mood Check Form
INSERT OR IGNORE INTO feedback_forms (
  form_id, property_id, form_name, form_description, form_type,
  is_active, require_room_number, require_guest_name,
  thank_you_message, created_at
) VALUES (
  9003, 1, 'Daily Mood Check - Unhappy (😟)', 
  'URGENT: Guest reported issues - needs immediate attention', 
  'mood_unhappy',
  1, 0, 0,
  'Thank you for bringing this to our attention. A manager will contact you within 5 minutes.',
  CURRENT_TIMESTAMP
);

-- Questions for Happy Form
INSERT OR IGNORE INTO feedback_questions (form_id, question_text, question_type, is_required, options, display_order)
VALUES 
  (9001, 'What made your day great?', 'multiple_choice', 0, '["Excellent food", "Amazing beach", "Friendly staff", "Great activities", "Beautiful room", "Other"]', 1),
  (9001, 'Would you like to share more details?', 'textarea', 0, NULL, 2);

-- Questions for Okay Form
INSERT OR IGNORE INTO feedback_questions (form_id, question_text, question_type, is_required, options, display_order)
VALUES 
  (9002, 'Anything we could improve?', 'textarea', 0, NULL, 1);

-- Questions for Unhappy Form
INSERT OR IGNORE INTO feedback_questions (form_id, question_text, question_type, is_required, options, display_order)
VALUES 
  (9003, 'What issues did you experience?', 'multiple_choice', 1, '["Food quality", "Room cleanliness", "Noise", "Staff service", "Facilities", "Other"]', 1),
  (9003, 'Please provide details so we can fix this immediately:', 'textarea', 0, NULL, 2);

-- Link mood checks to feedback submissions
-- This creates a view that shows mood check data in the feedback system
CREATE VIEW IF NOT EXISTS mood_check_submissions AS
SELECT 
  f.feedback_id as submission_id,
  CASE 
    WHEN f.mood_score = 3 THEN 9001  -- Happy form
    WHEN f.mood_score = 2 THEN 9002  -- Okay form
    WHEN f.mood_score = 1 THEN 9003  -- Unhappy form
  END as form_id,
  f.property_id,
  f.room_number,
  f.guest_name,
  NULL as guest_email,
  NULL as guest_phone,
  'mood_check' as submission_source,
  gm.check_date as submitted_at,
  CASE 
    WHEN f.mood_score = 3 THEN 1.0   -- Positive
    WHEN f.mood_score = 2 THEN 0.0   -- Neutral
    WHEN f.mood_score = 1 THEN -1.0  -- Negative
  END as sentiment_score,
  CASE 
    WHEN f.mood_score = 3 THEN 'positive'
    WHEN f.mood_score = 2 THEN 'neutral'
    WHEN f.mood_score = 1 AND f.feedback_type = 'urgent' THEN 'urgent'
    WHEN f.mood_score = 1 THEN 'negative'
  END as sentiment_label,
  CASE WHEN f.feedback_type = 'urgent' THEN 1 ELSE 0 END as is_urgent,
  0 as is_read,
  f.custom_comment as admin_notes,
  gm.mood_emoji,
  f.categories
FROM guest_feedback f
LEFT JOIN guest_mood_checks gm ON f.mood_check_id = gm.mood_check_id
WHERE gm.mood_check_id IS NOT NULL;
