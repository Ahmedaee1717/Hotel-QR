-- ============================================
-- SUBSCRIPTION SYSTEM - SaaS Multi-Tenancy
-- ============================================

-- Platform Super Admins (separate from hotel admins)
CREATE TABLE IF NOT EXISTS platform_admins (
  admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin' CHECK(role IN ('super_admin', 'support', 'billing')),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Subscription Plans (Free, Basic, Pro, Enterprise)
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_key TEXT UNIQUE NOT NULL, -- 'free', 'basic', 'pro', 'enterprise'
  plan_name TEXT NOT NULL,
  description TEXT,
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  max_rooms INTEGER DEFAULT 10,
  max_staff_users INTEGER DEFAULT 3,
  max_vendors INTEGER DEFAULT 5,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature Flags (all available features in the platform)
CREATE TABLE IF NOT EXISTS feature_flags (
  feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_key TEXT UNIQUE NOT NULL, -- 'restaurants', 'beach', 'spa', 'analytics', etc.
  feature_name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'core', 'booking', 'management', 'analytics', 'advanced'
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Plan Features (which features are included in each plan)
CREATE TABLE IF NOT EXISTS plan_features (
  plan_feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  feature_id INTEGER NOT NULL,
  is_included INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id) ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES feature_flags(feature_id) ON DELETE CASCADE,
  UNIQUE(plan_id, feature_id)
);

-- Property Subscriptions (link properties to subscription plans)
CREATE TABLE IF NOT EXISTS property_subscriptions (
  subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'cancelled', 'trial')),
  trial_ends_at DATETIME,
  current_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_period_end DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);

-- Property Feature Overrides (custom feature access per property)
CREATE TABLE IF NOT EXISTS property_feature_overrides (
  override_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  feature_id INTEGER NOT NULL,
  is_enabled INTEGER DEFAULT 1, -- 0 = disabled, 1 = enabled
  override_reason TEXT, -- 'custom_request', 'beta_access', 'trial', etc.
  expires_at DATETIME,
  created_by INTEGER, -- platform_admin_id
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES feature_flags(feature_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES platform_admins(admin_id),
  UNIQUE(property_id, feature_id)
);

-- Subscription History (audit trail)
CREATE TABLE IF NOT EXISTS subscription_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'suspended'
  previous_plan_id INTEGER,
  performed_by INTEGER, -- platform_admin_id
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id),
  FOREIGN KEY (previous_plan_id) REFERENCES subscription_plans(plan_id),
  FOREIGN KEY (performed_by) REFERENCES platform_admins(admin_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_subscriptions_property ON property_subscriptions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_subscriptions_status ON property_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_property_feature_overrides_property ON property_feature_overrides(property_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_property ON subscription_history(property_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);

-- ============================================
-- SEED DATA: Subscription Plans
-- ============================================

INSERT INTO subscription_plans (plan_key, plan_name, description, price_monthly, price_yearly, max_rooms, max_staff_users, max_vendors, display_order) VALUES
('free', 'Free Trial', 'Perfect for testing - 14 days trial', 0, 0, 5, 2, 2, 1),
('basic', 'Basic', 'Essential features for small properties', 49, 490, 25, 5, 10, 2),
('pro', 'Professional', 'Advanced features for growing properties', 149, 1490, 100, 20, 50, 3),
('enterprise', 'Enterprise', 'Unlimited features for large resorts', 499, 4990, 999, 100, 200, 4);

-- ============================================
-- SEED DATA: Feature Flags
-- ============================================

INSERT INTO feature_flags (feature_key, feature_name, description, category) VALUES
-- Core Features
('qrcode', 'QR Code Generation', 'Generate QR codes for rooms', 'core'),
('frontdesk', 'Front Desk Dashboard', 'Guest check-in/check-out management', 'core'),
('rooms', 'Room Management', 'Add and manage hotel rooms', 'core'),

-- Booking Features
('restaurants', 'Restaurant Booking', 'Manage restaurant reservations and floor plans', 'booking'),
('beach', 'Beach Booking', 'Beach spot reservations and live map', 'booking'),
('spa', 'Spa Booking', 'Spa appointments and services', 'booking'),
('activities', 'Activity Booking', 'Tours and activity management', 'booking'),

-- Management Features
('vendors', 'Vendor Management', 'Manage external service providers', 'management'),
('offerings', 'Offerings Management', 'Manage hotel services and events', 'management'),
('infopages', 'Info Pages', 'Custom information pages for guests', 'management'),
('customsections', 'Custom Sections', 'Homepage card customization', 'management'),

-- Analytics Features
('analytics', 'Analytics Dashboard', 'Detailed insights and reports', 'analytics'),
('feedback', 'Guest Feedback', 'Collect and analyze guest reviews', 'analytics'),

-- Advanced Features
('chatbot', 'AI Chatbot', 'AI-powered guest assistance', 'advanced'),
('users', 'Staff User Management', 'Manage staff accounts and permissions', 'advanced'),
('multilang', 'Multi-Language', 'Multi-language content support', 'advanced'),
('callbacks', 'Callback Requests', 'Guest callback management', 'advanced');

-- ============================================
-- SEED DATA: Plan Features Matrix
-- ============================================

-- Free Plan (Core features only)
INSERT INTO plan_features (plan_id, feature_id, is_included)
SELECT 
  (SELECT plan_id FROM subscription_plans WHERE plan_key = 'free'),
  feature_id,
  1
FROM feature_flags
WHERE feature_key IN ('qrcode', 'frontdesk', 'rooms');

-- Basic Plan (Core + Essential Booking)
INSERT INTO plan_features (plan_id, feature_id, is_included)
SELECT 
  (SELECT plan_id FROM subscription_plans WHERE plan_key = 'basic'),
  feature_id,
  1
FROM feature_flags
WHERE feature_key IN ('qrcode', 'frontdesk', 'rooms', 'restaurants', 'offerings', 'infopages', 'feedback');

-- Pro Plan (Everything except Enterprise features)
INSERT INTO plan_features (plan_id, feature_id, is_included)
SELECT 
  (SELECT plan_id FROM subscription_plans WHERE plan_key = 'pro'),
  feature_id,
  1
FROM feature_flags
WHERE feature_key IN ('qrcode', 'frontdesk', 'rooms', 'restaurants', 'beach', 'spa', 'activities', 'vendors', 'offerings', 'infopages', 'customsections', 'analytics', 'feedback', 'callbacks');

-- Enterprise Plan (ALL features)
INSERT INTO plan_features (plan_id, feature_id, is_included)
SELECT 
  (SELECT plan_id FROM subscription_plans WHERE plan_key = 'enterprise'),
  feature_id,
  1
FROM feature_flags;

-- ============================================
-- SEED DATA: Default Super Admin
-- ============================================

INSERT INTO platform_admins (email, password_hash, full_name, role, is_active) VALUES
('superadmin@guestconnect.com', 'admin123', 'Platform Administrator', 'super_admin', 1);

-- ============================================
-- SEED DATA: Assign Existing Properties to Plans
-- ============================================

-- Paradise Resort → Pro Plan
INSERT INTO property_subscriptions (property_id, plan_id, status, current_period_end)
SELECT 
  (SELECT property_id FROM properties WHERE slug = 'paradise-resort'),
  (SELECT plan_id FROM subscription_plans WHERE plan_key = 'pro'),
  'active',
  datetime('now', '+30 days');

-- Hilton (property_id = 9) → Enterprise Plan
INSERT INTO property_subscriptions (property_id, plan_id, status, current_period_end)
VALUES (9, (SELECT plan_id FROM subscription_plans WHERE plan_key = 'enterprise'), 'active', datetime('now', '+365 days'));

-- Record subscription history
INSERT INTO subscription_history (property_id, plan_id, action, performed_by, notes)
SELECT 
  property_id,
  plan_id,
  'created',
  (SELECT admin_id FROM platform_admins WHERE email = 'superadmin@guestconnect.com'),
  'Initial subscription setup'
FROM property_subscriptions;
