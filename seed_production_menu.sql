-- Seed À La Carte Menu Items for PRODUCTION restaurants
-- Based on existing restaurants: 
-- 1: Sunrise Breakfast Buffet (skip - buffet)
-- 2: Azure Beach Grill (à la carte)
-- 3: Le Jardin Fine Dining (à la carte)
-- 9: Main Restaurant (skip - buffet)

-- ============================================================
-- AZURE BEACH GRILL (restaurant_id: 2) - Mediterranean Beachside
-- ============================================================

-- SALADS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'salad', 'Greek Salad', 'سلطة يونانية', 'Fresh vegetables with feta cheese and olives', 'خضار طازجة مع جبن فيتا وزيتون', 4.50, 0, 1, 1),
(1, 2, 'salad', 'Tabbouleh', 'تبولة', 'Lebanese parsley salad with bulgur and tomatoes', 'سلطة البقدونس اللبنانية مع البرغل والطماطم', 3.50, 0, 2, 1),
(1, 2, 'salad', 'Fattoush', 'فتوش', 'Mixed greens with crispy pita and sumac dressing', 'خضار مشكلة مع خبز بيتا مقرمش وصوص السماق', 4.00, 0, 3, 1);

-- STARTERS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'starter', 'Mezze Platter', 'طبق المزة', 'Hummus, baba ghanoush, and muhammara with pita', 'حمص وبابا غنوج ومحمرة مع خبز بيتا', 7.00, 0, 1, 1),
(1, 2, 'starter', 'Grilled Halloumi', 'حلومي مشوي', 'Grilled Cypriot cheese with zaatar', 'جبن قبرصي مشوي مع الزعتر', 6.50, 0, 2, 1),
(1, 2, 'starter', 'Calamari Fritti', 'كالاماري مقلي', 'Lightly fried squid rings with lemon aioli', 'حلقات حبار مقلية خفيفة مع صوص الليمون', 9.00, 0, 3, 1),
(1, 2, 'starter', 'Grilled Prawns', 'جمبري مشوي', 'Garlic butter prawns with lemon', 'جمبري بالزبدة والثوم مع الليمون', 14.00, 1, 4, 1);

-- MAINS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'main', 'Grilled Chicken', 'دجاج مشوي', 'Marinated chicken breast with Mediterranean herbs', 'صدر دجاج متبل بالأعشاب المتوسطية', 8.00, 0, 1, 1),
(1, 2, 'main', 'Lamb Kofta', 'كفتة لحم', 'Grilled lamb skewers with tahini sauce', 'أسياخ لحم الخروف المشوية مع صوص الطحينة', 10.00, 0, 2, 1),
(1, 2, 'main', 'Mixed Grill', 'مشويات مشكلة', 'Lamb, chicken, and beef kebabs with grilled vegetables', 'كباب لحم الخروف والدجاج ولحم البقر مع الخضار المشوية', 14.00, 0, 3, 1),
(1, 2, 'main', 'Grilled Sea Bass', 'سمك قاروص مشوي', 'Whole grilled sea bass with lemon and herbs', 'سمك قاروص كامل مشوي مع الليمون والأعشاب', 18.00, 1, 4, 1),
(1, 2, 'main', 'Seafood Paella', 'بايلا المأكولات البحرية', 'Spanish rice with mixed seafood and saffron', 'أرز إسباني مع مأكولات بحرية مشكلة والزعفران', 20.00, 1, 5, 1),
(1, 2, 'main', 'Grilled Lobster', 'كركند مشوي', 'Whole grilled lobster with garlic butter', 'كركند كامل مشوي مع زبدة الثوم', 35.00, 1, 6, 1);

-- DESSERTS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'dessert', 'Baklava', 'بقلاوة', 'Phyllo pastry with honey and pistachios', 'معجنات فيلو مع العسل والفستق', 4.00, 0, 1, 1),
(1, 2, 'dessert', 'Kunafa', 'كنافة', 'Shredded phyllo with sweet cheese and syrup', 'فيلو مقطع مع جبن حلو وشراب', 5.00, 0, 2, 1),
(1, 2, 'dessert', 'Fresh Fruit Platter', 'طبق فواكه طازجة', 'Seasonal fresh fruits', 'فواكه طازجة موسمية', 3.50, 0, 3, 1);


-- ============================================================
-- LE JARDIN FINE DINING (restaurant_id: 3) - French/International
-- ============================================================

-- SALADS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 3, 'salad', 'Caesar Salad', 'سلطة السيزر', 'Classic Caesar with crisp romaine, parmesan, and garlic croutons', 'سلطة السيزر الكلاسيكية مع الخس الروماني والبارميزان والخبز المقلي بالثوم', 5.00, 0, 1, 1),
(1, 3, 'salad', 'Caprese Salad', 'سلطة كابريزي', 'Burrata cheese, heirloom tomatoes, basil, and aged balsamic', 'جبن بوراتا وطماطم موروثة وريحان وصوص بلسميك معتق', 7.00, 0, 2, 1),
(1, 3, 'salad', 'Garden Greens', 'سلطة الحديقة', 'Mixed organic greens with champagne vinaigrette', 'خضار عضوية مشكلة مع صوص الشمبانيا', 6.00, 0, 3, 1);

-- STARTERS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 3, 'starter', 'French Onion Soup', 'حساء البصل الفرنسي', 'Classic soup with caramelized onions and melted gruyere', 'حساء كلاسيكي مع بصل كراميلي وجبن غرويير ذائب', 6.00, 0, 1, 1),
(1, 3, 'starter', 'Escargots de Bourgogne', 'حلزون بورغندي', 'Burgundy snails with garlic herb butter', 'حلزون بورغندي مع زبدة الثوم والأعشاب', 12.00, 1, 2, 1),
(1, 3, 'starter', 'Foie Gras', 'كبد الإوز', 'Pan-seared foie gras with fig compote', 'كبد الإوز المقلي مع مربى التين', 18.00, 1, 3, 1),
(1, 3, 'starter', 'Beef Carpaccio', 'كارباتشيو اللحم', 'Thinly sliced wagyu beef with truffle oil and arugula', 'شرائح لحم واغيو رقيقة مع زيت الكمأة والجرجير', 16.00, 1, 4, 1),
(1, 3, 'starter', 'Lobster Bisque', 'بسك الكركند', 'Creamy lobster soup with cognac', 'حساء كركند كريمي مع الكونياك', 14.00, 1, 5, 1);

-- MAINS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 3, 'main', 'Herb Crusted Chicken', 'دجاج بقشرة الأعشاب', 'Organic chicken breast with herb crust and seasonal vegetables', 'صدر دجاج عضوي مع قشرة الأعشاب والخضروات الموسمية', 12.00, 0, 1, 1),
(1, 3, 'main', 'Pan-Seared Salmon', 'سلمون مقلي', 'Atlantic salmon with lemon beurre blanc', 'سلمون أطلسي مع صوص الزبدة بالليمون', 16.00, 0, 2, 1),
(1, 3, 'main', 'Beef Tenderloin', 'لحم خاصرة', 'Prime beef tenderloin with red wine reduction', 'لحم خاصرة فاخر مع صوص النبيذ الأحمر', 22.00, 1, 3, 1),
(1, 3, 'main', 'Rack of Lamb', 'رف لحم الخروف', 'Herb-crusted lamb rack with rosemary jus', 'رف لحم الخروف بقشرة الأعشاب مع صوص الروزماري', 28.00, 1, 4, 1),
(1, 3, 'main', 'Dover Sole Meunière', 'سمك دوفر سول', 'Classic French sole with brown butter and capers', 'سمك دوفر سول الفرنسي الكلاسيكي مع الزبدة البنية والكبر', 24.00, 1, 5, 1),
(1, 3, 'main', 'Wagyu Ribeye', 'ريب آي واغيو', 'Japanese Wagyu ribeye with truffle butter', 'ريب آي واغيو ياباني مع زبدة الكمأة', 48.00, 1, 6, 1),
(1, 3, 'main', 'Lobster Thermidor', 'كركند ثيرميدور', 'Whole lobster in creamy cognac sauce', 'كركند كامل مع صوص الكونياك الكريمي', 42.00, 1, 7, 1),
(1, 3, 'main', 'Surf & Turf', 'سيرف آند تيرف', 'Wagyu tenderloin and grilled lobster tail', 'لحم واغيو الخاصرة وذيل كركند مشوي', 58.00, 1, 8, 1);

-- DESSERTS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 3, 'dessert', 'Crème Brûlée', 'كريم برولي', 'Classic vanilla custard with caramelized sugar crust', 'كاسترد الفانيليا الكلاسيكي مع قشرة سكر كراميل', 6.50, 0, 1, 1),
(1, 3, 'dessert', 'Chocolate Soufflé', 'سوفليه الشوكولاتة', 'Warm chocolate soufflé with vanilla ice cream', 'سوفليه الشوكولاتة الدافئ مع آيس كريم الفانيليا', 8.00, 0, 2, 1),
(1, 3, 'dessert', 'Tarte Tatin', 'تارت تاتان', 'Caramelized apple tart with crème fraîche', 'تارت التفاح الكراميلي مع كريم فريش', 7.00, 0, 3, 1),
(1, 3, 'dessert', 'Profiteroles', 'بروفيتيرول', 'Choux pastry with vanilla ice cream and chocolate sauce', 'معجنات شو مع آيس كريم الفانيليا وصوص الشوكولاتة', 7.50, 0, 4, 1);
