# express-zipkin: Express based NodeJS Zipkin Tracer Client

[![Build Status](https://secure.travis-ci.org/eodgooch/node-zipkin.png?branch=master)](http://travis-ci.org/eodgooch/node-zipkin)

Zipkin is a Distributed Tracing system developed by Twitter. The aim of this project is to allow Express Developers an
easy way to mix in zipkin tracing to their apps.

---

### Initialize the Zipkin Tracing Client
```javascript
   var zipkin = require("node-zipkin");

   // initialize zipkin when you start the server
   zipkin.start({
     scribeClientAddress: "localhost"
     , scribeClientPort: 1463
     , rpcName: "serverName"
     , scribeStoreName: "zipkin"
     , maxTraces: 50
     , serverAddress: "server ip address"
     , serverPort: 80
   });
```

### Initialize the Zipkin Tracing Client for local debugging with no scribe client
```javascript
   var zipkin = require("node-zipkin");

   // initialize zipkin when you start the server
   zipkin.start({
     rpcName: "serverName"
     , maxTraces: 50
     , serverAddress: "server ip address"
     , serverPort: 80
     , withDebugTracer: true // set this for local testing to see trace information in the console
     , localTesting: true // set this so local development doesn't need a scribe client
   });
```

### Add the zipkin tracing to your routes
```javascript
   var zipkin = require("express-zipkin");

   app.all("*", zipkin.trace);
```

### Trace requests to clients
```javascript
   var zipkin = require("express-zipkin");

   function (request, response, next) {
     var clientRequest = ...;
     ...;
     clientRequest.headers = zipkin.toHeaders(request, clientRequest.headers);
   };
```

### Trace a DB call
```javascript
   var zipkin = require("express-zipkin");

   function (request, response, next) {
     var redisClient = ...;
     zipkin.traceService(request, response, "redis", function(){ redisClient.get("myKey") }, next);
   };
```
