(function() {
  module.exports = function(samjs) {
    var mongo, plugin;
    mongo = require("./mongo")(samjs);
    plugin = {};
    plugin.name = mongo.name;
    plugin.obj = mongo;
    plugin.options = {};
    plugin.options[mongo.URI] = mongo.URI;
    plugin.configs = {
      defaults: function(samjs) {
        return [
          {
            name: samjs.options[samjs.mongo.URI],
            isRequired: true,
            test: samjs.mongo.testConnection
          }
        ];
      }
    };
    plugin.startup = mongo.startup;
    plugin.shutdown = mongo.shutdown;
    return plugin;
  };

}).call(this);
