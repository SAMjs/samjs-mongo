# out: ../lib/mongo.js

module.exports = (samjs) ->
  mongoose = samjs.Promise.promisifyAll(require("mongoose"))
  debug = samjs.debug("mongo")
  name = "mongo"
  URI = "mongoURI"
  modelInterface = require("./modelInterface")(samjs, debug)
  return new class Mongo
    constructor: ->
      @name = name
      @URI = URI
      @_plugins = {}
    plugins: (plugins) =>
      for k,v of plugins
        @_plugins[k] = v
    processModel: (model) =>
      throw new Error "mongo model needs a schema" unless model.schema?
      model.interfaces ?= {}
      model.mutators ?= {}
      model.mutators.find ?= []
      model.mutators.update ?= []
      model.mutators.insert ?= []
      model.mutators.remove ?= []
      model.schemaRaw = model.schema
      model.schema = new mongoose.Schema model.schema
      for name, options of model.plugins
        model = @_plugins[name].bind(model)(options)
        unless samjs.util.isObject model
          throw new Error "mongo plugins need to return the model"
      model.interfaces[model.name] = modelInterface


      model.startup = (connection) ->
        @dbModel = mongoose.model @name, @schema
        debug "model "+@name+" - loaded"
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
      model.find = (query, socket) ->
        query = samjs.mongo.cleanQuery(query)
        @processMutators.bind(@)(query, socket, "find")
        .then (query) =>
          new Promise (resolve, reject) =>
            @dbModel.find query.find, query.fields, query.options, (err, data) ->
              return reject err if err?
              resolve data

      model.count = (query, socket) ->
        query = samjs.mongo.cleanQuery(query)
        @processMutators.bind(@)(query, socket, "find")
        .then (query) =>
          new Promise (resolve, reject) =>
            @dbModel.find(query.find, null, query.options).count (err, count) ->
              return reject err if err?
              resolve count
      model.insert = (query, socket) ->
        @processMutators.bind(@)(query, socket, "insert")
        .then (query) =>
          new Promise (resolve, reject) =>
            @dbModel.create query, (err, obj) ->
              return reject err if err?
              resolve {_id: obj._id}
      model.update = (query, socket) ->
        @processMutators.bind(@)(query, socket, "update")
        .then (query) =>
          new Promise (resolve, reject) =>
            return reject() unless query.cond? and query.doc?
            @dbModel.update query.cond, query.doc, (err) =>
              return reject err if err?
              @find.bind(@) {find: query.cond, fields: "_id"}, socket
              .then resolve
      model.remove = (query, socket) ->
        @processMutators.bind(@)(query, socket, "remove")
        .then (query) =>
          new Promise (resolve, reject) =>
            @find.bind(@) {find: query, fields: "_id"}, socket
            .then (results) =>
              if results.length > 0
                @dbModel.remove query, (err) ->
                  return reject err if err?
                  resolve results
              else
                resolve []
      return model
    cleanQuery: (query) ->
      return null unless query?
      query.find = {} unless query.find? and samjs.util.isObject(query.find)
      if query.fields?
        if samjs.util.isArray(query.fields)
          query.fields = query.fields.join(" ")
        else unless samjs.util.isString(query.fields)
          query.fields = null
      unless samjs.util.isObject(query.options)
        query.options = null
      return query
    debug: (name) ->
      samjs.debug("mongo:#{name}")
    testConnection: (string) ->
      debug "testing mongoose connection to '#{string}'"
      options =
        server:
          auto_reconnect: false
          socketOptions:
            connectTimeoutMS: 200
      return new samjs.Promise (resolve,reject) ->
        reject() if not string
        conn =  mongoose.createConnection string, options
        conn.once "open", ->
          conn.db.listCollections().toArray (err,collections) ->
            conn.db.dropDatabase() if not err and collections.length == 0
            conn.close ->
              if err
                reject(err)
              else
                debug "mongoose connection to '#{string}' successful"
                resolve "db:#{conn.name};collections:#{collections.length}"
        conn.on "error", (err) ->
          debug "mongoose connection to '#{string}' failed"
    startup: ->
      debug "connecting with mongodb"
      samjs.configs[samjs.options.mongoURI]._getBare()
      .then (connectionString) ->
        conn = mongoose.connection
        return new Promise (resolve, reject) ->
          conn.once "open", ->
            debug "connected successfully with mongodb"
            resolve()
          conn.once "error", (err) ->
            debug "connecting failed with mongodb"
            reject(err)
          mongoose.connect(connectionString)
    shutdown: ->
      debug "closing mongoose connection"
      if mongoose.connection.readyState? == 0
        debug "mongoose connection already closed"
        return Promise.resolve()
      return new Promise (resolve) ->
        mongoose.connection.once "close", ->
          debug "mongoose connection closed"
          resolve()
        mongoose.connection.close()
