module.exports = function(RED) {
    "use strict";

    // Simple Caesar cipher decryption function.
    function caesarDecrypt(encrypted, shift) {
        if (!encrypted) return "";
        try {
            var decoded = Buffer.from(encrypted, 'base64').toString('binary');
        } catch (e) {
            return "";
        }
        var result = "";
        for (var i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) - shift);
        }
        return result;
    }

    function ChirpStackServerNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.server = config.server;
        this.useTls = config.useTls;
        // Derive the shift value from the node's unique id.
        var shift = (this.id && this.id.length > 0) ? this.id.charCodeAt(0) % 26 : 3;
        // Decrypt the stored API token using the same method as in the HTML.
        this.apiToken = caesarDecrypt(config.apiToken, shift);
        this.log("ChirpStack server config node loaded: " + this.name + " (" + this.server + ")");
    }

    RED.nodes.registerType("chirpstack-server", ChirpStackServerNode);
};
