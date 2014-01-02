// Wolfgame module!
var _k = Object.keys;
var util = require('util');
var Chance = require('chance');
var chance = new Chance();
var EventEmitter = require('events').EventEmitter;
var Wolfgame = function() {
    this.players = {};
    this.phase = 'start';
    this.lynches = {};
    this.over = false;
    this.c = require('irc-colors');
    /* Roles */
    this.Seer = require('./roles/seer.js');
    this.Wolf = require('./roles/wolf.js');
    this.Villager = require('./roles/villager.js');
    this.killing = [];
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
		process.game.emit('message', {message: process.game.c.bold('Game over!') + ' The wolves have enough to outnumber the villagers. They do so and win.'});
		process.game.emit('message', {message: process.game.c.bold.red('The wolves win!')});
		process.game.emit('gameover');
		process.game.over = true;
		return true;
	    }
	    if (wolves == 0) {
		process.game.emit('message', {message: process.game.c.bold('Game over!') + ' All the wolves are dead! The villagers chop them up, BBQ them and have a hearty meal.'});
		process.game.emit('message', {message: process.game.c.bold.green('The villagers win!')});
		process.game.emit('gameover');
		process.game.over = true;
		return true;
	    }
	    return false;
    };
    this.kill = function(player, reason) {
	this.emit('message', {message: this.c.bold(player) + (reason ? reason : ' was mauled by werewolves and died.') + ' It appears that they were a ' + this.c.bold(this.players[player]) + '.'});
	delete this.players[player];
	this.emit('death', {player: player, reason: reason});
	if (this.phase !== 'start') {
	    return this.checkEnd();
	}
    };
    this.autocomplete = function(player) {
        _k(this.players).forEach(function(p) {
            if (p.indexOf(player) !== -1) {
                player = p;
            }
        });
        if (_k(this.players).indexOf(player) == -1) {
            this.emit('notice', {to: player, message: 'That player does not exist.'});
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
            lynch = this.lynches[lynch];
            if (!votes[lynch]) {
                votes[lynch] = 0;
            }
            votes[lynch]++;
        });
        Object.keys(votes).forEach(function(vote) {
            var voted = votes[vote];
            if (voted >= (_k(process.game.players).length - 1 + (_k(process.game.players).length > 4 ? 1 : 0))) {
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
	setTimeout(function() {
	    if (this.phase == 'night') {
		this.emit('day');
	    }
	}, 120000);
    });
    this.on('day', function() {
	this.phase = 'day';
	this.lynches = {};
	if (this.killing) {
	    this.kill(this.killing, ' was mauled by wolves and died.');
	}
    });
};
util.inherits(Wolfgame, EventEmitter);
module.exports = Wolfgame;

