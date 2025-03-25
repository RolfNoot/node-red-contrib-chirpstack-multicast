module.exports = function(RED) {
	"use strict";
	// Import gRPC modules for Application, MulticastGroup, and Tenant services.
	var application = require("@chirpstack/chirpstack-api/api/application_grpc_pb");
	var application_pb = require("@chirpstack/chirpstack-api/api/application_pb");
	var multicastGroup = require("@chirpstack/chirpstack-api/api/multicast_group_grpc_pb");
	var multicastGroup_pb = require("@chirpstack/chirpstack-api/api/multicast_group_pb");
	var tenant = require("@chirpstack/chirpstack-api/api/tenant_grpc_pb");
	var tenant_pb = require("@chirpstack/chirpstack-api/api/tenant_pb");
	var grpc = require("@grpc/grpc-js");

	function ListItems(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		// Retrieve the shared server config node.
		var srv = RED.nodes.getNode(config.serverConfig);
		if (!srv) {
				node.error("No ChirpStack Server config node selected.", config);
				return;
		}
		// Use properties from the config node.
		var server = srv.server;
		// srv.apiToken is the decrypted token from server.js.
		var apiToken = srv.apiToken;
		var useTls = srv.useTls;
		
		// Create clients for ApplicationService, MulticastGroupService, and TenantService.
		var appClient, mgClient, tenantClient;
		if (useTls) {
			appClient = new application.ApplicationServiceClient(server, grpc.credentials.createSsl());
			mgClient = new multicastGroup.MulticastGroupServiceClient(server, grpc.credentials.createSsl());
			tenantClient = new tenant.TenantServiceClient(server, grpc.credentials.createSsl());
		} else {
			appClient = new application.ApplicationServiceClient(server, grpc.credentials.createInsecure());
			mgClient = new multicastGroup.MulticastGroupServiceClient(server, grpc.credentials.createInsecure());
			tenantClient = new tenant.TenantServiceClient(server, grpc.credentials.createInsecure());
		}

		var meta = new grpc.Metadata();
		meta.add("authorization", "Bearer " + apiToken);

		node.on("input", function(msg) {
			if (msg.topic === "listApplications") {
				if (!msg.tenantId) {
					node.error("tenantId is missing for listApplications", msg);
					return;
				}
				var appReq = new application_pb.ListApplicationsRequest();
				appReq.setTenantId(msg.tenantId);
				appReq.setLimit(100);
				appClient.list(appReq, meta, function(err, resp) {
					if (err) {
						node.error("Error listing applications: " + err, msg);
						return;
					}
					var apps = resp.getResultList();
					var appArray = apps.map(function(app) {
						return { id: app.getId(), name: app.getName() };
					});
					msg.Applications = appArray;
					node.send(msg);
				});
			} else if (msg.topic === "listMulticastGroups") {
				if (!msg.applicationId) {
					node.error("applicationId is missing for listMulticastGroups", msg);
					return;
				}
				var mgReq = new multicastGroup_pb.ListMulticastGroupsRequest();
				mgReq.setApplicationId(msg.applicationId);
				mgReq.setLimit(100);
				mgClient.list(mgReq, meta, function(err, resp) {
					if (err) {
						node.error("Error listing multicast groups: " + err, msg);
						return;
					}
					var groups = resp.getResultList();
					var groupArray = groups.map(function(group) {
						return { id: group.getId(), name: group.getName() };
					});
					msg.MulticastGroups = groupArray;
					node.send(msg);
				});
			} else if (msg.topic === "listTenants") {
				var tenantReq = new tenant_pb.ListTenantsRequest();
				tenantReq.setLimit(100);
				tenantClient.list(tenantReq, meta, function(err, resp) {
					if (err) {
						node.error("Error listing tenants: " + err, msg);
						return;
					}
					var tenants = resp.getResultList();
					var tenantArray = tenants.map(function(t) {
						return { id: t.getId(), name: t.getName() };
					});
					msg.Tenants = tenantArray;
					node.send(msg);
				});
			} else {
				node.error("Invalid topic. Use 'listApplications', 'listMulticastGroups', or 'listTenants'", msg);
			}
		});
	}

	RED.nodes.registerType("list-items", ListItems);
};
