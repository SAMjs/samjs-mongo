(function() {
  var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  module.exports = function(samjs) {
    var Mongo, URI, debug, modelInterface, mongoose, name;
    mongoose = samjs.Promise.promisifyAll(require("mongoose"));
    debug = samjs.debug("mongo");
    name = "mongo";
    URI = "mongoURI";
    modelInterface = require("./modelInterface")(samjs, debug);
    return new (Mongo = (function() {
      function Mongo() {
        this.processModel = bind(this.processModel, this);
        this.plugins = bind(this.plugins, this);
        this.name = name;
        this.URI = URI;
        this._plugins = {};
      }

      Mongo.prototype.plugins = function(plugins) {
        var k, results1, v;
        results1 = [];
        for (k in plugins) {
          v = plugins[k];
          results1.push(this._plugins[k] = v);
        }
        return results1;
      };

      Mongo.prototype.processModel = function(model) {
        var base, base1, base2, base3, options, ref;
        if (model.schema == null) {
          throw new Error("mongo model needs a schema");
        }
        if (model.interfaces == null) {
          model.interfaces = {};
        }
        if (model.mutators == null) {
          model.mutators = {};
        }
        if ((base = model.mutators).find == null) {
          base.find = [];
        }
        if ((base1 = model.mutators).update == null) {
          base1.update = [];
        }
        if ((base2 = model.mutators).insert == null) {
          base2.insert = [];
        }
        if ((base3 = model.mutators).remove == null) {
          base3.remove = [];
        }
        model.schemaRaw = model.schema;
        model.schema = new mongoose.Schema(model.schema);
        ref = model.plugins;
        for (name in ref) {
          options = ref[name];
          model = this._plugins[name].bind(model)(options);
          if (!samjs.util.isObject(model)) {
            throw new Error("mongo plugins need to return the model");
          }
        }
        model.interfaces[model.name] = modelInterface;
        model.startup = function(connection) {
          this.dbModel = mongoose.model(this.name, this.schema);
          debug("model " + this.name + " - loaded");
          return samjs.Promise.resolve();
        };
        model.processMutators = function(query, socket, type) {
          return new Promise((function(_this) {
            return function(resolve, reject) {
              var i, len, mutator, ref1;
              if (!((query != null) || (socket != null) || (type != null))) {
                return reject();
              }
              ref1 = _this.mutators[type];
              for (i = 0, len = ref1.length; i < len; i++) {
                mutator = ref1[i];
                try {
                  query = mutator.bind(_this)(query, socket);
                } catch (_error) {
                  return reject();
                }
              }
              return resolve(query);
            };
          })(this));
        };
        model.find = function(query, socket) {
          query = samjs.mongo.cleanQuery(query);
          return this.processMutators.bind(this)(query, socket, "find").then((function(_this) {
            return function(query) {
              return new Promise(function(resolve, reject) {
                return _this.dbModel.find(query.find, query.fields, query.options, function(err, data) {
                  if (err != null) {
                    return reject(err);
                  }
                  return resolve(data);
                });
              });
            };
          })(this));
        };
        model.count = function(query, socket) {
          query = samjs.mongo.cleanQuery(query);
          return this.processMutators.bind(this)(query, socket, "find").then((function(_this) {
            return function(query) {
              return new Promise(function(resolve, reject) {
                return _this.dbModel.find(query.find, null, query.options).count(function(err, count) {
                  if (err != null) {
                    return reject(err);
                  }
                  return resolve(count);
                });
              });
            };
          })(this));
        };
        model.insert = function(query, socket) {
          return this.processMutators.bind(this)(query, socket, "insert").then((function(_this) {
            return function(query) {
              return new Promise(function(resolve, reject) {
                return _this.dbModel.create(query, function(err, obj) {
                  if (err != null) {
                    return reject(err);
                  }
                  return resolve({
                    _id: obj._id
                  });
                });
              });
            };
          })(this));
        };
        model.update = function(query, socket) {
          return this.processMutators.bind(this)(query, socket, "update").then((function(_this) {
            return function(query) {
              return new Promise(function(resolve, reject) {
                if (!((query.cond != null) && (query.doc != null))) {
                  return reject();
                }
                return _this.dbModel.update(query.cond, query.doc, function(err) {
                  if (err != null) {
                    return reject(err);
                  }
                  return _this.find.bind(_this)({
                    find: query.cond,
                    fields: "_id"
                  }, socket).then(resolve);
                });
              });
            };
          })(this));
        };
        model.remove = function(query, socket) {
          return this.processMutators.bind(this)(query, socket, "remove").then((function(_this) {
            return function(query) {
              return new Promise(function(resolve, reject) {
                return _this.find.bind(_this)({
                  find: query,
                  fields: "_id"
                }, socket).then(function(results) {
                  if (results.length > 0) {
                    return _this.dbModel.remove(query, function(err) {
                      if (err != null) {
                        return reject(err);
                      }
                      return resolve(results);
                    });
                  } else {
                    return resolve([]);
                  }
                });
              });
            };
          })(this));
        };
        return model;
      };

      Mongo.prototype.cleanQuery = function(query) {
        if (query == null) {
          return null;
        }
        if (!((query.find != null) && samjs.util.isObject(query.find))) {
          query.find = {};
        }
        if (query.fields != null) {
          if (samjs.util.isArray(query.fields)) {
            query.fields = query.fields.join(" ");
          } else if (!samjs.util.isString(query.fields)) {
            query.fields = null;
          }
        }
        if (!samjs.util.isObject(query.options)) {
          query.options = null;
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
          conn = mongoose.createConnection(string, options);
          conn.once("open", function() {
            return conn.db.listCollections().toArray(function(err, collections) {
              if (!err && collections.length === 0) {
                conn.db.dropDatabase();
              }
              return conn.close(function() {
                if (err) {
                  return reject(err);
                } else {
                  debug("mongoose connection to '" + string + "' successful");
                  return resolve("db:" + conn.name + ";collections:" + collections.length);
                }
              });
            });
          });
          return conn.on("error", function(err) {
            return debug("mongoose connection to '" + string + "' failed");
          });
        });
      };

      Mongo.prototype.startup = function() {
        debug("connecting with mongodb");
        return samjs.configs[samjs.options.mongoURI]._getBare().then(function(connectionString) {
          var conn;
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
