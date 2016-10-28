chai = require "chai"
should = chai.should()
chai.use require "chai-as-promised"
samjs = require "samjs"
samjsClient = require "samjs-client"
samjsMongoClient = require "samjs-mongo-client"
samjsMongo = require("../src/main")
mongoose = require "mongoose"
mongoose.Promise = samjs.Promise
fs = samjs.Promise.promisifyAll(require("fs"))
port = 3050
url = "http://localhost:"+port+"/"
testConfigFile = "test/testConfig.json"
mongodb = "mongodb://localhost/test"

testModel =
  name: "test"
  db: "mongo"
  schema:
    testProp: String
    testProp2: Boolean
  plugins:
    testPlugin: null
testModel2 =
  name: "test2"
  db: "mongo"
  populate: "link"
  schema: (Schema) ->
    link:
      ref: "test"
      type: Schema.Types.ObjectId
  plugins:
    testPlugin: null

describe "mongoose", ->
  it "should work", ->
    return samjs.Promise.resolve(mongoose.createConnection(mongodb))
      .then (conn) ->
        return new samjs.Promise (resolve) ->
          conn.on "open", ->
            resolve(conn)
      .call "close"

describe "samjs", ->
  client = null
  clientTestModel = null
  clientTest2Model = null
  before ->
    samjs.reset().plugins(samjsMongo).options({config:testConfigFile})
    return fs.unlinkAsync testConfigFile
      .catch -> return true

  describe "mongo", ->
    it "should be accessible", ->
      should.exist samjs.mongo
    it "should have default config mongoURI", ->
      samjs.configs()
      should.exist samjs.configs["mongoURI"]
    it "should take model plugins", ->
      samjs.mongo.plugins testPlugin: ->
        @someProp = true
        return @
      samjs.models(testModel,testModel2)
      samjs.models.test.someProp.should.be.true
    it "should configure", ->
      samjs.startup().io.listen(port)
      client = samjsClient({
        url: url
        ioOpts:
          reconnection: false
          autoConnect: false
        })()
      return client.install.onceConfigure
        .return client.install.set "mongoURI", mongodb
    it "should startup", ->
      samjs.state.onceStarted
    it "should insert data",  ->
      samjs.models.test.insert testProp:"test",testProp2: false
      .then ({result}) ->
        should.exist result._id
    it "should count data", ->
      samjs.models.test.count()
      .then ({result}) ->
        result.should.equal 1
    it "should find data", ->
      samjs.models.test.find find: {testProp:"test"}, fields: "testProp2"
      .then ({result}) ->
        result.length.should.be.above(0)
        for entry in result
          should.not.exist entry.testProp
          entry.testProp2.should.be.false
          should.exist entry._id
    it "should update data", ->
      samjs.models.test.update cond: {testProp:"test"}, doc: {testProp2:true}
      .then ({result}) ->
        should.exist result[0]._id
        samjs.models.test.find find: {testProp:"test"}
      .then ({result}) ->
        result[0].testProp2.should.be.true
    it "should populate data", ->
      samjs.models.test.find {}
      .then ({result}) ->
        samjs.models.test2.insert link: result[0]._id
      .then -> samjs.models.test2.find {}
      .then ({result}) ->
        deleteall = samjs.models.test2.delete {}
        should.exist result[0].link
        should.exist result[0].link.testProp
        result[0].link.testProp.should.equal "test"
        return deleteall
    it "should delete data", ->
      samjs.models.test.delete {testProp:"test"}
      .then ({result}) ->
        result.length.should.be.above(0)

    describe "client", ->
      it "should plugin", ->
        client.plugins(samjsMongoClient)
        should.exist client.getMongoModel
        should.exist client.mongoPlugins
      it "should connect", ->
        return client.io.connect().then ->
          clientTestModel = client.getMongoModel("test")
          clientTest2Model = client.getMongoModel("test2")
          return clientTestModel.onceLoaded
      it "should insert data", ->
        clientTestModel.insert testProp:"test",testProp2: false
        .then (response) ->
          should.exist response._id
      it "should count data", ->
        clientTestModel.count()
        .then (response) ->
          response.should.equal 1
      it "should find data", ->
        clientTestModel.find find: {testProp:"test"}, fields: "testProp2"
        .then (response) ->
          response.length.should.be.above(0)
          for entry in response
            should.not.exist entry.testProp
            entry.testProp2.should.be.false
            should.exist entry._id
      it "should update data", ->
        clientTestModel.update cond: {testProp:"test"}, doc: {testProp2:true}
        .then (response) ->
          should.exist response[0]._id
          clientTestModel.find find: {testProp:"test"}
        .then (response) ->
          response[0].testProp2.should.be.true
      it "should populate data", ->
        clientTestModel.find {}
        .then (response) ->

          clientTest2Model.insert link: response[0]._id
        .then -> clientTest2Model.find {}
        .then (response) ->
          should.exist response[0].link
          should.exist response[0].link.testProp
          response[0].link.testProp.should.equal "test"
          clientTest2Model.delete _id: response[0]._id
      it "should delete data", ->
        clientTestModel.delete {testProp:"test"}
        .then (response) ->
          response.length.should.be.above(0)
  after ->
    if samjs.shutdown?
      return samjs.shutdown()
