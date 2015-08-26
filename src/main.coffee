# out: ../lib/main.js
module.exports = (samjs) ->
  mongo = require("./mongo")(samjs)
  plugin = {}
  plugin.name = mongo.name
  plugin.obj = mongo
  plugin.options = {}
  plugin.options[mongo.URI] = mongo.URI
  plugin.configs = defaults: (samjs) -> [{
    name: samjs.options[samjs.mongo.URI]
    isRequired: true
    test: samjs.mongo.testConnection
    }]
  plugin.startup = mongo.startup
  plugin.shutdown = mongo.shutdown
  return plugin
