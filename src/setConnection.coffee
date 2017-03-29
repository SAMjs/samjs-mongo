ceri = require "ce/wrapper"
module.exports = ceri
  mixins: [
    require "ce/structure"
    require "ce/class"
    require "ce/#model"
    require "ce/computed"
  ]
  structure: template 1, """
    <span class="card-title black-text">Create root user</span>
    <div class=row>
      <div class="input-field col s12">
        <ceri-icon class=prefix name="ma-device_hub"></ceri-icon>
        <input
          #ref=dbInput 
          #model=dbconn
          placeholder="e.g. mongodb://localhost/someTable"
          @keyup=onKeyupdb
          class=validate
          />
        <label 
          #ref=dbLabel 
          class=active
          data-error="not valid"
          :data-success=dbState
          >MongoDB connection string
        </label>
      </div>
    </div>
  """

  data: ->
    dbconn: ""
    dbState: ""
  computed:
    isValid: -> @dbState?
  methods:
    onKeyupdb: (e) ->
      return if e.keyCode != 13
      @finished()

    next: -> @samjs.install.set("mongoURI",@dbconn)
  watch:
    dbconn: (str) ->
      if @dbInput
        if str
          @samjs.install.test("mongoURI",str)
          .then (result) =>
            @dbState = result.replace(";"," ")
            @dbInput.className = "validate valid"
          .catch (e) =>
            @dbState = null
            @dbInput.className = "validate invalid"
        else
          @dbInput.className = "validate"