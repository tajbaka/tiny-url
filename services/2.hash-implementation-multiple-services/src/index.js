const express = require("express");
const cors = require("cors");
const { urlStore } = require("./urlStore");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const MAX_URL_LENGTH = 6;

// Generate a random short URL
function generateShortUrl() {
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
  } while (urlStore.has(shortUrl) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error("Unable to generate unique short URL");
  }

  return shortUrl;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" })); // Limit payload size

// Health check endpoint
app.get("/health", (req, res) => {
  const instanceId = process.env.INSTANCE_ID || "unknown";
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    mappings: urlStore.size,
    instance: instanceId,
  });
});

// Get all URL mappings endpoint (for load testing)
app.get("/api/mappings", (req, res) => {
  try {
    const mappings = Object.fromEntries(urlStore);
    res.status(200).json({
      mappings,
      count: urlStore.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/mappings:", error);
    res.status(500).json({ error: "Failed to retrieve mappings" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// URL shortening endpoint
app.post("/api/shorten", (req, res) => {
  try {
    const { longUrl } = req.body;

    if (!longUrl) {
      return res.status(400).json({ error: "Long URL is required" });
    }
    // Check if URL already exists in store
    for (const [shortUrl, storedUrl] of urlStore.entries()) {
      if (storedUrl === longUrl) {
        return res.json({ shortUrl });
      }
    }

    // Generate new short URL
    const shortUrl = generateShortUrl();
    urlStore.set(shortUrl, longUrl);

    // console.log("shortUrl", shortUrl);
    res.status(200).json({ shortUrl });
  } catch (error) {
    console.error("Error in /api/shorten:", error);
    res.status(500).json({ error: "Failed to shorten URL" });
  }
});

// This should come LAST since it catches all remaining routes
app.get("/:id", (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "URL ID is required" });
    }

    const longUrl = urlStore.get(id);

    if (!longUrl) {
      return res.status(404).json({ error: "URL not found" });
    }

    // console.log(`Redirecting ${id} to ${longUrl}`);
    res.redirect(301, longUrl);
  } catch (error) {
    console.error("Error in redirect:", error);
    res.status(500).json({ error: "Failed to redirect" });
  }
});

// Increase server limits
const server = app.listen(port, () => {
  const instanceId = process.env.INSTANCE_ID || "unknown";
  console.log(`[Instance ${instanceId}] Server is running on port ${port}`);
});

// Configure server for high load
server.timeout = 30000; // 30 seconds
server.keepAliveTimeout = 30000;
server.maxConnections = 10000;
