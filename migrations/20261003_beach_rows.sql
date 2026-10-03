-- Live beach rows: a row of N spots spaced along a line on the photo; the app can draw its umbrellas
CREATE TABLE IF NOT EXISTS beach_rows (
  row_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  row_no INTEGER NOT NULL,
  live INTEGER NOT NULL DEFAULT 0,
  x_start REAL NOT NULL,
  x_end REAL NOT NULL,
  y_top REAL NOT NULL,
  spot_count INTEGER NOT NULL,
  numbering TEXT NOT NULL DEFAULT 'ltr',
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (property_id, row_no)
);
-- Areas of a row as spot-number ranges: pets welcome, quiet area, other — with a note for guests
CREATE TABLE IF NOT EXISTS beach_areas (
  area_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  row_no INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  label TEXT NOT NULL,
  note TEXT,
  from_num INTEGER NOT NULL,
  to_num INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_beach_areas_row ON beach_areas (property_id, row_no);
