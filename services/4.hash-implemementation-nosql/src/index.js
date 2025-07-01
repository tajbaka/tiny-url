const express = require("express");
const cors = require("cors");
const UrlDatabase = require("./database");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const instanceId = process.env.INSTANCE_ID || "unknown";

const MAX_URL_LENGTH = 6;

// Middleware to add instance identification to all responses
app.use((req, res, next) => {
  res.setHeader("X-Instance-ID", instanceId);
  res.setHeader("X-Service-Name", "hash-service");
  next();
});

// Generate a random short URL
async function generateShortUrl() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let shortUrl = "";
  let attempts = 0;
  const maxAttempts = 10;

  do {
    shortUrl = "";
    for (let i = 0; i < MAX_URL_LENGTH; i++) {
      shortUrl += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  } while (
    (await UrlDatabase.shortUrlExists(shortUrl)) &&
    attempts < maxAttempts
  );

  if (attempts >= maxAttempts) {
    throw new Error("Unable to generate unique short URL");
  }

  return shortUrl;
}

// URL validation
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Initialize database connection
async function initializeDatabase() {
  console.log(`[Instance ${instanceId}] Connecting to database...`);
  const connected = await UrlDatabase.connect();
  if (!connected) {
    console.error(`[Instance ${instanceId}] Failed to connect to database`);
    process.exit(1);
  }
  console.log(`[Instance ${instanceId}] Database connection established`);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" })); // Limit payload size

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection as part of health check
    const dbConnected = await UrlDatabase.testConnection();

    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      instanceId: instanceId,
      uptime: process.uptime(),
      database: dbConnected ? "connected" : "disconnected",
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      instanceId: instanceId,
      error: "Database health check failed",
    });
  }
});

// Instance information endpoint
app.get("/api/instance", async (req, res) => {
  try {
    const urlCount = await UrlDatabase.getTotalUrlCount();

    res.status(200).json({
      instanceId: instanceId,
      serviceName: "hash-service",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      urlCount: urlCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      instanceId: instanceId,
      serviceName: "hash-service",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      urlCount: "error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// URL shortening endpoint
app.post("/api/shorten", async (req, res) => {
  try {
    const { longUrl } = req.body;
    console.log(
      `[Instance ${instanceId}] URL shortening request received for: ${longUrl}`
    );

    if (!longUrl) {
      return res.status(400).json({ error: "Long URL is required" });
    }

    if (!isValidUrl(longUrl)) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Check if URL already exists in database
    const existingShortUrl = await UrlDatabase.findShortUrlByLongUrl(longUrl);
    if (existingShortUrl) {
      console.log(
        `[Instance ${instanceId}] Returning existing short URL: ${existingShortUrl}`
      );
      return res.json({
        shortUrl: existingShortUrl,
        instanceId: instanceId,
        fromCache: true,
      });
    }

    // Generate new short URL
    const shortUrl = await generateShortUrl();
    await UrlDatabase.createUrl(shortUrl, longUrl);

    console.log(
      `[Instance ${instanceId}] Generated new short URL: ${shortUrl}`
    );
    res.status(200).json({
      shortUrl,
      instanceId: instanceId,
      fromCache: false,
    });
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error in /api/shorten:`, error);
    res.status(500).json({ error: "Failed to shorten URL" });
  }
});

// New detailed analytics endpoint
app.get("/api/analytics/:shortUrl", async (req, res) => {
  try {
    const { shortUrl } = req.params;
    console.log(`[Instance ${instanceId}] Analytics request for: ${shortUrl}`);

    const analytics = await UrlDatabase.getUrlAnalytics(shortUrl);

    if (!analytics) {
      return res.status(404).json({
        error: "URL not found",
        instanceId: instanceId,
      });
    }

    res.json({
      ...analytics,
      instanceId: instanceId,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error in /api/analytics:`, error);
    res.status(500).json({ error: "Failed to get URL analytics" });
  }
});

app.get("/api/urls", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    console.log(`[Instance ${instanceId}] Fetching URLs with limit: ${limit}`);

    // Test database connection first
    const connected = await UrlDatabase.testConnection();
    if (!connected) {
      console.error(`[Instance ${instanceId}] Database connection failed`);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const urls = await UrlDatabase.getUrls(limit);
    console.log(
      `[Instance ${instanceId}] Successfully fetched ${urls.length} URLs`
    );

    res.json({
      urls: urls,
      count: urls.length,
      instanceId: instanceId,
    });
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error fetching URLs:`, error);
    res.status(500).json({
      error: "Failed to fetch URLs",
      details: error.message,
      instanceId: instanceId,
    });
  }
});

// This should come LAST since it catches all remaining routes
app.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Instance ${instanceId}] Redirect request for: ${id}`);

    const longUrl = await UrlDatabase.getLongUrl(id);

    if (!longUrl) {
      return res.status(404).json({
        error: "URL not found",
        instanceId: instanceId,
      });
    }

    // Extract access information for analytics
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];
    const referrer = req.headers.referer || req.headers.referrer;

    // Parse user agent for device/browser info
    const { deviceType, browser, operatingSystem } =
      UrlDatabase.parseUserAgent(userAgent);

    // Enhanced access logging with detailed information
    const accessInfo = {
      userAgent: userAgent,
      ipAddress: ipAddress,
      referrer: referrer,
      country: req.headers["cloudflare-ipcountry"] || "Unknown", // Use Cloudflare country if available
      city: "Unknown", // Could be enhanced with IP geolocation service
      deviceType: deviceType,
      browser: browser,
      operatingSystem: operatingSystem,
    };

    // Log detailed access information (don't wait for it to complete)
    UrlDatabase.logAccess(id, accessInfo).catch((err) => {
      console.error(
        `[Instance ${instanceId}] Error logging detailed access:`,
        err
      );
    });

    // Increment click count (don't wait for it to complete)
    UrlDatabase.incrementClickCount(id).catch((err) => {
      console.error(
        `[Instance ${instanceId}] Error incrementing click count:`,
        err
      );
    });

    console.log(`[Instance ${instanceId}] Redirecting to: ${longUrl}`);
    res.status(301).json({
      longUrl,
    });
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error in redirect:`, error);
    res.status(500).json({ error: "Failed to redirect" });
  }
});

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log(
    `[Instance ${instanceId}] SIGTERM received, shutting down gracefully`
  );
  await UrlDatabase.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log(
    `[Instance ${instanceId}] SIGINT received, shutting down gracefully`
  );
  await UrlDatabase.close();
  process.exit(0);
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Increase server limits
    const server = app.listen(port, () => {
      console.log(`[Instance ${instanceId}] Server is running on port ${port}`);
    });

    // Configure server for high load
    server.timeout = 30000; // 30 seconds
    server.keepAliveTimeout = 30000;
    server.maxConnections = 10000;
  } catch (error) {
    console.error(`[Instance ${instanceId}] Failed to start server:`, error);
    process.exit(1);
  }
}

// Start the server
startServer();
