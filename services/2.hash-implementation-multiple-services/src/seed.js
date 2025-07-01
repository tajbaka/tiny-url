const axios = require("axios");

// Predefined short URLs for testing and demo purposes
const seedMappings = [
  {
    shortUrl: "abc123",
    longUrl: "https://example.com/article/technology-trends-2024",
  },
  { shortUrl: "def456", longUrl: "https://test.com/page/user-guide" },
  {
    shortUrl: "ghi789",
    longUrl: "https://demo.org/product/innovative-solution",
  },
  { shortUrl: "jkl012", longUrl: "https://sample.net/service/cloud-hosting" },
  { shortUrl: "mno345", longUrl: "https://example.org/post/best-practices" },
  { shortUrl: "pqr678", longUrl: "https://example.net/item/featured-product" },
  { shortUrl: "stu901", longUrl: "https://example.com/article/industry-news" },
  { shortUrl: "vwx234", longUrl: "https://test.com/page/documentation" },
  { shortUrl: "yzA567", longUrl: "https://demo.org/service/consulting" },
  { shortUrl: "BcD890", longUrl: "https://sample.net/product/premium-service" },
  // Additional URLs for multi-service setup to demonstrate load balancing
  { shortUrl: "LbT111", longUrl: "https://loadbalancer.test/api/endpoint-1" },
  { shortUrl: "LbT222", longUrl: "https://loadbalancer.test/api/endpoint-2" },
  { shortUrl: "LbT333", longUrl: "https://loadbalancer.test/api/endpoint-3" },
  { shortUrl: "LbT444", longUrl: "https://loadbalancer.test/api/endpoint-4" },
  {
    shortUrl: "ScL555",
    longUrl: "https://scale.test/service/horizontal-scaling",
  },
];

async function waitForServer(url, maxAttempts = 60, delay = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(url);
      console.log("Load balancer and services are ready!");
      return true;
    } catch (error) {
      console.log(
        `Attempt ${i + 1}/${maxAttempts}: Services not ready yet, waiting...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(
    `Services did not become ready after ${maxAttempts} attempts`
  );
}

async function checkServiceHealth() {
  const baseUrl = process.env.API_URL || "http://localhost:8090";

  try {
    console.log("Checking service health...");
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log(
      `Health check passed for instance: ${healthResponse.data.instance}`
    );
    console.log(`Current mappings: ${healthResponse.data.mappings}`);
    return true;
  } catch (error) {
    console.error("Health check failed:", error.message);
    return false;
  }
}

async function seedViaAPI() {
  const baseUrl = process.env.API_URL || "http://localhost:8090";

  try {
    // Wait for load balancer and services to be ready
    await waitForServer(`${baseUrl}/health`);

    // Check health before seeding
    await checkServiceHealth();

    console.log("Seeding database via load balancer API calls...");
    console.log(`Using load balancer endpoint: ${baseUrl}`);

    let successCount = 0;

    // Seed additional URLs through the load balancer
    // This will distribute the URLs across different service instances
    for (const { shortUrl, longUrl } of seedMappings) {
      try {
        const response = await axios.post(`${baseUrl}/api/shorten`, {
          longUrl: longUrl,
        });

        console.log(`✓ Seeded: ${response.data.shortUrl} -> ${longUrl}`);
        successCount++;

        // Small delay to ensure load balancer can distribute requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`✗ Failed to seed ${shortUrl}: ${error.message}`);
      }
    }

    console.log(
      `\nSeeding completed: ${successCount}/${seedMappings.length} URLs seeded successfully`
    );

    // Verify seeding by sampling mappings from different instances
    console.log("\nSampling mappings distribution across instances...");
    let totalUniqueMappings = new Set();
    let instanceSamples = {};

    // Sample multiple times to hit different instances
    for (let i = 0; i < 12; i++) {
      try {
        const mappingsResponse = await axios.get(`${baseUrl}/api/mappings`);
        const healthResponse = await axios.get(`${baseUrl}/health`);

        const instanceId = healthResponse.data.instance || "unknown";
        const mappingCount = mappingsResponse.data.count;

        // Track unique mappings across all instances
        Object.keys(mappingsResponse.data.mappings).forEach((shortUrl) => {
          totalUniqueMappings.add(shortUrl);
        });

        // Track instance samples
        if (!instanceSamples[instanceId]) {
          instanceSamples[instanceId] = {
            count: mappingCount,
            sampleMappings: Object.keys(mappingsResponse.data.mappings).slice(
              0,
              3
            ),
          };
        }

        await new Promise((resolve) => setTimeout(resolve, 200)); // Brief delay
      } catch (error) {
        console.error(`Sample ${i + 1} failed: ${error.message}`);
      }
    }

    console.log(`\nDistribution Summary:`);
    console.log(
      `Total unique mappings across all instances: ${totalUniqueMappings.size}`
    );
    console.log(`\nInstance breakdown:`);
    Object.entries(instanceSamples).forEach(([instanceId, data]) => {
      console.log(
        `  Instance ${instanceId}: ${
          data.count
        } mappings (sample: ${data.sampleMappings.join(", ")})`
      );
    });
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedViaAPI();
}

module.exports = { seedViaAPI, seedMappings };
