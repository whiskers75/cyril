var Villager = require('./villager.js');
var util = require('util');
var Seer = function(Wolfgame) {
    this.toString = function() {
	return 'seer';
    };
    this.acted = false;
    this.canAct = true;
    this.description = 'You can see one person per night, and reveal their role.';
    this.act = function(player) {
	if (Wolfgame.autocomplete(player)) {
	    player = Wolfgame.autocomplete(player);
	    Wolfgame.pm(this.name, Wolfgame.c.green('You have a vision; in this vision you see that ') + Wolfgame.c.bold.green(player) + Wolfgame.c.green(' is a ') + Wolfgame.c.bold.green(Wolfgame.players[player]) + Wolfgame.c.green('!'));
	    this.acted = true;
	}
    };
};
util.inherits(Seer, Villager);
module.exports = Seer;
