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

-- Insert some sample data for testing (optional)
-- INSERT INTO urls (short_url, long_url) VALUES 
--     ('abc123', 'https://www.example.com'),
--     ('xyz789', 'https://www.google.com');

-- Grant necessary permissions to the shortener user
GRANT ALL PRIVILEGES ON TABLE urls TO shortener;
GRANT USAGE, SELECT ON SEQUENCE urls_id_seq TO shortener; 