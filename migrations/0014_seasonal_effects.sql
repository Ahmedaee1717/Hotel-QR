-- Seasonal Effects and Decorations
CREATE TABLE IF NOT EXISTS seasonal_settings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  
  -- Active season/theme
  active_theme TEXT DEFAULT 'none' CHECK(active_theme IN ('none', 'christmas', 'newyear', 'easter', 'ramadan', 'eid', 'halloween', 'valentines', 'custom')),
  is_active INTEGER DEFAULT 0,
  
  -- Effect settings
  enable_snow INTEGER DEFAULT 0,
  enable_fireworks INTEGER DEFAULT 0,
  enable_confetti INTEGER DEFAULT 0,
  enable_lights INTEGER DEFAULT 0,
  enable_overlay INTEGER DEFAULT 0,
  
  -- Overlay settings (images over profile pics, logos, etc.)
  overlay_type TEXT, -- 'santa_hat', 'bunny_ears', 'party_hat', etc.
  overlay_position TEXT DEFAULT 'top-right', -- 'top-left', 'top-right', 'center', etc.
  
  -- Custom decorations
  custom_decorations TEXT, -- JSON array of custom decoration configs
  
  -- Colors and theme customization
  theme_primary_color TEXT,
  theme_secondary_color TEXT,
  custom_message TEXT, -- e.g., "Merry Christmas!", "Happy Eid!"
  
  -- Schedule (optional - auto-activate on specific dates)
  auto_activate_start DATE,
  auto_activate_end DATE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seasonal_property ON seasonal_settings(property_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_active ON seasonal_settings(is_active);
