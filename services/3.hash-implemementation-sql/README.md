---
Connection Pooling of 10
All VUs finished. Total time: 32 seconds
---

## Summary report @ 16:02:12(-0400)

http.codes.200: ................................................................ 1802
http.codes.301: ................................................................ 16198
http.response_time:
http.downloaded_bytes: ......................................................... 959413
min: ......................................................................... 1.9
max: ......................................................................... 303.4
mean: ........................................................................ 12.3
median: ...................................................................... 4.6
p95: ......................................................................... 51.9
p99: ......................................................................... 127.8

Welcome to actually using a database, we set up a postgres sql database that runs in its own container which all servers are now accessing. What problems has this solved for us already?

Now if our servers go down, we still have access to the data on reboot.
Postgres has built in ACID compliance, meaning there are internal mechanisms in operations that keep data consistent among the queries accessing them. All the concurrency we would have had to write ourselves via locking etc has been taken of for us. Right now we allow 10 concurrent connections to the DB per server. so that is 40 connections total since we have 4 servers. Each connection running in its own separate process which also means no memory sharing issues. Unfortunately we don't have enough memory to pool with 20 connections, we are bound to our docker setup which only gives us max 512MB of memory in our case.

---

Analytics load-test(nested object in sql database)
All VUs finished. Total time: 32 seconds

## Summary report @ 16:34:55(-0400)

http.codes.200: ................................................................ 18000
http.response_time:
min: ......................................................................... 2.1
max: ......................................................................... 1310.4
mean: ........................................................................ 76.4
median: ...................................................................... 18
p95: ......................................................................... 391.6
p99: ......................................................................... 671.9

We are trying to pull the analytics data now which is a nested object, here we see our latency increase substantially to read a nested object in a table.
