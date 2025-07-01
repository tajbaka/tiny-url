function generateRandomUrl() {
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

  const domain = domains[Math.floor(Math.random() * domains.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const query = queries[Math.floor(Math.random() * queries.length)];
  const randomId = Date.now() + Math.floor(Math.random() * 10000000);

  return `https://${domain}${path}${query}${randomId}`;
}

// Cache for URL mappings
let mappingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds in milliseconds

async function fetchMappings() {
  const now = Date.now();

  // Check if cache is valid (exists and not expired)
  if (
    mappingsCache &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return mappingsCache;
  }

  try {
    const response = await fetch("http://localhost:8090/api/mappings");
    if (!response.ok) {
      throw new Error("Failed to fetch mappings");
    }
    const data = await response.json();
    const length = Object.keys(data.mappings).length;

    // Always set cache and timestamp, even if empty
    mappingsCache = data.mappings || {};
    cacheTimestamp = now;

    if (length > 0) {
      return mappingsCache;
    } else {
      return mappingsCache; // Return empty object instead of null
    }
  } catch (error) {
    console.error("Error fetching mappings:", error);
    // Fallback to empty object if API fails
    mappingsCache = {};
    cacheTimestamp = now;
    return mappingsCache;
  }
}

module.exports = {
  generateRandomUrl: function (context, events, done) {
    context.vars.randomUrl = generateRandomUrl();
    return done();
  },
  getRandomShortUrl: function (context, events, done) {
    // Ensure mappingsCache is initialized
    if (!mappingsCache) {
      mappingsCache = {};
    }

    // If cache is empty or expired, fetch fresh data
    if (
      Object.keys(mappingsCache).length === 0 ||
      !cacheTimestamp ||
      Date.now() - cacheTimestamp >= CACHE_DURATION
    ) {
      fetchMappings()
        .then((mappings) => {
          const shortUrls = Object.keys(mappings);
          if (shortUrls.length > 0) {
            context.vars.randomShortUrl =
              shortUrls[Math.floor(Math.random() * shortUrls.length)];
          } else {
            // Fallback to a default short URL if no mappings available
            context.vars.randomShortUrl = "";
          }
          return done();
        })
        .catch((error) => {
          console.error("Error in getRandomShortUrl:", error);
          // Fallback to a default short URL on error
          context.vars.randomShortUrl = "";
          return done();
        });
    } else {
      const shortUrls = Object.keys(mappingsCache);
      if (shortUrls.length > 0) {
        context.vars.randomShortUrl =
          shortUrls[Math.floor(Math.random() * shortUrls.length)];
      } else {
        // Fallback to a default short URL if no mappings available
        context.vars.randomShortUrl = "";
      }
      return done();
    }
  },
};
