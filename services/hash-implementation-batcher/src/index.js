const express = require("express");
const cors = require("cors");
const UrlDatabase = require("./database");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const instanceId = process.env.INSTANCE_ID || "unknown";

// Batching Queue System for /:id endpoint
class RequestQueue {
  constructor() {
    this.batchSize = 10;
    this.maxWaitTime = 2000; // 2 seconds
    this.maxQueueSize = 5000; // Safety limit
    this.queue = [];
    this.timer = null;
    this.stats = {
      totalRequests: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      totalWaitTime: 0,
    };
  }

  async addRequest(shortId, res, startTime) {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        console.log(
          `[Instance ${instanceId}] Queue full (${this.queue.length}), waiting...`
        );
        return;
      }

      const request = {
        shortId,
        res,
        startTime,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(request);
      this.stats.totalRequests++;

      console.log(
        `[Instance ${instanceId}] [QUEUE] Added request for ${shortId}, queue size: ${this.queue.length}`
      );

      // Process immediately if batch is full
      if (this.queue.length >= this.batchSize) {
        setTimeout(() => {
          this.processBatch();
        }, Math.floor(Math.random() * 1000));
      } else if (!this.timer) {
        // Much longer wait is fine!
        this.timer = setTimeout(() => {
          this.processBatch();
        }, this.maxWaitTime);
      }
    });
  }

  async processBatch() {
    if (this.queue.length === 0) return;

    // Clear timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Extract current batch
    const batch = this.queue.splice(0, this.batchSize);
    const batchSize = batch.length;
    const shortIds = batch.map((req) => req.shortId);

    console.log(
      `[Instance ${instanceId}] [BATCH] Processing batch of ${batchSize} requests: [${shortIds.join(
        ", "
      )}]`
    );

    try {
      const batchStartTime = Date.now();

      // Batch database lookup
      const results = await UrlDatabase.getLongUrlsBatch(shortIds);

      const batchProcessTime = Date.now() - batchStartTime;

      // Update stats
      this.stats.batchesProcessed++;
      this.stats.averageBatchSize =
        (this.stats.averageBatchSize * (this.stats.batchesProcessed - 1) +
          batchSize) /
        this.stats.batchesProcessed;

      console.log(
        `[Instance ${instanceId}] [BATCH] Completed batch in ${batchProcessTime}ms, got ${
          Object.keys(results).length
        } results`
      );

      // Process each request in the batch
      for (const request of batch) {
        try {
          const waitTime = Date.now() - request.timestamp;
          this.stats.totalWaitTime += waitTime;

          const longUrl = results[request.shortId];

          if (!longUrl) {
            console.error(
              `[Instance ${instanceId}] [404 ERROR] Short URL not found in batch: ${request.shortId}`,
              {
                timestamp: new Date().toISOString(),
                shortUrl: request.shortId,
                batchSize: batchSize,
                waitTime: waitTime,
                errorType: "NOT_FOUND",
              }
            );

            request.res.status(404).json({
              error: "URL not found",
              instanceId: instanceId,
              shortUrl: request.shortId,
              timestamp: new Date().toISOString(),
              errorType: "NOT_FOUND",
              batchProcessed: true,
              waitTime: waitTime,
            });
            continue;
          }

          // Increment click count asynchronously (don't wait)
          UrlDatabase.incrementClickCount(request.shortId).catch((err) => {
            console.error(
              `[Instance ${instanceId}] Error incrementing click count for ${request.shortId}:`,
              err
            );
          });

          console.log(
            `[Instance ${instanceId}] [BATCH] Redirecting ${request.shortId} to: ${longUrl} (waited ${waitTime}ms)`
          );

          request.res.status(301).json({
            longUrl,
            batchProcessed: true,
            waitTime: waitTime,
            batchSize: batchSize,
          });

          request.resolve();
        } catch (error) {
          console.error(
            `[Instance ${instanceId}] [BATCH] Error processing individual request ${request.shortId}:`,
            error
          );
          request.reject(error);
        }
      }
    } catch (error) {
      console.error(
        `[Instance ${instanceId}] [BATCH] Error processing batch:`,
        error
      );

      // Handle batch failure - respond to all requests in batch
      for (const request of batch) {
        try {
          request.res.status(500).json({
            error: "Failed to process batch request",
            errorType: error.code || "BATCH_ERROR",
            instanceId: instanceId,
            batchProcessed: true,
          });
          request.reject(error);
        } catch (responseError) {
          console.error(
            `[Instance ${instanceId}] Error sending error response:`,
            responseError
          );
        }
      }
    }

    // Continue processing if there are more items in queue
    if (this.queue.length > 0) {
      setImmediate(() => this.processBatch());
    }
  }

  getStats() {
    return {
      ...this.stats,
      currentQueueSize: this.queue.length,
      averageWaitTime:
        this.stats.totalRequests > 0
          ? this.stats.totalWaitTime / this.stats.totalRequests
          : 0,
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log(
      `[Instance ${instanceId}] [QUEUE] Shutting down queue, processing remaining ${this.queue.length} requests`
    );

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Process remaining requests
    while (this.queue.length > 0) {
      await this.processBatch();
    }
  }
}

// Initialize with more conservative settings
const requestQueue = new RequestQueue();

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

// Add endpoint to check queue stats
app.get("/admin/queue-stats", (req, res) => {
  res.json({
    queueStats: requestQueue.getStats(),
    timestamp: new Date().toISOString(),
    instanceId: instanceId,
  });
});

// This should come LAST since it catches all remaining routes
app.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const startTime = Date.now();

    console.log(
      `[Instance ${instanceId}] [QUEUE] Queuing redirect request for: ${id}`
    );

    // Add request to batching queue - this will handle the response
    await requestQueue.addRequest(id, res, startTime);
  } catch (error) {
    console.error(
      `[Instance ${instanceId}] [QUEUE] Error processing queued request for ${req.params.id}:`,
      {
        error: error.message,
        code: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        shortUrl: req.params.id,
      }
    );

    // Only send response if not already sent by queue
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to process request",
        errorType: error.code || "QUEUE_ERROR",
        instanceId: instanceId,
        batchProcessed: false,
      });
    }
  }
});

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log(
    `[Instance ${instanceId}] SIGTERM received, shutting down gracefully`
  );
  await requestQueue.shutdown();
  await UrlDatabase.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log(
    `[Instance ${instanceId}] SIGINT received, shutting down gracefully`
  );
  await requestQueue.shutdown();
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
