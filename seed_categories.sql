-- Seed Activity Categories for Red Sea Resorts and Worldwide Resorts

INSERT INTO categories (name_en, name_ar, slug, icon_name, display_order) VALUES
-- Water Sports & Activities (1-8)
('Diving & Snorkeling', 'الغوص والغطس', 'diving-snorkeling', 'fa-water', 1),
('Scuba Diving', 'الغوص بالاسكوبا', 'scuba-diving', 'fa-mask-snorkel', 2),
('Boat Tours & Cruises', 'رحلات القوارب', 'boat-tours', 'fa-ship', 3),
('Water Sports', 'الرياضات المائية', 'water-sports', 'fa-person-swimming', 4),
('Parasailing', 'الطيران الشراعي', 'parasailing', 'fa-parachute-box', 5),
('Jet Ski & Banana Boat', 'جت سكي وقارب الموز', 'jet-ski', 'fa-water', 6),
('Fishing Trips', 'رحلات الصيد', 'fishing', 'fa-fish', 7),
('Submarine Tours', 'رحلات الغواصة', 'submarine', 'fa-submarine', 8),

-- Desert & Land Activities (9-14)
('Desert Safari', 'رحلات السفاري الصحراوية', 'desert-safari', 'fa-car', 9),
('Quad Biking', 'دراجات الكواد', 'quad-biking', 'fa-motorcycle', 10),
('Camel Riding', 'ركوب الجمال', 'camel-riding', 'fa-horse', 11),
('Stargazing & Astronomy', 'مراقبة النجوم', 'stargazing', 'fa-star', 12),
('Bedouin Camp Experience', 'تجربة المخيم البدوي', 'bedouin-camp', 'fa-campground', 13),
('Horseback Riding', 'ركوب الخيل', 'horseback-riding', 'fa-horse-head', 14),

-- Cultural & Sightseeing (15-18)
('City Tours & Excursions', 'جولات المدينة', 'city-tours', 'fa-bus', 15),
('Historical Sites', 'المواقع التاريخية', 'historical-sites', 'fa-landmark', 16),
('Cultural Experiences', 'التجارب الثقافية', 'cultural', 'fa-mosque', 17),
('Shopping Tours', 'جولات التسوق', 'shopping-tours', 'fa-shopping-bag', 18),

-- Wellness & Spa (19-21)
('Spa & Wellness', 'السبا والعافية', 'spa-wellness', 'fa-spa', 19),
('Yoga & Meditation', 'اليوغا والتأمل', 'yoga', 'fa-om', 20),
('Massage Therapy', 'العلاج بالتدليك', 'massage', 'fa-hands', 21),

-- Entertainment & Nightlife (22-23)
('Nightlife & Shows', 'الحياة الليلية والعروض', 'nightlife', 'fa-moon', 22),
('Live Entertainment', 'الترفيه الحي', 'entertainment', 'fa-music', 23),

-- Family & Kids (24)
('Kids Activities', 'أنشطة للأطفال', 'kids-activities', 'fa-child', 24),

-- Adventure & Sports (25-26)
('Adventure Sports', 'الرياضات المغامرة', 'adventure-sports', 'fa-mountain', 25),
('Golf', 'الجولف', 'golf', 'fa-golf-ball-tee', 26),

-- Other (27)
('Other Activities', 'أنشطة أخرى', 'other', 'fa-ellipsis-h', 27);
