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
  "WWhZ6E",
  "XNmBvG",
  "yHqMlu",
  "BknPEg",
  "gBAyuT",
  "4sQFKq",
  "A2vuO8",
  "hsJrk7",
  "RHN2NY",
  "oPQHSZ",
  "rn01LU",
  "0cSkIb",
  "ElFjF1",
  "Y57Dwl",
  "fFBsgt",
  "gqys0D",
  "YQJIGU",
  "u72vwY",
  "9AYzVl",
  "CT4Wn4",
  "G3hlqU",
  "FiDrSp",
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
