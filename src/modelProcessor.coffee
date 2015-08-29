# out: ../lib/modelProcessor.js

module.exports = (samjs,mongo) ->
  modelInterface = require("./modelInterface")(samjs, mongo.debug)
  return (model) ->
    throw new Error "mongo model needs a schema" unless model.schema?
    model.interfaces ?= {}
    model.interfaceGenerators ?= {}
    model.mutators ?= {}
    model.mutators.find ?= []
    model.mutators.update ?= []
    model.mutators.insert ?= []
    model.mutators.remove ?= []
    model.dbModels ?= {}
    if samjs.util.isFunction model.schema
      model.schema = model.schema(@mongoose.Schema)
    unless model.schema.paths? or model.schema.tree?
      model.schema = new @mongoose.Schema model.schema
    model.interfaceGenerators[model.name] = modelInterface
    model.startup = ->
      @dbModel = mongo.mongoose.model @name, @schema
      mongo.debug "model "+@name+" - loaded"
      for name, interfaceGenerator of @interfaceGenerators
        @interfaces[name] = interfaceGenerator()
      return samjs.Promise.resolve()
    model.processMutators = (query, socket, type) ->
      new Promise (resolve, reject) =>
        return reject() unless query? or socket? or type?
        for mutator in @mutators[type]
          try
            query = mutator.bind(@)(query, socket)
          catch
            return reject()
        return resolve(query)
    model.find = (query, socket, modelName) ->
      query = samjs.mongo.cleanQuery(query)
      @processMutators.bind(@)(query, socket, "find")
      .then (query) =>
        new Promise (resolve, reject) =>
          dbModel = if modelName then @dbModels[modelName] else @dbModel
          dbModel.find query.find, query.fields, query.options, (err, data) ->
            return reject err if err?
            resolve data

    model.count = (query, socket, modelName) ->
      query = samjs.mongo.cleanQuery(query)
      @processMutators.bind(@)(query, socket, "find")
      .then (query) =>
        new Promise (resolve, reject) =>
          dbModel = if modelName then @dbModels[modelName] else @dbModel
          dbModel.find(query.find, null, query.options).count (err, count) ->
            return reject err if err?
            resolve count
    model.insert = (query, socket, modelName) ->
      @processMutators.bind(@)(query, socket, "insert")
      .then (query) =>
        new Promise (resolve, reject) =>
          dbModel = if modelName then @dbModels[modelName] else @dbModel
          dbModel.create query, (err, obj) ->
            return reject err if err?
            resolve {_id: obj._id}
    model.update = (query, socket, modelName) ->
      @processMutators.bind(@)(query, socket, "update")
      .then (query) =>
        new Promise (resolve, reject) =>
          return reject() unless query.cond? and query.doc?
          dbModel = if modelName then @dbModels[modelName] else @dbModel
          dbModel.update query.cond, query.doc, (err) =>
            return reject err if err?
            @find.bind(@) {find: query.cond, fields: "_id"}, socket, modelName
            .then resolve
    model.remove = (query, socket, modelName) ->
      @processMutators.bind(@)(query, socket, "remove")
      .then (query) =>
        new Promise (resolve, reject) =>
          dbModel = if modelName then @dbModels[modelName] else @dbModel
          @find.bind(@) {find: query, fields: "_id"}, socket, modelName
          .then (results) ->
            if results.length > 0
              dbModel.remove query, (err) ->
                return reject err if err?
                resolve results
            else
              resolve []
          .catch reject
    for name, options of model.plugins
      throw new Error "#{name} mongo plugin not found" unless @_plugins[name]?
      model = @_plugins[name].bind(model)(options)
      unless samjs.util.isObject model
        throw new Error "mongo plugins need to return the model"
    return model
