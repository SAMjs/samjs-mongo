(function() {
  module.exports = function(samjs) {
    return samjs.shutdown = function() {
      var dbClosed, ioClosed;
      ioClosed = new samjs.Promise(function(resolve) {
        return samjs.io.httpServer.on("close", function() {
          samjs.debug.core("server closed");
          return setTimeout(resolve, 50);
        });
      });
      samjs.io.close();
      dbClosed = samjs.db.close();
      samjs.shutdown = null;
      samjs.started = null;
      return new Promise(function(resolve) {
        return Promise.all([ioClosed, dbClosed])["finally"](resolve());
      });
    };
  };

}).call(this);
