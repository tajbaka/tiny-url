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

  return `http://${domain}${path}${query}${randomId}`;
}

// Hardcoded URLs for testing
const hardcodedUrls = [
  "M5KCCn",
  "Cx3cjq",
  "ixO927",
  "IQSzYz",
  "Pon6cv",
  "bAdAL6",
  "ZeFjZE",
  "sHRPgG",
  "PipgCe",
  "RSAbYX",
  "utLtHu",
  "uX86hx",
  "H9sBxS",
  "OJKg3P",
  "61NWEI",
  "5c4EYS",
];

let currentIndex = 0;

async function getRandomShortUrl() {
  const url = hardcodedUrls[currentIndex];
  currentIndex = (currentIndex + 1) % hardcodedUrls.length;
  return url;
}

module.exports = {
  generateRandomUrl: function (context, events, done) {
    context.vars.randomUrl = generateRandomUrl();
    return done();
  },
  getRandomShortUrl: function (context, events, done) {
    getRandomShortUrl()
      .then((url) => {
        context.vars.randomShortUrl = url;
        return done();
      })
      .catch((error) => {
        return done(error);
      });
  },
};
