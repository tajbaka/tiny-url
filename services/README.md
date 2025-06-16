<!-- config:
  target: "http://localhost:8110"
  phases:
    - duration: 60
      arrivalRate: 8040
      name: "TinyURL-like traffic simulation"
  output: "load-test-report.json"
  processor: "./src/urlGenerator.js"

scenarios:
  # URL Creation (5% of traffic - 40/sec out of 8040/sec)
  - name: "URL Creation"
    weight: 5
    flow:
      - function: "generateRandomUrl"
      - post:
          url: "/api/shorten"
          json:
            longUrl: "{{ randomUrl }}"
          expect:
            - statusCode: [200]

  # URL Redirections (95% of traffic - 8000/sec out of 8040/sec)
  - name: "URL Redirections"
    weight: 95
    flow:
      - function: "getRandomShortUrl"
      - get:
          url: "/{{ randomShortUrl }}"
          followRedirect: false
          expect:
            - statusCode: [301, 302] -->
