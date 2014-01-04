Villager = require('./villager.js')
util = require('util')
Cursed = (Wolfgame) ->
        this.toString = () -> return 'cursed villager'
        this.minPlayers = 6;
        this.description = 'You are seen as wolf, but are not.'        
        return this
util.inherits(Cursed, Villager)
module.exports = Cursed