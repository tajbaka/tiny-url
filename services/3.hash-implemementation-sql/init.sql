-- Database initialization script for URL Shortener
-- This script runs when the PostgreSQL container starts for the first time

-- Create the urls table with nested JSON structures
CREATE TABLE IF NOT EXISTS urls (
    id SERIAL PRIMARY KEY,
    short_url VARCHAR(10) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    clicks INTEGER DEFAULT 0,
    access_logs JSONB DEFAULT '[]'::jsonb,
    analytics JSONB DEFAULT '{
        "total_clicks": 0,
        "unique_visitors": 0,
        "countries": {},
        "devices": {},
        "browsers": {},
        "referrers": {}
    }'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_short_url ON urls(short_url);
CREATE INDEX IF NOT EXISTS idx_long_url ON urls(long_url);
CREATE INDEX IF NOT EXISTS idx_created_at ON urls(created_at);

-- Indexes for JSON data
CREATE INDEX IF NOT EXISTS idx_access_logs_gin ON urls USING GIN (access_logs);
CREATE INDEX IF NOT EXISTS idx_analytics_gin ON urls USING GIN (analytics);
CREATE INDEX IF NOT EXISTS idx_analytics_countries ON urls USING GIN ((analytics->'countries'));
CREATE INDEX IF NOT EXISTS idx_analytics_devices ON urls USING GIN ((analytics->'devices'));

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_urls_updated_at 
    BEFORE UPDATE ON urls 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data with nested JSON structures
INSERT INTO urls (short_url, long_url, clicks, access_logs, analytics) VALUES
('fOBbVf', 'https://github.com/nodejs/node', 18, 
 '[
    {
        "accessed_at": "2024-01-15T13:30:00Z",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "ip_address": "192.168.1.100",
        "referrer": "https://google.com",
        "country": "United States",
        "city": "New York",
        "device_type": "Desktop",
        "browser": "Chrome",
        "operating_system": "Windows"
    },
    {
        "accessed_at": "2024-01-15T14:00:00Z",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        "ip_address": "192.168.1.101",
        "referrer": "https://twitter.com",
        "country": "United States",
        "city": "Los Angeles",
        "device_type": "Mobile",
        "browser": "Safari",
        "operating_system": "iOS"
    }
 ]'::jsonb,
 '{
    "total_clicks": 18,
    "unique_visitors": 15,
    "countries": {"United States": 12, "Canada": 4, "Germany": 2},
    "devices": {"Desktop": 11, "Mobile": 7},
    "browsers": {"Chrome": 10, "Safari": 5, "Firefox": 3},
    "referrers": {"https://google.com": 8, "https://twitter.com": 6, "direct": 4}
 }'::jsonb),

('GZyY62', 'https://stackoverflow.com/questions/javascript', 12,
 '[
    {
        "accessed_at": "2024-01-15T14:15:00Z",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "ip_address": "192.168.1.102",
        "referrer": "https://stackoverflow.com",
        "country": "Canada",
        "city": "Toronto",
        "device_type": "Desktop",
        "browser": "Chrome",
        "operating_system": "macOS"
    }
 ]'::jsonb,
 '{
    "total_clicks": 12,
    "unique_visitors": 9,
    "countries": {"Canada": 7, "United States": 5},
    "devices": {"Desktop": 8, "Mobile": 4},
    "browsers": {"Chrome": 7, "Firefox": 5},
    "referrers": {"https://stackoverflow.com": 6, "https://google.com": 4, "direct": 2}
 }'::jsonb),

('mYJVtm', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', 25, '[]'::jsonb,
 '{
    "total_clicks": 25,
    "unique_visitors": 20,
    "countries": {"Germany": 12, "United States": 8, "France": 5},
    "devices": {"Desktop": 18, "Mobile": 7},
    "browsers": {"Firefox": 15, "Chrome": 8, "Safari": 2},
    "referrers": {"https://github.com": 10, "https://google.com": 9, "https://reddit.com": 4, "direct": 2}
 }'::jsonb),

('l0GyCS', 'https://www.npmjs.com/package/express', 9, '[]'::jsonb,
 '{
    "total_clicks": 9,
    "unique_visitors": 7,
    "countries": {"United States": 5, "India": 2, "Brazil": 2},
    "devices": {"Desktop": 6, "Mobile": 3},
    "browsers": {"Chrome": 6, "Firefox": 3},
    "referrers": {"https://npmjs.com": 4, "https://google.com": 3, "direct": 2}
 }'::jsonb),

('GSEbWK', 'https://reactjs.org/docs/getting-started.html', 33, '[]'::jsonb,
 '{
    "total_clicks": 33,
    "unique_visitors": 28,
    "countries": {"United States": 18, "United Kingdom": 8, "Australia": 4, "Canada": 3},
    "devices": {"Desktop": 20, "Mobile": 13},
    "browsers": {"Chrome": 22, "Safari": 7, "Firefox": 4},
    "referrers": {"https://reddit.com": 15, "https://google.com": 12, "https://twitter.com": 4, "direct": 2}
 }'::jsonb),

('SLTRo1', 'https://www.postgresql.org/docs/', 15, '[]'::jsonb,
 '{
    "total_clicks": 15,
    "unique_visitors": 12,
    "countries": {"United States": 9, "Canada": 4, "Germany": 2},
    "devices": {"Desktop": 12, "Mobile": 3},
    "browsers": {"Chrome": 8, "Firefox": 5, "Safari": 2},
    "referrers": {"https://postgresql.org": 8, "https://google.com": 5, "direct": 2}
 }'::jsonb),

('r3OMDA', 'https://docker.com/get-started', 21, '[]'::jsonb,
 '{
    "total_clicks": 21,
    "unique_visitors": 17,
    "countries": {"United States": 12, "Canada": 6, "UK": 3},
    "devices": {"Desktop": 15, "Mobile": 6},
    "browsers": {"Chrome": 12, "Firefox": 6, "Safari": 3},
    "referrers": {"https://docker.com": 10, "https://google.com": 7, "direct": 4}
 }'::jsonb),

('tiCy69', 'https://kubernetes.io/docs/home/', 7, '[]'::jsonb,
 '{
    "total_clicks": 7,
    "unique_visitors": 6,
    "countries": {"United States": 4, "Canada": 2, "UK": 1},
    "devices": {"Desktop": 5, "Mobile": 2},
    "browsers": {"Chrome": 4, "Firefox": 2, "Safari": 1},
    "referrers": {"https://kubernetes.io": 4, "https://google.com": 2, "direct": 1}
 }'::jsonb),

('ZCqOiN', 'https://aws.amazon.com/documentation/', 28, '[]'::jsonb,
 '{
    "total_clicks": 28,
    "unique_visitors": 22,
    "countries": {"United States": 16, "Canada": 7, "UK": 3, "Germany": 2},
    "devices": {"Desktop": 20, "Mobile": 8},
    "browsers": {"Chrome": 18, "Firefox": 7, "Safari": 3},
    "referrers": {"https://aws.amazon.com": 15, "https://google.com": 9, "direct": 4}
 }'::jsonb),

('26qqaz', 'https://www.google.com/search?q=system+design', 14, '[]'::jsonb,
 '{
    "total_clicks": 14,
    "unique_visitors": 11,
    "countries": {"United States": 8, "Canada": 4, "UK": 2},
    "devices": {"Desktop": 10, "Mobile": 4},
    "browsers": {"Chrome": 9, "Firefox": 3, "Safari": 2},
    "referrers": {"https://google.com": 8, "https://bing.com": 4, "direct": 2}
 }'::jsonb),

('VVDVV4', 'https://leetcode.com/problemset/all/', 19, '[]'::jsonb,
 '{
    "total_clicks": 19,
    "unique_visitors": 15,
    "countries": {"United States": 12, "Canada": 5, "UK": 2},
    "devices": {"Desktop": 14, "Mobile": 5},
    "browsers": {"Chrome": 12, "Firefox": 5, "Safari": 2},
    "referrers": {"https://leetcode.com": 10, "https://google.com": 6, "direct": 3}
 }'::jsonb),

('DKD6z6', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 42, '[]'::jsonb,
 '{
    "total_clicks": 42,
    "unique_visitors": 35,
    "countries": {"United States": 25, "Canada": 10, "UK": 4, "Germany": 3},
    "devices": {"Desktop": 28, "Mobile": 14},
    "browsers": {"Chrome": 25, "Firefox": 12, "Safari": 5},
    "referrers": {"https://youtube.com": 20, "https://google.com": 15, "https://reddit.com": 5, "direct": 2}
 }'::jsonb)

ON CONFLICT (short_url) DO NOTHING;

-- Grant necessary permissions to the shortener user
GRANT ALL PRIVILEGES ON TABLE urls TO shortener;
GRANT USAGE, SELECT ON SEQUENCE urls_id_seq TO shortener; 