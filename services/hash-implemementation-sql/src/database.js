const { Pool } = require("pg");

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "urlshortener_sql",
  user: process.env.DB_USER || "shortener",
  password: process.env.DB_PASSWORD || "shortener123",
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Database operations
class UrlDatabase {
  // Test database connection
  static async testConnection() {
    try {
      const client = await pool.connect();
      const result = await client.query("SELECT NOW() as current_time");
      client.release();
      console.log(
        "Database connected successfully at:",
        result.rows[0].current_time
      );
      return true;
    } catch (err) {
      console.error("Database connection error:", err);
      return false;
    }
  }

  // Check if a short URL already exists
  static async shortUrlExists(shortUrl) {
    try {
      const result = await pool.query(
        "SELECT 1 FROM urls WHERE short_url = $1",
        [shortUrl]
      );
      return result.rows.length > 0;
    } catch (err) {
      console.error("Error checking short URL existence:", err);
      throw err;
    }
  }

  // Find existing short URL for a long URL
  static async findShortUrlByLongUrl(longUrl) {
    try {
      const result = await pool.query(
        "SELECT short_url FROM urls WHERE long_url = $1 LIMIT 1",
        [longUrl]
      );
      return result.rows.length > 0 ? result.rows[0].short_url : null;
    } catch (err) {
      console.error("Error finding short URL by long URL:", err);
      throw err;
    }
  }

  // Create a new URL mapping
  static async createUrl(shortUrl, longUrl) {
    try {
      const result = await pool.query(
        "INSERT INTO urls (short_url, long_url) VALUES ($1, $2) RETURNING *",
        [shortUrl, longUrl]
      );
      return result.rows[0];
    } catch (err) {
      console.error("Error creating URL mapping:", err);
      throw err;
    }
  }

  // Get long URL by short URL
  static async getLongUrl(shortUrl) {
    try {
      const result = await pool.query(
        "SELECT long_url FROM urls WHERE short_url = $1",
        [shortUrl]
      );
      return result.rows.length > 0 ? result.rows[0].long_url : null;
    } catch (err) {
      console.error("Error getting long URL:", err);
      throw err;
    }
  }

  // Increment click count for a URL
  static async incrementClickCount(shortUrl) {
    try {
      const result = await pool.query(
        "UPDATE urls SET clicks = clicks + 1, updated_at = CURRENT_TIMESTAMP WHERE short_url = $1 RETURNING clicks",
        [shortUrl]
      );
      return result.rows.length > 0 ? result.rows[0].clicks : 0;
    } catch (err) {
      console.error("Error incrementing click count:", err);
      // Don't throw error for click counting - it's not critical
      return 0;
    }
  }

  // Get URL statistics
  static async getUrlStats(shortUrl) {
    try {
      const result = await pool.query(
        "SELECT * FROM urls WHERE short_url = $1",
        [shortUrl]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("Error getting URL stats:", err);
      throw err;
    }
  }

  // Get total count of URLs in database
  static async getTotalUrlCount() {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM urls");
      return parseInt(result.rows[0].count);
    } catch (err) {
      console.error("Error getting total URL count:", err);
      return 0;
    }
  }

  // Get recent URLs (for admin purposes)
  static async getRecentUrls(limit = 10) {
    try {
      const result = await pool.query(
        "SELECT short_url, long_url, created_at, clicks FROM urls ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      return result.rows;
    } catch (err) {
      console.error("Error getting recent URLs:", err);
      throw err;
    }
  }

  // Close the database pool (for graceful shutdown)
  static async close() {
    try {
      await pool.end();
      console.log("Database pool closed");
    } catch (err) {
      console.error("Error closing database pool:", err);
    }
  }
}

module.exports = UrlDatabase;
