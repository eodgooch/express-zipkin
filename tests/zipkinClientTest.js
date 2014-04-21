
var zipkin = require('../lib/zipkinClient');
var Scribe = require('scribe').Scribe;
var scribeServer = require('../node_modules/scribe/test_utils/scribeserver');
var _ = require('underscore');
var nodeMocks = require('node-mocks-http');
var nock = require('nock');

describe("zipkinClient", function(){

  describe("", function(){

  })
})

module.exports = {

  zipkinClientTests: {

    testStart_default_opts: function(test){
      var server = scribeServer.createServer();
      server.listen(1463);

      zipkin.start();
      var opts = zipkin.getLocalOpts();
      server.stop();
      var expectedOpts = {
        scribeClientAddress: "localhost"
        , scribeClientPort: 1463
        , rpcName: ""
        , scribeStoreName: "zipkin"
        , maxTraces: 50
        , serverAddress: "localhost"
        , serverPort: 80
      };
      _.forEach(expectedOpts, function(key){
        test.equal(expectedOpts[key], opts[key]);
      });
      test.done();
    }
    , testStart_custom_opts: function(test){
      var server = scribeServer.createServer();
      server.listen(8991);
      var myOpts = {
        scribeClientAddress: "localhost"
        , scribeClientPort: 8991
        , rpcName: ""
        , scribeStoreName: "zipkin-test"
        , maxTraces: 25
        , serverAddress: "localhost"
        , serverPort: 8888
      };

      zipkin.start(myOpts);
      var opts = zipkin.getLocalOpts();
      server.stop();
      _.forEach(myOpts, function(key){
        test.equal(myOpts[key], opts[key]);
      });
      test.done();
    }
    , testTrace_with_trace: function(test){
      var server = scribeServer.createServer();
      server.listen(8992);
      var myOpts = {
        scribeClientPort: 8992
        , rpcName: "test"
      };
      zipkin.start(myOpts);
      var req = nodeMocks.createRequest();
      var res = nodeMocks.createResponse();
      var next = function(request, resp, n){
        var t = request.zipkinTrace;
        //assertNotNull(t);
        test.done();
      };
      zipkin.trace(req, res, next);
    }
  }
};
