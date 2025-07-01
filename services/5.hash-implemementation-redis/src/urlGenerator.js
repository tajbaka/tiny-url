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

const hardcodedUrls = [
  "2vRXYg",
  "slH00A",
  "ARZcPi",
  "drwS9J",
  "JexeuQ",
  "YaFCfH",
  "XeEl81",
  "xbXmWy",
  "P8yiw2",
  "bADWHS",
  "PIYQtm",
  "tcjZQ0",
  "h3mOs7",
  "r06PnG",
  "DhJiv8",
  "hb1BSM",
  "4cKpEw",
  "6nVPKW",
  "cuMc1D",
  "p8K0vc",
  "9te1n3",
  "905X0j",
  "0k6IZO",
  "HKqN7w",
  "rH1xB9",
  "DgRaGj",
  "CkadK3",
  "WY5F1g",
  "ApvcQd",
  "VoyzHJ",
  "4ek5dI",
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
  hardcodedUrls,
  generateRandomUrl,
};
