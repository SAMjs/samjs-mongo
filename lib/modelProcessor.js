(function() {
  module.exports = function(samjs, mongo) {
    var modelInterface;
    modelInterface = require("./modelInterface")(samjs, mongo.debug);
    return function(model) {
      var base, base1, base2, base3, name, options, ref;
      if (model.schema == null) {
        throw new Error("mongo model needs a schema");
      }
      if (model.interfaces == null) {
        model.interfaces = {};
      }
      if (model.interfaceGenerators == null) {
        model.interfaceGenerators = {};
      }
      if (model.dbModelGenerators == null) {
        model.dbModelGenerators = {};
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
      if (model.dbModels == null) {
        model.dbModels = {};
      }
      if (samjs.util.isFunction(model.schema)) {
        model.schema = model.schema(this.mongoose.Schema);
      }
      if (!(model.schema instanceof this.mongoose.Schema)) {
        model.schema = new this.mongoose.Schema(model.schema);
      }
      model.interfaceGenerators[model.name] = modelInterface;
      model.dbModelGenerators[model.name] = function(addName) {
        var name;
        if (addName == null) {
          addName = "";
        }
        name = addName ? addName + "." + this.name : this.name;
        return samjs.mongo.mongoose.model(name, this.schema);
      };
      model.startup = function() {
        var interfaceGenerator, name, ref;
        this.dbModel = this.dbModelGenerators[this.name].bind(this)();
        mongo.debug("model " + this.name + " - loaded");
        ref = this.interfaceGenerators;
        for (name in ref) {
          interfaceGenerator = ref[name];
          this.interfaces[name] = interfaceGenerator();
        }
        return samjs.Promise.resolve();
      };
      model.processMutators = function(query, socket, type) {
        return new Promise((function(_this) {
          return function(resolve, reject) {
            var i, len, mutator, ref;
            if (!((query != null) || (socket != null) || (type != null))) {
              return reject();
            }
            ref = _this.mutators[type];
            for (i = 0, len = ref.length; i < len; i++) {
              mutator = ref[i];
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
      model.find = function(query, socket, addName) {
        query = samjs.mongo.cleanQuery(query);
        return this.processMutators.bind(this)(query, socket, "find").then((function(_this) {
          return function(query) {
            return new Promise(function(resolve, reject) {
              var dbModel;
              dbModel = addName ? _this.dbModels[addName + "." + _this.name] : _this.dbModel;
              return dbModel.find(query.find, query.fields, query.options, function(err, data) {
                if (err != null) {
                  return reject(err);
                }
                return resolve(data);
              });
            });
          };
        })(this));
      };
      model.count = function(query, socket, addName) {
        query = samjs.mongo.cleanQuery(query);
        return this.processMutators.bind(this)(query, socket, "find").then((function(_this) {
          return function(query) {
            return new Promise(function(resolve, reject) {
              var dbModel;
              dbModel = addName ? _this.dbModels[addName + "." + _this.name] : _this.dbModel;
              return dbModel.find(query.find, null, query.options).count(function(err, count) {
                if (err != null) {
                  return reject(err);
                }
                return resolve(count);
              });
            });
          };
        })(this));
      };
      model.insert = function(query, socket, addName) {
        return this.processMutators.bind(this)(query, socket, "insert").then((function(_this) {
          return function(query) {
            return new Promise(function(resolve, reject) {
              var dbModel;
              dbModel = addName ? _this.dbModels[addName + "." + _this.name] : _this.dbModel;
              return dbModel.create(query, function(err, obj) {
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
      model.update = function(query, socket, addName) {
        return this.processMutators.bind(this)(query, socket, "update").then((function(_this) {
          return function(query) {
            return new Promise(function(resolve, reject) {
              var dbModel;
              if (!((query.cond != null) && (query.doc != null))) {
                return reject();
              }
              dbModel = addName ? _this.dbModels[addName + "." + _this.name] : _this.dbModel;
              return dbModel.update(query.cond, query.doc, function(err) {
                if (err != null) {
                  return reject(err);
                }
                return _this.find.bind(_this)({
                  find: query.cond,
                  fields: "_id"
                }, socket, addName).then(resolve);
              });
            });
          };
        })(this));
      };
      model.remove = function(query, socket, addName) {
        return this.processMutators.bind(this)(query, socket, "remove").then((function(_this) {
          return function(query) {
            return new Promise(function(resolve, reject) {
              var dbModel;
              dbModel = addName ? _this.dbModels[addName + "." + _this.name] : _this.dbModel;
              return _this.find.bind(_this)({
                find: query,
                fields: "_id"
              }, socket, addName).then(function(results) {
                if (results.length > 0) {
                  return dbModel.remove(query, function(err) {
                    if (err != null) {
                      return reject(err);
                    }
                    return resolve(results);
                  });
                } else {
                  return resolve([]);
                }
              })["catch"](reject);
            });
          };
        })(this));
      };
      ref = model.plugins;
      for (name in ref) {
        options = ref[name];
        if (this._plugins[name] == null) {
          throw new Error(name + " mongo plugin not found");
        }
        model = this._plugins[name].bind(model)(options);
        if (!samjs.util.isObject(model)) {
          throw new Error("mongo plugins need to return the model");
        }
      }
      return model;
    };
  };

}).call(this);
