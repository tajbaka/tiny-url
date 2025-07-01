const { Pool } = require("pg");
const Redis = require("ioredis");

// PostgreSQL configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "urlshortener",
  user: process.env.DB_USER || "shortener",
  password: process.env.DB_PASSWORD || "shortener123",
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
};

// Redis configuration for LFU cache
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Create Redis client for caching
const redis = new Redis(redisConfig);

// Handle PostgreSQL pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

// Handle Redis connection events
redis.on("connect", () => {
  console.log("Redis cache connected");
});

redis.on("error", (err) => {
  console.error("Redis cache error:", err);
});

redis.on("close", () => {
  console.log("Redis cache connection closed");
});

// Cache configuration
const CACHE_TTL = 3600; // 1 hour cache TTL
const CACHE_PREFIX = "url:";

// Database operations with Redis LFU caching
class UrlDatabase {
  // Test database connections
  static async testConnection() {
    try {
      // Test PostgreSQL connection
      const client = await pool.connect();
      const result = await client.query("SELECT NOW() as current_time");
      client.release();
      console.log(
        "PostgreSQL connected successfully at:",
        result.rows[0].current_time
      );

      // Test Redis connection
      await redis.ping();
      console.log("Redis cache connected successfully");

      return true;
    } catch (err) {
      console.error("Database connection error:", err);
      return false;
    }
  }

  // Check if a short URL already exists (check cache first, then DB)
  static async shortUrlExists(shortUrl) {
    try {
      const result = await pool.query(
        "SELECT 1 FROM urls WHERE short_url = $1",
        [shortUrl]
      );

      const exists = result.rows.length > 0;

      return exists;
    } catch (err) {
      console.error("Error checking short URL existence:", err);
      throw err;
    }
  }

  // Find existing short URL for a long URL (check cache first, then DB)
  static async findShortUrlByLongUrl(longUrl) {
    try {
      // Check database
      const result = await pool.query(
        "SELECT short_url FROM urls WHERE long_url = $1 LIMIT 1",
        [longUrl]
      );

      if (result.rows.length > 0) {
        const shortUrl = result.rows[0].short_url;
        return shortUrl;
      }

      return null;
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

      const urlData = result.rows[0];

      return urlData;
    } catch (err) {
      console.error("Error creating URL mapping:", err);
      throw err;
    }
  }

  // Get long URL by short URL (check cache first, then DB)
  static async getLongUrl(shortUrl) {
    try {
      // Check cache first
      const cached = await redis.get(`${CACHE_PREFIX}${shortUrl}`);
      if (cached) {
        const urlData = JSON.parse(cached);
        return urlData.long_url;
      }

      // If not in cache, query database
      const result = await pool.query(
        "SELECT * FROM urls WHERE short_url = $1",
        [shortUrl]
      );

      if (result.rows.length > 0) {
        const urlData = result.rows[0];

        // Cache the URL data for future requests
        await redis.setex(
          `${CACHE_PREFIX}${shortUrl}`,
          CACHE_TTL,
          JSON.stringify(urlData)
        );

        return urlData.long_url;
      }

      return null;
    } catch (err) {
      console.error("Error getting long URL:", err);
      throw err;
    }
  }

  // Increment click count for a URL
  static async incrementClickCount(shortUrl) {
    try {
      const result = await pool.query(
        "UPDATE urls SET clicks = clicks + 1, updated_at = CURRENT_TIMESTAMP WHERE short_url = $1 RETURNING clicks, long_url",
        [shortUrl]
      );

      if (result.rows.length > 0) {
        const { clicks, long_url } = result.rows[0];

        // Update cache with new click count
        const fullUrlData = await pool.query(
          "SELECT * FROM urls WHERE short_url = $1",
          [shortUrl]
        );

        if (fullUrlData.rows.length > 0) {
          await redis.setex(
            `${CACHE_PREFIX}${shortUrl}`,
            CACHE_TTL,
            JSON.stringify(fullUrlData.rows[0])
          );
        }

        return clicks;
      }

      return 0;
    } catch (err) {
      console.error("Error incrementing click count:", err);
      // Don't throw error for click counting - it's not critical
      return 0;
    }
  }

  // Get all URLs with pagination support - no caching for admin endpoints
  static async getUrls(limit = 1000) {
    try {
      const result = await pool.query(
        "SELECT short_url, long_url, created_at, clicks, updated_at FROM urls ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      return result.rows;
    } catch (err) {
      console.error("Error getting URLs:", err);
      throw err;
    }
  }

  // Get cache statistics
  static async getCacheStats() {
    try {
      const info = await redis.info("memory");
      const keyspace = await redis.info("keyspace");

      return {
        memory_info: info,
        keyspace_info: keyspace,
        cache_prefix: CACHE_PREFIX,
        cache_ttl: CACHE_TTL,
      };
    } catch (err) {
      console.error("Error getting cache stats:", err);
      return null;
    }
  }

  // Close database connections (for graceful shutdown)
  static async close() {
    try {
      await Promise.all([pool.end(), redis.quit()]);
      console.log("Database connections closed");
    } catch (err) {
      console.error("Error closing database connections:", err);
    }
  }
}

module.exports = UrlDatabase;
