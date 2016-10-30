(function() {
  var path;

  path = require("path");

  module.exports = function(samjs) {
    var Mongo, cleanPopulate, debug, mongoose;
    mongoose = require("mongoose");
    mongoose.Promise = samjs.Promise;
    debug = samjs.debug("mongo");
    cleanPopulate = function(populates) {
      var arr, cleanPopulateItem, i, len, populate;
      cleanPopulateItem = function(populateItem) {
        if (samjs.util.isString(populateItem)) {
          populateItem = {
            path: populateItem
          };
        }
        return populateItem;
      };
      if (samjs.util.isString(populates)) {
        populates = populates.split(" ");
      }
      if (samjs.util.isArray(populates)) {
        arr = [];
        for (i = 0, len = populates.length; i < len; i++) {
          populate = populates[i];
          arr.push(cleanPopulateItem(populate));
        }
        populates = arr;
      } else {
        populates = [cleanPopulateItem(populates)];
      }
      return populates;
    };
    return new (Mongo = (function() {
      function Mongo() {
        samjs.helper.initiateHooks(this, [], ["afterProcess", "beforeProcess"]);
        this.mongoose = mongoose;
        this.mongoose.options.pluralization = false;
        this.name = "mongo";
        this.configs = [
          {
            name: "mongoURI",
            isRequired: true,
            test: this.testConnection,
            installComp: {
              paths: [path.resolve(__dirname, "./setConnection")],
              icons: ["material-device_hub"]
            }
          }
        ];
        this._plugins = {};
        this.processModel = require("./modelProcessor")(samjs, this);
      }

      Mongo.prototype.plugins = function(plugins) {
        var k, results, v;
        results = [];
        for (k in plugins) {
          v = plugins[k];
          results.push(this._plugins[k] = v);
        }
        return results;
      };

      Mongo.prototype.cleanPopulate = cleanPopulate;

      Mongo.prototype.cleanQuery = function(query) {
        if (query == null) {
          return null;
        }
        if (!((query.find != null) && samjs.util.isObject(query.find))) {
          query.find = {};
        }
        if (samjs.util.isArray(query.fields)) {
          query.fields = query.fields.join(" ");
        } else if (!samjs.util.isString(query.fields)) {
          query.fields = null;
        }
        if (!samjs.util.isObject(query.options)) {
          query.options = null;
        }
        if (query.populate != null) {
          query.populate = cleanPopulate(query.populate);
        }
        return query;
      };

      Mongo.prototype.debug = function(name) {
        return samjs.debug("mongo:" + name);
      };

      Mongo.prototype.testConnection = function(string) {
        var options;
        debug("testing mongoose connection to '" + string + "'");
        options = {
          promiseLibrary: samjs.Promise,
          server: {
            auto_reconnect: false,
            socketOptions: {
              connectTimeoutMS: 200
            }
          }
        };
        return new samjs.Promise(function(resolve, reject) {
          var conn;
          if (!string) {
            reject();
          }
          conn = mongoose.createConnection();
          return conn.open(string, options, function(err, db) {
            if (err != null) {
              debug("mongoose connection to '" + string + "' failed");
              return reject(err);
            }
            return conn.db.listCollections().toArray(function(err, collections) {
              var close;
              close = function() {
                return conn.close(function() {
                  if (err) {
                    return reject(err);
                  } else {
                    debug("mongoose connection to '" + string + "' successful");
                    return resolve("db:" + conn.name + ";collections:" + collections.length);
                  }
                });
              };
              if (!err && collections.length === 0) {
                return conn.db.dropDatabase(close);
              } else {
                return close();
              }
            });
          });
        });
      };

      Mongo.prototype.startup = function() {
        debug("connecting with mongodb");
        return samjs.configs.mongoURI._getBare().then(function(connectionString) {
          var conn;
          if ((mongoose.connection.readyState != null) === 1) {
            return;
          }
          conn = mongoose.connection;
          return new Promise(function(resolve, reject) {
            conn.once("open", function() {
              debug("connected successfully with mongodb");
              return resolve();
            });
            conn.once("error", function(err) {
              debug("connecting failed with mongodb");
              return reject(err);
            });
            return mongoose.connect(connectionString);
          });
        });
      };

      Mongo.prototype.shutdown = function() {
        debug("closing mongoose connection");
        mongoose.models = [];
        if ((mongoose.connection.readyState != null) === 0) {
          debug("mongoose connection already closed");
          return Promise.resolve();
        }
        return new Promise(function(resolve) {
          mongoose.connection.once("close", function() {
            debug("mongoose connection closed");
            return resolve();
          });
          return mongoose.connection.close();
        });
      };

      return Mongo;

    })());
  };

}).call(this);
