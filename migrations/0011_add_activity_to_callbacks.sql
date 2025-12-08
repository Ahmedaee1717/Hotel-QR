-- Add activity_id to callback_requests table
ALTER TABLE callback_requests ADD COLUMN activity_id INTEGER;

-- Add foreign key index
CREATE INDEX IF NOT EXISTS idx_callback_requests_activity ON callback_requests(activity_id);

-- Add vendor_id for faster queries
ALTER TABLE callback_requests ADD COLUMN vendor_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_callback_requests_vendor ON callback_requests(vendor_id, status);
