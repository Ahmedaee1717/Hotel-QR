-- WhatsApp alert groups: who in the group wrote a reply (shown to the guest as the staff name)
ALTER TABLE wa_inbound ADD COLUMN sender_name TEXT;
