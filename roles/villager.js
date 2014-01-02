var Villager = function() {
    this.team = 'villager';
    this.toString = function() {
	return 'villager';
    };
    this.acted = true;
    this.canAct = false;
    this.name = 'bob';
    this.description = 'Just an ordinary villager.';
};
module.exports = Villager;
