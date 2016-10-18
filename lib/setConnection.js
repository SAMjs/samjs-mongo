module.exports = {
  components: {
    icon: require("vmat/icon"),
    inputField: require("vmat/input-field")
  },
  props: ["samjs"],
  data: function() {
    return {
      dbconn: "",
      dbState: ""
    };
  },
  computed: {
    dbInfo: function() {
      if (this.dbState) {
        return this.dbState.replace(";", " ");
      }
      return "";
    }
  },
  methods: {
    testDB: function(str) {
      return this.samjs.install.test("mongoURI", str).then((function(_this) {
        return function(result) {
          _this.dbState = result;
          return _this.$emit("validity-changed", true);
        };
      })(this))["catch"]((function(_this) {
        return function(e) {
          _this.dbState = null;
          _this.$emit("validity-changed", false);
          throw e;
        };
      })(this));
    },
    triggerNext: function() {
      return this.$emit("next");
    },
    next: function() {
      return this.samjs.install.set("mongoURI", this.dbconn);
    }
  },
  ready: function() {
    return this.$emit("validity-changed", false);
  }
};

if (module.exports.__esModule) module.exports = module.exports.default
;(typeof module.exports === "function"? module.exports.options: module.exports).template = "<div class=\"card black-text\"><div class=\"card-content\"><span class=\"card-title black-text\">Setup the mongo-db connection</span><div class=\"row\"><input-field class=\"s12\" autofocus=\"autofocus\" v-bind:validate=\"testDB\" data-error=\"not valid\" v-bind:data-success=\"dbInfo\" label=\"MongoDB connection string\" placeholder=\"e.g. mongodb://localhost/someTable\" v-bind:value.sync=\"dbconn\" @confirm=\"triggerNext\"><icon class=\"prefix\" slot=\"icon\" name=\"material-device_hub\"></icon></input-field></div></div><slot></slot></div>"
if (module.hot) {(function () {  module.hot.accept()
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  if (!module.hot.data) {
    hotAPI.createRecord("_v-49627472", module.exports)
  } else {
    hotAPI.update("_v-49627472", module.exports, (typeof module.exports === "function" ? module.exports.options : module.exports).template)
  }
})()}