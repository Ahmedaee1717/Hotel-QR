-- Add guest_name and room_number columns to chatbot_conversations table
-- This fixes the "GUEST: anonymous" issue in the Front Desk dashboard

ALTER TABLE chatbot_conversations ADD COLUMN guest_name TEXT;
ALTER TABLE chatbot_conversations ADD COLUMN room_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_guest ON chatbot_conversations(guest_name, room_number);
