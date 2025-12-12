-- AI-Powered Restaurant Floor Plan Textures
-- Stores extracted textures from restaurant photos for realistic floor plans

CREATE TABLE IF NOT EXISTS restaurant_textures (
  texture_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  
  -- Original uploaded image
  original_image_url TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- AI-extracted textures
  floor_texture_url TEXT,           -- Extracted floor texture image
  floor_texture_type TEXT,          -- AI-detected type (wood, tile, marble, carpet, concrete, etc.)
  floor_color_primary TEXT,         -- Hex color of dominant floor color
  floor_color_secondary TEXT,       -- Hex color of secondary floor color
  
  table_texture_url TEXT,           -- Extracted table surface texture
  table_texture_type TEXT,          -- AI-detected type (wood, glass, metal, marble, etc.)
  table_color_primary TEXT,         -- Hex color of dominant table color
  table_color_secondary TEXT,       -- Hex color of secondary table color
  
  -- AI analysis metadata
  ai_analysis_data TEXT,            -- JSON data from AI analysis
  confidence_score REAL,            -- AI confidence score (0-1)
  
  -- Settings
  is_active INTEGER DEFAULT 1,      -- Enable/disable texture overlay
  floor_opacity REAL DEFAULT 0.8,   -- Floor texture opacity (0-1)
  table_opacity REAL DEFAULT 0.9,   -- Table texture opacity (0-1)
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurant_textures_offering ON restaurant_textures(offering_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_textures_property ON restaurant_textures(property_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_textures_active ON restaurant_textures(is_active);

-- Insert default entry for existing restaurant (offering_id = 1)
INSERT OR IGNORE INTO restaurant_textures (
  offering_id, 
  property_id, 
  is_active,
  floor_color_primary,
  table_color_primary
) VALUES (
  1, 
  1, 
  0,  -- Disabled by default until admin uploads photo
  '#F3F4F6',  -- Default light gray floor
  '#FFFFFF'   -- Default white tables
);
