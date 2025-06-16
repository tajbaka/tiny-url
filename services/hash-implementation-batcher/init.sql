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
CREATE INDEX IF NOT EXISTS idx_id ON urls(id DESC);

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

-- Create the short_urls_bucket table
CREATE TABLE IF NOT EXISTS short_urls_bucket (
    id SERIAL PRIMARY KEY,
    short_url VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on short_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_bucket_short_url ON short_urls_bucket(short_url);

-- Insert some sample data for testing (optional)
-- INSERT INTO urls (short_url, long_url) VALUES 
--     ('abc123', 'https://www.example.com'),
--     ('xyz789', 'https://www.google.com');

-- Grant necessary permissions to the shortener user
GRANT ALL PRIVILEGES ON TABLE urls TO shortener;
GRANT USAGE, SELECT ON SEQUENCE urls_id_seq TO shortener;
GRANT ALL PRIVILEGES ON TABLE short_urls_bucket TO shortener;
GRANT USAGE, SELECT ON SEQUENCE short_urls_bucket_id_seq TO shortener; 