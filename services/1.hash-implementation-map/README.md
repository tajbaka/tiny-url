All VUs finished. Total time: 32 seconds

---

## Summary report @ 17:57:15(-0400)

errors.ECONNRESET: ............................................................. 102
http.codes.200: ................................................................ 1777
http.codes.301: ................................................................ 16121
http.response_time:
min: ......................................................................... 1.3
max: ......................................................................... 668.1
mean: ........................................................................ 27.7
median: ...................................................................... 4.1
p95: ......................................................................... 135.7
p99: ......................................................................... 376.2

As we can see, this actually gives us really low latency on requests but what are the problems?

Firstly all of our generated urls and url mappings are stored in memory, meaning as soon as the server retarts or crashes we lose everything...
Secondly, we can't actually handle high number of requests since all requests are routed to one server. See those ECONNRESET responses? its because we have only one sever.
