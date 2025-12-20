-- Fix foreign key in guest_stay_plans to reference digital_passes instead of guests

-- SQLite doesn't support ALTER TABLE to modify foreign keys
-- So we need to recreate the table

-- First, rename the old table
ALTER TABLE guest_stay_plans RENAME TO guest_stay_plans_old;

-- Create new table with correct foreign key
CREATE TABLE guest_stay_plans (\n  plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  total_nights INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES digital_passes(pass_id),
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Copy data if any exists
INSERT INTO guest_stay_plans 
SELECT * FROM guest_stay_plans_old;

-- Drop old table
DROP TABLE guest_stay_plans_old;
