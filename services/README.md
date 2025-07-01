To start each service run
pnpm run docker:restart

To start load test
pnpm run load-test

monitor resource usage with
pnpm run docker:stats

We hardcoded the tests to be 600 concurrent requests per second. I'm on a M4 Macbook air with 16GB of RAM. This was around the range of my computers
abilities whilst also running the server. 600/req per second takes a lot of resources apparently!

Running watch -n 1 'echo "=== CPU/MEM ==="; top -l 1 -n 10 | head -15; echo "=== CONNECTIONS ==="; netstat -an | grep ESTABLISHED | wc -l' to monitor my own computers resources while running these tests

WHAT:
In this project we analyze and run incremental improvements to the classic url shortening service. We start with trivially bad solutions and work our way up to a functioning solution that can handle a semi large throughput, and authentication.

Using nginx for load balancing
Using artillery for load tests
And changing different storage solutions to see which works best.

SUMMARY:

Unless you're running a highly used service with throughput exceeding 1000 req per seconds etc the nosql vs sql debate is irrelevant.
We can use nosql to handle more concurrency via more connection pooling, but then we need to allocate more resources to our database as well.
A simple in memory cache using redis and sql database to store the data in disk, with 4 servers can handle incredible load, whilst having really low latency for requests, and handling authentication via user sessions seamlessly.
