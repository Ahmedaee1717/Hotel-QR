-- ============================================
-- MOBILE SHOWCASE MIGRATION
-- For homepage product screenshots
-- ============================================

-- Mobile showcase screenshots
CREATE TABLE IF NOT EXISTS mobile_showcase (
  showcase_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_showcase_order ON mobile_showcase(display_order, is_active);

-- Insert sample screenshots (placeholder URLs - Super Admin will replace)
INSERT INTO mobile_showcase (title, description, image_url, display_order) VALUES
  ('Welcome Screen', 'Beautiful welcome experience for guests', 'https://via.placeholder.com/375x812/016e8f/ffffff?text=Welcome+Screen', 1),
  ('Room Service Menu', 'Browse and order from digital menus', 'https://via.placeholder.com/375x812/016e8f/ffffff?text=Room+Service', 2),
  ('Beach Booking', 'Reserve beach chairs and umbrellas', 'https://via.placeholder.com/375x812/016e8f/ffffff?text=Beach+Booking', 3),
  ('Spa Appointments', 'Book spa treatments with ease', 'https://via.placeholder.com/375x812/016e8f/ffffff?text=Spa+Booking', 4),
  ('Activity Booking', 'Discover and book hotel activities', 'https://via.placeholder.com/375x812/016e8f/ffffff?text=Activities', 5);
