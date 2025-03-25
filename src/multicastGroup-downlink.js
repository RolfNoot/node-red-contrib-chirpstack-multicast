module.exports = function(RED) {
  "use strict";
  var multicastGroup = require("@chirpstack/chirpstack-api/api/multicast_group_grpc_pb");
  var multicastGroup_pb = require("@chirpstack/chirpstack-api/api/multicast_group_pb");
  var grpc = require("@grpc/grpc-js");

  function MulticastGroupDownlink(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    
    // Retrieve the shared ChirpStack Server configuration node.
    var srv = RED.nodes.getNode(config.serverConfig);
    if (!srv) {
      node.error("No ChirpStack Server config node selected.", config);
      return;
    }
    var server = srv.server;
    var apiToken = srv.apiToken;
    var useTls = srv.useTls;

    // Create the client using the shared settings.
    var client = null;
    if (useTls) {
      client = new multicastGroup.MulticastGroupServiceClient(server, grpc.credentials.createSsl());
    } else {
      client = new multicastGroup.MulticastGroupServiceClient(server, grpc.credentials.createInsecure());
    }

    // Create metadata with the API token.
    var meta = new grpc.Metadata();
    meta.add('authorization', 'Bearer ' + apiToken);

    node.on("input", function(msg) {

      var item = new multicastGroup_pb.MulticastGroupQueueItem();
      var req = new multicastGroup_pb.EnqueueMulticastGroupQueueItemRequest();

      if (msg.multicastGroupId === undefined) {
        node.error("multicastGroupId is undefined");
        return;
      } else {
        item.setMulticastGroupId(msg.multicastGroupId);
      }

      if (msg.fPort === undefined) {
        node.error("fPort is undefined");
        return;
      } else {
        item.setFPort(msg.fPort);
      }

      // Use the node's encoding setting (or default to "hex")
      var encoding = config.encoding || "hex";
      if (msg.payload !== undefined) {
        item.setData(Buffer.from(msg.payload, encoding).toString("base64"));
      } else {
        node.log("payload is undefined, assuming empty downlink frame");
      }

      req.setQueueItem(item);
      client.enqueue(req, meta, function(err, resp) {
        if (err !== null) {
          node.error("Enqueue error: " + err, msg);
        } else {
          node.log("Downlink enqueued");
          node.send({
            fCnt: resp.getFCnt()
          });
        }
      });
    });
  }

  RED.nodes.registerType("multicast group downlink", MulticastGroupDownlink);
}
