-- Super Admin Support Ticket System
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK(category IN ('general', 'technical', 'billing', 'feature_request', 'bug_report')),
  
  -- User info (who created the ticket)
  created_by_type TEXT NOT NULL CHECK(created_by_type IN ('hotel', 'vendor', 'superadmin')),
  created_by_id INTEGER NOT NULL,
  created_by_email TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  
  -- Assignment
  assigned_to_id INTEGER, -- superadmin user ID
  assigned_to_name TEXT,
  
  -- Metadata
  property_id INTEGER, -- if hotel-related
  vendor_id INTEGER, -- if vendor-related
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  closed_at DATETIME,
  
  -- Indexes
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON support_tickets(created_by_type, created_by_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON support_tickets(created_at DESC);

-- Ticket Messages/Replies
CREATE TABLE IF NOT EXISTS ticket_messages (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  
  -- Message content
  message TEXT NOT NULL,
  is_internal_note INTEGER DEFAULT 0, -- 1 if only visible to superadmins
  
  -- Author info
  author_type TEXT NOT NULL CHECK(author_type IN ('hotel', 'vendor', 'superadmin')),
  author_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  
  -- Attachments (URLs separated by newlines)
  attachments TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);

-- Live Chat System
CREATE TABLE IF NOT EXISTS chat_rooms (
  room_id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_type TEXT NOT NULL CHECK(room_type IN ('hotel_support', 'vendor_support', 'direct')),
  room_name TEXT NOT NULL,
  
  -- Participants
  participant1_type TEXT NOT NULL CHECK(participant1_type IN ('hotel', 'vendor', 'superadmin')),
  participant1_id INTEGER NOT NULL,
  participant1_name TEXT NOT NULL,
  
  participant2_type TEXT CHECK(participant2_type IN ('hotel', 'vendor', 'superadmin')),
  participant2_id INTEGER,
  participant2_name TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'closed')),
  
  -- Metadata
  property_id INTEGER,
  vendor_id INTEGER,
  last_message_at DATETIME,
  unread_count_p1 INTEGER DEFAULT 0,
  unread_count_p2 INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_participants ON chat_rooms(participant1_type, participant1_id, participant2_type, participant2_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status ON chat_rooms(status);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  
  -- Message content
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'file', 'image', 'system')),
  
  -- Sender info
  sender_type TEXT NOT NULL CHECK(sender_type IN ('hotel', 'vendor', 'superadmin')),
  sender_id INTEGER NOT NULL,
  sender_name TEXT NOT NULL,
  
  -- Status
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(room_id, is_read);

-- User Management Table (All platform users)
CREATE TABLE IF NOT EXISTS platform_users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL CHECK(user_type IN ('hotel', 'vendor', 'superadmin')),
  
  -- User credentials
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'inactive', 'pending')),
  is_verified INTEGER DEFAULT 0,
  
  -- Related IDs
  property_id INTEGER, -- if hotel admin
  vendor_id INTEGER, -- if vendor
  
  -- Permissions (JSON string for superadmin roles)
  permissions TEXT,
  
  -- Activity tracking
  last_login_at DATETIME,
  login_count INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  suspended_at DATETIME,
  suspended_reason TEXT,
  
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_users_type ON platform_users(user_type);
CREATE INDEX IF NOT EXISTS idx_platform_users_status ON platform_users(status);
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email);

-- Activity Logs for Super Admin
CREATE TABLE IF NOT EXISTS activity_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Actor (who did the action)
  actor_type TEXT NOT NULL CHECK(actor_type IN ('hotel', 'vendor', 'superadmin', 'system')),
  actor_id INTEGER,
  actor_name TEXT,
  
  -- Action details
  action TEXT NOT NULL, -- e.g., 'user_suspended', 'ticket_created', 'chat_started'
  entity_type TEXT NOT NULL, -- e.g., 'user', 'ticket', 'chat', 'booking'
  entity_id INTEGER,
  
  -- Details (JSON string)
  details TEXT,
  
  -- IP and metadata
  ip_address TEXT,
  user_agent TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
