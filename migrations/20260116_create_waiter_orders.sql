-- Migration: Create waiter_orders table for waiter dashboard
-- Purpose: Track orders taken by waiters at tables with staff incentives

-- Create waiter_orders table
CREATE TABLE IF NOT EXISTS waiter_orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL REFERENCES restaurant_tables(table_id),
  restaurant_id INTEGER NOT NULL,
  waiter_id INTEGER NOT NULL REFERENCES users(user_id),
  guest_name TEXT NOT NULL,
  room_number TEXT,
  party_size INTEGER NOT NULL,
  items TEXT NOT NULL DEFAULT '[]', -- JSON array of {item_id, item_name, cost, quantity}
  total_cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, preparing, ready, served, cleared
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waiter_orders_table 
ON waiter_orders(table_id);

CREATE INDEX IF NOT EXISTS idx_waiter_orders_waiter 
ON waiter_orders(waiter_id);

CREATE INDEX IF NOT EXISTS idx_waiter_orders_status 
ON waiter_orders(status);

CREATE INDEX IF NOT EXISTS idx_waiter_orders_restaurant 
ON waiter_orders(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_waiter_orders_waiter_status 
ON waiter_orders(waiter_id, status);
