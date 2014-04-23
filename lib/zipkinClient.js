
/**
 * Zipkin Client
 *
 */

(function () {
  var trace =        require('tryfer').trace;
  var tracers =      require('tryfer').tracers;
  var nodeTracers =  require('tryfer').node_tracers;
  var hexStringify = require('tryfer').formatters._hexStringify;
  var Scribe =       require('scribe').Scribe;

  /**
   * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
   * @param obj1
   * @param obj2
   * @returns obj3 a new object based on obj1 and obj2
   */
  var merge_options = function (obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  };

  var scribeClient = {};
  var local_opts = {
    zipkinTracer: {}
    , scribeClientAddress: "localhost"
    , scribeClientPort: 1463
    , rpcName: ""
    , scribeStoreName: "zipkin"
    , maxTraces: 50
    , serverAddress: "localhost"
    , serverPort: 80
    , autoReconnect: true
    , sampleRate: 1
  };

  /**
   *
   * @param opts Initialization params for zipkin tracing
   * opts -
   *   scribeClientAddress: String,
   *   scribeClientPort:String,
   *   tracers:List[Tracers],
   *   rpcName:String
   *   address:String
   *   port:Int
   */
  var initialize = function(opts){
    local_opts = merge_options(local_opts, opts || {});
    scribeClient = new Scribe(local_opts.scribeClientAddress,local_opts.scribeClientPort,{autoReconnect:local_opts.autoReconnect});
    scribeClient.open(function (err){
      if (err) console.log("Error connecting to scribe. No tracing enabled.", err);
      else {
        console.log("Scribe connection made, now initializing tracing.");
        local_opts.zipkinTracer = new nodeTracers.ZipkinTracer(scribeClient,local_opts.scribeStoreName,{'maxTraces':local_opts.maxTraces});
        tracers.pushTracer(local_opts.zipkinTracer);
      }
    });
  };

  var traceFilter = function(req, res, next){
    // handle the callback request and record the trace
    var t = trace.Trace.fromRequest(req, local_opts.rpcName, {address: local_opts.serverAddress, port: local_opts.serverPort});

    if (t){
      //t.record(trace.Annotation('request.headers', JSON.stringify(req.headers)));
      t.record(trace.Annotation.uri(req.url));
      t.record(trace.Annotation.serverRecv());
      req.zipkinTrace = t;
    }

    res.on('finish', function(){
      if (req.zipkinTrace) {
        t.record(trace.Annotation.string('http.response.code', res.statusCode+""));
        t.record(trace.Annotation.serverSend());
      }
      next();
    });

    next();
  };

  var traceService = function(req, res, serviceName, fn, next){
    if (req.zipkinTrace) {
      var t = req.zipkinTrace.child(serviceName || "traceService");
      t.record(trace.Annotation.serverSend());
      try{
        fn();
      } finally {
        t.record(trace.Annotation.serverRecv());
        next();
      }
    }
  };

  var toRequestHeader = function(req, header){
    if (req.zipkinTrace) return req.zipkinTrace.toHeaders(header);
  };

  var toRabbitMessage = function(req, msg){
    if (req.zipkinTrace) {
      var t = req.zipkinTrace;
      msg.header["zipkin"] =  {
        'trace_id' : hexStringify(t.traceId),
        'parent_id' : hexStringify(t.parentSpanId),
        'span_id' : hexStringify(t.spanId),
        'debug' : t.debug || false
      };
      return msg;
    }
  };

  var getLocalOpts = function(){
    return local_opts;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      start: initialize
      , trace: traceFilter
      , traceService: traceService
      , toRequestHeader: toRequestHeader
      , toRabbitMessage: toRabbitMessage
      , getLocalOpts: getLocalOpts
    };
  }
}());
