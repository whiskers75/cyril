// Wolfgame module!
var _k = Object.keys;
var util = require('util');
var Chance = require('chance');
var chance = new Chance();
var coffee = require('coffee-script');
var EventEmitter = require('events').EventEmitter;
var Wolfgame = function() {
    this.players = {};
    this.phase = 'start';
    this.lynches = {};
    this.dead = {};
    this.over = false;
    this.timeouts = [];
    this.c = require('irc-colors');
    /* Roles */
    this.Seer = require('./roles/seer.coffee');
    this.Cursed = require('./roles/cursed.coffee');
    this.Wolf = require('./roles/wolf.js');
    this.Villager = require('./roles/villager.js');
    this.checkEnd = function() {
	var wolves = 0;
	var vills = 0;
	_k(process.game.players).forEach(function(player) {
	    if (process.game.players[player].team == 'wolf'){
		wolves++;
	    }
	    else {
		vills++;
	    }
	});
	if (wolves >= vills || vills == 0) {
	    process.game.emit('gameover', {win: 'wolves'});
	    process.game.over = true;
	    return true;
	}
	if (wolves == 0) {
	    process.game.emit('gameover', {win: 'villagers'});
	    process.game.over = true;
	    return true;
	}
	return false;
    };
    this.kill = function(player, reason, hooks) {
	if (typeof hooks == 'undefined') {
	    hooks = false;
	}
	this.emit('death', {player: player, reason: reason, role: this.players[player]});
	this.dead[player] = this.players[player];
        delete this.players[player];
        if (this.phase !== 'start') {
	    var end = this.checkEnd();
	    if (!end) {
		if (this.dead[player].onDeath) {
		    player.onDeath(this, player.name);
		}
		/* This bit has a weird bug.
		_k(this.players).forEach(function(p) {
		    p = this.players[p];
		    if (p.onOtherDeath) {
		    p.onOtherDeath(process.game, player.name);
		    }
		    });
			*/
		if (hooks) {
		    hooks.after(this, player);
		}
	    }
	    return end;
        }
        
    };
    this.autocomplete = function(player, from) {
	var count = 0;
        _k(this.players).forEach(function(p) {
            if (p.indexOf(player) == 0) {
                player = p;
		count++;
            }
        });
        if (_k(this.players).indexOf(player) == -1) {
	    if (from) {
		this.emit('notice', {to: from, message: 'That player does not exist.'});
	    }
            return false;
        }
	if (count > 1) {
	    if (from) {
		this.emit('notice', {to: from, message: 'Ambiguous autocompletion. Please refine!'});
	    }
            return false;
	}
	return player;
    };
    this.pm = function(to, message) {
	this.emit('pm', {to: to, message: message});
    };
    this.checkLynches = function() {
        var votes = {};
        if (this.phase !== 'day') {
            return;
        }
        _k(this.lynches).forEach(function(lynch) {
            lynch = process.game.lynches[lynch];
            if (!votes[lynch]) {
                votes[lynch] = 0;
            }
            votes[lynch]++;
        });
        Object.keys(votes).forEach(function(vote) {
            var voted = votes[vote];
            if (voted >= (_k(process.game.players).length - (_k(process.game.players).length > 4 ? 2 : 1))) {
		if (!process.game.kill(vote, ' was lynched by the angry mob of villagers.')) {
		    process.game.emit('night');
		}
		return;
            }
	});
    };
    this.lynch = function(player, lynchee) {
	if (process.game.autocomplete(player) && process.game.autocomplete(lynchee)) {
	    lynchee = process.game.autocomplete(lynchee);
	    player = process.game.autocomplete(player);
	    process.game.lynches[lynchee] = player;
	    process.game.emit('lynch', {from: lynchee, to: player});
	    process.game.checkLynches();
	}
    };
    this.randomPlayer = function() {
        return _k(this.players)[chance.integer({min: 0, max: _k(this.players).length - 1})];
    };
    this.allocate = function() {
	// Allocate the roles
	var roled = [];
        roled.Wolf = this.randomPlayer();
	roled.push(roled.Wolf);
	delete this.players[roled.Wolf]; // Don't worry, we'll put it back later
	roled.Seer = this.randomPlayer();
	roled.push(roled.Seer);
	delete this.players[roled.Seer];
	if (_k(this.players).length >= 4) {
	    roled.Cursed = this.randomPlayer();
	    roled.push(roled.Cursed);
	    delete this.players[roled.Cursed];
	}
        process.game = this;
	roled.forEach(function(player) {
	    if (player == roled.Wolf) {
		process.game.players[player] = new process.game.Wolf(process.game);
		process.game.players[player].name = player;
	    }
	    if (player == roled.Seer) {
		process.game.players[player] = new process.game.Seer(process.game);
                process.game.players[player].name = player;
	    }
	    if (player == roled.Cursed) {
		process.game.players[player] = new process.game.Cursed(process.game);
		process.game.players[player].name = player;
	    }
	});
	var defvil = new this.Villager(this);
	_k(this.players).forEach(function(player) {
	    if (process.game.players[player] == 'unallocated') {
		process.game.players[player] = defvil;
                process.game.players[player].name = player;
	    }
	});
	return this.emit('night');
    };
    this.on('join', function(data) {
	if (this.phase != 'start') {
	    return this.emit('error', new Error('You can\'t join or quit now!'));
	}
	if (_k(this.players).indexOf(data.player) !== -1) {
            this.emit('notice', {to: data.player, message: 'You are already playing.'});
	}
	else {
	    this.players[data.player] = 'unallocated';
	    this.emit('joined', {player: data.player});
	}
    });
    this.on('quit', function(data) {
        if (this.phase != 'start') {
            return this.emit('error', new Error('You can\'t join or quit now!'));
        }
	if (this.phase == 'start') {
	    if (_k(this.players).indexOf(data.player) == -1) {
		return this.emit('notice', {to: data.player, message: 'You are not playing.'});
	    }
	    delete this.players[data.player];
	    this.emit('quitted', {player: data.player});
	}
    });
    this.on('start', function() {
	if (this.phase != 'start') {
	    return this.emit('error', new Error('You can\'t start the game now!'));
	}
	this.emit('starting');
	this.phase = 'night';
	this.allocate();
    });
    this.on('night', function() {
	this.phase = 'night';
	this.killing = '';
	this.timeouts.forEach(function(t) {
	    clearTimeout(t);
	});
	this.timeouts.push(setTimeout(function() {
	    if (this.phase == 'night') {
		this.emit('day');
	    }
	}, 120000));
    });
    this.on('day', function() {
	this.phase = 'day';
	this.lynches = {};
        this.timeouts.forEach(function(t) {
            clearTimeout(t);
        });
	_k(this.players).forEach(function(p) {
	    if (typeof p == 'undefined') {
		return;
	    }
	    p = process.game.players[p];
	    if (p.canAct) {
		p.acted = false;
	    }
	    if (p.onDay) {
		p.onDay();
	    }
	});
    });
    this.on('gameover', function() {
        this.timeouts.forEach(function(t) {
            clearTimeout(t);
        });
    });
};
util.inherits(Wolfgame, EventEmitter);
module.exports = Wolfgame;


