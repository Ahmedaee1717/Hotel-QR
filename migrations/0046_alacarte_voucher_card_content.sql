-- À La Carte Voucher Card Content (customizable by admin)
CREATE TABLE IF NOT EXISTS alacarte_voucher_card_content (
  content_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  title_en TEXT NOT NULL DEFAULT 'Voucher Eligible!',
  title_ar TEXT,
  message_en TEXT NOT NULL DEFAULT 'This meal is INCLUDED in your all-inclusive package!',
  message_ar TEXT,
  disclaimer_en TEXT DEFAULT 'Premium items may have additional charges based on your tier.',
  disclaimer_ar TEXT,
  icon TEXT DEFAULT 'fa-ticket-alt',
  color_scheme TEXT DEFAULT 'green',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Insert default content
INSERT OR IGNORE INTO alacarte_voucher_card_content (property_id, content_id)
VALUES (1, 1);
