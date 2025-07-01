All VUs finished. Total time: 32 seconds

---

## Summary report @ 18:02:45(-0400)

http.codes.200: ................................................................ 1201
http.codes.301: ................................................................ 2697
http.codes.404: ................................................................ 8102
http.response_time:
min: ......................................................................... 1.4
max: ......................................................................... 301.9
mean: ........................................................................ 6.3
median: ...................................................................... 2.7
p95: ......................................................................... 15.3
p99: ......................................................................... 102.5

So we addressed the high throughput issue, we spun up a bunch of new services using nginx as sort of a load balancer here to distribute the load via round robin between 4 servers. Now all of our requests are returning good status codes but what problems do we still have?

We still have all of our generated urls and url mappings are stored in memory, meaning as soon as the server restarts or crashes we lose everything...

Secondly, how extensible is this sort of data storage. Would we not need more Map() data structures to store other potential data in our app?
