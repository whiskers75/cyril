var irc = require('slate-irc');
var c = require('irc-colors');
var winston = require('winston');
var net = require('net');
var Wolfgame = require('./wolfgame.js');
var stream = net.connect({
    port: 6667,
    host: 'irc.freenode.org'
});
var bot = irc(stream);
var _k = Object.keys;
winston.info('Starting Cywolf 2');
bot.pass(process.env.PASSWORD);
bot.nick('cywolf2');
bot.user('cywolf', 'Cywolf 2');
bot.join('#cywolf');
String.prototype.repeat = function( num ) {
    return new Array( num + 1 ).join( this );
};
function reset() {
    winston.info('Cywolf 2 reset!');
    setTimeout(function() {
	bot.mode('#cywolf', '-m');
	var game = new Wolfgame();
    game.on('joined', function(data) {
	bot.send('#cywolf', c.bold(data.player) + ' joined Cywolf. ' + c.bold(_k(game.players).length) + ' people playing.');
    });
    game.on('quitted', function(data) {
        bot.send('#cywolf', c.bold(data.player) + ' quit Cywolf. ' + c.bold(_k(game.players).length) + ' people playing.');
    });
    game.on('notice', function(data) {
	bot.notice(data.to, data.message);
    });
    game.on('message', function(data) {
	bot.send('#cywolf', data.message);
    });
    game.on('gameover', function() {
        bot.mode('#cywolf', '-' + 'v'.repeat(_k(game.players).length), _k(game.players).join(' '));
	reset();
    });
    game.on('pm', function(data) {
	bot.send(data.to, data.message);
    });
    game.on('starting', function() {
        bot.send('#cywolf', _k(game.players).join(', ') + ': Welcome to Cywolf ' + game.c.bold('2.0') + ', the next generation of the game Wolfgame (or Mafia).');
	bot.mode('#cywolf', '+m');
    });
    game.on('day', function() {
	setTimeout(function() {
	if (!game.over) {
            bot.send('#cywolf', c.bold('☀') + ' It is now day.');
	    bot.send('#cywolf', 'The villagers must now decide who to lynch. Use ' + c.bold('!lynch [player]') + ' to do so.');
	}
	}, 1000);
    });
    game.on('death', function(name, reason) {
	bot.mode('#cywolf', '-v', name);
    });
    game.on('night', function() {
	_k(game.players).forEach(function(player) {
	    player = game.players[player];
	    if (player.canAct && !player.acted) {
		bot.send(player.name, 'You are a ' + c.bold(player.toString()) + '.');
		bot.send(player.name, 'Your role description is:');
		bot.send(player.name, player.description);
		bot.send(player.name, 'You can act on the following: ' + _k(game.players).join(', '));
		bot.send(player.name, 'PM me "act [player]" to act on that player (see your description).');
	    }
	});
        bot.send('#cywolf', c.bold('☾') + ' It is now ' + c.bold('night') + '. All players check for PMs from me for instructions. If you did not recieve one, simply sit back, relax and wait until morning (max 2 mins).');
    });
    bot.on('message', function(data) {
	data.cmd = data.message.split(' ')[0];
	data.args = data.message.split(' ');
        if (data.cmd == '!freset' && data.from == 'whiskers75') {
            reset();
        }
	if (game.phase == 'start') {
	    if (data.cmd == '!join') {
		bot.mode('#cywolf', '+v', data.from);
		game.emit('join', {player: data.from.toString()});
	    }
	    if (data.cmd == '!quit' || data.cmd == '!leave') {
                bot.mode('#cywolf', '-v', data.from);
		game.emit('quit', {player: data.from.toString()});
	    }
	    if (data.cmd == '!stats') {
		bot.send('#cywolf', 'Players: ' + _k(game.players).join(' '));
	    }
	    if (data.cmd == '!ping' && data.from == 'whiskers75') {
		bot.names('#cywolf', function(er, names) {
		    bot.send('#cywolf', 'PING (by operator)! ' + names.join(' '));
		});
	    }
	    if (data.cmd == '!start') {
		if (_k(game.players).length >= 4 || data.from == 'whiskers75') {
		    game.emit('start');
		}
		else {
		    bot.notice(data.from, '4 or more players must be playing to use this.');
		}
	    }
	}
	if (game.phase == 'night' && data.to == 'cywolf2') {
	    if (data.cmd == 'act' || data.cmd == 'see' || data.cmd == 'kill') {
		if (game.players[data.from].canAct && !game.players[data.from].acted) {
		    game.players[data.from].act(data.args[1]);
		    var done = true;
		    _k(game.players).forEach(function(player) {
			if (!game.players[player].acted && game.players[player].canAct) {
			    done = false;
			}
		    });
		    if (done) {
			game.emit('day');
		    }
		}
	    }
	}
	if (game.phase == 'day') {
	    if (data.cmd == '!lynch' || data.cmd == 'vote') {
		game.lynch(data.args[1], data.from);
	    }
	}
    });
	});
}
bot.on('join', function(data) {
    if (data.nick != 'cywolf2') {
	return;
    }
    bot.say('#cywolf', c.bold('Cywolf 2 connected!') + ' Start a game with !join.');
    reset();
});

