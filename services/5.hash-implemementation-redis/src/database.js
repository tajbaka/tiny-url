const Redis = require("ioredis");

// Redis configuration
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

// Create Redis client
const redis = new Redis(redisConfig);

// Handle Redis connection events
redis.on("connect", () => {
  console.log("Redis client connected");
});

redis.on("error", (err) => {
  console.error("Redis client error:", err);
});

redis.on("close", () => {
  console.log("Redis client connection closed");
});

// Database operations
class UrlDatabase {
  // Test database connection
  static async testConnection() {
    try {
      await redis.ping();
      console.log("Redis connected successfully");
      return true;
    } catch (err) {
      console.error("Redis connection error:", err);
      return false;
    }
  }

  // Check if a short URL already exists
  static async shortUrlExists(shortUrl) {
    try {
      const exists = await redis.exists(`url:${shortUrl}`);
      return exists === 1;
    } catch (err) {
      console.error("Error checking short URL existence:", err);
      throw err;
    }
  }

  // Find existing short URL for a long URL
  static async findShortUrlByLongUrl(longUrl) {
    try {
      const shortUrl = await redis.get(`reverse:${longUrl}`);
      return shortUrl;
    } catch (err) {
      console.error("Error finding short URL by long URL:", err);
      throw err;
    }
  }

  // Create a new URL mapping
  static async createUrl(shortUrl, longUrl) {
    try {
      const pipeline = redis.pipeline();

      // Store the URL mapping
      pipeline.hset(`url:${shortUrl}`, {
        longUrl: longUrl,
        shortUrl: shortUrl,
        clicks: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Set expiration (optional - URLs expire after 1 year)
      pipeline.expire(`url:${shortUrl}`, 365 * 24 * 60 * 60);

      // Store reverse mapping for quick lookup
      pipeline.set(`reverse:${longUrl}`, shortUrl);
      pipeline.expire(`reverse:${longUrl}`, 365 * 24 * 60 * 60);

      // Add to recent URLs sorted set
      pipeline.zadd("recent_urls", Date.now(), shortUrl);

      // Keep only last 1000 recent URLs
      pipeline.zremrangebyrank("recent_urls", 0, -1001);

      await pipeline.exec();

      return {
        shortUrl,
        longUrl,
        clicks: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (err) {
      console.error("Error creating URL mapping:", err);
      throw err;
    }
  }

  // Get long URL by short URL
  static async getLongUrl(shortUrl) {
    try {
      const longUrl = await redis.hget(`url:${shortUrl}`, "longUrl");
      return longUrl;
    } catch (err) {
      console.error("Error getting long URL:", err);
      throw err;
    }
  }

  // Increment click count for a URL
  static async incrementClickCount(shortUrl) {
    try {
      const pipeline = redis.pipeline();
      pipeline.hincrby(`url:${shortUrl}`, "clicks", 1);
      pipeline.hset(`url:${shortUrl}`, "updatedAt", Date.now());

      const results = await pipeline.exec();
      return results[0][1]; // Return the new click count
    } catch (err) {
      console.error("Error incrementing click count:", err);
      // Don't throw error for click counting - it's not critical
      return 0;
    }
  }

  // Get URL statistics
  static async getUrlStats(shortUrl) {
    try {
      const urlData = await redis.hgetall(`url:${shortUrl}`);

      if (!urlData.longUrl) {
        return null;
      }

      return {
        short_url: urlData.shortUrl,
        long_url: urlData.longUrl,
        clicks: parseInt(urlData.clicks) || 0,
        created_at: new Date(parseInt(urlData.createdAt)),
        updated_at: new Date(parseInt(urlData.updatedAt)),
      };
    } catch (err) {
      console.error("Error getting URL stats:", err);
      throw err;
    }
  }

  // Get total count of URLs in database
  static async getTotalUrlCount() {
    try {
      const keys = await redis.keys("url:*");
      return keys.length;
    } catch (err) {
      console.error("Error getting total URL count:", err);
      return 0;
    }
  }

  // Get recent URLs (for admin purposes)
  static async getRecentUrls(limit = 10) {
    try {
      const recentShortUrls = await redis.zrevrange(
        "recent_urls",
        0,
        limit - 1
      );
      const urls = [];

      for (const shortUrl of recentShortUrls) {
        const urlData = await redis.hgetall(`url:${shortUrl}`);
        if (urlData.longUrl) {
          urls.push({
            short_url: urlData.shortUrl,
            long_url: urlData.longUrl,
            created_at: new Date(parseInt(urlData.createdAt)),
            clicks: parseInt(urlData.clicks) || 0,
          });
        }
      }

      return urls;
    } catch (err) {
      console.error("Error getting recent URLs:", err);
      throw err;
    }
  }

  // Get all URLs with pagination support
  static async getUrls(limit = 1000) {
    try {
      const allKeys = await redis.keys("url:*");
      const urls = [];

      // Process URLs in batches to avoid blocking
      const batchSize = 100;
      for (let i = 0; i < Math.min(allKeys.length, limit); i += batchSize) {
        const batch = allKeys.slice(i, i + batchSize);
        const pipeline = redis.pipeline();

        batch.forEach((key) => {
          pipeline.hgetall(key);
        });

        const results = await pipeline.exec();

        for (const [err, urlData] of results) {
          if (!err && urlData.longUrl) {
            urls.push({
              short_url: urlData.shortUrl,
              long_url: urlData.longUrl,
              created_at: new Date(parseInt(urlData.createdAt)),
              clicks: parseInt(urlData.clicks) || 0,
              updated_at: new Date(parseInt(urlData.updatedAt)),
            });
          }
        }

        if (urls.length >= limit) break;
      }

      // Sort by creation date (newest first)
      return urls.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
    } catch (err) {
      console.error("Error getting URLs:", err);
      throw err;
    }
  }

  // Close the database connection (for graceful shutdown)
  static async close() {
    try {
      await redis.quit();
      console.log("Redis connection closed");
    } catch (err) {
      console.error("Error closing Redis connection:", err);
    }
  }
}

module.exports = UrlDatabase;
