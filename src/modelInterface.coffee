# out: ../lib/modelInterface.js
module.exports = (samjs, debug) -> return (socket) ->
  #debug "listening on "+ @name + ".schema"
  #socket.on "schema", (request) =>
#    if socket.client.auth?.getGroup?
#      group = socket.client.auth?.getGroup()
#      if request?.token? and group == samjs.options.groupRoot
#        response = success: true, content: @schemaRaw
#        socket.emit "schema.#{request.token}", response

  debug "listening on "+ @name + ".find"
  socket.on "find", (request) =>
    if request?.token?
      @find request.content, socket
      .then (data) -> success:true , content:data
      .catch (err) -> success:false, content:undefined
      .then (response) -> socket.emit "find.#{request.token}", response

  debug "listening on "+ @name + ".count"
  socket.on "count", (request) =>
    if request?.token?
      @count request.content, socket
      .then (count) -> success:true , content:count
      .catch (err)  -> success:false, content:undefined
      .then (response) -> socket.emit "count.#{request.token}", response

  debug "listening on "+ @name + ".insert"
  socket.on "insert", (request) =>
    if request?.token?
      @insert request.content, socket
      .then (modelObj) ->
        socket.broadcast.emit "inserted", modelObj._id
        return success: true, content: modelObj
      .catch (err) -> success: false, content: undefined
      .then (response) -> socket.emit "insert." + request.token, response

  debug "listening on "+ @name + ".update"
  socket.on "update", (request) =>
    if request?.token?
      @update request.content, socket
      .then (modelObj) ->
        socket.broadcast.emit("updated",modelObj._id)
        return success: true, content: modelObj
      .catch (err) -> success: false, content: undefined
      .then (response) -> socket.emit "update." + request.token, response

  debug "listening on "+ @name + ".remove"
  socket.on "remove", (request) =>
    if request?.token?
      @remove request.content, socket
      .then (id) ->
        socket.broadcast.emit "removed", id
        success: true, content: id
      .catch -> success: false, content: undefined
      .then (response) -> socket.emit "remove." + request.token, response
