-- Guest-app editor: opening hours on venues, a tile-order list the home screen actually reads, and
-- per-page restaurant menus stored as URLs (R2) instead of base64 arrays. Additive only.
-- Applied to production D1 (webapp-production) on 2026-09-30.
ALTER TABLE hotel_offerings ADD COLUMN opening_hours TEXT;      -- free text shown as a chip, e.g. "Daily 7:00–10:30 · 18:30–22:00"
ALTER TABLE hotel_offerings ADD COLUMN tile_subtitle TEXT;      -- optional one-liner under the name on cards
ALTER TABLE properties ADD COLUMN tile_order TEXT;              -- JSON list of tile keys in guest order (see spec)
ALTER TABLE properties ADD COLUMN guest_whatsapp TEXT;          -- number guests can tap to chat (optional)
ALTER TABLE restaurant_menus ADD COLUMN page_url TEXT;          -- one row per menu page; URL served by /api/img/*
ALTER TABLE restaurant_menus ADD COLUMN page_no INTEGER;        -- order within the menu
ALTER TABLE custom_sections ADD COLUMN tile_image_url TEXT;     -- optional tile photo (default: first offering photo)
ALTER TABLE info_pages ADD COLUMN tile_image_url TEXT;
