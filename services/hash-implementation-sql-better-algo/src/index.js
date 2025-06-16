const express = require("express");
const cors = require("cors");
const UrlDatabase = require("./database");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const instanceId = process.env.INSTANCE_ID || "unknown";

// Add connection monitoring
let connectionErrors = {
  ENOTFOUND: 0,
  ETIMEDOUT: 0,
  ECONNRESET: 0,
  other: 0,
};

// Log connection errors
function logConnectionError(error) {
  const errorType = error.code || "other";
  connectionErrors[errorType] = (connectionErrors[errorType] || 0) + 1;

  console.error(`[Instance ${instanceId}] [DB CONNECTION ERROR]`, {
    errorType,
    message: error.message,
    timestamp: new Date().toISOString(),
    stack: error.stack,
    totalErrors: connectionErrors,
  });
}

// Middleware to add instance identification to all responses
app.use((req, res, next) => {
  res.setHeader("X-Instance-ID", instanceId);
  res.setHeader("X-Service-Name", "hash-service");
  next();
});

// URL validation
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    // Only validate the URL structure, don't require DNS resolution
    const isValid = urlObj.protocol === "http:" || urlObj.protocol === "https:";
    console.log(
      `[URL VALIDATION] URL: ${url}, Valid: ${isValid}, Protocol: ${urlObj.protocol}`
    );
    return isValid;
  } catch (error) {
    console.error(
      `[URL VALIDATION ERROR] URL: ${url}, Error: ${error.message}`
    );
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" })); // Limit payload size

// Error handling middleware
app.use((err, req, res, next) => {
  const errorType = err.code || "UNKNOWN";
  const errorDetails = {
    timestamp: new Date().toISOString(),
    errorType: errorType,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };

  console.error(`[Instance ${instanceId}] [ERROR] ${errorType}:`, errorDetails);

  if (errorType === "ENOTFOUND" || errorType === "ETIMEDOUT") {
    return res.status(503).json({
      error: "Service temporarily unavailable",
      errorType: errorType,
      instanceId: instanceId,
    });
  }

  res.status(500).json({
    error: "Internal Server Error",
    errorType: errorType,
    instanceId: instanceId,
  });
});

// URL shortening endpoint
app.post("/api/shorten", async (req, res) => {
  try {
    const { longUrl } = req.body;
    console.log(
      `[Instance ${instanceId}] [REQUEST] URL shortening request received for: ${longUrl}`
    );

    if (!longUrl) {
      return res.status(400).json({ error: "Long URL is required" });
    }

    if (!isValidUrl(longUrl)) {
      console.error(
        `[Instance ${instanceId}] [VALIDATION ERROR] Invalid URL format: ${longUrl}`
      );
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Log database state before operation
    console.log(
      `[Instance ${instanceId}] [DB STATE] Before findShortUrlByLongUrl`,
      {
        timestamp: new Date().toISOString(),
        connectionErrors,
      }
    );

    // Check if URL already exists in database
    const existingShortUrl = await UrlDatabase.findShortUrlByLongUrl(longUrl);

    // Log database state after operation
    console.log(
      `[Instance ${instanceId}] [DB STATE] After findShortUrlByLongUrl`,
      {
        timestamp: new Date().toISOString(),
        connectionErrors,
      }
    );

    if (existingShortUrl) {
      console.log(
        `[Instance ${instanceId}] [RESPONSE] Returning existing short URL: ${existingShortUrl}`
      );
      return res.json({
        shortUrl: existingShortUrl,
        instanceId: instanceId,
        fromCache: true,
      });
    }

    // Log database state before getting next URL
    console.log(`[Instance ${instanceId}] [DB STATE] Before getNextShortUrl`, {
      timestamp: new Date().toISOString(),
      connectionErrors,
    });

    // Get next available short URL from the bucket
    const shortUrl = await UrlDatabase.getNextShortUrl();

    // Log database state after getting next URL
    console.log(`[Instance ${instanceId}] [DB STATE] After getNextShortUrl`, {
      timestamp: new Date().toISOString(),
      connectionErrors,
    });

    await UrlDatabase.createUrl(shortUrl, longUrl);

    console.log(
      `[Instance ${instanceId}] [RESPONSE] Generated new short URL: ${shortUrl}`
    );
    res.status(200).json({
      shortUrl,
      instanceId: instanceId,
      fromCache: false,
    });
  } catch (error) {
    logConnectionError(error);
    console.error(`[Instance ${instanceId}] [ERROR] Error in /api/shorten:`, {
      error: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      connectionErrors,
    });
    res.status(500).json({ error: "Failed to shorten URL" });
  }
});

// Add this endpoint before the catch-all route
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

// Admin endpoint to initialize bucket
app.post("/admin/initialize-bucket", async (req, res) => {
  try {
    console.log(
      `[Instance ${instanceId}] Received bucket initialization request`
    );
    await UrlDatabase.initializeBucket();
    res.status(200).json({
      status: "success",
      message: "Bucket initialization completed",
      instanceId: instanceId,
    });
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error initializing bucket:`, error);
    res.status(500).json({
      status: "error",
      message: "Failed to initialize bucket",
      error: error.message,
    });
  }
});

// Admin endpoint to initialize URLs table with sample data
app.post("/admin/initialize-urls", async (req, res) => {
  try {
    console.log(
      `[Instance ${instanceId}] Received URLs table initialization request`
    );
    await UrlDatabase.initializeUrlsTable();
    res.status(200).json({
      status: "success",
      message: "URLs table initialized with sample data",
      instanceId: instanceId,
    });
  } catch (error) {
    console.error(
      `[Instance ${instanceId}] Error initializing URLs table:`,
      error
    );
    res.status(500).json({
      status: "error",
      message: "Failed to initialize URLs table",
      error: error.message,
    });
  }
});

// Add this endpoint to check connection error stats
app.get("/admin/connection-stats", (req, res) => {
  res.json({
    connectionErrors,
    timestamp: new Date().toISOString(),
    instanceId: instanceId,
  });
});

// This should come LAST since it catches all remaining routes
app.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Instance ${instanceId}] Redirect request for: ${id}`);

    // Add timeout to database query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database query timeout")), 30000); // 10 second timeout
    });

    const longUrlPromise = UrlDatabase.getLongUrl(id);
    const longUrl = await Promise.race([longUrlPromise, timeoutPromise]);

    if (!longUrl) {
      console.error(
        `[Instance ${instanceId}] [404 ERROR] Short URL not found: ${id}`,
        {
          timestamp: new Date().toISOString(),
          shortUrl: id,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          referer: req.headers.referer || "direct",
          path: req.path,
          method: req.method,
          errorType: "NOT_FOUND",
          note: "Database query returned null - check DB connection",
        }
      );
      return res.status(404).json({
        error: "URL not found",
        instanceId: instanceId,
        shortUrl: id,
        timestamp: new Date().toISOString(),
        errorType: "NOT_FOUND",
      });
    }

    // Increment click count (don't wait for it to complete)
    UrlDatabase.incrementClickCount(id).catch((err) => {
      console.error(
        `[Instance ${instanceId}] Error incrementing click count:`,
        err
      );
    });

    console.log(`[Instance ${instanceId}] Redirecting to: ${longUrl}`);
    // res.redirect(301, longUrl);
    res.status(301).json({
      longUrl,
    });
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error in redirect:`, {
      error: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      shortUrl: req.params.id,
    });

    if (error.message === "Database query timeout") {
      return res.status(503).json({
        error: "Service temporarily unavailable",
        errorType: "TIMEOUT",
        instanceId: instanceId,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      error: "Failed to redirect",
      errorType: error.code || "UNKNOWN",
      instanceId: instanceId,
    });
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
