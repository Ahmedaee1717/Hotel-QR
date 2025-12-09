-- Migration: Interactive Hotel Maps System
-- Allows admins to create interactive, clickable maps with hotspots

-- Table: hotel_map_hotspots
-- Stores clickable hotspots on hotel maps (buildings, facilities, points of interest)
CREATE TABLE IF NOT EXISTS hotel_map_hotspots (
  hotspot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  
  -- Visual positioning (percentage-based for responsive scaling)
  position_x REAL NOT NULL, -- X coordinate as percentage (0-100)
  position_y REAL NOT NULL, -- Y coordinate as percentage (0-100)
  width REAL DEFAULT 5, -- Width as percentage
  height REAL DEFAULT 5, -- Height as percentage
  shape TEXT DEFAULT 'rectangle', -- rectangle, circle, polygon
  
  -- Hotspot content
  hotspot_type TEXT NOT NULL, -- building, facility, poi, amenity
  title TEXT NOT NULL,
  subtitle TEXT, -- e.g., "Building 23", "Main Pool"
  description TEXT,
  icon_class TEXT, -- Font Awesome icon class
  icon_emoji TEXT, -- Alternative emoji icon
  
  -- Categorization (from legend)
  category TEXT, -- accommodation, pool, restaurant, fitness, clinic, etc.
  building_number TEXT, -- For buildings: "23", "17", etc.
  
  -- Linking
  link_url TEXT, -- Link to booking page, details, etc.
  link_type TEXT, -- internal, external, booking, info
  
  -- Styling
  color TEXT DEFAULT '#3B82F6',
  hover_color TEXT DEFAULT '#2563EB',
  
  -- Visibility
  is_visible INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
);

-- Table: hotel_map_categories
-- Define legend/key categories for filtering
CREATE TABLE IF NOT EXISTS hotel_map_categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  
  category_key TEXT NOT NULL, -- accommodation, pool, restaurant, etc.
  category_name TEXT NOT NULL,
  icon_class TEXT,
  icon_emoji TEXT,
  color TEXT DEFAULT '#3B82F6',
  
  is_visible INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  UNIQUE(property_id, category_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotel_map_hotspots_property ON hotel_map_hotspots(property_id);
CREATE INDEX IF NOT EXISTS idx_hotel_map_hotspots_visible ON hotel_map_hotspots(is_visible);
CREATE INDEX IF NOT EXISTS idx_hotel_map_hotspots_category ON hotel_map_hotspots(category);
CREATE INDEX IF NOT EXISTS idx_hotel_map_categories_property ON hotel_map_categories(property_id);

-- Insert default map categories (based on Hilton resort map legend)
INSERT INTO hotel_map_categories (property_id, category_key, category_name, icon_class, icon_emoji, color, display_order) VALUES
  (1, 'accommodation', 'Accommodations', 'fas fa-bed', '🏨', '#D97706', 1),
  (1, 'pool', 'Pools', 'fas fa-swimming-pool', '🏊', '#3B82F6', 2),
  (1, 'restaurant', 'Restaurants', 'fas fa-utensils', '🍽️', '#10B981', 3),
  (1, 'spa', 'Spa & Wellness', 'fas fa-spa', '💆', '#8B5CF6', 4),
  (1, 'fitness', 'Fitness Center', 'fas fa-dumbbell', '🏋️', '#EF4444', 5),
  (1, 'clinic', 'Medical Clinic', 'fas fa-clinic-medical', '🏥', '#DC2626', 6),
  (1, 'water-sports', 'Water Sports', 'fas fa-water', '🏄', '#06B6D4', 7),
  (1, 'diving', 'Diving', 'fas fa-mask-snorkel', '🤿', '#0891B2', 8),
  (1, 'kids-club', 'Kids Club', 'fas fa-child', '👶', '#F59E0B', 9),
  (1, 'reception', 'Reception', 'fas fa-concierge-bell', '🛎️', '#6366F1', 10),
  (1, 'bank', 'Bank', 'fas fa-building-columns', '🏦', '#64748B', 11),
  (1, 'toilets', 'Toilets', 'fas fa-restroom', '🚻', '#94A3B8', 12),
  (1, 'massage', 'Massage', 'fas fa-hands', '💆', '#A855F7', 13),
  (1, 'beach', 'Beach Access', 'fas fa-umbrella-beach', '🏖️', '#F97316', 14);
