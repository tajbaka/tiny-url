Connection Pooling of 10
All VUs finished. Total time: 32 seconds

---

## Summary report @ 15:56:59(-0400)

http.codes.200: ................................................................ 1714
http.codes.301: ................................................................ 16286
http.response_time:
min: ......................................................................... 2.1
max: ......................................................................... 452.6
mean: ........................................................................ 17.1
median: ...................................................................... 5.8
p95: ......................................................................... 79.1
p99: ......................................................................... 159.2

We moved to using a nosql implementation to see if it reduces our read latency. Looking at the mean latency here and comparing to our sql implementation we see we actually have higher latency in nosql. Not what we expected right? Well actually in a straight key value approach an indexed sql table performs very fast, no sql query efficiency kicks in more when we have nested objects or when we want to horizontally scale since we have database partitioning(sharding) as a built in feature of a no sql database.

Whats interesting here too is database pooling in mongo is done via threads not processes, this means overall lower memory requirements per database connection and we can in theory handle a much larger max connection pool than a sql database(in the thousands vs sqls in the hundreds)

Connection Pool of 20
All VUs finished. Total time: 32 seconds

---

## Summary report @ 15:41:46(-0400)

http.codes.200: ................................................................ 1743
http.codes.301: ................................................................ 16257
http.response_time:
min: ......................................................................... 2.2
max: ......................................................................... 1027.8
mean: ........................................................................ 38
median: ...................................................................... 7.5
p95: ......................................................................... 214.9
p99: ......................................................................... 424.2

Connection Pool of 10, analytics load test
All VUs finished. Total time: 32 seconds

---

We increased our number of connections to 20 to see what happens, in theory we can actually handle more concurrent requests but at what cost? Well if we make more requests per second and allow more db conenctions as well our requests have more resource contention, thread contention and context switching. Means we have more locked resources hence requests have to wait for these to free up before mongodb can query and return the data.

---

Analytics load-test(nested object in nosql database)
Connection Pooling of 10

## Summary report @ 16:55:25(-0400)

errors.ECONNRESET: ............................................................. 15
http.codes.200: ................................................................ 17985
http.response_time:
min: ......................................................................... 2.3
max: ......................................................................... 1093.5
mean: ........................................................................ 60.6
median: ...................................................................... 8.2
p95: ......................................................................... 354.3
p99: ......................................................................... 658.6

Now we are trying to look at nested analytics data as well, well we are already beating our sql counterpart but actually running into memory issues with 512MB RAM? How come, well since we are actually loading each analytics object into memory ourselves, that is a lot of memory per connection.

All VUs finished. Total time: 32 seconds

Analytics load-test(nested object in nosql database)
Connection Pooling of 10
Increased RAM to 1GB

---

## Summary report @ 17:02:24(-0400)

http.codes.200: ................................................................ 18000
http.response_time:
min: ......................................................................... 2
max: ......................................................................... 1334
mean: ........................................................................ 48.6
median: ...................................................................... 5.2
p95: ......................................................................... 340.4
p99: ......................................................................... 645.6

Due to memory issues of loading each object into memory, increased memory allocation in docker to 1GB. Now looking at mean response time we see where the nosql power is coming in, we are cutting almost 1/3 of our sql response time. Is this really worth implementing at a startup though?
