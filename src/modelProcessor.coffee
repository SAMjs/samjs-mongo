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
  hasNoAuth = false
  hasAuth = false
  for name, options of model.plugins
    throw new Error "#{name} mongo plugin not found" unless @_plugins[name]?
    @_plugins[name].bind(model)(options)
    unless samjs.util.isObject model
      throw new Error "mongo plugins need to return the model"
    if name == "noAuth"
      hasNoAuth = true
    if name == "auth"
      hasAuth = true
  # activate auth plugin by default if present
  if @_plugins.auth? and not hasAuth and not hasNoAuth
    @_plugins.auth.bind(model)({})
  model.insert ?= model.write
  model.update ?= model.write
  model.delete ?= model.write
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

  model.find = (query, client, addName) ->
    query = samjs.mongo.cleanQuery(query)
    model._hooks.beforeFind(client: client, query:query)
    .then ({query}) ->
      dbquery = model.getDBModel(addName).find query.find, query.fields, query.options
      if query.populate
        dbquery.populate(query.populate)
      return dbquery
    .then model._hooks.afterFind

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".find"
    socket.on "find", (request) =>
      if request?.token?
        @find request.content, socket.client, addName
        .then (data) -> success:true , content:data
        .catch (err) -> success:false, content:err?.message
        .then (response) -> socket.emit "find.#{request.token}", response

  model.count = (query, client, addName) ->
    query ?= {}
    model._hooks.beforeFind(client: client, query: find: query)
    .then ({query}) ->
      model.getDBModel(addName).count(query.find, null, null)
    .then model._hooks.afterFind

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".count"
    socket.on "count", (request) =>
      if request?.token?
        @count request.content, socket.client, addName
        .then (count) -> success:true , content:count
        .catch (err)  ->
          success:false, content:err?.message
        .then (response) -> socket.emit "count.#{request.token}", response

  model.insert = (query, client, addName) ->
    model._hooks.beforeInsert(client: client, query:query)
    .then ({query}) ->
      model.getDBModel(addName).create query
    .then model._hooks.afterInsert

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".insert"
    socket.on "insert", (request) =>
      if request?.token?
        @insert request.content, socket.client, addName
        .then (modelObj) ->
          socket.broadcast.emit "inserted", modelObj._id
          return success: true, content: modelObj
        .catch (err) -> success: false, content: err?.message
        .then (response) -> socket.emit "insert." + request.token, response

  model.update = (query, client, addName) ->
    model._hooks.beforeUpdate(client: client, query:query)
    .then ({query}) ->
      throw new Error unless query.cond? and query.doc?
      model.getDBModel(addName).find query.cond, "_id"
    .then (results) ->
      model.getDBModel(addName).update query.cond, query.doc
      .then -> return results
    .then model._hooks.afterUpdate

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".update"
    socket.on "update", (request) =>
      if request?.token?
        @update request.content, socket.client, addName
        .then (objects) ->
          socket.broadcast.emit("updated",objects)
          return success: true, content: objects
        .catch (err) -> success: false, content: err?.message
        .then (response) -> socket.emit "update." + request.token, response

  model.delete = (query, client, addName) ->
    model._hooks.beforeDelete(client: client, query:query)
    .then ({query}) ->
      model.find {find: query, fields: "_id"}, client, addName
    .then (results) ->
      if results.length > 0
        return model.getDBModel(addName)
          .remove(query)
          .then ->
            return results
      else
        return []
    .then model._hooks.afterDelete

  model.interfaceGenerators[model.name].push (addName) -> return (socket) ->
    mongo.debug "listening on "+ @name + ".delete"
    socket.on "delete", (request) =>
      if request?.token?
        @delete request.content, socket.client, addName
        .then (ids) ->
          if ids.length > 0
            socket.broadcast.emit "deleted", ids
          success: true, content: ids
        .catch -> success: false, content: err?.message
        .then (response) -> socket.emit "delete." + request.token, response

  model.getPermission = (path, permission) ->
    model.schema

  model._hooks.afterCreate()

  return model
