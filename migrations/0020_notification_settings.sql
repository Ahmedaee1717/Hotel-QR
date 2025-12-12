-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  
  -- Sound settings
  sound_enabled INTEGER DEFAULT 1,
  persistent_beep INTEGER DEFAULT 0, -- Continue beeping until acknowledged
  beep_interval_ms INTEGER DEFAULT 3000, -- How often to repeat beep
  beep_frequency INTEGER DEFAULT 800, -- Sound frequency in Hz
  beep_duration_ms INTEGER DEFAULT 500, -- Duration of each beep
  
  -- Notification types with persistent beep
  persistent_new_bookings INTEGER DEFAULT 1,
  persistent_new_callbacks INTEGER DEFAULT 1,
  persistent_new_feedback INTEGER DEFAULT 0,
  persistent_new_chat INTEGER DEFAULT 0,
  
  -- Popup settings
  show_popup INTEGER DEFAULT 1,
  popup_auto_close_seconds INTEGER DEFAULT 0, -- 0 means manual close only
  
  -- Refresh intervals
  refresh_interval_ms INTEGER DEFAULT 300000, -- 5 minutes
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  UNIQUE(property_id)
);

-- Insert default settings for existing property
INSERT OR IGNORE INTO notification_settings (
  property_id,
  persistent_beep,
  persistent_new_bookings,
  persistent_new_callbacks
) VALUES (1, 1, 1, 1);
