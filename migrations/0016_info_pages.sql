-- Migration: Add Info Pages System for standalone information pages

-- Info Pages Table
CREATE TABLE IF NOT EXISTS info_pages (
  page_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  page_key TEXT NOT NULL,
  
  -- Multilingual titles
  title_en TEXT NOT NULL,
  title_ar TEXT,
  title_de TEXT,
  title_ru TEXT,
  title_pl TEXT,
  title_it TEXT,
  title_fr TEXT,
  title_cs TEXT,
  title_uk TEXT,
  title_zh TEXT,
  
  -- Rich HTML content for each language
  content_en TEXT NOT NULL,
  content_ar TEXT,
  content_de TEXT,
  content_ru TEXT,
  content_pl TEXT,
  content_it TEXT,
  content_fr TEXT,
  content_cs TEXT,
  content_uk TEXT,
  content_zh TEXT,
  
  -- Visual styling
  icon_class TEXT DEFAULT 'fas fa-info-circle',
  color_theme TEXT DEFAULT 'blue',
  
  -- Layout options
  layout_type TEXT DEFAULT 'single-column',
  
  -- Display settings
  is_published INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  show_in_menu INTEGER DEFAULT 1,
  
  -- SEO and metadata
  meta_description_en TEXT,
  meta_description_ar TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, page_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_info_pages_property ON info_pages(property_id);
CREATE INDEX IF NOT EXISTS idx_info_pages_published ON info_pages(property_id, is_published);
CREATE INDEX IF NOT EXISTS idx_info_pages_menu ON info_pages(property_id, show_in_menu, is_published);
CREATE INDEX IF NOT EXISTS idx_info_pages_order ON info_pages(property_id, display_order);
