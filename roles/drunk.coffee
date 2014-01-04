Villager = require('./villager.js')
util = require('util')
Drunk = (Wolfgame) ->
        this.toString = () -> return 'village drunk'
        this.minPlayers = 8;
        this.description = 'You have been drinking too much!'
        this.onNight = () -> Wolfgame.pm(this.name, 'You have been drinking too much! You are the village drunk!');
        return this
util.inherits(Drunk, Villager)
module.exports = Drunk