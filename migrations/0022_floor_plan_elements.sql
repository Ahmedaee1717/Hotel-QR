-- Floor Plan Elements for Restaurant Layout
-- Non-bookable elements like buffet, bar, kitchen, entrance, restrooms, etc.

CREATE TABLE IF NOT EXISTS floor_plan_elements (
  element_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  
  -- Element identification
  element_type TEXT NOT NULL,  -- 'buffet', 'bar', 'kitchen', 'entrance', 'restroom', 'exit', 'window', 'wall', 'plant', 'stage'
  element_label TEXT,           -- Display name (e.g., "Main Buffet", "Cocktail Bar")
  
  -- Position and size
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  rotation INTEGER DEFAULT 0,   -- Rotation in degrees (0, 90, 180, 270)
  
  -- Visual styling
  icon TEXT,                    -- Font Awesome icon class (e.g., 'fa-utensils')
  color TEXT DEFAULT '#94A3B8', -- Background color
  border_color TEXT,            -- Border color
  
  -- Metadata
  description TEXT,             -- Optional description
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_floor_elements_offering ON floor_plan_elements(offering_id);
CREATE INDEX IF NOT EXISTS idx_floor_elements_type ON floor_plan_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_floor_elements_active ON floor_plan_elements(is_active);

-- Insert sample elements for restaurant 1
INSERT OR IGNORE INTO floor_plan_elements (offering_id, property_id, element_type, element_label, position_x, position_y, width, height, icon, color, description) VALUES
(1, 1, 'buffet', 'Main Buffet', 50, 400, 200, 100, 'fa-utensils', '#FCD34D', 'Self-service breakfast buffet'),
(1, 1, 'bar', 'Beverage Bar', 650, 400, 120, 80, 'fa-glass-cheers', '#FB923C', 'Coffee, tea, and juice station'),
(1, 1, 'entrance', 'Main Entrance', 400, 50, 100, 60, 'fa-door-open', '#6EE7B7', 'Restaurant entrance'),
(1, 1, 'restroom', 'Restrooms', 50, 550, 80, 80, 'fa-restroom', '#A78BFA', 'Guest restrooms'),
(1, 1, 'kitchen', 'Kitchen', 700, 500, 100, 120, 'fa-fire-burner', '#EF4444', 'Kitchen area (staff only)');
