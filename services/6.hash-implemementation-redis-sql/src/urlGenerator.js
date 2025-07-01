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
