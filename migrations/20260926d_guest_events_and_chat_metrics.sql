-- Analytics rebuild: guest-app events (visits with a persistent visitor id, section opens, chat opens,
-- language, source) and two chat columns for honest response metrics. Additive only.
-- Applied to production D1 (webapp-production) on 2026-09-26.
CREATE TABLE IF NOT EXISTS guest_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  day         TEXT    NOT NULL,                  -- Cairo date YYYY-MM-DD (dashboard ranges bind on this)
  hour        INTEGER,                           -- Cairo hour 0-23
  ts          DATETIME DEFAULT CURRENT_TIMESTAMP,-- UTC
  visitor_id  TEXT,                              -- random id kept on the guest's phone (localStorage)
  session_id  TEXT,                              -- new after 30 min idle (sessionStorage)
  event       TEXT    NOT NULL,                  -- visit | open | chat_open | lang | home
  target      TEXT,                              -- e.g. offering:H3, room-service, beach-booking, live-map, info:<key>, feedback
  lang        TEXT,                              -- site language at the time
  source      TEXT,                              -- visits only: qr | app-android | app-ios | link | direct
  is_new      INTEGER NOT NULL DEFAULT 0,        -- visits only: first visit from this phone
  staff       INTEGER NOT NULL DEFAULT 0         -- 1 = a staff/admin browser (excluded from reports)
);
CREATE INDEX IF NOT EXISTS idx_guest_events_pde ON guest_events(property_id, day, event);
CREATE INDEX IF NOT EXISTS idx_guest_events_visitor ON guest_events(property_id, visitor_id);

-- First time staff acknowledged the chat (staff_ack_at is overwritten on every ack and bulk-set by WhatsApp replies)
ALTER TABLE chatbot_conversations ADD COLUMN first_ack_at TEXT;
-- The language the guest had chosen on the site when the chat started
ALTER TABLE chatbot_conversations ADD COLUMN site_lang TEXT;
