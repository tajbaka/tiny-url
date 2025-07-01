-- Database initialization script for URL Shortener
-- This script runs when the PostgreSQL container starts for the first time

-- Create the urls table with analytics support
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

-- Create the users table for session management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_short_url ON urls(short_url);
CREATE INDEX IF NOT EXISTS idx_long_url ON urls(long_url);
CREATE INDEX IF NOT EXISTS idx_created_at ON urls(created_at);

-- Indexes for analytics JSON data
CREATE INDEX IF NOT EXISTS idx_access_logs_gin ON urls USING GIN (access_logs);
CREATE INDEX IF NOT EXISTS idx_analytics_gin ON urls USING GIN (analytics);
CREATE INDEX IF NOT EXISTS idx_analytics_countries ON urls USING GIN ((analytics->'countries'));
CREATE INDEX IF NOT EXISTS idx_analytics_devices ON urls USING GIN ((analytics->'devices'));
CREATE INDEX IF NOT EXISTS idx_clicks ON urls(clicks);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON users(created_at);

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

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions to the shortener user
GRANT ALL PRIVILEGES ON TABLE urls TO shortener;
GRANT USAGE, SELECT ON SEQUENCE urls_id_seq TO shortener;

-- Grant permissions for users table
GRANT ALL PRIVILEGES ON TABLE users TO shortener;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO shortener;

-- Insert seed data with analytics for testing and demonstration
INSERT INTO urls (short_url, long_url, clicks, access_logs, analytics) VALUES
('lJsZeu', 'https://github.com/nodejs/node', 15, 
 '[{"accessed_at": "2024-01-15T13:30:00Z", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "ip_address": "192.168.1.100", "referrer": "https://google.com", "country": "United States", "device_type": "Desktop", "browser": "Chrome"}]'::jsonb,
 '{"total_clicks": 15, "unique_visitors": 12, "countries": {"United States": 10, "Canada": 3, "Germany": 2}, "devices": {"Desktop": 9, "Mobile": 6}, "browsers": {"Chrome": 8, "Safari": 4, "Firefox": 3}, "referrers": {"https://google.com": 6, "https://twitter.com": 5, "direct": 4}}'::jsonb),

('9G7J4d', 'https://stackoverflow.com/questions/javascript', 8,
 '[{"accessed_at": "2024-01-15T14:15:00Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "ip_address": "192.168.1.102", "referrer": "https://stackoverflow.com", "country": "Canada", "device_type": "Desktop", "browser": "Chrome"}]'::jsonb,
 '{"total_clicks": 8, "unique_visitors": 6, "countries": {"Canada": 5, "United States": 3}, "devices": {"Desktop": 6, "Mobile": 2}, "browsers": {"Chrome": 5, "Firefox": 3}, "referrers": {"https://stackoverflow.com": 4, "https://google.com": 3, "direct": 1}}'::jsonb),

('vCA0PI', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', 22, '[]'::jsonb,
 '{"total_clicks": 22, "unique_visitors": 18, "countries": {"Germany": 10, "United States": 7, "France": 5}, "devices": {"Desktop": 15, "Mobile": 7}, "browsers": {"Firefox": 12, "Chrome": 7, "Safari": 3}, "referrers": {"https://github.com": 8, "https://google.com": 8, "https://reddit.com": 4, "direct": 2}}'::jsonb),

-- Add remaining URLs with analytics data  
('EJhrAM', 'https://www.npmjs.com/package/express', 12, '[]'::jsonb, '{"total_clicks": 12, "unique_visitors": 9, "countries": {"United States": 7, "India": 3, "Brazil": 2}, "devices": {"Desktop": 8, "Mobile": 4}, "browsers": {"Chrome": 8, "Firefox": 4}, "referrers": {"https://npmjs.com": 5, "https://google.com": 4, "direct": 3}}'::jsonb),
('1xGwgg', 'https://reactjs.org/docs/getting-started.html', 31, '[]'::jsonb, '{"total_clicks": 31, "unique_visitors": 25, "countries": {"United States": 15, "United Kingdom": 8, "Australia": 5, "Canada": 3}, "devices": {"Desktop": 18, "Mobile": 13}, "browsers": {"Chrome": 20, "Safari": 7, "Firefox": 4}, "referrers": {"https://reddit.com": 12, "https://google.com": 10, "https://twitter.com": 6, "direct": 3}}'::jsonb),
('zGor1Q', 'https://www.postgresql.org/docs/', 7, '[]'::jsonb, '{"total_clicks": 7, "unique_visitors": 6, "countries": {"United States": 5, "Canada": 2}, "devices": {"Desktop": 6, "Mobile": 1}, "browsers": {"Chrome": 4, "Firefox": 3}, "referrers": {"https://google.com": 4, "direct": 3}}'::jsonb),
('OwBEZP', 'https://redis.io/documentation', 19, '[]'::jsonb, '{"total_clicks": 19, "unique_visitors": 15, "countries": {"United States": 12, "Europe": 7}, "devices": {"Desktop": 14, "Mobile": 5}, "browsers": {"Chrome": 12, "Firefox": 7}, "referrers": {"https://google.com": 10, "direct": 9}}'::jsonb),
('ZQhNIS', 'https://docker.com/get-started', 14, '[]'::jsonb, '{"total_clicks": 14, "unique_visitors": 11, "countries": {"United States": 8, "Canada": 4, "UK": 2}, "devices": {"Desktop": 10, "Mobile": 4}, "browsers": {"Chrome": 9, "Firefox": 5}, "referrers": {"https://docker.com": 7, "https://google.com": 5, "direct": 2}}'::jsonb),
('QL6JnS', 'https://kubernetes.io/docs/home/', 9, '[]'::jsonb, '{"total_clicks": 9, "unique_visitors": 8, "countries": {"United States": 6, "Canada": 3}, "devices": {"Desktop": 7, "Mobile": 2}, "browsers": {"Chrome": 6, "Firefox": 3}, "referrers": {"https://kubernetes.io": 5, "https://google.com": 3, "direct": 1}}'::jsonb),
('SXeST2', 'https://aws.amazon.com/documentation/', 25, '[]'::jsonb, '{"total_clicks": 25, "unique_visitors": 20, "countries": {"United States": 15, "Canada": 6, "UK": 4}, "devices": {"Desktop": 18, "Mobile": 7}, "browsers": {"Chrome": 16, "Firefox": 6, "Safari": 3}, "referrers": {"https://aws.amazon.com": 12, "https://google.com": 8, "direct": 5}}'::jsonb),
('T4IeON', 'https://www.google.com/search?q=system+design', 33, '[]'::jsonb, '{"total_clicks": 33, "unique_visitors": 28, "countries": {"United States": 20, "Canada": 8, "UK": 5}, "devices": {"Desktop": 22, "Mobile": 11}, "browsers": {"Chrome": 25, "Firefox": 5, "Safari": 3}, "referrers": {"https://google.com": 15, "https://bing.com": 10, "direct": 8}}'::jsonb),
('Kh7VJ4', 'https://leetcode.com/problemset/all/', 18, '[]'::jsonb, '{"total_clicks": 18, "unique_visitors": 15, "countries": {"United States": 12, "Canada": 4, "India": 2}, "devices": {"Desktop": 14, "Mobile": 4}, "browsers": {"Chrome": 12, "Firefox": 4, "Safari": 2}, "referrers": {"https://leetcode.com": 8, "https://google.com": 6, "direct": 4}}'::jsonb),
('kEBWN4', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 45, '[]'::jsonb, '{"total_clicks": 45, "unique_visitors": 38, "countries": {"United States": 25, "Canada": 12, "UK": 8}, "devices": {"Desktop": 28, "Mobile": 17}, "browsers": {"Chrome": 30, "Safari": 10, "Firefox": 5}, "referrers": {"https://twitter.com": 20, "https://reddit.com": 15, "direct": 10}}'::jsonb),
('cBJO20', 'https://en.wikipedia.org/wiki/URL_shortening', 11, '[]'::jsonb, '{"total_clicks": 11, "unique_visitors": 9, "countries": {"United States": 7, "Canada": 3, "UK": 1}, "devices": {"Desktop": 8, "Mobile": 3}, "browsers": {"Chrome": 7, "Firefox": 3, "Safari": 1}, "referrers": {"https://google.com": 6, "https://wikipedia.org": 3, "direct": 2}}'::jsonb),
('TJszuv', 'https://www.cloudflare.com/learning/', 6, '[]'::jsonb, '{"total_clicks": 6, "unique_visitors": 5, "countries": {"United States": 4, "Canada": 2}, "devices": {"Desktop": 5, "Mobile": 1}, "browsers": {"Chrome": 4, "Firefox": 2}, "referrers": {"https://google.com": 3, "direct": 3}}'::jsonb),
('ufd4K7', 'https://nginx.org/en/docs/', 13, '[]'::jsonb, '{"total_clicks": 13, "unique_visitors": 11, "countries": {"United States": 8, "Europe": 5}, "devices": {"Desktop": 10, "Mobile": 3}, "browsers": {"Chrome": 8, "Firefox": 5}, "referrers": {"https://google.com": 7, "direct": 6}}'::jsonb),
('rRyLYv', 'https://www.mongodb.com/docs/', 17, '[]'::jsonb, '{"total_clicks": 17, "unique_visitors": 14, "countries": {"United States": 10, "Canada": 5, "India": 2}, "devices": {"Desktop": 12, "Mobile": 5}, "browsers": {"Chrome": 11, "Firefox": 6}, "referrers": {"https://google.com": 9, "direct": 8}}'::jsonb),
('HahHsY', 'https://nodejs.org/en/docs/', 20, '[]'::jsonb, '{"total_clicks": 20, "unique_visitors": 16, "countries": {"United States": 12, "Canada": 6, "UK": 2}, "devices": {"Desktop": 15, "Mobile": 5}, "browsers": {"Chrome": 14, "Firefox": 6}, "referrers": {"https://google.com": 10, "https://nodejs.org": 6, "direct": 4}}'::jsonb),
('gkzRUJ', 'https://expressjs.com/en/guide/', 16, '[]'::jsonb, '{"total_clicks": 16, "unique_visitors": 13, "countries": {"United States": 10, "Canada": 4, "India": 2}, "devices": {"Desktop": 12, "Mobile": 4}, "browsers": {"Chrome": 10, "Firefox": 6}, "referrers": {"https://google.com": 8, "direct": 8}}'::jsonb),
('KFKDqP', 'https://www.postman.com/api-platform/', 10, '[]'::jsonb, '{"total_clicks": 10, "unique_visitors": 8, "countries": {"United States": 6, "Canada": 3, "UK": 1}, "devices": {"Desktop": 7, "Mobile": 3}, "browsers": {"Chrome": 6, "Firefox": 4}, "referrers": {"https://google.com": 5, "direct": 5}}'::jsonb),
('muPP95', 'https://jwt.io/introduction/', 24, '[]'::jsonb, '{"total_clicks": 24, "unique_visitors": 19, "countries": {"United States": 15, "Canada": 6, "Europe": 3}, "devices": {"Desktop": 18, "Mobile": 6}, "browsers": {"Chrome": 16, "Firefox": 8}, "referrers": {"https://google.com": 12, "direct": 12}}'::jsonb),
('bkXjdm', 'https://www.elastic.co/guide/', 5, '[]'::jsonb, '{"total_clicks": 5, "unique_visitors": 4, "countries": {"United States": 3, "Canada": 2}, "devices": {"Desktop": 4, "Mobile": 1}, "browsers": {"Chrome": 3, "Firefox": 2}, "referrers": {"https://google.com": 3, "direct": 2}}'::jsonb),
('8XUdDa', 'https://prometheus.io/docs/', 8, '[]'::jsonb, '{"total_clicks": 8, "unique_visitors": 7, "countries": {"United States": 5, "Europe": 3}, "devices": {"Desktop": 6, "Mobile": 2}, "browsers": {"Chrome": 5, "Firefox": 3}, "referrers": {"https://google.com": 4, "direct": 4}}'::jsonb),
('1h3bh8', 'https://grafana.com/docs/', 12, '[]'::jsonb, '{"total_clicks": 12, "unique_visitors": 10, "countries": {"United States": 8, "Canada": 3, "Europe": 1}, "devices": {"Desktop": 9, "Mobile": 3}, "browsers": {"Chrome": 8, "Firefox": 4}, "referrers": {"https://google.com": 6, "direct": 6}}'::jsonb),
('Xc6S9G', 'https://www.jenkins.io/doc/', 15, '[]'::jsonb, '{"total_clicks": 15, "unique_visitors": 12, "countries": {"United States": 9, "Canada": 4, "Europe": 2}, "devices": {"Desktop": 11, "Mobile": 4}, "browsers": {"Chrome": 10, "Firefox": 5}, "referrers": {"https://google.com": 8, "direct": 7}}'::jsonb),
('TOUdHj', 'https://kubernetes.io/docs/concepts/', 21, '[]'::jsonb, '{"total_clicks": 21, "unique_visitors": 17, "countries": {"United States": 13, "Canada": 5, "Europe": 3}, "devices": {"Desktop": 16, "Mobile": 5}, "browsers": {"Chrome": 14, "Firefox": 7}, "referrers": {"https://kubernetes.io": 10, "https://google.com": 7, "direct": 4}}'::jsonb),
('qrNATN', 'https://www.terraform.io/docs/', 9, '[]'::jsonb, '{"total_clicks": 9, "unique_visitors": 8, "countries": {"United States": 6, "Canada": 3}, "devices": {"Desktop": 7, "Mobile": 2}, "browsers": {"Chrome": 6, "Firefox": 3}, "referrers": {"https://google.com": 5, "direct": 4}}'::jsonb),
('7b3LdQ', 'https://docs.ansible.com/', 14, '[]'::jsonb, '{"total_clicks": 14, "unique_visitors": 11, "countries": {"United States": 9, "Canada": 4, "Europe": 1}, "devices": {"Desktop": 10, "Mobile": 4}, "browsers": {"Chrome": 9, "Firefox": 5}, "referrers": {"https://google.com": 7, "direct": 7}}'::jsonb),
('H839HU', 'https://www.vagrantup.com/docs/', 7, '[]'::jsonb, '{"total_clicks": 7, "unique_visitors": 6, "countries": {"United States": 5, "Canada": 2}, "devices": {"Desktop": 6, "Mobile": 1}, "browsers": {"Chrome": 5, "Firefox": 2}, "referrers": {"https://google.com": 4, "direct": 3}}'::jsonb)
ON CONFLICT (short_url) DO NOTHING; 