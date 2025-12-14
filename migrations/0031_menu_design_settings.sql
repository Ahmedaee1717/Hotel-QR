-- Menu design customization settings per restaurant
CREATE TABLE IF NOT EXISTS restaurant_menu_design (
  design_id INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id INTEGER NOT NULL,
  
  -- Layout Settings
  layout_style TEXT DEFAULT 'classic', -- classic, modern, elegant, minimal, grid
  columns_count INTEGER DEFAULT 1, -- 1, 2, 3 columns
  item_spacing TEXT DEFAULT 'comfortable', -- compact, comfortable, spacious
  
  -- Color Theme
  primary_color TEXT DEFAULT '#1a1a1a',
  secondary_color TEXT DEFAULT '#666666',
  accent_color TEXT DEFAULT '#d4af37', -- gold
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1a1a1a',
  price_color TEXT DEFAULT '#d4af37',
  
  -- Typography
  heading_font TEXT DEFAULT 'Playfair Display', -- serif, elegant
  body_font TEXT DEFAULT 'Lato', -- sans-serif, clean
  font_size_base INTEGER DEFAULT 16,
  heading_size INTEGER DEFAULT 32,
  item_name_size INTEGER DEFAULT 20,
  
  -- Visual Elements
  show_images BOOLEAN DEFAULT 1,
  image_position TEXT DEFAULT 'left', -- left, right, top, none
  image_size TEXT DEFAULT 'medium', -- small, medium, large
  show_dividers BOOLEAN DEFAULT 1,
  divider_style TEXT DEFAULT 'line', -- line, dots, none
  show_category_icons BOOLEAN DEFAULT 1,
  
  -- Header/Banner
  show_restaurant_logo BOOLEAN DEFAULT 1,
  header_style TEXT DEFAULT 'centered', -- centered, left, full
  show_restaurant_name BOOLEAN DEFAULT 1,
  show_restaurant_description BOOLEAN DEFAULT 1,
  header_background_color TEXT DEFAULT '#000000',
  header_text_color TEXT DEFAULT '#ffffff',
  
  -- Item Display
  show_descriptions BOOLEAN DEFAULT 1,
  show_prices BOOLEAN DEFAULT 1,
  price_position TEXT DEFAULT 'right', -- right, below, inline
  show_dietary_icons BOOLEAN DEFAULT 1, -- vegan, vegetarian, gluten-free, etc.
  show_spice_level BOOLEAN DEFAULT 1,
  
  -- Special Effects
  hover_effect TEXT DEFAULT 'subtle', -- subtle, bold, none
  animation_style TEXT DEFAULT 'smooth', -- smooth, bouncy, none
  border_radius INTEGER DEFAULT 8, -- 0-20 px
  shadow_intensity TEXT DEFAULT 'medium', -- none, light, medium, strong
  
  -- Language Switcher
  language_switcher_position TEXT DEFAULT 'top-right', -- top-right, top-left, floating
  language_switcher_style TEXT DEFAULT 'dropdown', -- dropdown, flags, buttons
  
  -- Custom CSS
  custom_css TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(offering_id)
);

-- Insert default design for existing restaurants
INSERT OR IGNORE INTO restaurant_menu_design (offering_id)
SELECT offering_id FROM hotel_offerings WHERE offering_type = 'restaurant';
