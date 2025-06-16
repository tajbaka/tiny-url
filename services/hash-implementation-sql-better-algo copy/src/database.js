const { Pool } = require("pg");

// Database configurations
const bucketDbConfig = {
  host: process.env.BUCKET_DB_HOST || "localhost",
  port: parseInt(process.env.BUCKET_DB_PORT) || 5433,
  database: process.env.BUCKET_DB_NAME || "short_urls_bucket",
  user: process.env.BUCKET_DB_USER || "shortener",
  password: process.env.BUCKET_DB_PASSWORD || "shortener123",
  max: 25,
  min: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  application_name: "url-shortener-bucket",
  retry_strategy: {
    max_retries: 3,
    retry_delay: 1000,
  },
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const urlsDbConfig = {
  host: process.env.URLS_DB_HOST || "localhost",
  port: parseInt(process.env.URLS_DB_PORT) || 5434,
  database: process.env.URLS_DB_NAME || "urls_list",
  user: process.env.URLS_DB_USER || "shortener",
  password: process.env.URLS_DB_PASSWORD || "shortener123",
  max: 25,
  min: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  application_name: "url-shortener-urls",
  retry_strategy: {
    max_retries: 3,
    retry_delay: 1000,
  },
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create connection pools with error handling
let bucketPool, urlsPool;

function createPools() {
  try {
    bucketPool = new Pool(bucketDbConfig);
    urlsPool = new Pool(urlsDbConfig);

    // Enhanced pool error handling
    bucketPool.on("error", (err) => {
      console.error("[Bucket Pool] Unexpected error on idle client", {
        error: err.message,
        code: err.code,
        timestamp: new Date().toISOString(),
        stack: err.stack,
      });
    });

    urlsPool.on("error", (err) => {
      console.error("[URLs Pool] Unexpected error on idle client", {
        error: err.message,
        code: err.code,
        timestamp: new Date().toISOString(),
        stack: err.stack,
      });
    });

    // Add connection monitoring
    let lastConnectionCheck = Date.now();
    const connectionCheckInterval = 30000; // 30 seconds

    setInterval(async () => {
      try {
        const now = Date.now();
        if (now - lastConnectionCheck >= connectionCheckInterval) {
          const stats = await UrlDatabase.getPool();
          console.log("[DB Connection Stats]", {
            timestamp: new Date().toISOString(),
            bucketPool: stats.bucket,
            urlsPool: stats.urls,
            bucketConfig: {
              host: bucketDbConfig.host,
              port: bucketDbConfig.port,
              database: bucketDbConfig.database,
            },
            urlsConfig: {
              host: urlsDbConfig.host,
              port: urlsDbConfig.port,
              database: urlsDbConfig.database,
            },
          });
          lastConnectionCheck = now;
        }
      } catch (err) {
        console.error("[DB Connection Check Error]", {
          error: err.message,
          code: err.code,
          timestamp: new Date().toISOString(),
          stack: err.stack,
        });
      }
    }, 5000);
  } catch (err) {
    console.error("[Pool Creation Error]", {
      error: err.message,
      code: err.code,
      timestamp: new Date().toISOString(),
      stack: err.stack,
    });
    throw err;
  }
}

// Initialize pools
createPools();

class UrlDatabase {
  // Get pool statistics
  static async getPool() {
    return {
      bucket: {
        totalCount: bucketPool.totalCount,
        idleCount: bucketPool.idleCount,
        waitingCount: bucketPool.waitingCount,
      },
      urls: {
        totalCount: urlsPool.totalCount,
        idleCount: urlsPool.idleCount,
        waitingCount: urlsPool.waitingCount,
      },
    };
  }

  // Test database connections
  static async testConnection() {
    try {
      const bucketClient = await bucketPool.connect();
      const urlsClient = await urlsPool.connect();

      const bucketResult = await bucketClient.query(
        "SELECT NOW() as current_time"
      );
      const urlsResult = await urlsClient.query("SELECT NOW() as current_time");

      bucketClient.release();
      urlsClient.release();

      console.log(
        "Bucket database connected at:",
        bucketResult.rows[0].current_time
      );
      console.log(
        "URLs database connected at:",
        urlsResult.rows[0].current_time
      );
      return true;
    } catch (err) {
      console.error("Database connection error:", err);
      return false;
    }
  }

  // Initialize the URLs table
  static async initializeUrlsTable() {
    try {
      // Drop existing table to ensure clean state
      await urlsPool.query(`
        DROP TABLE IF EXISTS urls CASCADE;
      `);

      await urlsPool.query(`
        CREATE TABLE urls (
          id SERIAL PRIMARY KEY,
          short_url VARCHAR(10) UNIQUE NOT NULL,
          long_url TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          clicks INTEGER DEFAULT 0
        )
      `);

      // Create indexes for better performance
      await urlsPool.query(`
        CREATE INDEX idx_short_url ON urls(short_url);
        CREATE INDEX idx_long_url ON urls(long_url);
        CREATE INDEX idx_created_at ON urls(created_at);
        CREATE INDEX idx_id ON urls(id DESC);
      `);

      // Create a trigger to update the updated_at timestamp
      await urlsPool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_urls_updated_at ON urls;
        CREATE TRIGGER update_urls_updated_at 
            BEFORE UPDATE ON urls 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
      `);

      console.log("URLs table and indexes initialized successfully");
    } catch (err) {
      console.error("Error initializing URLs table:", err);
      throw err;
    }
  }

  // Initialize the bucket database with pre-generated short URLs
  static async initializeBucket() {
    const client = await bucketPool.connect();
    try {
      console.log("[Bucket] Starting bucket initialization...");

      // Try to acquire an advisory lock to prevent multiple instances from initializing
      const lockResult = await client.query(
        "SELECT pg_try_advisory_lock(1) as acquired"
      );

      if (!lockResult.rows[0].acquired) {
        console.log("[Bucket] Another instance is initializing, waiting...");
        // Wait for a short time and check the count
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const countResult = await client.query(
          "SELECT COUNT(*) as count FROM short_urls_bucket"
        );
        const currentCount = parseInt(countResult.rows[0].count);
        console.log(`[Bucket] Current URL count: ${currentCount}`);
        return;
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS short_urls_bucket (
          id SERIAL PRIMARY KEY,
          short_url VARCHAR(6) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("[Bucket] Table structure verified");

      // Check if we already have enough URLs in the bucket
      const countResult = await client.query(
        "SELECT COUNT(*) as count FROM short_urls_bucket"
      );
      const currentCount = parseInt(countResult.rows[0].count);
      console.log(`[Bucket] Current URL count: ${currentCount}`);

      if (currentCount >= 1000000) {
        console.log(
          `[Bucket] Already has ${currentCount} URLs, skipping initialization`
        );
        return;
      }

      console.log(
        `[Bucket] Need to generate ${1000000 - currentCount} more URLs`
      );

      // Generate and insert initial batch of short URLs
      const totalUrls = 1000000;
      const batchSize = 1000; // Smaller batch size
      const delayBetweenBatches = 100; // 100ms delay between batches
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      let totalInserted = 0;
      for (let i = 0; i < totalUrls; i += batchSize) {
        const batch = [];
        const currentBatchSize = Math.min(batchSize, totalUrls - i);

        // Generate batch of URLs
        for (let j = 0; j < currentBatchSize; j++) {
          let shortUrl = "";
          for (let k = 0; k < 6; k++) {
            shortUrl += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          batch.push(shortUrl);
        }

        try {
          // Use ON CONFLICT DO NOTHING to silently skip duplicates
          const insertResult = await client.query(
            `
            INSERT INTO short_urls_bucket (short_url)
            SELECT unnest($1::varchar[])
            ON CONFLICT (short_url) DO NOTHING
            RETURNING short_url
          `,
            [batch]
          );

          const insertedCount = insertResult.rows.length;
          totalInserted += insertedCount;

          console.log(
            `[Bucket] Inserted ${insertedCount} URLs in current batch (${totalInserted}/${totalUrls} total)`
          );

          // Add delay between batches to prevent server overload
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenBatches)
          );
        } catch (err) {
          console.error("[Bucket] Error inserting batch:", err);
          // Continue with next batch even if this one fails
        }
      }

      // Verify final count
      const finalCount = await client.query(
        "SELECT COUNT(*) as count FROM short_urls_bucket"
      );
      console.log(
        `[Bucket] Initialization complete. Total URLs: ${finalCount.rows[0].count}`
      );

      // Verify we have enough URLs
      if (parseInt(finalCount.rows[0].count) < 1000000) {
        console.warn("[Bucket] Warning: Did not reach target URL count!");
      }
    } catch (err) {
      console.error("[Bucket] Error initializing bucket:", err);
      throw err;
    } finally {
      // Release the advisory lock
      await client.query("SELECT pg_advisory_unlock(1)");
      client.release();
    }
  }

  // Get next available short URL
  static async getNextShortUrl() {
    const bucketClient = await bucketPool.connect();
    try {
      await bucketClient.query("BEGIN");

      // Get and reserve a short URL from the bucket
      const result = await bucketClient.query(`
        WITH next_url AS (
          SELECT short_url, id
          FROM short_urls_bucket
          ORDER BY id
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        DELETE FROM short_urls_bucket
        WHERE id IN (SELECT id FROM next_url)
        RETURNING short_url
      `);

      if (result.rows.length === 0) {
        await bucketClient.query("ROLLBACK");
        throw new Error("No short URLs available in bucket");
      }

      await bucketClient.query("COMMIT");
      return result.rows[0].short_url;
    } catch (err) {
      await bucketClient.query("ROLLBACK");
      console.error("Error getting next short URL:", err);
      throw err;
    } finally {
      bucketClient.release();
    }
  }

  // Create URL mapping
  static async createUrl(shortUrl, longUrl) {
    try {
      const result = await urlsPool.query(
        "INSERT INTO urls (short_url, long_url) VALUES ($1, $2) RETURNING *",
        [shortUrl, longUrl]
      );
      return result.rows[0];
    } catch (err) {
      console.error("Error creating URL mapping:", err);
      throw err;
    }
  }

  // Find existing short URL for a long URL
  static async findShortUrlByLongUrl(longUrl) {
    try {
      const result = await urlsPool.query(
        "SELECT short_url FROM urls WHERE long_url = $1 LIMIT 1",
        [longUrl]
      );
      return result.rows.length > 0 ? result.rows[0].short_url : null;
    } catch (err) {
      console.error("Error finding short URL by long URL:", err);
      throw err;
    }
  }

  // Get long URL by short URL
  static async getLongUrl(shortUrl) {
    try {
      const result = await urlsPool.query(
        "SELECT long_url FROM urls WHERE short_url = $1",
        [shortUrl]
      );
      return result.rows.length > 0 ? result.rows[0].long_url : null;
    } catch (err) {
      console.error("Error getting long URL:", err);
      throw err;
    }
  }

  // Increment click count
  static async incrementClickCount(shortUrl) {
    try {
      const result = await urlsPool.query(
        "UPDATE urls SET clicks = clicks + 1, updated_at = CURRENT_TIMESTAMP WHERE short_url = $1 RETURNING clicks",
        [shortUrl]
      );
      return result.rows.length > 0 ? result.rows[0].clicks : 0;
    } catch (err) {
      console.error("Error incrementing click count:", err);
      return 0;
    }
  }

  // Get URLs for testing
  static async getUrls(limit = 1000) {
    try {
      const result = await urlsPool.query(
        "SELECT id, short_url, long_url FROM urls ORDER BY id ASC LIMIT $1",
        [limit]
      );
      return result.rows.map((row) => ({
        id: row.id,
        short_url: row.short_url,
        long_url: row.long_url,
      }));
    } catch (err) {
      console.error("Error getting URLs:", err);
      throw err;
    }
  }

  // Close database connections
  static async close() {
    try {
      await bucketPool.end();
      await urlsPool.end();
      console.log("Database pools closed");
    } catch (err) {
      console.error("Error closing database pools:", err);
    }
  }
}

module.exports = UrlDatabase;
