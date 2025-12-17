-- Seed script for All-Inclusive Digital Pass System test data

-- Insert default tiers for property 1
INSERT OR IGNORE INTO all_inclusive_tiers (property_id, tier_code, tier_display_name, tier_description, tier_color, tier_icon, daily_upgrade_price, display_order) VALUES 
(1, 'standard', 'Standard', 'Access to all beach spots and basic amenities', '#3B82F6', 'fa-star', 0.00, 1),
(1, 'premium', 'Premium', 'Priority access, premium zones, and enhanced services', '#8B5CF6', 'fa-crown', 25.00, 2),
(1, 'vip', 'VIP', 'Exclusive VIP areas, dedicated service, and luxury amenities', '#EC4899', 'fa-gem', 50.00, 3),
(1, 'diamond', 'Diamond', 'All-inclusive ultra-luxury experience with private areas', '#F59E0B', 'fa-diamond', 100.00, 4);

-- Insert test digital passes
INSERT OR IGNORE INTO digital_passes (property_id, pass_reference, primary_guest_name, room_number, tier_id, num_adults, num_children, valid_from, valid_until, qr_secret, pass_status) VALUES 
(1, 'PASS-101-STD', 'Ahmed Smith', '101', 1, 2, 1, '2025-12-15', '2025-12-22', 'secret123', 'active'),
(1, 'PASS-103-PREM', 'Maria Garcia', '103', 2, 2, 0, '2025-12-16', '2025-12-23', 'secret456', 'active'),
(1, 'PASS-201-VIP', 'John Wilson', '201', 3, 2, 2, '2025-12-14', '2025-12-28', 'secret789', 'active'),
(1, 'PASS-202-DIAM', 'Sarah Johnson', '202', 4, 2, 0, '2025-12-17', '2025-12-24', 'secret999', 'active');

-- Insert test pass verifications
INSERT OR IGNORE INTO pass_verifications (property_id, pass_id, staff_name, verification_location, verification_result, notes) VALUES 
(1, 1, 'John Staff', 'Pool Bar', 'valid', 'Guest verified at pool'),
(1, 2, 'Mary Staff', 'Main Restaurant', 'valid', 'Guest verified at restaurant'),
(1, 3, 'John Staff', 'VIP Spa', 'valid', 'VIP guest verified at spa'),
(1, 1, 'John Staff', 'Beach Club', 'valid', 'Second verification'),
(1, 4, 'Mary Staff', 'Premium Lounge', 'valid', 'Diamond guest verified');
