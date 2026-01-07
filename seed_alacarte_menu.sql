-- Seed À La Carte Menu Items for all restaurants
-- Cost structure: Kitchen costs are what matters for inventory and cost control
-- Guests don't pay per item - their tier controls total meal value

-- ============================================================
-- ITALIAN TRATTORIA (restaurant_id: 2)
-- ============================================================

-- SALADS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'salad', 'Caesar Salad', 'سلطة السيزر', 'Classic Caesar with crisp romaine, parmesan, and garlic croutons', 'سلطة السيزر الكلاسيكية مع الخس الروماني والبارميزان والخبز المقلي بالثوم', 4.50, 0, 1, 1),
(1, 2, 'salad', 'Caprese Salad', 'سلطة كابريزي', 'Fresh mozzarella, tomatoes, basil, and balsamic glaze', 'جبن موزاريلا طازج وطماطم وريحان وصوص البلسميك', 5.00, 0, 2, 1),
(1, 2, 'salad', 'Italian Garden Salad', 'سلطة الحديقة الإيطالية', 'Mixed greens with Italian dressing and shaved parmesan', 'خضار مشكلة مع صوص إيطالي وبارميزان مبشور', 3.50, 0, 3, 1);

-- STARTERS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'starter', 'Bruschetta', 'بروشيتا', 'Toasted bread topped with fresh tomatoes, garlic, and basil', 'خبز محمص مع طماطم طازجة وثوم وريحان', 4.00, 0, 1, 1),
(1, 2, 'starter', 'Arancini', 'أرانشيني', 'Crispy fried rice balls with mozzarella center', 'كرات أرز مقلية مقرمشة مع جبن موزاريلا', 5.50, 0, 2, 1),
(1, 2, 'starter', 'Calamari Fritti', 'كالاماري مقلي', 'Lightly fried squid with marinara sauce', 'حبار مقلي خفيف مع صوص مارينارا', 8.00, 0, 3, 1),
(1, 2, 'starter', 'Burrata & Prosciutto', 'بوراتا وبروشوتو', 'Creamy burrata cheese with Italian prosciutto', 'جبن بوراتا الكريمي مع بروشوتو إيطالي', 12.00, 1, 4, 1);

-- MAINS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'main', 'Spaghetti Carbonara', 'سباغيتي كاربونارا', 'Classic Roman pasta with pancetta, eggs, and pecorino', 'معكرونة رومانية كلاسيكية مع بانسيتا وبيض وجبن بيكورينو', 6.00, 0, 1, 1),
(1, 2, 'main', 'Fettuccine Alfredo', 'فيتوتشيني ألفريدو', 'Creamy parmesan sauce with fresh fettuccine', 'صوص كريمي بالبارميزان مع فيتوتشيني طازج', 5.50, 0, 2, 1),
(1, 2, 'main', 'Margherita Pizza', 'بيتزا مارغريتا', 'Wood-fired pizza with tomato, mozzarella, and fresh basil', 'بيتزا مخبوزة بالحطب مع طماطم وموزاريلا وريحان طازج', 7.00, 0, 3, 1),
(1, 2, 'main', 'Risotto ai Funghi', 'ريزوتو الفطر', 'Creamy mushroom risotto with truffle oil', 'ريزوتو الفطر الكريمي مع زيت الكمأة', 8.50, 0, 4, 1),
(1, 2, 'main', 'Osso Buco', 'أوسو بوكو', 'Braised veal shanks with saffron risotto', 'ساق العجل المطهو مع ريزوتو الزعفران', 18.00, 1, 5, 1),
(1, 2, 'main', 'Branzino al Forno', 'برانزينو مخبوز', 'Oven-baked Mediterranean sea bass with herbs', 'سمك قاروص البحر الأبيض المتوسط المخبوز بالأعشاب', 22.00, 1, 6, 1);

-- DESSERTS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 2, 'dessert', 'Tiramisu', 'تيراميسو', 'Classic Italian dessert with espresso and mascarpone', 'حلوى إيطالية كلاسيكية مع إسبريسو وماسكاربوني', 5.00, 0, 1, 1),
(1, 2, 'dessert', 'Panna Cotta', 'بانا كوتا', 'Silky vanilla custard with berry compote', 'كاسترد الفانيليا الحريري مع مربى التوت', 4.50, 0, 2, 1),
(1, 2, 'dessert', 'Gelato (3 scoops)', 'جيلاتو (3 كرات)', 'Artisan Italian gelato - choice of flavors', 'جيلاتو إيطالي حرفي - اختيار النكهات', 4.00, 0, 3, 1);


-- ============================================================
-- THE STEAKHOUSE (restaurant_id: 4)
-- ============================================================

-- SALADS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 4, 'salad', 'Wedge Salad', 'سلطة الإسفين', 'Iceberg lettuce with blue cheese, bacon, and tomatoes', 'خس آيسبيرغ مع جبن أزرق ولحم خنزير مقدد وطماطم', 5.50, 0, 1, 1),
(1, 4, 'salad', 'Steakhouse Caesar', 'سيزر الستيك هاوس', 'Caesar salad with grilled chicken', 'سلطة السيزر مع دجاج مشوي', 6.00, 0, 2, 1);

-- STARTERS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 4, 'starter', 'Shrimp Cocktail', 'كوكتيل الجمبري', 'Jumbo shrimp with cocktail sauce', 'جمبري جامبو مع صوص الكوكتيل', 10.00, 0, 1, 1),
(1, 4, 'starter', 'French Onion Soup', 'حساء البصل الفرنسي', 'Classic soup with melted gruyere', 'حساء كلاسيكي مع جبن غرويير ذائب', 5.00, 0, 2, 1),
(1, 4, 'starter', 'Beef Carpaccio', 'كارباتشيو اللحم', 'Thinly sliced raw beef with arugula and parmesan', 'شرائح لحم نيء رقيقة مع الجرجير والبارميزان', 14.00, 1, 3, 1),
(1, 4, 'starter', 'Grilled Octopus', 'أخطبوط مشوي', 'Char-grilled octopus with lemon and herbs', 'أخطبوط مشوي على الفحم مع ليمون وأعشاب', 16.00, 1, 4, 1);

-- MAINS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 4, 'main', 'Grilled Chicken Breast', 'صدر دجاج مشوي', 'Herb-marinated chicken breast with vegetables', 'صدر دجاج متبل بالأعشاب مع الخضروات', 8.00, 0, 1, 1),
(1, 4, 'main', 'Pork Chops', 'قطع لحم الخنزير', 'Double-cut pork chops with apple chutney', 'قطع لحم الخنزير المزدوجة مع صلصة التفاح', 12.00, 0, 2, 1),
(1, 4, 'main', 'NY Strip Steak (12oz)', 'ستيك نيويورك (12 أونصة)', 'Prime NY strip with herb butter', 'شريحة نيويورك فاخرة مع زبدة الأعشاب', 18.00, 1, 3, 1),
(1, 4, 'main', 'Ribeye Steak (16oz)', 'ريب آي ستيك (16 أونصة)', 'Premium ribeye with peppercorn sauce', 'ريب آي فاخر مع صوص الفلفل', 25.00, 1, 4, 1),
(1, 4, 'main', 'Filet Mignon (8oz)', 'فيليه مينيون (8 أونصة)', 'Tender beef tenderloin wrapped in bacon', 'لحم خاصرة طري ملفوف بلحم الخنزير المقدد', 28.00, 1, 5, 1),
(1, 4, 'main', 'Wagyu Steak (10oz)', 'ستيك واغيو (10 أونصة)', 'Premium Japanese Wagyu beef', 'لحم واغيو ياباني فاخر', 45.00, 1, 6, 1),
(1, 4, 'main', 'Grilled Lobster Tail', 'ذيل كركند مشوي', 'Whole lobster tail with drawn butter', 'ذيل كركند كامل مع زبدة ذائبة', 38.00, 1, 7, 1),
(1, 4, 'main', 'Surf & Turf', 'سيرف آند تيرف', 'Filet mignon and lobster tail combo', 'مزيج فيليه مينيون وذيل الكركند', 55.00, 1, 8, 1);

-- DESSERTS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 4, 'dessert', 'Chocolate Lava Cake', 'كيك الشوكولاتة بالحمم', 'Warm chocolate cake with molten center', 'كيك الشوكولاتة الدافئة مع مركز ذائب', 6.00, 0, 1, 1),
(1, 4, 'dessert', 'Crème Brûlée', 'كريم برولي', 'Classic French custard with caramelized sugar', 'كاسترد فرنسي كلاسيكي مع سكر كراميل', 5.50, 0, 2, 1),
(1, 4, 'dessert', 'New York Cheesecake', 'تشيز كيك نيويورك', 'Rich cheesecake with berry sauce', 'تشيز كيك غني مع صوص التوت', 6.50, 0, 3, 1);


-- ============================================================
-- AZURE GRILL (restaurant_id: 5) - Mediterranean
-- ============================================================

-- SALADS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 5, 'salad', 'Greek Salad', 'سلطة يونانية', 'Fresh vegetables with feta cheese and olives', 'خضار طازجة مع جبن فيتا وزيتون', 4.50, 0, 1, 1),
(1, 5, 'salad', 'Tabbouleh', 'تبولة', 'Lebanese parsley salad with bulgur and tomatoes', 'سلطة البقدونس اللبنانية مع البرغل والطماطم', 3.50, 0, 2, 1),
(1, 5, 'salad', 'Fattoush', 'فتوش', 'Mixed greens with crispy pita and sumac dressing', 'خضار مشكلة مع خبز بيتا مقرمش وصوص السماق', 4.00, 0, 3, 1);

-- STARTERS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 5, 'starter', 'Mezze Platter', 'طبق المزة', 'Hummus, baba ghanoush, and muhammara with pita', 'حمص وبابا غنوج ومحمرة مع خبز بيتا', 7.00, 0, 1, 1),
(1, 5, 'starter', 'Grilled Halloumi', 'حلومي مشوي', 'Grilled Cypriot cheese with zaatar', 'جبن قبرصي مشوي مع الزعتر', 6.50, 0, 2, 1),
(1, 5, 'starter', 'Lamb Kibbeh', 'كبة لحم', 'Fried bulgur shells stuffed with spiced lamb', 'أقراص البرغل المقلية محشوة بلحم الخروف المتبل', 8.00, 0, 3, 1),
(1, 5, 'starter', 'Grilled Prawns', 'جمبري مشوي', 'Garlic butter prawns with lemon', 'جمبري بالزبدة والثوم مع الليمون', 14.00, 1, 4, 1);

-- MAINS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 5, 'main', 'Chicken Shawarma', 'شاورما الدجاج', 'Marinated chicken with garlic sauce and pickles', 'دجاج متبل مع صوص الثوم والمخللات', 7.50, 0, 1, 1),
(1, 5, 'main', 'Mixed Grill Platter', 'طبق مشويات مشكلة', 'Lamb kofta, chicken, and beef kebabs', 'كفتة لحم الخروف ودجاج وكباب لحم', 14.00, 0, 2, 1),
(1, 5, 'main', 'Grilled Sea Bass', 'سمك قاروص مشوي', 'Whole grilled sea bass with lemon and herbs', 'سمك قاروص كامل مشوي مع الليمون والأعشاب', 18.00, 1, 3, 1),
(1, 5, 'main', 'Lamb Chops', 'قطع لحم الخروف', 'Grilled lamb chops with mint yogurt', 'قطع لحم الخروف المشوية مع لبن النعناع', 22.00, 1, 4, 1),
(1, 5, 'main', 'Seafood Paella', 'بايلا المأكولات البحرية', 'Spanish rice dish with mixed seafood', 'طبق أرز إسباني مع مأكولات بحرية مشكلة', 20.00, 1, 5, 1),
(1, 5, 'main', 'Grilled Lobster', 'كركند مشوي', 'Whole grilled lobster with herbs and butter', 'كركند كامل مشوي مع الأعشاب والزبدة', 35.00, 1, 6, 1);

-- DESSERTS
INSERT OR IGNORE INTO alacarte_menu_items (property_id, restaurant_id, category, item_name, item_name_ar, description, description_ar, cost_to_hotel, is_premium, display_order, is_available) VALUES
(1, 5, 'dessert', 'Baklava', 'بقلاوة', 'Phyllo pastry with honey and pistachios', 'معجنات فيلو مع العسل والفستق', 4.00, 0, 1, 1),
(1, 5, 'dessert', 'Kunafa', 'كنافة', 'Shredded phyllo with sweet cheese', 'فيلو مقطع مع جبن حلو', 5.00, 0, 2, 1),
(1, 5, 'dessert', 'Fresh Fruit Platter', 'طبق فواكه طازجة', 'Seasonal fresh fruits', 'فواكه طازجة موسمية', 3.50, 0, 3, 1);
