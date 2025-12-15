-- Custom Section Translations Table for On-Demand AI Translation
CREATE TABLE IF NOT EXISTS custom_section_translations (
  translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES custom_sections(section_id) ON DELETE CASCADE,
  UNIQUE(section_id, language_code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_section_translations_lookup 
ON custom_section_translations(section_id, language_code);
