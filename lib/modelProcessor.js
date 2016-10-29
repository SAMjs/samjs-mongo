(function() {
  var asyncHooks, syncHooks;

  asyncHooks = ["afterFind", "afterInsert", "afterUpdate", "afterDelete", "beforeFind", "beforeInsert", "beforeUpdate", "beforeDelete", "beforePopulate"];

  syncHooks = ["afterCreate", "beforeCreate"];

  module.exports = function(samjs, mongo) {
    return function(model) {
      var base, base1, base2, base3, base4, hook, hookName, i, j, len, len1, name, name1, options, ref, ref1, ref2;
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
      if (model.access == null) {
        model.access = {};
      }
      if (model.plugins == null) {
        model.plugins = {};
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
      mongo._hooks.beforeProcess(model);
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
      if ((base1 = model.access).insert == null) {
        base1.insert = model.access.write;
      }
      if ((base2 = model.access).update == null) {
        base2.update = model.access.write;
      }
      if ((base3 = model.access)["delete"] == null) {
        base3["delete"] = model.access.write;
      }
      if (model.populate != null) {
        model.populate = samjs.mongo.cleanPopulate(model.populate);
      }
      if (samjs.util.isFunction(model.schema)) {
        model.schema = model.schema(this.mongoose.Schema);
      }
      if (!(model.schema instanceof this.mongoose.Schema)) {
        model.schema = new this.mongoose.Schema(model.schema);
      }
      if ((base4 = model.interfaceGenerators)[name1 = model.name] == null) {
        base4[name1] = [];
      }
      model.dbModelGenerators[model.name] = function(addName) {
        if (addName == null) {
          addName = "";
        }
        name = addName ? addName + "." + this.name : this.name;
        return samjs.mongo.mongoose.model(name, this.schema);
      };
      model.startup = function() {
        var base5, interfaceGenerator, interfaceGenerators, interfaces, k, len2, ref3;
        this.dbModel = this.dbModelGenerators[this.name].bind(this)();
        mongo.debug("model " + this.name + " - loaded");
        ref3 = this.interfaceGenerators;
        for (name in ref3) {
          interfaceGenerators = ref3[name];
          interfaces = (base5 = this.interfaces)[name] != null ? base5[name] : base5[name] = [];
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
          var dbquery, populate, query;
          query = arg.query;
          dbquery = model.getDBModel(addName).find(query.find, query.fields, query.options);
          populate = query.populate;
          if (populate == null) {
            populate = model.populate;
          }
          if (populate) {
            return model._hooks.beforePopulate({
              socket: socket,
              populate: populate
            }).then(function(arg1) {
              var populate;
              populate = arg1.populate;
              return dbquery.populate(populate);
            });
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
                  console.log(err);
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
        if (query._id != null) {
          query = {
            cond: query._id,
            doc: query
          };
        }
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
          var dbModel, query;
          query = arg.query;
          dbModel = model.getDBModel(addName);
          return dbModel.find(query, "_id").then(function(result) {
            if (result.length > 0) {
              return dbModel.remove(query).then(function() {
                return result;
              });
            } else {
              return [];
            }
          });
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
                })["catch"](function(err) {
                  return {
                    success: false,
                    content: err != null ? err.message : void 0
                  };
                }).then(function(response) {
                  return socket.emit("delete." + request.token, response);
                });
              }
            };
          })(this));
        };
      });
      model._hooks.afterCreate();
      mongo._hooks.afterProcess(model);
      return model;
    };
  };

}).call(this);
