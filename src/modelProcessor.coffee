# out: ../lib/modelProcessor.js

asyncHooks = ["afterFind","afterInsert","afterUpdate","afterDelete",
    "beforeFind","beforeInsert","beforeUpdate","beforeDelete"]
syncHooks = ["afterCreate","beforeCreate"]

module.exports = (samjs,mongo) -> return (model) ->
  throw new Error "mongo model needs a schema" unless model.schema?
  samjs.helper.initiateHooks model, asyncHooks, syncHooks
  model.interfaces ?= {}
  model.interfaceGenerators ?= {}
  model.dbModelGenerators ?= {}
  model.dbModels ?= {}
  if @_plugins.auth?
    if model.plugins.noAuth
      delete model.plugins.noAuth
    else
      model.plugins.auth ?= {} # activate auth plugin by default if present
  for name, options of model.plugins
    throw new Error "#{name} mongo plugin not found" unless @_plugins[name]?
    @_plugins[name].bind(model)(options)

  for hookName in asyncHooks.concat(syncHooks)
    if model[hookName]?
      model[hookName] = [model[hookName]] unless samjs.util.isArray(model[hookName])
      model.addHook hookName, hook for hook in model[hookName]
  model._hooks.beforeCreate()
  if samjs.util.isFunction model.schema
    model.schema = model.schema(@mongoose.Schema)
  unless model.schema instanceof @mongoose.Schema
    model.schema = new @mongoose.Schema model.schema
  model.interfaceGenerators[model.name] ?= []
  model.dbModelGenerators[model.name] = (addName="") ->
    name = if addName then addName+"."+@name else @name
    return samjs.mongo.mongoose.model name,@schema

  model.startup = ->
    @dbModel = @dbModelGenerators[@name].bind(@)()
    mongo.debug "model "+@name+" - loaded"
    for name, interfaceGenerators of @interfaceGenerators
      interfaces = @interfaces[name] ?= []
      for interfaceGenerator in interfaceGenerators
        interfaces.push interfaceGenerator()
    return samjs.Promise.resolve()

  model.getDBModel = (addName) ->
    if addName
      model.dbModels[addName+"."+model.name]
    else
      model.dbModel

  model.find = (query, socket, addName) ->
    query = samjs.mongo.cleanQuery(query)
    model._hooks.beforeFind(socket: socket, query:query)
    .then ({query}) ->
      dbquery = model.getDBModel(addName).find query.find, query.fields, query.options
      if query.populate
        dbquery.populate(query.populate)
      if query.distinct
        dbquery.distinct(query.distinct)
      return dbquery
    .then (result) ->
      model._hooks.afterFind result: result, socket: socket

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".find"
    socket.on "find", (request) =>
      if request?.token?
        @find request.content, socket, addName
        .then ({result}) -> success:true , content:result
        .catch (err) -> success:false, content:err?.message
        .then (response) -> socket.emit "find.#{request.token}", response

  model.count = (query, socket, addName) ->
    query ?= {}
    model._hooks.beforeFind(socket: socket, query: find: query)
    .then ({query}) ->
      model.getDBModel(addName).count(query.find, null, null)
    .then (result) ->
      model._hooks.afterFind result: result, socket: socket

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".count"
    socket.on "count", (request) =>
      if request?.token?
        @count request.content, socket, addName
        .then ({result}) -> success:true , content:result
        .catch (err)  ->
          success:false, content:err?.message
        .then (response) -> socket.emit "count.#{request.token}", response

  model.insert = (query, socket, addName) ->
    model._hooks.beforeInsert(socket: socket, query:query)
    .then ({query}) ->
      model.getDBModel(addName).create query
    .then (result) ->
      model._hooks.afterInsert result: result, socket: socket

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".insert"
    socket.on "insert", (request) =>
      if request?.token?
        @insert request.content, socket, addName
        .then ({result}) ->
          socket.broadcast.emit "inserted", result._id
          return success: true, content: result
        .catch (err) -> success: false, content: err?.message
        .then (response) -> socket.emit "insert." + request.token, response

  model.update = (query, socket, addName) ->
    model._hooks.beforeUpdate(socket: socket, query:query)
    .then ({query}) ->
      throw new Error unless query.cond? and query.doc?
      model.getDBModel(addName).find query.cond, "_id"
    .then (result) ->
      model.getDBModel(addName).update query.cond, query.doc
      .then -> model._hooks.afterUpdate result: result, socket: socket

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".update"
    socket.on "update", (request) =>
      if request?.token?
        @update request.content, socket, addName
        .then ({result}) ->
          socket.broadcast.emit("updated",result)
          return success: true, content: result
        .catch (err) -> success: false, content: err?.message
        .then (response) -> socket.emit "update." + request.token, response

  model.delete = (query, socket, addName) ->
    model._hooks.beforeDelete(socket: socket, query:query)
    .then ({query}) ->
      model.find {find: query, fields: "_id"}, socket, addName
    .then ({result}) ->
      if result.length > 0
        return model.getDBModel(addName)
          .remove(query)
          .then ->
            return result
      else
        return []
    .then (result) -> model._hooks.afterDelete result: result, socket: socket

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".delete"
    socket.on "delete", (request) =>
      if request?.token?
        @delete request.content, socket, addName
        .then ({result}) ->
          if result.length > 0
            socket.broadcast.emit "deleted", result
          success: true, content: result
        .catch -> success: false, content: err?.message
        .then (response) -> socket.emit "delete." + request.token, response

  model.getPermission = (path, permission) ->
    model.schema

  model._hooks.afterCreate()

  return model
