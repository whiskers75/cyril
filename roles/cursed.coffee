Villager = require('./villager.js')
util = require('util')
Cursed = (Wolfgame) ->
        this.toString = () -> return 'cursed villager'
        this.description = 'You are seen as wolf, but are not.'
        this.see = () -> return 'wolf' 
        return this
util.inherits(Cursed, Villager)
module.exports = Cursed