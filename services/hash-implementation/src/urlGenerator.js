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
    const response = await fetch("http://localhost:8080/api/mappings");
    if (!response.ok) {
      throw new Error("Failed to fetch mappings");
    }
    const data = await response.json();
    mappingsCache = data.mappings;
    cacheTimestamp = now;
    return mappingsCache;
  } catch (error) {
    console.error("Error fetching mappings:", error);
    // Fallback to hardcoded mappings if API fails
    return {};
  }
}

module.exports = {
  generateRandomUrl: function (context, events, done) {
    context.vars.randomUrl = generateRandomUrl();
    return done();
  },
  getRandomShortUrl: function (context, events, done) {
    if (!mappingsCache) {
      fetchMappings()
        .then(() => {
          const shortUrls = Object.keys(mappingsCache);
          context.vars.randomShortUrl =
            shortUrls[Math.floor(Math.random() * shortUrls.length)];
          return done();
        })
        .catch((error) => {
          console.error("Error in getRandomShortUrl:", error);
          return done(error);
        });
    } else {
      const shortUrls = Object.keys(mappingsCache);
      context.vars.randomShortUrl =
        shortUrls[Math.floor(Math.random() * shortUrls.length)];
      return done();
    }
  },
};
