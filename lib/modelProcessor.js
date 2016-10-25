(function() {
  var asyncHooks, syncHooks;

  asyncHooks = ["afterFind", "afterInsert", "afterUpdate", "afterDelete", "beforeFind", "beforeInsert", "beforeUpdate", "beforeDelete"];

  syncHooks = ["afterCreate", "beforeCreate"];

  module.exports = function(samjs, mongo) {
    return function(model) {
      var base, base1, hook, hookName, i, j, len, len1, name, name1, options, ref, ref1, ref2;
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
      if (this._plugins.auth != null) {
        if (model.plugins.noAuth) {
          delete model.plugins.noAuth;
        } else {
          if ((base = model.plugins).auth == null) {
            base.auth = {};
          }
        }
      }
      ref = model.plugins;
      for (name in ref) {
        options = ref[name];
        if (this._plugins[name] == null) {
          throw new Error(name + " mongo plugin not found");
        }
        this._plugins[name].bind(model)(options);
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
      if ((base1 = model.interfaceGenerators)[name1 = model.name] == null) {
        base1[name1] = [];
      }
      model.dbModelGenerators[model.name] = function(addName) {
        if (addName == null) {
          addName = "";
        }
        name = addName ? addName + "." + this.name : this.name;
        return samjs.mongo.mongoose.model(name, this.schema);
      };
      model.startup = function() {
        var base2, interfaceGenerator, interfaceGenerators, interfaces, k, len2, ref3;
        this.dbModel = this.dbModelGenerators[this.name].bind(this)();
        mongo.debug("model " + this.name + " - loaded");
        ref3 = this.interfaceGenerators;
        for (name in ref3) {
          interfaceGenerators = ref3[name];
          interfaces = (base2 = this.interfaces)[name] != null ? base2[name] : base2[name] = [];
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
      model.find = function(query, socket, addName) {
        query = samjs.mongo.cleanQuery(query);
        return model._hooks.beforeFind({
          socket: socket,
          query: query
        }).then(function(arg) {
          var dbquery, query;
          query = arg.query;
          dbquery = model.getDBModel(addName).find(query.find, query.fields, query.options);
          if (query.populate) {
            dbquery.populate(query.populate);
          }
          if (query.distinct) {
            dbquery.distinct(query.distinct);
          }
          return dbquery;
        }).then(function(result) {
          return model._hooks.afterFind({
            result: result,
            socket: socket
          });
        });
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".find");
          return socket.on("find", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.find(request.content, socket, addName).then(function(arg) {
                  var result;
                  result = arg.result;
                  return {
                    success: true,
                    content: result
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
      model.count = function(query, socket, addName) {
        if (query == null) {
          query = {};
        }
        return model._hooks.beforeFind({
          socket: socket,
          query: {
            find: query
          }
        }).then(function(arg) {
          var query;
          query = arg.query;
          return model.getDBModel(addName).count(query.find, null, null);
        }).then(function(result) {
          return model._hooks.afterFind({
            result: result,
            socket: socket
          });
        });
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".count");
          return socket.on("count", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.count(request.content, socket, addName).then(function(arg) {
                  var result;
                  result = arg.result;
                  return {
                    success: true,
                    content: result
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
      model.insert = function(query, socket, addName) {
        return model._hooks.beforeInsert({
          socket: socket,
          query: query
        }).then(function(arg) {
          var query;
          query = arg.query;
          return model.getDBModel(addName).create(query);
        }).then(function(result) {
          return model._hooks.afterInsert({
            result: result,
            socket: socket
          });
        });
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".insert");
          return socket.on("insert", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.insert(request.content, socket, addName).then(function(arg) {
                  var result;
                  result = arg.result;
                  socket.broadcast.emit("inserted", result._id);
                  return {
                    success: true,
                    content: result
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
      model.update = function(query, socket, addName) {
        return model._hooks.beforeUpdate({
          socket: socket,
          query: query
        }).then(function(arg) {
          var query;
          query = arg.query;
          if (!((query.cond != null) && (query.doc != null))) {
            throw new Error;
          }
          return model.getDBModel(addName).find(query.cond, "_id");
        }).then(function(result) {
          return model.getDBModel(addName).update(query.cond, query.doc).then(function() {
            return model._hooks.afterUpdate({
              result: result,
              socket: socket
            });
          });
        });
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".update");
          return socket.on("update", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this.update(request.content, socket, addName).then(function(arg) {
                  var result;
                  result = arg.result;
                  socket.broadcast.emit("updated", result);
                  return {
                    success: true,
                    content: result
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
      model["delete"] = function(query, socket, addName) {
        return model._hooks.beforeDelete({
          socket: socket,
          query: query
        }).then(function(arg) {
          var query;
          query = arg.query;
          return model.find({
            find: query,
            fields: "_id"
          }, socket, addName);
        }).then(function(arg) {
          var result;
          result = arg.result;
          if (result.length > 0) {
            return model.getDBModel(addName).remove(query).then(function() {
              return result;
            });
          } else {
            return [];
          }
        }).then(function(result) {
          return model._hooks.afterDelete({
            result: result,
            socket: socket
          });
        });
      };
      model.interfaceGenerators[model.name].push(function(addName) {
        return function(socket) {
          mongo.debug("listening on " + this.name + ".delete");
          return socket.on("delete", (function(_this) {
            return function(request) {
              if ((request != null ? request.token : void 0) != null) {
                return _this["delete"](request.content, socket, addName).then(function(arg) {
                  var result;
                  result = arg.result;
                  if (result.length > 0) {
                    socket.broadcast.emit("deleted", result);
                  }
                  return {
                    success: true,
                    content: result
                  };
                })["catch"](function() {
                  return {
                    success: false,
                    content: typeof err !== "undefined" && err !== null ? err.message : void 0
                  };
                }).then(function(response) {
                  return socket.emit("delete." + request.token, response);
                });
              }
            };
          })(this));
        };
      });
      model.getPermission = function(path, permission) {
        return model.schema;
      };
      model._hooks.afterCreate();
      return model;
    };
  };

}).call(this);
