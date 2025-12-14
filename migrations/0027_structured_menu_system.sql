-- =====================================================
-- STRUCTURED MENU SYSTEM (Uber Eats style)
-- AI-powered menu parser with categories, items, prices
-- =====================================================

-- Menu categories (Appetizers, Main Course, Desserts, etc.)
CREATE TABLE IF NOT EXISTS menu_categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  category_name_native TEXT,
  category_description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES restaurant_menus(menu_id) ON DELETE CASCADE
);

-- Menu items (individual dishes)
CREATE TABLE IF NOT EXISTS menu_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_name_native TEXT,
  description TEXT,
  description_native TEXT,
  price REAL,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  is_vegetarian BOOLEAN DEFAULT 0,
  is_vegan BOOLEAN DEFAULT 0,
  is_gluten_free BOOLEAN DEFAULT 0,
  spice_level TEXT CHECK(spice_level IN ('none', 'mild', 'medium', 'hot', 'extra_hot')),
  calories INTEGER,
  allergens TEXT, -- JSON array: ["nuts", "dairy", "gluten"]
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT 1,
  is_popular BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES menu_categories(category_id) ON DELETE CASCADE
);

-- Translations for categories
CREATE TABLE IF NOT EXISTS menu_category_translations (
  translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  category_description TEXT,
  translated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES menu_categories(category_id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES supported_languages(language_code),
  UNIQUE(category_id, language_code)
);

-- Translations for menu items
CREATE TABLE IF NOT EXISTS menu_item_translations (
  translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  translated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES supported_languages(language_code),
  UNIQUE(item_id, language_code)
);

-- AI parsing logs
CREATE TABLE IF NOT EXISTS menu_parsing_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_json TEXT, -- Structured JSON output from AI
  categories_found INTEGER DEFAULT 0,
  items_found INTEGER DEFAULT 0,
  parsing_status TEXT DEFAULT 'pending' CHECK(parsing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES restaurant_menus(menu_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_categories_menu ON menu_categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_popular ON menu_items(is_popular, is_available);
CREATE INDEX IF NOT EXISTS idx_category_translations ON menu_category_translations(category_id, language_code);
CREATE INDEX IF NOT EXISTS idx_item_translations ON menu_item_translations(item_id, language_code);
CREATE INDEX IF NOT EXISTS idx_parsing_logs_menu ON menu_parsing_logs(menu_id);
