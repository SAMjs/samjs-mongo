# out: ../lib/main.js
path = require "path"
module.exports = (samjs) ->
  mongoose = require("mongoose")
  mongoose.Promise = samjs.Promise
  debug = samjs.debug("mongo")
  cleanPopulate = (populates) ->
    cleanPopulateItem = (populateItem) ->
      if samjs.util.isString(populateItem)
        populateItem = path: populateItem
      return populateItem
    if samjs.util.isString(populates)
      populates = populates.split(" ")
    if samjs.util.isArray(populates)
      arr = []
      for populate in populates
        arr.push cleanPopulateItem(populate)
      populates = arr
    else
      populates = [cleanPopulateItem(populates)]
    return populates
  return new class Mongo
    constructor: ->
      samjs.helper.initiateHooks @, [], ["afterProcess","beforeProcess"]
      @mongoose = mongoose
      @mongoose.options.pluralization = false
      @name = "mongo"
      @configs = [{
        name: "mongoURI"
        isRequired: true
        test: @testConnection
        installComp:
          paths: [path.resolve(__dirname, "./setConnection")]
          icons: ["material-device_hub"]
      }]
      @_plugins = {}
      @processModel = require("./modelProcessor")(samjs,@)
    plugins: (plugins) ->
      for k,v of plugins
        @_plugins[k] = v
    cleanPopulate: cleanPopulate
    cleanQuery: (query) ->
      return null unless query?
      query.find = {} unless query.find? and samjs.util.isObject(query.find)
      if samjs.util.isArray(query.fields)
        query.fields = query.fields.join(" ")
      else unless samjs.util.isString(query.fields)
        query.fields = null
      unless samjs.util.isObject(query.options)
        query.options = null
      if query.populate?
        query.populate = cleanPopulate(query.populate)

      return query
    debug: (name) ->
      samjs.debug("mongo:#{name}")
    testConnection: (string) ->
      debug "testing mongoose connection to '#{string}'"
      options =
        promiseLibrary: samjs.Promise
        server:
          auto_reconnect: false
          socketOptions:
            connectTimeoutMS: 200
      return new samjs.Promise (resolve,reject) ->
        reject() if not string
        conn = mongoose.createConnection()
        conn.open string, options, (err,db) ->
          if err?
            debug "mongoose connection to '#{string}' failed"
            return reject(err)
          conn.db.listCollections().toArray (err,collections) ->
            close = ->
              conn.close ->
                if err
                  reject(err)
                else
                  debug "mongoose connection to '#{string}' successful"
                  resolve "db:#{conn.name};collections:#{collections.length}"
            if not err and collections.length == 0
              conn.db.dropDatabase(close)
            else
              close()


    startup: ->
      debug "connecting with mongodb"
      samjs.configs.mongoURI._getBare()
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
      mongoose.models = []
      if mongoose.connection.readyState? == 0
        debug "mongoose connection already closed"
        return Promise.resolve()
      return new Promise (resolve) ->
        mongoose.connection.once "close", ->
          debug "mongoose connection closed"
          resolve()
        mongoose.connection.close()
