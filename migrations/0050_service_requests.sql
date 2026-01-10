-- Service Requests System
-- Guest service request feature for housekeeping, maintenance, etc.

-- Service Types Table (admin-configurable)
CREATE TABLE IF NOT EXISTS service_types (
  service_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  service_icon TEXT DEFAULT 'fa-concierge-bell', -- FontAwesome icon class
  service_color TEXT DEFAULT '#D4AF37', -- Display color
  description TEXT,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  estimated_response_minutes INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Service Requests Table
CREATE TABLE IF NOT EXISTS service_requests (
  request_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  service_type_id INTEGER NOT NULL,
  pass_id INTEGER, -- Optional: link to guest pass
  guest_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  request_details TEXT,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'pending', -- pending, acknowledged, in_progress, completed, cancelled
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME,
  started_at DATETIME,
  completed_at DATETIME,
  assigned_to_user_id INTEGER, -- Staff member assigned
  admin_notes TEXT, -- Internal notes for staff
  completion_notes TEXT, -- Notes added when completing
  rating INTEGER, -- Guest rating (1-5)
  feedback TEXT, -- Guest feedback after completion
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(service_type_id),
  FOREIGN KEY (pass_id) REFERENCES digital_passes(pass_id),
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_requests_property ON service_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_requested_at ON service_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_pass ON service_requests(pass_id);
CREATE INDEX IF NOT EXISTS idx_service_types_property ON service_types(property_id);

-- Insert default service types for demo
INSERT OR IGNORE INTO service_types (service_type_id, property_id, service_name, service_icon, service_color, description, display_order, estimated_response_minutes)
VALUES 
  (1, 1, 'Housekeeping', 'fa-broom', '#10B981', 'Room cleaning and linen service', 1, 30),
  (2, 1, 'Maintenance', 'fa-tools', '#F59E0B', 'Technical issues and repairs', 2, 45),
  (3, 1, 'Extra Amenities', 'fa-bed', '#8B5CF6', 'Additional towels, pillows, etc.', 3, 20),
  (4, 1, 'Laundry Service', 'fa-tshirt', '#3B82F6', 'Laundry and ironing', 4, 120),
  (5, 1, 'Concierge', 'fa-concierge-bell', '#EF4444', 'General assistance and requests', 5, 15);
