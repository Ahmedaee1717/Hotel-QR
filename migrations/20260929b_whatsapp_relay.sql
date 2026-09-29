-- Two-way WhatsApp relay for guest chats: per-contact relay mode + language, the contact's "active chat",
-- inbound jobs (text + voice notes), a prioritised outbox, and WhatsApp LID → phone learning. Additive only.
-- Applied to production D1 (webapp-production) on 2026-09-29.
ALTER TABLE escalation_contacts ADD COLUMN relay_mode TEXT NOT NULL DEFAULT 'alerts';   -- alerts | instant | off
ALTER TABLE escalation_contacts ADD COLUMN language TEXT NOT NULL DEFAULT 'en';         -- language the contact reads
ALTER TABLE escalation_contacts ADD COLUMN muted_until TEXT;
ALTER TABLE escalation_contacts ADD COLUMN last_reply_at TEXT;
ALTER TABLE chatbot_conversations ADD COLUMN wa_handler_phone TEXT;                      -- contact handling this chat over WhatsApp
CREATE TABLE IF NOT EXISTS wa_relay_state (
  contact_phone          TEXT PRIMARY KEY,
  active_conversation_id INTEGER,
  updated_at             TEXT
);
CREATE TABLE IF NOT EXISTS wa_inbound (
  id              TEXT PRIMARY KEY,               -- 'mid:' + WhatsApp key.id (dedupe: INSERT OR IGNORE)
  property_id     INTEGER NOT NULL DEFAULT 1,
  contact_phone   TEXT NOT NULL,
  kind            TEXT NOT NULL,                  -- text | voice
  text            TEXT,
  quoted_text     TEXT,
  media_json      TEXT,                           -- audioMessage fields for voice; scrubbed when done
  conversation_id INTEGER,
  transcript      TEXT,
  staff_lang      TEXT,
  intent          TEXT,
  guest_message   TEXT,
  staff_summary   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',-- pending | working | done | failed | ignored
  attempts        INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,
  done_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_wa_inbound_status ON wa_inbound(status, created_at);
CREATE TABLE IF NOT EXISTS wa_outbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id     INTEGER NOT NULL DEFAULT 1,
  contact_phone   TEXT NOT NULL,
  conversation_id INTEGER,
  kind            TEXT NOT NULL,                  -- alert | forward | confirm | help | test
  text            TEXT NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 5,     -- 1 = first
  status          TEXT NOT NULL DEFAULT 'pending',-- pending | sent | failed
  attempts        INTEGER NOT NULL DEFAULT 0,
  retry_after     TEXT,
  msg_id          INTEGER,
  detail          TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_wa_outbox_status ON wa_outbox(status, priority, created_at);
CREATE TABLE IF NOT EXISTS wa_lids (lid TEXT PRIMARY KEY, phone TEXT, updated_at TEXT);
