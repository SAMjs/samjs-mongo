<template lang="pug">
.card.black-text
  .card-content
    span.card-title.black-text Setup the mongo-db connection
    .row
      input-field.s12(
        autofocus
        v-bind:validate="testDB"
        data-error="not valid"
        v-bind:data-success="dbInfo"
        label="MongoDB connection string"
        placeholder="e.g. mongodb://localhost/someTable"
        v-bind:value.sync="dbconn"
        @confirm="triggerNext"
      )
        icon.prefix(slot="icon" name="material-device_hub")
  slot
</template>
<script lang="coffee">
module.exports =
  components:
    icon: require("vmat/icon")
    inputField: require("vmat/input-field")
  props: ["samjs"]
  data: ->
    dbconn: ""
    dbState: ""
  computed:
    dbInfo: ->
      return @dbState.replace(";"," ") if @dbState
      return ""
  methods:
    testDB: (str) ->
      @samjs.install.test("mongoURI",str)
      .then (result) =>
        @dbState = result
        @$emit "validity-changed", true
      .catch (e) =>
        @dbState = null
        @$emit "validity-changed", false
        throw e
    triggerNext: -> @$emit "next"
    next: -> @samjs.install.set("mongoURI",@dbconn)
  ready: ->
    @$emit "validity-changed", false
</script>
