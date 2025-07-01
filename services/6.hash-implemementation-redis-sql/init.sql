-- Database initialization script for URL Shortener
-- This script runs when the PostgreSQL container starts for the first time

-- Create the urls table
CREATE TABLE IF NOT EXISTS urls (
    id SERIAL PRIMARY KEY,
    short_url VARCHAR(10) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    clicks INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_short_url ON urls(short_url);
CREATE INDEX IF NOT EXISTS idx_long_url ON urls(long_url);
CREATE INDEX IF NOT EXISTS idx_created_at ON urls(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks ON urls(clicks);

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

-- Grant necessary permissions to the shortener user
GRANT ALL PRIVILEGES ON TABLE urls TO shortener;
GRANT USAGE, SELECT ON SEQUENCE urls_id_seq TO shortener;

-- Insert seed data using hardcoded URLs from urlGenerator.js
-- This provides initial data for testing and demonstration
INSERT INTO urls (short_url, long_url, clicks) VALUES
('lJsZeu', 'https://github.com/nodejs/node', 15),
('9G7J4d', 'https://stackoverflow.com/questions/javascript', 8),
('vCA0PI', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', 22),
('EJhrAM', 'https://www.npmjs.com/package/express', 12),
('1xGwgg', 'https://reactjs.org/docs/getting-started.html', 31),
('zGor1Q', 'https://www.postgresql.org/docs/', 7),
('OwBEZP', 'https://redis.io/documentation', 19),
('ZQhNIS', 'https://docker.com/get-started', 14),
('QL6JnS', 'https://kubernetes.io/docs/home/', 9),
('SXeST2', 'https://aws.amazon.com/documentation/', 25),
('T4IeON', 'https://www.google.com/search?q=system+design', 33),
('Kh7VJ4', 'https://leetcode.com/problemset/all/', 18),
('kEBWN4', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 45),
('cBJO20', 'https://en.wikipedia.org/wiki/URL_shortening', 11),
('TJszuv', 'https://www.cloudflare.com/learning/', 6),
('ufd4K7', 'https://nginx.org/en/docs/', 13),
('rRyLYv', 'https://www.mongodb.com/docs/', 17),
('HahHsY', 'https://nodejs.org/en/docs/', 20),
('gkzRUJ', 'https://expressjs.com/en/guide/', 16),
('KFKDqP', 'https://www.postman.com/api-platform/', 10),
('muPP95', 'https://jwt.io/introduction/', 24),
('bkXjdm', 'https://www.elastic.co/guide/', 5),
('8XUdDa', 'https://prometheus.io/docs/', 8),
('1h3bh8', 'https://grafana.com/docs/', 12),
('Xc6S9G', 'https://www.jenkins.io/doc/', 15),
('TOUdHj', 'https://kubernetes.io/docs/concepts/', 21),
('qrNATN', 'https://www.terraform.io/docs/', 9),
('7b3LdQ', 'https://docs.ansible.com/', 14),
('H839HU', 'https://www.vagrantup.com/docs/', 7)
ON CONFLICT (short_url) DO NOTHING; 