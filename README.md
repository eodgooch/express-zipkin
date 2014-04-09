# node-zipkin: Express based NodeJS Zipkin Tracer Client

[![Build Status](https://secure.travis-ci.org/eodgooch/node-zipkin.png?branch=master)](http://travis-ci.org/eodgooch/node-zipkin)

Zipkin is a Distributed Tracing system developed by Twitter. The aim of this project is to allow Express Developers an
easy way to mix in zipkin tracing to their apps.

---

Initialize the Zipkin Tracing Client.
```javascript
   var zipkin = require("node-zipkin");

   // initialize zipkin when you start the server
   zipkin.start({
     scribeClientAddress: "localhost"
     , scribeClientPort: 1463
     , rpcName: ""
     , scribeStoreName: "zipkin"
     , maxTraces: 50
     , serverAddress: "localhost"
     , serverPort: 80
   });
```

In your routes add the zipkin filter
```javascript
   var zipkin = require("node-zipkin");

   app.all("*", zipkin.trace);
```

Pass along the zipkin trace info to any client calls to trace the request
```javascript
   var zipkin = require("node-zipkin");

   function (request, response, next) {
     var clientRequest = ...;
     ...;
     clientRequest.headers = zipkin.toHeaders(request, clientRequest.headers);
   };
```

Trace a DB call
```javascript
   var zipkin = require("node-zipkin");

   function (request, response, next) {
     var redisClient = ...;
     zipkin.traceService(request, response, "redis", function(){ redisClient.get("myKey") }, next);
   };
```