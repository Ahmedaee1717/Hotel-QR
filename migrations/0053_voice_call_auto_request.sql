-- Add auto_created_request_id column to track service requests created from voice calls
ALTER TABLE voice_call_logs ADD COLUMN auto_created_request_id INTEGER;

-- Add source column to service_requests to track where requests came from
ALTER TABLE service_requests ADD COLUMN source TEXT DEFAULT 'manual';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_request ON voice_call_logs(auto_created_request_id);
