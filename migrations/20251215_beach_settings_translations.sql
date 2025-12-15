-- Beach Settings Translations Table for On-Demand AI Translation
CREATE TABLE IF NOT EXISTS beach_settings_translations (
  translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  card_title TEXT,
  card_subtitle TEXT,
  feature1_text TEXT,
  feature2_text TEXT,
  feature3_text TEXT,
  button_text TEXT,
  umbrellas_label TEXT,
  umbrellas_desc TEXT,
  cabanas_label TEXT,
  cabanas_desc TEXT,
  loungers_label TEXT,
  loungers_desc TEXT,
  daybeds_label TEXT,
  daybeds_desc TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (setting_id) REFERENCES beach_settings(setting_id) ON DELETE CASCADE,
  UNIQUE(setting_id, language_code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_beach_translations_lookup 
ON beach_settings_translations(setting_id, language_code);
