-- Simple seed data for analytics testing

-- Today's scans (25 scans)
INSERT INTO qr_scans (property_id, scan_date, scan_timestamp) VALUES
(1, date('now'), datetime('now', '-1 hour')),
(1, date('now'), datetime('now', '-2 hours')),
(1, date('now'), datetime('now', '-3 hours')),
(1, date('now'), datetime('now', '-4 hours')),
(1, date('now'), datetime('now', '-5 hours')),
(1, date('now'), datetime('now', '-6 hours')),
(1, date('now'), datetime('now', '-7 hours')),
(1, date('now'), datetime('now', '-8 hours')),
(1, date('now'), datetime('now', '-9 hours')),
(1, date('now'), datetime('now', '-10 hours')),
(1, date('now'), datetime('now', '-11 hours')),
(1, date('now'), datetime('now', '-12 hours')),
(1, date('now'), datetime('now', '-13 hours')),
(1, date('now'), datetime('now', '-14 hours')),
(1, date('now'), datetime('now', '-15 hours')),
(1, date('now'), datetime('now', '-16 hours')),
(1, date('now'), datetime('now', '-17 hours')),
(1, date('now'), datetime('now', '-18 hours')),
(1, date('now'), datetime('now', '-19 hours')),
(1, date('now'), datetime('now', '-20 hours')),
(1, date('now'), datetime('now', '-21 hours')),
(1, date('now'), datetime('now', '-22 hours')),
(1, date('now'), datetime('now', '-23 hours')),
(1, date('now'), datetime('now', '-23.5 hours')),
(1, date('now'), datetime('now', '-23.8 hours'));

-- Yesterday's scans (18 scans - less than today)
INSERT INTO qr_scans (property_id, scan_date, scan_timestamp) VALUES
(1, date('now', '-1 day'), datetime('now', '-1 day', '-1 hour')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-2 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-3 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-4 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-5 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-6 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-7 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-8 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-9 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-10 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-11 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-12 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-13 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-14 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-15 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-16 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-17 hours')),
(1, date('now', '-1 day'), datetime('now', '-1 day', '-18 hours'));

-- 2 days ago (20 scans)
INSERT INTO qr_scans (property_id, scan_date) VALUES
(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),
(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),
(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),
(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days')),(1, date('now', '-2 days'));

-- 3 days ago (15 scans)
INSERT INTO qr_scans (property_id, scan_date) VALUES
(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),
(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),
(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days')),(1, date('now', '-3 days'));

-- 4 days ago (22 scans)
INSERT INTO qr_scans (property_id, scan_date) VALUES
(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),
(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),
(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),
(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),(1, date('now', '-4 days')),
(1, date('now', '-4 days')),(1, date('now', '-4 days'));

-- 5 days ago (17 scans)
INSERT INTO qr_scans (property_id, scan_date) VALUES
(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),
(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),
(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),(1, date('now', '-5 days')),
(1, date('now', '-5 days')),(1, date('now', '-5 days'));

-- 6 days ago (19 scans)
INSERT INTO qr_scans (property_id, scan_date) VALUES
(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),
(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),
(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),
(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days')),(1, date('now', '-6 days'));

-- Page views for today
INSERT INTO page_views (property_id, page_type, view_date) VALUES
('1', 'activities', date('now')),('1', 'activities', date('now')),('1', 'activities', date('now')),('1', 'activities', date('now')),('1', 'activities', date('now')),
('1', 'activities', date('now')),('1', 'activities', date('now')),('1', 'activities', date('now')),('1', 'activities', date('now')),('1', 'activities', date('now')),
('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),
('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),('1', 'restaurants', date('now')),
('1', 'spa', date('now')),('1', 'spa', date('now')),('1', 'spa', date('now')),('1', 'spa', date('now')),('1', 'spa', date('now')),
('1', 'events', date('now')),('1', 'events', date('now')),('1', 'events', date('now')),('1', 'events', date('now'));
