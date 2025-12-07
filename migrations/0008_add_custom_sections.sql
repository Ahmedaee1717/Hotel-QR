-- Migration: Add custom sections support

-- Custom Sections Table
CREATE TABLE IF NOT EXISTS custom_sections (
  section_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  section_key TEXT NOT NULL,
  section_name_en TEXT NOT NULL,
  section_name_ar TEXT,
  section_name_de TEXT,
  section_name_ru TEXT,
  section_name_pl TEXT,
  section_name_it TEXT,
  section_name_fr TEXT,
  section_name_cs TEXT,
  section_name_uk TEXT,
  icon_class TEXT DEFAULT 'fas fa-star',
  color_class TEXT DEFAULT 'blue',
  display_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, section_key)
);

-- Add section heading translations for restaurants
ALTER TABLE properties ADD COLUMN section_restaurants_en TEXT DEFAULT 'Our Restaurants';
ALTER TABLE properties ADD COLUMN section_restaurants_ar TEXT DEFAULT 'مطاعمنا';
ALTER TABLE properties ADD COLUMN section_restaurants_de TEXT DEFAULT 'Unsere Restaurants';
ALTER TABLE properties ADD COLUMN section_restaurants_ru TEXT DEFAULT 'Наши рестораны';
ALTER TABLE properties ADD COLUMN section_restaurants_pl TEXT DEFAULT 'Nasze restauracje';
ALTER TABLE properties ADD COLUMN section_restaurants_it TEXT DEFAULT 'I nostri ristoranti';
ALTER TABLE properties ADD COLUMN section_restaurants_fr TEXT DEFAULT 'Nos restaurants';
ALTER TABLE properties ADD COLUMN section_restaurants_cs TEXT DEFAULT 'Naše restaurace';
ALTER TABLE properties ADD COLUMN section_restaurants_uk TEXT DEFAULT 'Наші ресторани';

-- Add section heading translations for events
ALTER TABLE properties ADD COLUMN section_events_en TEXT DEFAULT 'Upcoming Events';
ALTER TABLE properties ADD COLUMN section_events_ar TEXT DEFAULT 'الفعاليات القادمة';
ALTER TABLE properties ADD COLUMN section_events_de TEXT DEFAULT 'Kommende Veranstaltungen';
ALTER TABLE properties ADD COLUMN section_events_ru TEXT DEFAULT 'Предстоящие события';
ALTER TABLE properties ADD COLUMN section_events_pl TEXT DEFAULT 'Nadchodzące wydarzenia';
ALTER TABLE properties ADD COLUMN section_events_it TEXT DEFAULT 'Eventi in arrivo';
ALTER TABLE properties ADD COLUMN section_events_fr TEXT DEFAULT 'Événements à venir';
ALTER TABLE properties ADD COLUMN section_events_cs TEXT DEFAULT 'Nadcházející akce';
ALTER TABLE properties ADD COLUMN section_events_uk TEXT DEFAULT 'Майбутні події';

-- Add section heading translations for spa
ALTER TABLE properties ADD COLUMN section_spa_en TEXT DEFAULT 'Spa & Wellness';
ALTER TABLE properties ADD COLUMN section_spa_ar TEXT DEFAULT 'السبا والعافية';
ALTER TABLE properties ADD COLUMN section_spa_de TEXT DEFAULT 'Spa & Wellness';
ALTER TABLE properties ADD COLUMN section_spa_ru TEXT DEFAULT 'Спа и велнес';
ALTER TABLE properties ADD COLUMN section_spa_pl TEXT DEFAULT 'Spa i wellness';
ALTER TABLE properties ADD COLUMN section_spa_it TEXT DEFAULT 'Spa e benessere';
ALTER TABLE properties ADD COLUMN section_spa_fr TEXT DEFAULT 'Spa et bien-être';
ALTER TABLE properties ADD COLUMN section_spa_cs TEXT DEFAULT 'Spa a wellness';
ALTER TABLE properties ADD COLUMN section_spa_uk TEXT DEFAULT 'Спа і велнес';

-- Add section heading translations for services
ALTER TABLE properties ADD COLUMN section_service_en TEXT DEFAULT 'Hotel Services';
ALTER TABLE properties ADD COLUMN section_service_ar TEXT DEFAULT 'خدمات الفندق';
ALTER TABLE properties ADD COLUMN section_service_de TEXT DEFAULT 'Hoteldienstleistungen';
ALTER TABLE properties ADD COLUMN section_service_ru TEXT DEFAULT 'Услуги отеля';
ALTER TABLE properties ADD COLUMN section_service_pl TEXT DEFAULT 'Usługi hotelowe';
ALTER TABLE properties ADD COLUMN section_service_it TEXT DEFAULT 'Servizi dell hotel';
ALTER TABLE properties ADD COLUMN section_service_fr TEXT DEFAULT 'Services de l hotel';
ALTER TABLE properties ADD COLUMN section_service_cs TEXT DEFAULT 'Hotelové služby';
ALTER TABLE properties ADD COLUMN section_service_uk TEXT DEFAULT 'Готельні послуги';

-- Add section heading translations for activities
ALTER TABLE properties ADD COLUMN section_activities_en TEXT DEFAULT 'Activities & Experiences';
ALTER TABLE properties ADD COLUMN section_activities_ar TEXT DEFAULT 'الأنشطة والتجارب';
ALTER TABLE properties ADD COLUMN section_activities_de TEXT DEFAULT 'Aktivitäten & Erlebnisse';
ALTER TABLE properties ADD COLUMN section_activities_ru TEXT DEFAULT 'Мероприятия и впечатления';
ALTER TABLE properties ADD COLUMN section_activities_pl TEXT DEFAULT 'Zajęcia i doświadczenia';
ALTER TABLE properties ADD COLUMN section_activities_it TEXT DEFAULT 'Attività ed esperienze';
ALTER TABLE properties ADD COLUMN section_activities_fr TEXT DEFAULT 'Activités et expériences';
ALTER TABLE properties ADD COLUMN section_activities_cs TEXT DEFAULT 'Aktivity a zážitky';
ALTER TABLE properties ADD COLUMN section_activities_uk TEXT DEFAULT 'Заходи та враження';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_sections_property ON custom_sections(property_id);
CREATE INDEX IF NOT EXISTS idx_custom_sections_visible ON custom_sections(property_id, is_visible);
