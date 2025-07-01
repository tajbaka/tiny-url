// MongoDB initialization script for URL Shortener
// This script runs when the MongoDB container starts for the first time
// Uses the hardcoded URLs from urlGenerator.js with nested access_logs structure

// Switch to the urlshortener database
db = db.getSiblingDB("urlshortener");

// Create the urls collection and insert seed data with nested access_logs and analytics
db.urls.insertMany([
  {
    short_url: "9XIpKz",
    long_url: "https://github.com/nodejs/node",
    created_at: new Date(),
    updated_at: new Date(),
    clicks: 15,
    access_logs: [
      {
        accessed_at: new Date(Date.now() - 3600000), // 1 hour ago
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ip_address: "192.168.1.100",
        referrer: "https://google.com",
        country: "United States",
        city: "New York",
        device_type: "Desktop",
        browser: "Chrome",
        operating_system: "Windows",
      },
      {
        accessed_at: new Date(Date.now() - 1800000), // 30 minutes ago
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        ip_address: "192.168.1.101",
        referrer: "https://twitter.com",
        country: "United States",
        city: "Los Angeles",
        device_type: "Mobile",
        browser: "Safari",
        operating_system: "iOS",
      },
    ],
    analytics: {
      total_clicks: 15,
      unique_visitors: 12,
      countries: {
        "United States": 8,
        Canada: 4,
        Germany: 3,
      },
      devices: {
        Desktop: 9,
        Mobile: 6,
      },
      browsers: {
        Chrome: 10,
        Safari: 3,
        Firefox: 2,
      },
      referrers: {
        "https://google.com": 7,
        "https://twitter.com": 4,
        direct: 4,
      },
    },
  },
  {
    short_url: "1fZYXe",
    long_url: "https://stackoverflow.com/questions/javascript",
    created_at: new Date(),
    updated_at: new Date(),
    clicks: 8,
    access_logs: [
      {
        accessed_at: new Date(Date.now() - 900000), // 15 minutes ago
        user_agent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        ip_address: "192.168.1.102",
        referrer: "https://stackoverflow.com",
        country: "Canada",
        city: "Toronto",
        device_type: "Desktop",
        browser: "Chrome",
        operating_system: "macOS",
      },
    ],
    analytics: {
      total_clicks: 8,
      unique_visitors: 6,
      countries: {
        Canada: 5,
        "United States": 3,
      },
      devices: {
        Desktop: 6,
        Mobile: 2,
      },
      browsers: {
        Chrome: 5,
        Firefox: 3,
      },
      referrers: {
        "https://stackoverflow.com": 4,
        "https://google.com": 3,
        direct: 1,
      },
    },
  },
  {
    short_url: "avL0vX",
    long_url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    created_at: new Date(),
    updated_at: new Date(),
    clicks: 22,
    access_logs: [
      {
        accessed_at: new Date(Date.now() - 300000), // 5 minutes ago
        user_agent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        ip_address: "192.168.1.103",
        referrer: "https://github.com",
        country: "Germany",
        city: "Berlin",
        device_type: "Desktop",
        browser: "Firefox",
        operating_system: "Linux",
      },
    ],
    analytics: {
      total_clicks: 22,
      unique_visitors: 18,
      countries: {
        Germany: 10,
        "United States": 8,
        France: 4,
      },
      devices: {
        Desktop: 15,
        Mobile: 7,
      },
      browsers: {
        Firefox: 12,
        Chrome: 8,
        Safari: 2,
      },
      referrers: {
        "https://github.com": 9,
        "https://google.com": 8,
        "https://reddit.com": 3,
        direct: 2,
      },
    },
  },
  {
    short_url: "TzFU38",
    long_url: "https://www.npmjs.com/package/express",
    created_at: new Date(),
    updated_at: new Date(),
    clicks: 12,
    access_logs: [],
    analytics: {
      total_clicks: 12,
      unique_visitors: 10,
      countries: { "United States": 7, India: 3, Brazil: 2 },
      devices: { Desktop: 8, Mobile: 4 },
      browsers: { Chrome: 9, Firefox: 3 },
      referrers: { "https://npmjs.com": 6, "https://google.com": 4, direct: 2 },
    },
  },
  {
    short_url: "SuC8HM",
    long_url: "https://reactjs.org/docs/getting-started.html",
    created_at: new Date(),
    updated_at: new Date(),
    clicks: 31,
    access_logs: [
      {
        accessed_at: new Date(Date.now() - 120000), // 2 minutes ago
        user_agent: "Mozilla/5.0 (Android 11; SM-G991B) AppleWebKit/537.36",
        ip_address: "192.168.1.104",
        referrer: "https://reddit.com",
        country: "United Kingdom",
        city: "London",
        device_type: "Mobile",
        browser: "Chrome",
        operating_system: "Android",
      },
    ],
    analytics: {
      total_clicks: 31,
      unique_visitors: 25,
      countries: {
        "United States": 15,
        "United Kingdom": 8,
        Australia: 5,
        Canada: 3,
      },
      devices: { Desktop: 18, Mobile: 13 },
      browsers: { Chrome: 20, Safari: 7, Firefox: 4 },
      referrers: {
        "https://reddit.com": 12,
        "https://google.com": 10,
        "https://twitter.com": 6,
        direct: 3,
      },
    },
  },
]);

// Add remaining URLs with basic analytics structure
const basicUrls = [
  {
    short_url: "04f4dh",
    long_url: "https://www.mongodb.com/docs/",
    clicks: 19,
  },
  {
    short_url: "9olGKO",
    long_url: "https://redis.io/documentation",
    clicks: 14,
  },
  {
    short_url: "NQMk36",
    long_url: "https://docker.com/get-started",
    clicks: 9,
  },
  {
    short_url: "PVlvso",
    long_url: "https://kubernetes.io/docs/home/",
    clicks: 25,
  },
  {
    short_url: "ojEIBH",
    long_url: "https://aws.amazon.com/documentation/",
    clicks: 33,
  },
  {
    short_url: "ozjd4D",
    long_url: "https://www.google.com/search?q=system+design",
    clicks: 18,
  },
  {
    short_url: "sBPUye",
    long_url: "https://leetcode.com/problemset/all/",
    clicks: 45,
  },
  {
    short_url: "Hptr2g",
    long_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    clicks: 11,
  },
  // Additional URLs from urlGenerator.js
  {
    short_url: "CmUsBf",
    long_url: "https://en.wikipedia.org/wiki/URL_shortening",
    clicks: 6,
  },
  {
    short_url: "S9Alzq",
    long_url: "https://www.cloudflare.com/learning/",
    clicks: 13,
  },
  { short_url: "sz1IDl", long_url: "https://nginx.org/en/docs/", clicks: 17 },
  {
    short_url: "zNTGrG",
    long_url: "https://www.postgresql.org/docs/",
    clicks: 20,
  },
  { short_url: "seY0xM", long_url: "https://nodejs.org/en/docs/", clicks: 16 },
  {
    short_url: "HsG4de",
    long_url: "https://expressjs.com/en/guide/",
    clicks: 10,
  },
  {
    short_url: "rHzYe6",
    long_url: "https://www.postman.com/api-platform/",
    clicks: 24,
  },
  { short_url: "K5ndTz", long_url: "https://jwt.io/introduction/", clicks: 5 },
  {
    short_url: "0Q54g0",
    long_url: "https://www.elastic.co/guide/",
    clicks: 12,
  },
  { short_url: "VnXdsE", long_url: "https://prometheus.io/docs/", clicks: 15 },
  { short_url: "8f76ZZ", long_url: "https://grafana.com/docs/", clicks: 21 },
  { short_url: "dAz6NO", long_url: "https://www.jenkins.io/doc/", clicks: 9 },
  {
    short_url: "wL6zRy",
    long_url: "https://kubernetes.io/docs/concepts/",
    clicks: 14,
  },
  {
    short_url: "Bawhex",
    long_url: "https://www.terraform.io/docs/",
    clicks: 7,
  },
  { short_url: "NWHGWZ", long_url: "https://docs.ansible.com/", clicks: 28 },
  {
    short_url: "TGokRE",
    long_url: "https://www.vagrantup.com/docs/",
    clicks: 13,
  },
  { short_url: "vGknEY", long_url: "https://vuejs.org/guide/", clicks: 19 },
  { short_url: "glioko", long_url: "https://angular.io/docs", clicks: 16 },
  { short_url: "H4GfMj", long_url: "https://svelte.dev/docs", clicks: 11 },
  { short_url: "NAVhWt", long_url: "https://nextjs.org/docs", clicks: 23 },
  { short_url: "rhXttk", long_url: "https://nuxtjs.org/docs", clicks: 8 },
  {
    short_url: "Iqx1XD",
    long_url: "https://www.typescriptlang.org/docs/",
    clicks: 27,
  },
  {
    short_url: "p2YLg0",
    long_url: "https://webpack.js.org/concepts/",
    clicks: 12,
  },
  { short_url: "ZKWs4a", long_url: "https://vitejs.dev/guide/", clicks: 18 },
  { short_url: "CxFanv", long_url: "https://babeljs.io/docs/", clicks: 9 },
  { short_url: "mnCOZQ", long_url: "https://eslint.org/docs/", clicks: 14 },
  { short_url: "PIbKLZ", long_url: "https://prettier.io/docs/", clicks: 10 },
  { short_url: "0dXlWI", long_url: "https://jestjs.io/docs/", clicks: 15 },
  { short_url: "DNmHHk", long_url: "https://mochajs.org/", clicks: 7 },
  { short_url: "XfETrZ", long_url: "https://www.cypress.io/", clicks: 22 },
  { short_url: "Yr6NLe", long_url: "https://playwright.dev/", clicks: 13 },
  { short_url: "6hUs8D", long_url: "https://socket.io/docs/", clicks: 17 },
  { short_url: "ftFzMs", long_url: "https://graphql.org/learn/", clicks: 20 },
  {
    short_url: "HZSNRl",
    long_url: "https://www.apollographql.com/docs/",
    clicks: 11,
  },
  { short_url: "Xbot88", long_url: "https://hasura.io/docs/", clicks: 8 },
  {
    short_url: "hGRpBA",
    long_url: "https://strapi.io/documentation/",
    clicks: 16,
  },
  { short_url: "lHDACP", long_url: "https://www.prisma.io/docs/", clicks: 25 },
  { short_url: "cJwctG", long_url: "https://sequelize.org/docs/", clicks: 12 },
  { short_url: "jfRFFi", long_url: "https://mongoosejs.com/docs/", clicks: 19 },
  {
    short_url: "22JotV",
    long_url: "https://www.passportjs.org/docs/",
    clicks: 14,
  },
].map((url) => ({
  ...url,
  created_at: new Date(),
  updated_at: new Date(),
  access_logs: [],
  analytics: {
    total_clicks: url.clicks,
    unique_visitors: Math.floor(url.clicks * 0.8),
    countries: {
      "United States": Math.floor(url.clicks * 0.6),
      Canada: Math.floor(url.clicks * 0.2),
      UK: Math.floor(url.clicks * 0.2),
    },
    devices: {
      Desktop: Math.floor(url.clicks * 0.7),
      Mobile: Math.floor(url.clicks * 0.3),
    },
    browsers: {
      Chrome: Math.floor(url.clicks * 0.7),
      Firefox: Math.floor(url.clicks * 0.3),
    },
    referrers: {
      "https://google.com": Math.floor(url.clicks * 0.5),
      direct: Math.floor(url.clicks * 0.5),
    },
  },
}));

db.urls.insertMany(basicUrls);

// Create indexes for better performance
db.urls.createIndex({ short_url: 1 }, { unique: true });
db.urls.createIndex({ long_url: 1 });
db.urls.createIndex({ created_at: -1 });
db.urls.createIndex({ "access_logs.accessed_at": -1 });
db.urls.createIndex({ "access_logs.country": 1 });
db.urls.createIndex({ "access_logs.device_type": 1 });

print("MongoDB initialization complete with nested analytics data structure!");
