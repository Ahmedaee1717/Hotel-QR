-- Add excludes column and ensure requirements/includes are properly structured
-- These will store JSON arrays of strings

-- Add excludes column (what's NOT included)
ALTER TABLE activities ADD COLUMN excludes TEXT;

-- Update existing NULL values to empty JSON arrays
UPDATE activities SET requirements = '[]' WHERE requirements IS NULL;
UPDATE activities SET includes = '[]' WHERE includes IS NULL;
UPDATE activities SET excludes = '[]' WHERE excludes IS NULL;
