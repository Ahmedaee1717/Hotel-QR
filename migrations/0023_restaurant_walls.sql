-- Restaurant Walls for Floor Plan
-- Draw walls by clicking start and end points

CREATE TABLE IF NOT EXISTS restaurant_walls (
  wall_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  
  -- Wall endpoints (line from point A to point B)
  start_x INTEGER NOT NULL,
  start_y INTEGER NOT NULL,
  end_x INTEGER NOT NULL,
  end_y INTEGER NOT NULL,
  
  -- Visual styling
  thickness INTEGER DEFAULT 4,      -- Wall thickness in pixels
  color TEXT DEFAULT '#64748B',     -- Wall color
  style TEXT DEFAULT 'solid',       -- 'solid', 'dashed', 'door', 'window'
  
  -- Metadata
  label TEXT,                       -- Optional label (e.g., "North Wall")
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_walls_offering ON restaurant_walls(offering_id);
CREATE INDEX IF NOT EXISTS idx_walls_active ON restaurant_walls(is_active);

-- Remove 'wall' from floor_plan_elements types (we'll use wall drawing instead)
-- Note: Existing wall elements will remain but new ones should use wall drawing tool
