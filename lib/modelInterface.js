(function() {
  module.exports = function(samjs, debug) {
    return function(socket) {
      debug("listening on " + this.name + ".find");
      socket.on("find", (function(_this) {
        return function(request) {
          if ((request != null ? request.token : void 0) != null) {
            return _this.find(request.content, socket).then(function(data) {
              return {
                success: true,
                content: data
              };
            })["catch"](function(err) {
              return {
                success: false,
                content: void 0
              };
            }).then(function(response) {
              return socket.emit("find." + request.token, response);
            });
          }
        };
      })(this));
      debug("listening on " + this.name + ".count");
      socket.on("count", (function(_this) {
        return function(request) {
          if ((request != null ? request.token : void 0) != null) {
            return _this.count(request.content, socket).then(function(count) {
              return {
                success: true,
                content: count
              };
            })["catch"](function(err) {
              return {
                success: false,
                content: void 0
              };
            }).then(function(response) {
              return socket.emit("count." + request.token, response);
            });
          }
        };
      })(this));
      debug("listening on " + this.name + ".insert");
      socket.on("insert", (function(_this) {
        return function(request) {
          if ((request != null ? request.token : void 0) != null) {
            return _this.insert(request.content, socket).then(function(modelObj) {
              socket.broadcast.emit("inserted", modelObj._id);
              return {
                success: true,
                content: modelObj
              };
            })["catch"](function(err) {
              return {
                success: false,
                content: void 0
              };
            }).then(function(response) {
              return socket.emit("insert." + request.token, response);
            });
          }
        };
      })(this));
      debug("listening on " + this.name + ".update");
      socket.on("update", (function(_this) {
        return function(request) {
          if ((request != null ? request.token : void 0) != null) {
            return _this.update(request.content, socket).then(function(modelObj) {
              socket.broadcast.emit("updated", modelObj._id);
              return {
                success: true,
                content: modelObj
              };
            })["catch"](function(err) {
              return {
                success: false,
                content: void 0
              };
            }).then(function(response) {
              return socket.emit("update." + request.token, response);
            });
          }
        };
      })(this));
      debug("listening on " + this.name + ".remove");
      return socket.on("remove", (function(_this) {
        return function(request) {
          if ((request != null ? request.token : void 0) != null) {
            return _this.remove(request.content, socket).then(function(id) {
              socket.broadcast.emit("removed", id);
              return {
                success: true,
                content: id
              };
            })["catch"](function() {
              return {
                success: false,
                content: void 0
              };
            }).then(function(response) {
              return socket.emit("remove." + request.token, response);
            });
          }
        };
      })(this));
    };
  };

}).call(this);
