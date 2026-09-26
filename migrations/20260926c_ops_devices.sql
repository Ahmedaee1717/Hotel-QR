-- Ops staff sign-in: devices that have signed in to an account before (trusted: someone
-- else's wrong tries on the name don't lock them out; the PIN is still checked). Additive.
-- Applied to production D1 (webapp-production) on 2026-09-26.
CREATE TABLE IF NOT EXISTS ops_devices (
  token_hash   TEXT    NOT NULL,              -- sha256 hex of 'dev:' + the __Host-ops_dev cookie
  staff_id     INTEGER NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  last_ok_at   TEXT,
  fails        INTEGER NOT NULL DEFAULT 0,
  lock_count   INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  PRIMARY KEY (token_hash, staff_id)
);
CREATE INDEX IF NOT EXISTS idx_ops_devices_staff ON ops_devices(staff_id);
