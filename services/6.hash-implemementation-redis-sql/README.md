All VUs finished. Total time: 32 seconds

---

## Summary report @ 15:29:33(-0400)

http.codes.200: ................................................................ 1754
http.codes.301: ................................................................ 16246
http.response_time:
min: ......................................................................... 1.8
max: ......................................................................... 598.3
mean: ........................................................................ 13.3
median: ...................................................................... 4.4
p95: ......................................................................... 56.3
p99: ......................................................................... 147

Coming a long way, using redis for in memory cache and postgres for data storage of our urls and mappings.
Now if our server crashes we don't lose access to any data.
We also have really reduced latency, beating our sql and nosql only counter parts.
If we wanted to could also implement our analytics layer here and the latency differences would be even higher.
