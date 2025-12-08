-- Restaurant Menus Table
CREATE TABLE IF NOT EXISTS restaurant_menus (
  menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  menu_name TEXT NOT NULL,
  menu_url TEXT NOT NULL, -- URL to uploaded menu PDF/image
  menu_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'drinks', 'desserts', 'full'
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_menus_offering ON restaurant_menus(offering_id, is_active);
