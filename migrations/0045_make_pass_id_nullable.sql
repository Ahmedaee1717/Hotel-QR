-- Make pass_id nullable to support walk-in bookings without digital passes
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new table with pass_id nullable
CREATE TABLE alacarte_vouchers_new (
    voucher_id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    pass_id INTEGER,  -- Now nullable (was NOT NULL)
    voucher_code TEXT UNIQUE NOT NULL,
    tier_id INTEGER NOT NULL,
    meal_number INTEGER NOT NULL,
    max_cost DECIMAL(10,2),
    restaurant_id INTEGER NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER DEFAULT 1,
    table_number TEXT,
    preorder_items TEXT,
    preorder_item_ids TEXT,
    special_requests TEXT,
    total_cost DECIMAL(10,2),
    overage_amount DECIMAL(10,2) DEFAULT 0,
    overage_paid INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    checked_in_at DATETIME,
    checked_in_by TEXT,
    completed_at DATETIME,
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    qr_code TEXT,
    qr_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data
INSERT INTO alacarte_vouchers_new 
SELECT * FROM alacarte_vouchers;

-- Drop old table
DROP TABLE alacarte_vouchers;

-- Rename new table
ALTER TABLE alacarte_vouchers_new RENAME TO alacarte_vouchers;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON alacarte_vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_vouchers_pass ON alacarte_vouchers(pass_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON alacarte_vouchers(reservation_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON alacarte_vouchers(status);
