-- Enhanced Restaurant Menus with OCR and Translation Support
-- Drop old table if exists
DROP TABLE IF EXISTS restaurant_menus;

-- New comprehensive restaurant menus table
CREATE TABLE IF NOT EXISTS restaurant_menus (
  menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  menu_name TEXT NOT NULL,
  menu_type TEXT DEFAULT 'full', -- 'breakfast', 'lunch', 'dinner', 'drinks', 'desserts', 'full'
  
  -- Original uploaded image
  original_image_url TEXT NOT NULL,
  
  -- OCR extracted text (base language)
  extracted_text TEXT,
  ocr_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  ocr_processed_at DATETIME,
  
  -- Base language
  base_language TEXT DEFAULT 'en', -- ISO 639-1 code
  
  -- Translation status
  translation_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'partial', 'failed'
  translated_at DATETIME,
  
  -- Display settings
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  
  -- QR code settings
  qr_code_enabled INTEGER DEFAULT 1,
  qr_code_url TEXT, -- Generated QR code for guest access
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  
  FOREIGN KEY (offering_id) REFERENCES hotel_offerings(offering_id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Menu translations table (supports unlimited languages)
CREATE TABLE IF NOT EXISTS restaurant_menu_translations (
  translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  language_code TEXT NOT NULL, -- ISO 639-1 code: 'en', 'ar', 'es', 'fr', 'de', 'zh', 'ja', etc.
  translated_text TEXT NOT NULL,
  translation_method TEXT DEFAULT 'ai', -- 'ai', 'manual', 'hybrid'
  translation_quality TEXT DEFAULT 'auto', -- 'auto', 'reviewed', 'verified', 'certified'
  translated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  translated_by INTEGER, -- user_id who performed/verified translation
  
  FOREIGN KEY (menu_id) REFERENCES restaurant_menus(menu_id) ON DELETE CASCADE,
  FOREIGN KEY (translated_by) REFERENCES users(id),
  UNIQUE(menu_id, language_code)
);

-- Menu sections (for structured menus - optional)
CREATE TABLE IF NOT EXISTS restaurant_menu_sections (
  section_id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  section_name TEXT NOT NULL,
  section_name_translations TEXT, -- JSON: {"en": "Appetizers", "ar": "المقبلات", ...}
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  
  FOREIGN KEY (menu_id) REFERENCES restaurant_menus(menu_id) ON DELETE CASCADE
);

-- Menu items (for structured menus - optional)
CREATE TABLE IF NOT EXISTS restaurant_menu_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER,
  menu_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_price DECIMAL(10,2),
  price_currency TEXT DEFAULT 'USD',
  
  -- Multilingual support
  item_name_translations TEXT, -- JSON: {"en": "Caesar Salad", "ar": "سلطة سيزر", ...}
  item_description_translations TEXT, -- JSON
  
  -- Dietary & allergen info
  dietary_tags TEXT, -- JSON: ["vegetarian", "gluten-free", ...]
  allergens TEXT, -- JSON: ["nuts", "dairy", ...]
  
  -- Visual
  item_image_url TEXT,
  
  display_order INTEGER DEFAULT 0,
  is_available INTEGER DEFAULT 1,
  is_popular INTEGER DEFAULT 0,
  
  FOREIGN KEY (section_id) REFERENCES restaurant_menu_sections(section_id) ON DELETE SET NULL,
  FOREIGN KEY (menu_id) REFERENCES restaurant_menus(menu_id) ON DELETE CASCADE
);

-- Menu access logs (track guest QR scans)
CREATE TABLE IF NOT EXISTS restaurant_menu_access_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  language_code TEXT DEFAULT 'en',
  property_id INTEGER,
  guest_ip TEXT,
  user_agent TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (menu_id) REFERENCES restaurant_menus(menu_id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_menus_offering ON restaurant_menus(offering_id, is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_menus_ocr ON restaurant_menus(ocr_status);
CREATE INDEX IF NOT EXISTS idx_menu_translations_menu ON restaurant_menu_translations(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_translations_lang ON restaurant_menu_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_menu_sections_menu ON restaurant_menu_sections(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu ON restaurant_menu_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_section ON restaurant_menu_items(section_id);
CREATE INDEX IF NOT EXISTS idx_menu_access_logs_menu ON restaurant_menu_access_logs(menu_id);

-- Insert sample supported languages
CREATE TABLE IF NOT EXISTS supported_languages (
  lang_id INTEGER PRIMARY KEY AUTOINCREMENT,
  language_code TEXT NOT NULL UNIQUE,
  language_name_en TEXT NOT NULL,
  language_name_native TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0
);

-- Popular languages for restaurant menus
INSERT OR IGNORE INTO supported_languages (language_code, language_name_en, language_name_native, display_order) VALUES
('en', 'English', 'English', 1),
('ar', 'Arabic', 'العربية', 2),
('es', 'Spanish', 'Español', 3),
('fr', 'French', 'Français', 4),
('de', 'German', 'Deutsch', 5),
('it', 'Italian', 'Italiano', 6),
('pt', 'Portuguese', 'Português', 7),
('ru', 'Russian', 'Русский', 8),
('zh', 'Chinese', '中文', 9),
('ja', 'Japanese', '日本語', 10),
('ko', 'Korean', '한국어', 11),
('hi', 'Hindi', 'हिन्दी', 12),
('tr', 'Turkish', 'Türkçe', 13),
('nl', 'Dutch', 'Nederlands', 14),
('pl', 'Polish', 'Polski', 15),
('sv', 'Swedish', 'Svenska', 16),
('no', 'Norwegian', 'Norsk', 17),
('da', 'Danish', 'Dansk', 18),
('fi', 'Finnish', 'Suomi', 19),
('el', 'Greek', 'Ελληνικά', 20),
('he', 'Hebrew', 'עברית', 21),
('th', 'Thai', 'ไทย', 22),
('vi', 'Vietnamese', 'Tiếng Việt', 23),
('id', 'Indonesian', 'Bahasa Indonesia', 24),
('ms', 'Malay', 'Bahasa Melayu', 25),
('tl', 'Filipino', 'Filipino', 26),
('cs', 'Czech', 'Čeština', 27),
('hu', 'Hungarian', 'Magyar', 28),
('ro', 'Romanian', 'Română', 29),
('uk', 'Ukrainian', 'Українська', 30);
