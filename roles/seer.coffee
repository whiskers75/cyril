Villager = require('./villager.js')
util = require('util')
Seer = (Wolfgame) ->
        this.toString = () -> return 'seer'
        this.acted = false
        this.canAct = true
        this.actName = 'see'
        this.description = 'You can see one person per night, and reveal their role.'
        this.act = (player) ->
                if Wolfgame.autocomplete(player, this.name) && player != this.name
                        player = Wolfgame.autocomplete(player)
                        role = Wolfgame.players[player].see();
                        Wolfgame.pm(this.name, Wolfgame.c.green('You have a vision; in this vision you see that ') + Wolfgame.c.bold.green(player) + Wolfgame.c.green(' is a ') + Wolfgame.c.bold.green(role) + Wolfgame.c.green('!'))
                        this.acted = true    
        return this
util.inherits(Seer, Villager)
module.exports = Seer