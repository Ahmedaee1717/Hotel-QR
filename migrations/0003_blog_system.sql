-- ============================================
-- BLOG SYSTEM MIGRATION
-- Complete blog with SEO & AI-chatbot optimization
-- ============================================

-- Blog Categories
CREATE TABLE IF NOT EXISTS blog_categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blog Articles
CREATE TABLE IF NOT EXISTS blog_articles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT, -- Short summary for listings
  content TEXT NOT NULL, -- Full article HTML content
  featured_image TEXT, -- URL to hero image
  
  -- Author info (Super Admin)
  author_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  
  -- Categorization
  category_id INTEGER,
  
  -- SEO Optimization
  meta_title TEXT, -- Custom SEO title (max 60 chars)
  meta_description TEXT, -- Custom SEO description (max 160 chars)
  meta_keywords TEXT, -- Comma-separated keywords
  
  -- Open Graph (Facebook, LinkedIn)
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  
  -- Twitter Card
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  
  -- AI Chatbot Optimization
  ai_summary TEXT, -- Clear summary for AI understanding
  faq_schema TEXT, -- JSON-LD FAQ schema for chatbots
  key_points TEXT, -- Bullet points of main takeaways (JSON array)
  target_audience TEXT, -- Who is this article for
  
  -- Publishing
  status TEXT DEFAULT 'draft', -- draft, published, archived
  published_at DATETIME,
  
  -- Analytics
  views_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (author_id) REFERENCES platform_admins(admin_id),
  FOREIGN KEY (category_id) REFERENCES blog_categories(category_id)
);

-- Blog Tags (for better discovery)
CREATE TABLE IF NOT EXISTS blog_tags (
  tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Article-Tag relationship (many-to-many)
CREATE TABLE IF NOT EXISTS blog_article_tags (
  article_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES blog_articles(article_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES blog_tags(tag_id) ON DELETE CASCADE
);

-- Blog Comments (optional, for engagement)
CREATE TABLE IF NOT EXISTS blog_comments (
  comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, spam
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES blog_articles(article_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_slug ON blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON blog_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_category ON blog_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author ON blog_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_article ON blog_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON blog_tags(slug);

-- Insert default categories
INSERT OR IGNORE INTO blog_categories (name, slug, description) VALUES
  ('Hotel Technology', 'hotel-technology', 'Latest trends and innovations in hotel technology'),
  ('Guest Experience', 'guest-experience', 'Tips for improving guest satisfaction and experience'),
  ('Digital Transformation', 'digital-transformation', 'How hotels are going digital and paperless'),
  ('Revenue Management', 'revenue-management', 'Strategies to increase hotel revenue and bookings'),
  ('Case Studies', 'case-studies', 'Success stories from hotels using GuestConnect'),
  ('Industry News', 'industry-news', 'Latest news and updates in hospitality industry'),
  ('Product Updates', 'product-updates', 'New features and improvements to GuestConnect');

-- Insert sample tags
INSERT OR IGNORE INTO blog_tags (name, slug) VALUES
  ('QR Codes', 'qr-codes'),
  ('Mobile Technology', 'mobile-technology'),
  ('Guest Satisfaction', 'guest-satisfaction'),
  ('Revenue Growth', 'revenue-growth'),
  ('Contactless', 'contactless'),
  ('AI & Automation', 'ai-automation'),
  ('Best Practices', 'best-practices'),
  ('ROI', 'roi'),
  ('Hotel Management', 'hotel-management'),
  ('Digital Menus', 'digital-menus');
