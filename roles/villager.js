var Villager = function() {
    this.team = 'villager';
    this.toString = function() {
	return 'villager';
    };
    this.onNight = false;
    this.acted = true;
    this.minPlayers = 0;
    this.canAct = false;
    this.name = 'bob';
    this.actName = 'derp';
    this.see = function() {
	return this.toString();
    };
    this.onDeath = false;
    this.onOtherDeath = false;
    this.description = 'Just an ordinary villager.';
};
module.exports = Villager;
