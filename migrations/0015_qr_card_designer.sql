-- QR Code Card Designer Settings
CREATE TABLE IF NOT EXISTS qr_card_designs (
  design_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  
  -- Card settings
  card_title TEXT DEFAULT 'Welcome!',
  card_subtitle TEXT,
  bottom_message TEXT DEFAULT 'Scan for more information',
  footer_text TEXT,
  
  -- QR Code styling
  qr_size TEXT DEFAULT 'large' CHECK(qr_size IN ('small', 'medium', 'large', 'extra_large')),
  qr_color TEXT DEFAULT '#000000',
  qr_bg_color TEXT DEFAULT '#FFFFFF',
  
  -- Card design
  card_style TEXT DEFAULT 'modern' CHECK(card_style IN ('modern', 'classic', 'minimal', 'elegant', 'festive')),
  card_bg_color TEXT DEFAULT '#FFFFFF',
  card_border_color TEXT DEFAULT '#E5E7EB',
  text_color TEXT DEFAULT '#1F2937',
  
  -- Layout
  logo_position TEXT DEFAULT 'top' CHECK(logo_position IN ('top', 'bottom', 'none')),
  show_hotel_name INTEGER DEFAULT 1,
  show_logo INTEGER DEFAULT 1,
  show_qr_border INTEGER DEFAULT 1,
  
  -- Festive overlays
  festive_overlay TEXT DEFAULT 'none' CHECK(festive_overlay IN ('none', 'christmas_hat', 'santa_hat', 'snow_frame', 'confetti_border', 'ramadan_crescent', 'eid_stars', 'hearts', 'halloween_pumpkin')),
  overlay_position TEXT DEFAULT 'top-right',
  
  -- Print settings
  page_size TEXT DEFAULT 'a4' CHECK(page_size IN ('a4', 'a5', 'letter', 'card')),
  orientation TEXT DEFAULT 'portrait' CHECK(orientation IN ('portrait', 'landscape')),
  cards_per_page INTEGER DEFAULT 1,
  
  -- Template presets
  template_name TEXT,
  is_default INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qr_card_property ON qr_card_designs(property_id);
CREATE INDEX IF NOT EXISTS idx_qr_card_default ON qr_card_designs(is_default);

-- Insert default design for existing property
INSERT OR IGNORE INTO qr_card_designs (
  property_id, 
  card_title, 
  bottom_message,
  template_name,
  is_default
) VALUES (
  1, 
  'Welcome to Paradise Resort!', 
  'Scan here to explore our services',
  'Default',
  1
);
