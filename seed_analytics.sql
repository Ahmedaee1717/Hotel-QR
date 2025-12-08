-- Seed QR scan data for analytics testing
-- Generate scans for the past 30 days

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

-- Yesterday's scans (18 scans)
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

-- Last 7 days (generate varied scan counts)
INSERT INTO qr_scans (property_id, scan_date, scan_timestamp)
SELECT 1, date('now', '-' || days || ' days'), datetime('now', '-' || days || ' days', '-' || hours || ' hours')
FROM (
  SELECT 2 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20)
  UNION ALL
  SELECT 3 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15)
  UNION ALL
  SELECT 4 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22)
  UNION ALL
  SELECT 5 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17)
  UNION ALL
  SELECT 6 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19)
);

-- Page views data
INSERT INTO page_views (property_id, page_type, view_date, view_timestamp) 
SELECT 1, page, date('now', '-' || days || ' days'), datetime('now', '-' || days || ' days', '-' || hours || ' hours')
FROM (
  SELECT 'activities' as page, 0 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23)
  UNION ALL
  SELECT 'restaurants' as page, 0 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20)
  UNION ALL
  SELECT 'spa' as page, 0 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15)
  UNION ALL
  SELECT 'events' as page, 0 as days, value as hours FROM (SELECT 1 as value UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12)
);
