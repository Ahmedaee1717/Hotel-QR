-- Ops staff accounts: remember how many digits the PIN has (managers need 6). Additive.
-- Applied to production D1 (webapp-production) on 2026-09-26; the seeded first manager has a 6-digit PIN.
ALTER TABLE ops_staff ADD COLUMN pin_digits INTEGER NOT NULL DEFAULT 4;
UPDATE ops_staff SET pin_digits = 6 WHERE staff_id = 1 AND created_by = 'setup';
