-- Ops staff app accounts: name + PIN sign-in with per-tab access.
-- Additive only. Applied to production D1 (webapp-production) on 2026-09-26.

CREATE TABLE IF NOT EXISTS ops_staff (
  staff_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id   INTEGER NOT NULL DEFAULT 1,
  name          TEXT    NOT NULL,              -- display name, as typed by the manager
  name_key      TEXT    NOT NULL,              -- NFKC, lower-case, single spaces: the login key
  pin_hash      TEXT    NOT NULL,              -- pbkdf2h$<iter>$<b64 salt>$<b64 hash> (HMAC-peppered)
  access        TEXT    NOT NULL DEFAULT '',   -- '*' (every tab, incl. future ones) or csv of chats,beach,rest
  is_manager    INTEGER NOT NULL DEFAULT 0,    -- may manage accounts
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_by    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_staff_name ON ops_staff(property_id, name_key);

CREATE TABLE IF NOT EXISTS ops_sessions (
  token_hash   TEXT    PRIMARY KEY,            -- sha256 hex of the cookie token; the token itself is never stored
  staff_id     INTEGER NOT NULL,
  property_id  INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT    NOT NULL,
  last_seen_at TEXT,
  ip           TEXT,
  user_agent   TEXT
);
CREATE INDEX IF NOT EXISTS idx_ops_sessions_staff ON ops_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_ops_sessions_expires ON ops_sessions(expires_at);

CREATE TABLE IF NOT EXISTS ops_login_attempts (
  key          TEXT    PRIMARY KEY,            -- 'a:<staff_id>' per account, 'ip:<address>' per network address
  fails        INTEGER NOT NULL DEFAULT 0,
  lock_count   INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  window_start TEXT,
  updated_at   TEXT
);

INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description)
  VALUES ('ops_login_required', '0', 'Ops staff app: 1 = every phone must sign in with name + PIN');
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description)
  VALUES ('ops_session_hours', '12', 'Ops staff app: hours a sign-in lasts before the PIN is asked again');
