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
  "9XIpKz",
  "1fZYXe",
  "avL0vX",
  "TzFU38",
  "SuC8HM",
  "04f4dh",
  "9olGKO",
  "NQMk36",
  "PVlvso",
  "ojEIBH",
  "ozjd4D",
  "sBPUye",
  "Hptr2g",
  "CmUsBf",
  "S9Alzq",
  "sz1IDl",
  "zNTGrG",
  "seY0xM",
  "HsG4de",
  "rHzYe6",
  "K5ndTz",
  "0Q54g0",
  "VnXdsE",
  "8f76ZZ",
  "dAz6NO",
  "wL6zRy",
  "Bawhex",
  "NWHGWZ",
  "TGokRE",
  "vGknEY",
  "glioko",
  "H4GfMj",
  "NAVhWt",
  "rhXttk",
  "Iqx1XD",
  "p2YLg0",
  "ZKWs4a",
  "CxFanv",
  "mnCOZQ",
  "PIbKLZ",
  "0dXlWI",
  "DNmHHk",
  "XfETrZ",
  "Yr6NLe",
  "6hUs8D",
  "ftFzMs",
  "HZSNRl",
  "Xbot88",
  "hGRpBA",
  "lHDACP",
  "cJwctG",
  "jfRFFi",
  "22JotV",
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
