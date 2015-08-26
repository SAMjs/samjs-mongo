# samjs-mongo

Mongoose connector for samjs.

Client: [samjs-mongo-client](https://github.com/SAMjs/samjs-mongo-client)

## Example
```coffee
samjs = require "samjs"

samjs.plugins(require("samjs-mongo"))
.options({config:"config.json"})
.configs()
.models({name: "someModel", db: "mongo", schema:{someProp: String}})
.startup().io.listen(3000)

#will be in install mode, after install:
samjs.started.then -> # not in install mode anymore

#client in browser

samjs = require("samjs-client")({url: window.location.host+":3000/"})
samjs.plugins(require "samjs-mongo-client")

## when mongoURI isn't setted within config.json, samjs will go into
## install mode, there you can set it
samjs.install.set "mongoURI", "mongodb://localhost/tableName"
.then -> #success
.catch -> #failed
# can be tested before: samjs.install.test "mongoUri", "mongodb://localhost/tableName"

someModel = new samjs.Mongo("someModel")
# has insert / count / find / update / remove
someModel.insert someProp:"someValue"

## in another client
someModel.on "inserted", (id) ->
  # has id of inserted item
# other events updated / removed
```
## plugins
provides a plugin api
```coffee
samjs.mongo.plugins()
```
