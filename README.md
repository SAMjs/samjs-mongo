# samjs-mongo

adds a model and interface to connect with mongoDB.

Client: [samjs-mongo-client](https://github.com/SAMjs/samjs-mongo-client)

## Getting Started
```sh
npm install --save samjs-mongo
npm install --save-dev samjs-mongo-client
```

## Usage

```js
// server-side
samjs
.plugins(require("samjs-mogno"))
.options()
.configs()
.models({name: "someModel", db: "mongo", schema:{someProp: String}})
.startup(server)


// will be in config mode after startup to setup the mongo connection
// after successsful configuration:
samjs.state.onceStarted.then(function(){
  // not in install mode anymore
})

//client in browser

samjs.plugins(require "samjs-mongo-client")

// when mongoURI isn't setted in config, samjs will go into
// install mode, there you can set it
samjs.install.set("mongoURI", "mongodb://localhost/tableName")
.then(function(){
  // success
})
.catch(function(){
  // failed
})

var someModel = new samjs.Mongo("someModel")
// has insert / count / find / update / remove
someModel.insert(someProp:"someValue")

// in another client events: inserted / updated / removed
someModel.on("inserted", function(id) {
  // has id of inserted item
})

```

### model props

name | type | default | description
---: | --- | --- | ---
schema | object or factory function | - | (required) mongoose schema

### model hooks

each hook has to return its arguments.

name | arguments| description
---: | --- | ---
beforeFind | `{query, client}` | will be called before each `find` and `count`
afterFind | `results` | will be called after each `find` and `count`
beforeInsert | `{query, client}` | will be called before each `insert`
afterInsert | `results` | will be called after each `insert`
beforeUpdate | `{query, client}` | will be called before each server-side `update`
afterUpdate | `results` | will be called after each server-side `update`
beforeRemove | `{query, client}` | will be called before each server-side `remove`
afterRemove | `results` | will be called after each server-side `remove`
beforeCreate | `model` | will be called before model creation
afterCreate | `model` | will be called after model creation

example:
```js
samjs
.plugins(require("samjs-mongo"))
.options()
.configs()
.models({
  name:"someModel",
  db:"mongo",
  schema:{someProp: String},
  beforeGet: [
    function(obj) {
      if (notPermitted){
        throw new Error("no Permission")
      }
      return obj
    }
  ]
})
```

### plugins
plugins are activated on model level
```js
samjs
.plugins(require("samjs-mongo"),require("samjs-mongo-auth"))
.options()
.configs()
.models({
  name:"someModel",
  db:"mongo",
  schema:{
    someProp: String
    },
  plugins: {
    "auth": null // or a options object to interact with the plugin
    }
  }
})
```
