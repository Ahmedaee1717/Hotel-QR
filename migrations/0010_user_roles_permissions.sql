-- ============================================
-- COMPREHENSIVE USER ROLES & PERMISSIONS SYSTEM
-- ============================================

-- Permissions: Atomic access controls
CREATE TABLE IF NOT EXISTS permissions (
  permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  permission_key TEXT UNIQUE NOT NULL, -- e.g., 'beach_bookings_view', 'restaurant_1_checkin'
  permission_name TEXT NOT NULL,
  permission_category TEXT NOT NULL, -- 'beach', 'restaurant', 'feedback', 'analytics', etc.
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Roles: Predefined role templates
CREATE TABLE IF NOT EXISTS roles (
  role_id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_name TEXT NOT NULL,
  role_description TEXT,
  property_id INTEGER NOT NULL,
  is_system_role INTEGER DEFAULT 0, -- System roles cannot be deleted
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Role Permissions: Which permissions each role has
CREATE TABLE IF NOT EXISTS role_permissions (
  role_permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- User Permissions: Per-user permission overrides
CREATE TABLE IF NOT EXISTS user_permissions (
  user_permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  is_granted INTEGER DEFAULT 1, -- 1 = grant, 0 = revoke
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER, -- user_id of admin who granted
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id),
  UNIQUE(user_id, permission_id)
);

-- Resource Scoping: Limit access to specific resources
CREATE TABLE IF NOT EXISTS user_resource_access (
  access_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL, -- 'restaurant', 'beach', 'vendor', etc.
  resource_id INTEGER NOT NULL, -- ID of the specific resource
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id),
  UNIQUE(user_id, resource_type, resource_id)
);

-- Add role_id to users table
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(role_id);

-- ============================================
-- INSERT DEFAULT ATOMIC PERMISSIONS
-- ============================================

-- Front Desk Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('frontdesk_view', 'View Front Desk Dashboard', 'frontdesk', 'Access to front desk/concierge communications dashboard'),
('frontdesk_respond', 'Respond to Communications', 'frontdesk', 'Ability to respond and add notes to guest communications'),
('frontdesk_resolve', 'Resolve Issues', 'frontdesk', 'Mark issues as resolved');

-- Restaurant Permissions (Atomic)
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('restaurant_view_all', 'View All Restaurants', 'restaurant', 'See all restaurants in the system'),
('restaurant_view', 'View Restaurant Details', 'restaurant', 'View specific restaurant details'),
('restaurant_manage', 'Manage Restaurant Settings', 'restaurant', 'Edit restaurant info, hours, menus'),
('restaurant_reservations_view', 'View Reservations', 'restaurant', 'See reservation list'),
('restaurant_reservations_manage', 'Manage Reservations', 'restaurant', 'Create, update, cancel reservations'),
('restaurant_checkin', 'Check-in Guests', 'restaurant', 'Check guests in/out'),
('restaurant_waitlist', 'Manage Waitlist', 'restaurant', 'Add/remove from waitlist'),
('restaurant_tables', 'Manage Tables & Floor Plan', 'restaurant', 'Edit tables and floor plan'),
('restaurant_sessions', 'Manage Time Slots', 'restaurant', 'Create/delete dining sessions'),
('restaurant_analytics', 'View Restaurant Analytics', 'restaurant', 'Access analytics and reports'),
('restaurant_revenue', 'View Revenue Data', 'restaurant', 'See financial data');

-- Beach Permissions (Atomic)
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('beach_view', 'View Beach Dashboard', 'beach', 'Access beach management dashboard'),
('beach_bookings_view', 'View Beach Bookings', 'beach', 'See booking list'),
('beach_bookings_manage', 'Manage Beach Bookings', 'beach', 'Create, update, cancel bookings'),
('beach_checkin', 'Check-in Beach Guests', 'beach', 'Check guests in/out for beach'),
('beach_zones_manage', 'Manage Beach Zones', 'beach', 'Edit zones and amenities'),
('beach_analytics', 'View Beach Analytics', 'beach', 'Access beach analytics'),
('beach_revenue', 'View Beach Revenue', 'beach', 'See beach financial data'),
('beach_settings', 'Manage Beach Settings', 'beach', 'Configure beach system settings');

-- Feedback Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('feedback_view', 'View Feedback', 'feedback', 'Access feedback submissions'),
('feedback_forms_manage', 'Manage Feedback Forms', 'feedback', 'Create/edit feedback forms'),
('feedback_analytics', 'View Feedback Analytics', 'feedback', 'Access feedback analytics');

-- Analytics Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('analytics_view', 'View Analytics Dashboard', 'analytics', 'Access general analytics'),
('analytics_revenue', 'View Revenue Analytics', 'analytics', 'See all financial data');

-- Settings Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('settings_view', 'View Settings', 'settings', 'Access settings page'),
('settings_manage', 'Manage Settings', 'settings', 'Edit property settings'),
('settings_theme', 'Manage Theme', 'settings', 'Change colors and branding');

-- User Management Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('users_view', 'View Users', 'users', 'See user list'),
('users_create', 'Create Users', 'users', 'Add new users'),
('users_edit', 'Edit Users', 'users', 'Modify user details'),
('users_delete', 'Delete Users', 'users', 'Remove users'),
('users_permissions', 'Manage User Permissions', 'users', 'Grant/revoke permissions'),
('roles_manage', 'Manage Roles', 'users', 'Create/edit roles');

-- Content Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('offerings_manage', 'Manage Offerings', 'content', 'Create/edit offerings'),
('sections_manage', 'Manage Sections', 'content', 'Edit homepage sections'),
('infopages_manage', 'Manage Info Pages', 'content', 'Create/edit info pages'),
('activities_manage', 'Manage Activities', 'content', 'Manage vendor activities');

-- Callback Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('callbacks_view', 'View Callback Requests', 'callbacks', 'See callback requests'),
('callbacks_manage', 'Manage Callbacks', 'callbacks', 'Respond to/complete callbacks');

-- Vendor Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('vendors_view', 'View Vendors', 'vendors', 'See vendor list'),
('vendors_manage', 'Manage Vendors', 'vendors', 'Add/edit vendors');

-- QR Code Permissions
INSERT OR IGNORE INTO permissions (permission_key, permission_name, permission_category, description) VALUES
('qrcode_view', 'View QR Codes', 'qrcode', 'Access QR code generator'),
('qrcode_create', 'Create QR Codes', 'qrcode', 'Generate QR codes');

-- ============================================
-- INSERT DEFAULT SYSTEM ROLES
-- ============================================

-- Super Admin (Full Access)
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(1, 'Super Admin', 'Full system access - can do everything', 1, 1);

-- Hotel Manager (Most Access)
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(2, 'Hotel Manager', 'Manages all hotel operations', 1, 1);

-- Front Desk Staff (Limited)
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(3, 'Front Desk Staff', 'Guest communications and check-ins', 1, 1);

-- Beach Manager
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(4, 'Beach Manager', 'Manages beach operations', 1, 1);

-- Beach Check-in Staff (Very Limited)
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(5, 'Beach Check-in Staff', 'Beach guest check-in only', 1, 1);

-- Restaurant Manager (F&B)
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(6, 'Restaurant Manager', 'Manages all restaurants', 1, 1);

-- Restaurant Staff (Single Restaurant)
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(7, 'Restaurant Staff', 'Manages specific restaurant reservations and check-ins', 1, 1);

-- Restaurant Host (Check-in Only)
INSERT OR IGNORE INTO roles (role_id, role_name, role_description, property_id, is_system_role) VALUES
(8, 'Restaurant Host', 'Guest check-in and waitlist only', 1, 1);

-- ============================================
-- ASSIGN PERMISSIONS TO SYSTEM ROLES
-- ============================================

-- Super Admin gets EVERYTHING
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, permission_id FROM permissions;

-- Hotel Manager (everything except user management)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, permission_id FROM permissions 
WHERE permission_category != 'users';

-- Front Desk Staff (communications only)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, permission_id FROM permissions 
WHERE permission_key IN ('frontdesk_view', 'frontdesk_respond', 'frontdesk_resolve');

-- Beach Manager (all beach permissions)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 4, permission_id FROM permissions 
WHERE permission_category = 'beach';

-- Beach Check-in Staff (check-in and view bookings only)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, permission_id FROM permissions 
WHERE permission_key IN ('beach_view', 'beach_bookings_view', 'beach_checkin');

-- Restaurant Manager (all restaurant permissions)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 6, permission_id FROM permissions 
WHERE permission_category = 'restaurant';

-- Restaurant Staff (reservations and check-in, NO revenue/analytics)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 7, permission_id FROM permissions 
WHERE permission_key IN (
  'restaurant_view', 'restaurant_reservations_view', 'restaurant_reservations_manage',
  'restaurant_checkin', 'restaurant_waitlist', 'restaurant_sessions'
);

-- Restaurant Host (check-in and waitlist only)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 8, permission_id FROM permissions 
WHERE permission_key IN ('restaurant_view', 'restaurant_checkin', 'restaurant_waitlist');

-- Update existing admin user to Super Admin role
UPDATE users SET role_id = 1 WHERE email = 'admin@paradiseresort.com';
