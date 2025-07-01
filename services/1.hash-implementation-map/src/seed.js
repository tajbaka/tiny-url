const { urlStore } = require("./urlStore");

// Hardcoded values from urlGenerator.js
const domains = [
  "example.com",
  "test.com",
  "demo.org",
  "sample.net",
  "example.org",
  "example.net",
  "example.org",
  "example.com",
  "example.net",
  "example.org",
  "example.com",
];

const paths = [
  "/path",
  "/page",
  "/article",
  "/post",
  "/item",
  "/product",
  "/service",
];

const queries = [
  "?id=",
  "?ref=",
  "?source=",
  "?type=",
  "?category=",
  "?tag=",
  "?keyword=",
];

const MAX_URL_LENGTH = 6;

// Generate a random short URL (same logic as index.js)
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

// Generate URL using hardcoded values (same logic as urlGenerator.js)
function generateUrl(seedValue = null) {
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const query = queries[Math.floor(Math.random() * queries.length)];

  // Use seed value for deterministic generation if provided, otherwise use timestamp + random
  const randomId =
    seedValue || Date.now() + Math.floor(Math.random() * 10000000);

  return `https://${domain}${path}${query}${randomId}`;
}

// Seed the URL store with initial data
function seedUrlStore(numberOfUrls = 50) {
  console.log(`Seeding URL store with ${numberOfUrls} URLs...`);

  const seededUrls = [];

  for (let i = 0; i < numberOfUrls; i++) {
    try {
      // Generate a deterministic seed value for consistent results
      const seedValue = 1000000 + i;
      const longUrl = generateUrl(seedValue);

      // Check if URL already exists
      let exists = false;
      for (const [shortUrl, storedUrl] of urlStore.entries()) {
        if (storedUrl === longUrl) {
          exists = true;
          seededUrls.push({ shortUrl, longUrl });
          break;
        }
      }

      if (!exists) {
        const shortUrl = generateShortUrl();
        urlStore.set(shortUrl, longUrl);
        seededUrls.push({ shortUrl, longUrl });
        console.log(`Seeded: ${shortUrl} -> ${longUrl}`);
      }
    } catch (error) {
      console.error(`Error seeding URL ${i + 1}:`, error);
    }
  }

  console.log(`Successfully seeded ${seededUrls.length} URLs`);
  console.log(`Total URLs in store: ${urlStore.size}`);

  return seededUrls;
}

// Clear the URL store
function clearUrlStore() {
  console.log("Clearing URL store...");
  urlStore.clear();
  console.log("URL store cleared");
}

// Get current store stats
function getStoreStats() {
  return {
    totalUrls: urlStore.size,
    mappings: Object.fromEntries(urlStore),
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  seedUrlStore,
  clearUrlStore,
  getStoreStats,
  generateUrl,
  generateShortUrl,
};

// If this file is run directly, seed the store
if (require.main === module) {
  console.log("Running seed script...");
  clearUrlStore();
  seedUrlStore(25); // Seed with 25 URLs by default
  console.log("Seed script completed");
  console.log("Store stats:", getStoreStats());
}
