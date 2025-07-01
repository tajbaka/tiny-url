const { MongoClient } = require("mongodb");

// Database configuration
const dbConfig = {
  url:
    process.env.MONGODB_URI ||
    "mongodb://shortener:shortener123@localhost:27017/urlshortener",
  dbName: process.env.DB_NAME || "urlshortener",
  options: {
    maxPoolSize: 10,
    readConcern: { level: "local" },
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
  },
};

// MongoDB client instance
let client = null;
let db = null;

// Database operations
class UrlDatabase {
  // Initialize database connection
  static async connect() {
    try {
      client = new MongoClient(dbConfig.url, dbConfig.options);
      await client.connect();
      db = client.db(dbConfig.dbName);

      // Create indexes for better performance
      await db
        .collection("urls")
        .createIndex({ short_url: 1 }, { unique: true });
      await db.collection("urls").createIndex({ long_url: 1 });
      await db.collection("urls").createIndex({ created_at: -1 });

      console.log("MongoDB connected successfully");
      return true;
    } catch (err) {
      console.error("MongoDB connection error:", err);
      return false;
    }
  }

  // Test database connection
  static async testConnection() {
    try {
      if (!db) {
        await this.connect();
      }
      const result = await db.command({ ping: 1 });
      console.log("Database connected successfully");
      return true;
    } catch (err) {
      console.error("Database connection error:", err);
      return false;
    }
  }

  // Check if a short URL already exists
  static async shortUrlExists(shortUrl) {
    try {
      const result = await db
        .collection("urls")
        .findOne({ short_url: shortUrl });
      return result !== null;
    } catch (err) {
      console.error("Error checking short URL existence:", err);
      throw err;
    }
  }

  // Find existing short URL for a long URL
  static async findShortUrlByLongUrl(longUrl) {
    try {
      const result = await db.collection("urls").findOne({ long_url: longUrl });
      return result ? result.short_url : null;
    } catch (err) {
      console.error("Error finding short URL by long URL:", err);
      throw err;
    }
  }

  // Create a new URL mapping
  static async createUrl(shortUrl, longUrl) {
    try {
      const urlDoc = {
        short_url: shortUrl,
        long_url: longUrl,
        created_at: new Date(),
        updated_at: new Date(),
        clicks: 0,
      };

      const result = await db.collection("urls").insertOne(urlDoc);
      return { ...urlDoc, _id: result.insertedId };
    } catch (err) {
      console.error("Error creating URL mapping:", err);
      throw err;
    }
  }

  // Get long URL by short URL
  static async getLongUrl(shortUrl) {
    try {
      const result = await db
        .collection("urls")
        .findOne({ short_url: shortUrl });
      return result ? result.long_url : null;
    } catch (err) {
      console.error("Error getting long URL:", err);
      throw err;
    }
  }

  // Increment click count for a URL
  static async incrementClickCount(shortUrl) {
    try {
      const result = await db.collection("urls").findOneAndUpdate(
        { short_url: shortUrl },
        {
          $inc: { clicks: 1 },
          $set: { updated_at: new Date() },
        },
        { returnDocument: "after" }
      );
      return result.value ? result.value.clicks : 0;
    } catch (err) {
      console.error("Error incrementing click count:", err);
      // Don't throw error for click counting - it's not critical
      return 0;
    }
  }

  // Log detailed access information for analytics
  static async logAccess(shortUrl, accessInfo) {
    try {
      const accessLog = {
        accessed_at: new Date(),
        user_agent: accessInfo.userAgent || null,
        ip_address: accessInfo.ipAddress || null,
        referrer: accessInfo.referrer || null,
        country: accessInfo.country || null,
        city: accessInfo.city || null,
        device_type: accessInfo.deviceType || null,
        browser: accessInfo.browser || null,
        operating_system: accessInfo.operatingSystem || null,
      };

      // Add the access log to the URL document
      const result = await db.collection("urls").findOneAndUpdate(
        { short_url: shortUrl },
        {
          $push: { access_logs: accessLog },
          $set: { updated_at: new Date() },
        },
        { returnDocument: "after" }
      );

      // Update analytics aggregations
      await this.updateAnalytics(shortUrl, accessInfo);

      return accessLog;
    } catch (err) {
      console.error("Error logging access:", err);
      // Don't throw error for access logging - it's not critical
      return null;
    }
  }

  // Update analytics aggregations
  static async updateAnalytics(shortUrl, accessInfo) {
    try {
      const updateOperations = {
        $inc: { "analytics.total_clicks": 1 },
      };

      // Update country count
      if (accessInfo.country) {
        updateOperations.$inc[`analytics.countries.${accessInfo.country}`] = 1;
      }

      // Update device type count
      if (accessInfo.deviceType) {
        updateOperations.$inc[`analytics.devices.${accessInfo.deviceType}`] = 1;
      }

      // Update browser count
      if (accessInfo.browser) {
        updateOperations.$inc[`analytics.browsers.${accessInfo.browser}`] = 1;
      }

      // Update referrer count
      if (accessInfo.referrer) {
        updateOperations.$inc[`analytics.referrers.${accessInfo.referrer}`] = 1;
      } else {
        updateOperations.$inc["analytics.referrers.direct"] = 1;
      }

      await db
        .collection("urls")
        .updateOne({ short_url: shortUrl }, updateOperations);
    } catch (err) {
      console.error("Error updating analytics:", err);
    }
  }

  // Get detailed analytics for a URL
  static async getUrlAnalytics(shortUrl) {
    try {
      const result = await db
        .collection("urls")
        .findOne({ short_url: shortUrl });

      if (!result) {
        return null;
      }

      // Get recent access logs (last 100)
      const recentLogs = result.access_logs
        ? result.access_logs
            .sort((a, b) => new Date(b.accessed_at) - new Date(a.accessed_at))
            .slice(0, 100)
        : [];

      // Calculate daily clicks for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dailyClicksMap = {};

      if (result.access_logs) {
        result.access_logs
          .filter((log) => new Date(log.accessed_at) >= thirtyDaysAgo)
          .forEach((log) => {
            const date = new Date(log.accessed_at).toISOString().split("T")[0];
            dailyClicksMap[date] = (dailyClicksMap[date] || 0) + 1;
          });
      }

      const dailyClicks = Object.entries(dailyClicksMap)
        .map(([date, clicks]) => ({ date, clicks }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        url_info: {
          short_url: result.short_url,
          long_url: result.long_url,
          created_at: result.created_at,
          updated_at: result.updated_at,
          clicks: result.clicks,
        },
        access_logs: recentLogs,
        analytics: {
          total_clicks: result.clicks,
          unique_visitors: result.analytics?.unique_visitors || 0,
          countries: result.analytics?.countries || {},
          devices: result.analytics?.devices || {},
          browsers: result.analytics?.browsers || {},
          referrers: result.analytics?.referrers || {},
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

  // Get URL statistics
  static async getUrlStats(shortUrl) {
    try {
      const result = await db
        .collection("urls")
        .findOne({ short_url: shortUrl });
      return result;
    } catch (err) {
      console.error("Error getting URL stats:", err);
      throw err;
    }
  }

  // Get total count of URLs in database
  static async getTotalUrlCount() {
    try {
      const count = await db.collection("urls").countDocuments();
      return count;
    } catch (err) {
      console.error("Error getting total URL count:", err);
      return 0;
    }
  }

  // Get recent URLs (for admin purposes)
  static async getRecentUrls(limit = 10) {
    try {
      const result = await db
        .collection("urls")
        .find(
          {},
          {
            projection: {
              short_url: 1,
              long_url: 1,
              created_at: 1,
              clicks: 1,
              _id: 0,
            },
          }
        )
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();
      return result;
    } catch (err) {
      console.error("Error getting recent URLs:", err);
      throw err;
    }
  }

  // Get all URLs with pagination support
  static async getUrls(limit = 1000) {
    try {
      const result = await db
        .collection("urls")
        .find(
          {},
          {
            projection: {
              short_url: 1,
              long_url: 1,
              created_at: 1,
              clicks: 1,
              updated_at: 1,
              _id: 0,
            },
          }
        )
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();
      return result;
    } catch (err) {
      console.error("Error getting URLs:", err);
      throw err;
    }
  }

  // Close the database connection (for graceful shutdown)
  static async close() {
    try {
      if (client) {
        await client.close();
        console.log("MongoDB connection closed");
      }
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
    }
  }
}

module.exports = UrlDatabase;
