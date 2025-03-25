module.exports = function(RED) {
  "use strict";
  var device = require("@chirpstack/chirpstack-api/api/device_grpc_pb");
  var device_pb = require("@chirpstack/chirpstack-api/api/device_pb");
  var grpc = require("@grpc/grpc-js");

  function DeviceDownlink(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    // Retrieve the shared server config node.
    var srv = RED.nodes.getNode(config.serverConfig);
    if (!srv) {
      node.error("No ChirpStack Server config node selected.", config);
      return;
    }
    
    // Use properties from the shared server config node.
    var server = srv.server;
    var apiToken = srv.apiToken;
    var useTls = srv.useTls;
    // Use encoding from the server config node if available,
    // fallback to a default (e.g., "utf8") if not provided.
    var encoding = srv.encoding || "utf8";

    // Create the DeviceServiceClient based on the TLS setting.
    var client = null;
    if (useTls) {
      client = new device.DeviceServiceClient(server, grpc.credentials.createSsl());
    } else {
      client = new device.DeviceServiceClient(server, grpc.credentials.createInsecure());
    }

    // Create metadata with the API token.
    var meta = new grpc.Metadata();
    meta.add("authorization", "Bearer " + apiToken);

    node.on("input", function(msg) {
      var item = new device_pb.DeviceQueueItem();
      var req = new device_pb.EnqueueDeviceQueueItemRequest();

      if (msg.devEui === undefined) {
        node.error("devEui is undefined");
        return;
      } else {
        item.setDevEui(msg.devEui);
      }

      if (msg.fPort === undefined) {
        node.error("fPort is undefined");
        return;
      } else {
        item.setFPort(msg.fPort);
      }

      if (msg.confirmed === undefined) {
        node.error("confirmed is undefined");
        return;
      } else {
        item.setConfirmed(msg.confirmed);
      }

      if (msg.payload !== undefined) {
        // Convert the payload to base64 using the encoding from the server settings.
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
            id: resp.getId()
          });
        }
      });
    });
  }

  RED.nodes.registerType("device downlink", DeviceDownlink);
};
