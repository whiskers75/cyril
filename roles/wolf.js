var Villager = require('./villager.js');
var util = require('util');
var Wolf = function(Wolfgame) {
    this.acted = false;
    this.canAct = true;
    this.team = 'wolf';
    this.toString = function() {
	return 'wolf';
    };
    this.description = 'You are a werewolf! You can choose one person to kill every night.';
    this.act = function(target) {
	if (Wolfgame.autocomplete(target)) {
            target = Wolfgame.autocomplete(target);
	    Wolfgame.killing = target;
	    Wolfgame.pm(this.name, 'You have selected ' + Wolfgame.c.bold(target) + ' to be killed.');
	    this.acted = true;
	}
    };
    
};
util.inherits(Wolf, Villager);
module.exports = Wolf;

