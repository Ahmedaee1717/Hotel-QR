-- Add column to show feedback form on homepage
ALTER TABLE feedback_forms ADD COLUMN show_on_homepage INTEGER DEFAULT 0;
