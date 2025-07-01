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

  // Log detailed access information for analytics (using JSON)
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

  // Get detailed analytics for a URL (using JSON)
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

  // Get all URLs with pagination support
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
