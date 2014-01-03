Villager = require('./villager.js')
util = require('util')
Cursed = (Wolfgame) ->
        this.toString = () -> return 'cursed villager'
        this.description = 'You are seen as wolf, but are not.'
        this.onNight = () -> Wolfgame.pm(this.name, 'You are cursed to appear as wolf during the night!')
        return this
util.inherits(Cursed, Villager)
module.exports = Cursed