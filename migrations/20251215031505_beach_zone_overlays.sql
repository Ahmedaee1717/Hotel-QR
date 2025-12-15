-- Beach Zone Overlays for visual areas on beach map
CREATE TABLE IF NOT EXISTS beach_zone_overlays (
  overlay_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  zone_name TEXT NOT NULL,
  shape_type TEXT DEFAULT 'rectangle',
  coordinates TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  opacity REAL DEFAULT 0.3,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

CREATE INDEX IF NOT EXISTS idx_beach_zone_overlays_property ON beach_zone_overlays(property_id);
