-- Add checked_in_at and checked_in_by columns to waiter_orders table
ALTER TABLE waiter_orders ADD COLUMN checked_in_at DATETIME DEFAULT NULL;
ALTER TABLE waiter_orders ADD COLUMN checked_in_by TEXT DEFAULT NULL;
