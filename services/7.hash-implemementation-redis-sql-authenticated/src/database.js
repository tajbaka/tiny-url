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

  // Get total URL count for stats
  static async getTotalUrlCount() {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM urls");
      return parseInt(result.rows[0].count);
    } catch (err) {
      console.error("Error getting total URL count:", err);
      return 0;
    }
  }

  // Analytics methods

  // Log detailed access information for analytics
  static async logAccess(shortUrl, accessInfo) {
    try {
      const accessLog = {
        accessed_at: new Date().toISOString(),
        user_agent: accessInfo.userAgent || null,
        ip_address: accessInfo.ipAddress || null,
        referrer: accessInfo.referrer || null,
        country: accessInfo.country || null,
        city: accessInfo.city || null,
        device_type: accessInfo.deviceType || null,
        browser: accessInfo.browser || null,
        operating_system: accessInfo.operatingSystem || null,
      };

      // Add access log to the JSON array and update analytics
      const result = await pool.query(
        `UPDATE urls SET 
         access_logs = access_logs || $2::jsonb,
         analytics = jsonb_set(
           jsonb_set(
             jsonb_set(
               jsonb_set(
                 jsonb_set(
                   analytics,
                   '{total_clicks}',
                   (COALESCE((analytics->>'total_clicks')::int, 0) + 1)::text::jsonb
                 ),
                 '{countries,' || $3 || '}',
                 (COALESCE((analytics->'countries'->>$3)::int, 0) + 1)::text::jsonb
               ),
               '{devices,' || $4 || '}',
               (COALESCE((analytics->'devices'->>$4)::int, 0) + 1)::text::jsonb
             ),
             '{browsers,' || $5 || '}',
             (COALESCE((analytics->'browsers'->>$5)::int, 0) + 1)::text::jsonb
           ),
           '{referrers,' || $6 || '}',
           (COALESCE((analytics->'referrers'->>$6)::int, 0) + 1)::text::jsonb
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE short_url = $1`,
        [
          shortUrl,
          JSON.stringify([accessLog]),
          accessInfo.country || "Unknown",
          accessInfo.deviceType || "Unknown",
          accessInfo.browser || "Unknown",
          accessInfo.referrer || "direct",
        ]
      );

      return accessLog;
    } catch (err) {
      console.error("Error logging access:", err);
      // Don't throw error for access logging - it's not critical
      return null;
    }
  }

  // Get detailed analytics for a URL
  static async getUrlAnalytics(shortUrl) {
    try {
      const result = await pool.query(
        "SELECT *, jsonb_array_length(access_logs) as log_count FROM urls WHERE short_url = $1",
        [shortUrl]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const urlInfo = result.rows[0];

      // Get recent access logs (last 100)
      const recentLogs = urlInfo.access_logs.slice(-100).reverse();

      // Calculate daily clicks for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dailyClicksMap = {};

      urlInfo.access_logs.forEach((log) => {
        const logDate = new Date(log.accessed_at);
        if (logDate >= thirtyDaysAgo) {
          const date = logDate.toISOString().split("T")[0];
          dailyClicksMap[date] = (dailyClicksMap[date] || 0) + 1;
        }
      });

      const dailyClicks = Object.entries(dailyClicksMap)
        .map(([date, clicks]) => ({ date, clicks }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        url_info: {
          short_url: urlInfo.short_url,
          long_url: urlInfo.long_url,
          created_at: urlInfo.created_at,
          updated_at: urlInfo.updated_at,
          clicks: urlInfo.clicks,
        },
        access_logs: recentLogs,
        analytics: {
          ...urlInfo.analytics,
          daily_clicks: dailyClicks,
        },
      };
    } catch (err) {
      console.error("Error getting URL analytics:", err);
      throw err;
    }
  }

  // Parse user agent to extract device/browser info
  static parseUserAgent(userAgent) {
    if (!userAgent)
      return { deviceType: null, browser: null, operatingSystem: null };

    let deviceType = "Desktop";
    let browser = "Unknown";
    let operatingSystem = "Unknown";

    // Device type detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = "Mobile";
    } else if (/Tablet|iPad/.test(userAgent)) {
      deviceType = "Tablet";
    }

    // Browser detection
    if (/Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent)) {
      browser = "Chrome";
    } else if (/Firefox/.test(userAgent)) {
      browser = "Firefox";
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      browser = "Safari";
    } else if (/Edge|Edg/.test(userAgent)) {
      browser = "Edge";
    }

    // Operating system detection
    if (/Windows/.test(userAgent)) {
      operatingSystem = "Windows";
    } else if (/Mac OS X|macOS/.test(userAgent)) {
      operatingSystem = "macOS";
    } else if (/Linux/.test(userAgent)) {
      operatingSystem = "Linux";
    } else if (/Android/.test(userAgent)) {
      operatingSystem = "Android";
    } else if (/iOS|iPhone|iPad/.test(userAgent)) {
      operatingSystem = "iOS";
    }

    return { deviceType, browser, operatingSystem };
  }

  // User management methods

  // Create a new user
  static async createUser(username, email, passwordHash) {
    try {
      const result = await pool.query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
        [username, email, passwordHash]
      );
      return result.rows[0];
    } catch (err) {
      console.error("Error creating user:", err);
      throw err;
    }
  }

  // Get user by username
  static async getUserByUsername(username) {
    try {
      const result = await pool.query(
        "SELECT id, username, email, password_hash, created_at FROM users WHERE username = $1",
        [username]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("Error getting user by username:", err);
      throw err;
    }
  }

  // Get user by email
  static async getUserByEmail(email) {
    try {
      const result = await pool.query(
        "SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1",
        [email]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("Error getting user by email:", err);
      throw err;
    }
  }

  // Get user by ID
  static async getUserById(id) {
    try {
      const result = await pool.query(
        "SELECT id, username, email, created_at FROM users WHERE id = $1",
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("Error getting user by ID:", err);
      throw err;
    }
  }

  // Session management methods using Redis

  // Store session data in Redis
  static async createSession(sessionId, userId, userData = {}) {
    try {
      const sessionData = {
        userId,
        ...userData,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };

      // Store session for 24 hours by default
      await redis.setex(
        `session:${sessionId}`,
        86400,
        JSON.stringify(sessionData)
      );
      return sessionData;
    } catch (err) {
      console.error("Error creating session:", err);
      throw err;
    }
  }

  // Get session data from Redis
  static async getSession(sessionId) {
    try {
      const sessionData = await redis.get(`session:${sessionId}`);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        // Update last accessed time
        parsed.lastAccessed = new Date().toISOString();
        await redis.setex(
          `session:${sessionId}`,
          86400,
          JSON.stringify(parsed)
        );
        return parsed;
      }
      return null;
    } catch (err) {
      console.error("Error getting session:", err);
      throw err;
    }
  }

  // Delete session from Redis
  static async deleteSession(sessionId) {
    try {
      await redis.del(`session:${sessionId}`);
      return true;
    } catch (err) {
      console.error("Error deleting session:", err);
      throw err;
    }
  }

  // Update session data
  static async updateSession(sessionId, userData) {
    try {
      const existingSession = await this.getSession(sessionId);
      if (existingSession) {
        const updatedSession = {
          ...existingSession,
          ...userData,
          lastAccessed: new Date().toISOString(),
        };
        await redis.setex(
          `session:${sessionId}`,
          86400,
          JSON.stringify(updatedSession)
        );
        return updatedSession;
      }
      return null;
    } catch (err) {
      console.error("Error updating session:", err);
      throw err;
    }
  }
}

module.exports = UrlDatabase;
