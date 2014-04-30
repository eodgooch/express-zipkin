
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
    zipkinTracers: []
    , scribeClientAddress: "localhost"
    , scribeClientPort: 1463
    , rpcName: ""
    , scribeStoreName: "zipkin"
    , maxTraces: 50
    , serverAddress: "localhost"
    , serverPort: 80
    , autoReconnect: true
    , sampleRate: 1
    , withDebugTracer: false // set this for local testing to see trace information in the console
    , localTesting: false  // set this so local development doesn't need a scribe client
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
        if (local_opts.withDebugTracer) addDebugTracer();
        if (!local_opts.localTesting) local_opts.zipkinTracers.push(new nodeTracers.ZipkinTracer(scribeClient,local_opts.scribeStoreName,{'maxTraces':local_opts.maxTraces}));
        for (var i=0; i<local_opts.zipkinTracers.size; i++){
          tracers.pushTracer(local_opts.zipkinTracers[i]);
        }
      }
    });
  };

  /**
   * A filter to add zipkin tracing
   * Creates a trace from the given request and attaches the trace to the request object
   *
   * On response finish send trace annotation with response code
   *
   * @param req Express Request Object
   * @param res Express Response Object
   * @param next callback
   */
  var traceFilter = function(req, res, next){
    var d = req._time || req.timestamp || Date.now();
    // handle the callback request and record the trace
    var t = trace.Trace.fromRequest(req, local_opts.rpcName, {address: local_opts.serverAddress, port: local_opts.serverPort});

    if (t){
      t.record(trace.Annotation.uri(req.url));
      t.record(trace.Annotation.serverRecv(d*1000));
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

  /**
   * Function to wrap a service call with zipkin tracing
   *
   * @param req Express Request Object
   * @param res Express Response Object
   * @param serviceName String name of the service being wrapped
   * @param fn service function to wrap
   * @param next callback
   */
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

  /**
   * Add zipkin trace data to a request header
   *
   * @param req Express Request
   * @param header Express Request header object
   * @returns Express Request header
   */
  var toRequestHeader = function(req, header){
    if (req.zipkinTrace) return req.zipkinTrace.toHeaders(header);
  };

  /**
   * Add zipkin trace information to a rabbit message header
   *
   * @param req Express Request
   * @param msg Json string message to be sent to rabbit
   * @returns msg Json string
   */
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

  var addDebugTracer = function(){
    var debugTracer = new tracers.DebugTracer(process.stdout);
    local_opts.zipkinTracers.push(debugTracer);
  };

  /**
   * Accessor for local opts object
   *
   * @returns {{zipkinTracer: {}, scribeClientAddress: string, scribeClientPort: number, rpcName: string, scribeStoreName: string, maxTraces: number, serverAddress: string, serverPort: number, autoReconnect: boolean, sampleRate: number}}
   */
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
