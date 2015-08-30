# out: ../lib/mongo.js

module.exports = (samjs) ->
  mongoose = samjs.Promise.promisifyAll(require("mongoose"))
  debug = samjs.debug("mongo")
  name = "mongo"
  URI = "mongoURI"
  return new class Mongo
    constructor: ->
      @mongoose = mongoose
      @mongoose.options.pluralization = false
      @name = name
      @URI = URI
      @_plugins = {}
      @processModel = require("./modelProcessor")(samjs,@).bind(@)
    plugins: (plugins) =>
      for k,v of plugins
        @_plugins[k] = v
    cleanQuery: (query) ->
      return null unless query?
      query.find = {} unless query.find? and samjs.util.isObject(query.find)
      if samjs.util.isArray(query.fields)
        query.fields = query.fields.join(" ")
      else unless samjs.util.isString(query.fields)
        query.fields = ""
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
          reject(err)
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
