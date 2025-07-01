const fs = require("fs");
const path = require("path");

// Pre-generated URLs for testing
const testUrls = [
  "https://github.com/nodejs/node",
  "https://stackoverflow.com/questions/javascript",
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  "https://www.npmjs.com/package/express",
  "https://reactjs.org/docs/getting-started.html",
  "https://www.postgresql.org/docs/",
  "https://redis.io/documentation",
  "https://docker.com/get-started",
  "https://kubernetes.io/docs/home/",
  "https://aws.amazon.com/documentation/",
  "https://www.google.com/search?q=system+design",
  "https://leetcode.com/problemset/all/",
  "https://en.wikipedia.org/wiki/URL_shortening",
  "https://www.cloudflare.com/learning/",
  "https://nginx.org/en/docs/",
  "https://www.mongodb.com/docs/",
  "https://nodejs.org/en/docs/",
  "https://expressjs.com/en/guide/",
];

// Known short URLs from seed data
const knownShortUrls = [
  "lJsZeu",
  "9G7J4d",
  "vCA0PI",
  "EJhrAM",
  "1xGwgg",
  "zGor1Q",
  "OwBEZP",
  "ZQhNIS",
  "QL6JnS",
  "SXeST2",
  "T4IeON",
  "Kh7VJ4",
  "kEBWN4",
  "cBJO20",
  "TJszuv",
  "ufd4K7",
  "rRyLYv",
  "HahHsY",
  "gkzRUJ",
  "KFKDqP",
  "muPP95",
  "bkXjdm",
  "8XUdDa",
  "1h3bh8",
  "Xc6S9G",
  "TOUdHj",
  "qrNATN",
  "7b3LdQ",
  "H839HU",
];

// Load session cookie if available
let sessionCookie = null;
try {
  const cookieFile = path.join(__dirname, "..", "session-cookie.json");
  if (fs.existsSync(cookieFile)) {
    const cookieData = JSON.parse(fs.readFileSync(cookieFile, "utf8"));
    sessionCookie = cookieData.cookie;
    console.log("🍪 Session cookie loaded for authenticated testing");
  } else {
    console.log(
      '⚠️ No session cookie found. Run "node test-auth.js" first for authenticated testing'
    );
  }
} catch (error) {
  console.log("⚠️ Error loading session cookie:", error.message);
}

// Generate a random URL for shortening
function generateRandomUrl(context, events, done) {
  const randomUrl = testUrls[Math.floor(Math.random() * testUrls.length)];
  context.vars.randomUrl = randomUrl;
  return done();
}

// Get a random short URL for testing redirects
function getRandomShortUrl(context, events, done) {
  const randomShortUrl =
    knownShortUrls[Math.floor(Math.random() * knownShortUrls.length)];
  context.vars.randomShortUrl = randomShortUrl;
  return done();
}

// Add session cookie to authenticated requests
function addSessionCookie(requestParams, context, ee, next) {
  if (sessionCookie) {
    if (!requestParams.headers) {
      requestParams.headers = {};
    }
    requestParams.headers.Cookie = sessionCookie;
  }
  return next();
}

module.exports = {
  generateRandomUrl,
  getRandomShortUrl,
  addSessionCookie,
};
