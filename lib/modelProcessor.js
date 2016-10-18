(function() {
  var asyncHooks, syncHooks;

  asyncHooks = ["afterFind", "afterInsert", "afterUpdate", "afterRemove", "beforeFind", "beforeInsert", "beforeUpdate", "beforeRemove"];

  syncHooks = ["afterCreate", "beforeCreate"];

  module.exports = function(samjs, mongo) {
    return function(model) {
      var base, hasAuth, hasNoAuth, hook, hookName, i, j, len, len1, name, name1, options, ref, ref1, ref2;
      if (model.schema == null) {
        throw new Error("mongo model needs a schema");
      }
      samjs.helper.initiateHooks(model, asyncHooks, syncHooks);
      if (model.interfaces == null) {
        model.interfaces = {};
      }
      if (model.interfaceGenerators == null) {
        model.interfaceGenerators = {};
      }
      if (model.dbModelGenerators == null) {
        model.dbModelGenerators = {};
      }
      if (model.dbModels == null) {
        model.dbModels = {};
      }
      hasNoAuth = false;
      hasAuth = false;
      ref = model.plugins;
      for (name in ref) {
        options = ref[name];
        if (this._plugins[name] == null) {
          throw new Error(name + " mongo plugin not found");
        }
        this._plugins[name].bind(model)(options);
        if (!samjs.util.isObject(model)) {
          throw new Error("mongo plugins need to return the model");
        }
        if (name === "noAuth") {
          hasNoAuth = true;
        }
        if (name === "auth") {
          hasAuth = true;
        }
      }
      if ((this._plugins.auth != null) && !hasAuth && !hasNoAuth) {
        this._plugins.auth.bind(model)({});
      }
      ref1 = asyncHooks.concat(syncHooks);
      for (i = 0, len = ref1.length; i < len; i++) {
        hookName = ref1[i];
        if (model[hookName] != null) {
          if (!samjs.util.isArray(model[hookName])) {
            model[hookName] = [model[hookName]];
          }
          ref2 = model[hookName];
          for (j = 0, len1 = ref2.length; j < len1; j++) {
            hook = ref2[j];
            model.addHook(hookName, hook);
          }
        }
      }
      model._hooks.beforeCreate();
      if (samjs.util.isFunction(model.schema)) {
        model.schema = model.schema(this.mongoose.Schema);
      }
      if (!(model.schema instanceof this.mongoose.Schema)) {
        model.schema = new this.mongoose.Schema(model.schema);
      }
      if ((base = model.interfaceGenerators)[name1 = model.name] == null) {
        base[name1] = [];
      }
      model.dbModelGenerators[model.name] = function(addName) {
        if (addName == null) {
          addName = "";
        }
        name = addName ? addName + "." + this.name : this.name;
        return samjs.mongo.mongoose.model(name, this.schema);
      };
      model.startup = function() {
        var base1, interfaceGenerator, interfaceGenerators, interfaces, k, len2, ref3;
        this.dbModel = this.dbModelGenerators[this.name].bind(this)();
        mongo.debug("model " + this.name + " - loaded");
        ref3 = this.interfaceGenerators;
        for (name in ref3) {
          interfaceGenerators = ref3[name];
          interfaces = (base1 = this.interfaces)[name] != null ? base1[name] : base1[name] = [];
          for (k = 0, len2 = interfaceGenerators.length; k < len2; k++) {
            interfaceGenerator = interfaceGenerators[k];
            interfaces.push(interfaceGenerator());
          }
        }
        return samjs.Promise.resolve();
      };
      model.getDBModel = function(addName) {
        if (addName) {
          return model.dbModels[addName + "." + model.name];
        } else {
          return model.dbModel;
        }
      };
      model.find = function(query, client, addName) {
        query = samjs.mongo.cleanQuery(query);
        return model._hooks.beforeFind({
          client: client,
          query: query
        }).then(function(arg) {
          var dbquery, query;
          query = arg.query;
          dbquery = model.getDBModel(addName).find(query.find, query.fields, query.options);
          if (query.populate) {
            dbquery.populate(query.populate);
          }
          return dbquery;
        }).then(model._hooks.afterFind);
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".find");
          return socket.on("find", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.find(request.content, socket.client, addName).then(function(data) {
                  return {
                    success: true,
                    content: data
                  };
                })["catch"](function(err) {
                  return {
                    success: false,
                    content: err != null ? err.message : void 0
                  };
                }).then(function(response) {
                  return socket.emit("find." + request.token, response);
                });
              }
            };
          })(this));
        };
      });
      model.count = function(query, client, addName) {
        if (query == null) {
          query = {};
        }
        return model._hooks.beforeFind({
          client: client,
          query: {
            find: query
          }
        }).then(function(arg) {
          var query;
          query = arg.query;
          return model.getDBModel(addName).count(query.find, null, null);
        }).then(model._hooks.afterFind);
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".count");
          return socket.on("count", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.count(request.content, socket.client, addName).then(function(count) {
                  return {
                    success: true,
                    content: count
                  };
                })["catch"](function(err) {
                  return {
                    success: false,
                    content: err != null ? err.message : void 0
                  };
                }).then(function(response) {
                  return socket.emit("count." + request.token, response);
                });
              }
            };
          })(this));
        };
      });
      model.insert = function(query, client, addName) {
        return model._hooks.beforeInsert({
          client: client,
          query: query
        }).then(function(arg) {
          var query;
          query = arg.query;
          return model.getDBModel(addName).create(query);
        }).then(model._hooks.afterInsert);
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".insert");
          return socket.on("insert", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.insert(request.content, socket.client, addName).then(function(modelObj) {
                  socket.broadcast.emit("inserted", modelObj._id);
                  return {
                    success: true,
                    content: modelObj
                  };
                })["catch"](function(err) {
                  return {
                    success: false,
                    content: err != null ? err.message : void 0
                  };
                }).then(function(response) {
                  return socket.emit("insert." + request.token, response);
                });
              }
            };
          })(this));
        };
      });
      model.update = function(query, client, addName) {
        return model._hooks.beforeUpdate({
          client: client,
          query: query
        }).then(function(arg) {
          var query;
          query = arg.query;
          if (!((query.cond != null) && (query.doc != null))) {
            throw new Error;
          }
          return model.getDBModel(addName).find(query.cond, "_id");
        }).then(function(results) {
          return model.getDBModel(addName).update(query.cond, query.doc).then(function() {
            return results;
          });
        }).then(model._hooks.afterUpdate);
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".update");
          return socket.on("update", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.update(request.content, socket.client, addName).then(function(objects) {
                  socket.broadcast.emit("updated", objects);
                  return {
                    success: true,
                    content: objects
                  };
                })["catch"](function(err) {
                  return {
                    success: false,
                    content: err != null ? err.message : void 0
                  };
                }).then(function(response) {
                  return socket.emit("update." + request.token, response);
                });
              }
            };
          })(this));
        };
      });
      model.remove = function(query, client, addName) {
        return model._hooks.beforeRemove({
          client: client,
          query: query
        }).then(function(arg) {
          var query;
          query = arg.query;
          return model.find({
            find: query,
            fields: "_id"
          }, client, addName);
        }).then(function(results) {
          if (results.length > 0) {
            return model.getDBModel(addName).remove(query).then(function() {
              return results;
            });
          } else {
            return [];
          }
        }).then(model._hooks.afterRemove);
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".remove");
          return socket.on("remove", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.remove(request.content, socket.client, addName).then(function(ids) {
                  if (ids.length > 0) {
                    socket.broadcast.emit("removed", ids);
                  }
                  return {
                    success: true,
                    content: ids
                  };
                })["catch"](function() {
                  return {
                    success: false,
                    content: typeof err !== "undefined" && err !== null ? err.message : void 0
                  };
                }).then(function(response) {
                  return socket.emit("remove." + request.token, response);
                });
              }
            };
          })(this));
        };
      });
      model._hooks.afterCreate();
      return model;
    };
  };

}).call(this);
