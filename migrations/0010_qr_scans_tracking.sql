-- QR Scans Tracking Table
CREATE TABLE IF NOT EXISTS qr_scans (
  scan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  scan_date DATE NOT NULL DEFAULT (date('now')),
  scan_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_qr_scans_property_date ON qr_scans(property_id, scan_date);
CREATE INDEX IF NOT EXISTS idx_qr_scans_timestamp ON qr_scans(scan_timestamp);

-- Page Views Tracking Table
CREATE TABLE IF NOT EXISTS page_views (
  view_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  page_type TEXT NOT NULL, -- 'activities', 'restaurants', 'spa', 'events', 'custom_section', etc.
  page_id TEXT, -- section_id, activity_id, etc.
  view_date DATE NOT NULL DEFAULT (date('now')),
  view_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_page_views_property_date ON page_views(property_id, view_date);
CREATE INDEX IF NOT EXISTS idx_page_views_type ON page_views(page_type);
