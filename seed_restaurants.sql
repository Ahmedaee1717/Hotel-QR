-- Seed restaurants for Paradise Resort
-- NOTE: offering_id 1 'Main Restaurant' already exists

-- Insert additional restaurants
INSERT OR IGNORE INTO hotel_offerings (
  offering_id, property_id, offering_type, 
  title_en, title_ar,
  short_description_en, short_description_ar,
  full_description_en, full_description_ar,
  price, currency, price_type,
  requires_booking, capacity_per_slot, duration_minutes,
  display_order, status, is_featured,
  created_at, updated_at
) VALUES
-- Italian Trattoria (offering_id: 2)
(2, 1, 'restaurant',
 'Italian Trattoria', 'مطعم إيطالي',
 'Authentic Italian cuisine with fresh pasta and wood-fired pizzas',
 'مطبخ إيطالي أصيل مع المعكرونة الطازجة والبيتزا المخبوزة بالحطب',
 'Experience the warmth of Italy with our authentic trattoria featuring handmade pasta, wood-fired pizzas, and classic Italian dishes made with imported ingredients.',
 'اختبر دفء إيطاليا مع مطعمنا الإيطالي الأصيل المتميز بالمعكرونة المصنوعة يدويًا والبيتزا المخبوزة بالحطب والأطباق الإيطالية الكلاسيكية المصنوعة من مكونات مستوردة',
 0, 'USD', 'per_person',
 1, 40, 120,
 2, 'active', 1,
 datetime('now'), datetime('now')),

-- Sakura Sushi Bar (offering_id: 3)
(3, 1, 'restaurant',
 'Sakura Sushi Bar', 'بار سوشي ساكورا',
 'Premium Japanese sushi and sashimi with ocean views',
 'سوشي وساشيمي ياباني فاخر مع إطلالة على المحيط',
 'Our master sushi chefs prepare the finest selection of nigiri, sashimi, and specialty rolls using fresh seafood flown in daily. Experience authentic Japanese dining with breathtaking ocean views.',
 'يقوم طهاة السوشي المتخصصون لدينا بإعداد أفضل مجموعة من النيجيري والساشيمي واللفائف المتخصصة باستخدام المأكولات البحرية الطازجة التي يتم جلبها يوميًا. استمتع بتجربة تناول الطعام اليابانية الأصيلة مع إطلالة خلابة على المحيط',
 0, 'USD', 'per_person',
 1, 30, 90,
 3, 'active', 1,
 datetime('now'), datetime('now')),

-- The Steakhouse (offering_id: 4)
(4, 1, 'restaurant',
 'The Steakhouse', 'مطعم الستيك هاوس',
 'Premium cuts and grilled specialties in an elegant setting',
 'قطع لحم فاخرة ومشاوي مميزة في بيئة أنيقة',
 'Indulge in the finest premium cuts including Wagyu beef, dry-aged steaks, and fresh lobster. Our expert grill masters prepare each dish to perfection in an sophisticated atmosphere.',
 'انغمس في أفضل القطع الفاخرة بما في ذلك لحم الواغيو وشرائح اللحم المعتقة والكركند الطازج. يقوم خبراء الشواء لدينا بإعداد كل طبق على الكمال في جو راقٍ',
 0, 'USD', 'per_person',
 1, 35, 120,
 4, 'active', 1,
 datetime('now'), datetime('now')),

-- Azure Grill (offering_id: 5)
(5, 1, 'restaurant',
 'Azure Grill', 'مطعم أزور جريل',
 'Mediterranean fusion with fresh seafood and grilled meats',
 'مطبخ متوسطي مع المأكولات البحرية الطازجة واللحوم المشوية',
 'A vibrant Mediterranean grill featuring fresh catches of the day, premium meats, and vibrant mezze plates. Enjoy dining under the stars with live music on weekends.',
 'مطعم شواء متوسطي نابض بالحياة يضم مصيد اليوم الطازج واللحوم الفاخرة وأطباق المزة النابضة بالحياة. استمتع بتناول الطعام تحت النجوم مع الموسيقى الحية في عطلات نهاية الأسبوع',
 0, 'USD', 'per_person',
 1, 50, 120,
 5, 'active', 1,
 datetime('now'), datetime('now'));

-- Update Main Restaurant details
UPDATE hotel_offerings SET
  title_ar = 'المطعم الرئيسي',
  short_description_en = 'International buffet with live cooking stations',
  short_description_ar = 'بوفيه عالمي مع محطات طهي مباشرة',
  full_description_en = 'Our main restaurant offers an extensive international buffet for breakfast, lunch, and dinner. Features live cooking stations, themed nights, and cuisines from around the world.',
  full_description_ar = 'يقدم مطعمنا الرئيسي بوفيه عالمي واسع للإفطار والغداء والعشاء. يتميز بمحطات الطهي المباشر والليالي ذات الطابع الخاص والمأكولات من جميع أنحاء العالم',
  requires_booking = 0,
  capacity_per_slot = 200,
  duration_minutes = 120,
  display_order = 1,
  status = 'active',
  updated_at = datetime('now')
WHERE offering_id = 1 AND property_id = 1;
