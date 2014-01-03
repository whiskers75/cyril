var irc = require('slate-irc');
var c = require('irc-colors');
var winston = require('winston');
var net = require('net');
var idletimes = {};
var over = false;
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
var topic = 'Cywolf 2 | http://cyril.whiskers75.com | Roles: [4] wolf, seer [6] cursed villager | IDLE FOR 2 MINUTES INGAME AND GET KICKED WITHOUT WARNING!';
var game;
var idleint;
function reset() {
    winston.info('Cywolf 2 reset!');
    bot.mode('#cywolf', '-m');
    bot.on('topic', function(data) {
	if (topic !== data.topic) {
	    setTimeout(function() {
		bot.topic('#cywolf', topic);
	    }, 5000);
	}
    });
    bot.names('#cywolf', function(er, names) {
	setTimeout(function() {
	    var n;
	    var i = setInterval(function() {
		if (names.length == 0) {
                    bot.send('#cywolf', 'Welcome to Cywolf 2. Start a game with !join.');
                    return clearInterval(i);
		}
		n = names.splice(0, (names.length < 4 ? names.length : 4));
		bot.mode('#cywolf', '-' + 'v'.repeat(n.length), n.join(' '));
	    }, 500);
	}, 1000);
    });
    game = new Wolfgame();
    idleint = setInterval(function() {
            if (game.phase !== 'start') {
                _k(game.players).forEach(function(player) {
                    if ((new Date().getTime / 1000) - idletimes[player] >= 120) {
                        bot.send(player, c.bold.red('You have been idling for a while. Say something soon in #cywolf or you may be declared dead.'));
                    }
                    if ((new Date().getTime / 1000) - idletimes[player] >= 150) {
                        game.kill(player, ' didn\'t get out of bed for a long time and died.');
                    }
                });
            }
    }, 5000);
    setTimeout(function() {
	over = false;
    }, 5000);
    game.on('joined', function(data) {
        bot.mode('#cywolf', '+v', data.player);
	if (_k(game.players).length == 1) {
	    bot.send('#cywolf', c.bold(data.player) + ' started a game of Cywolf. !join to join, !quit to leave, and !start to start.');
	}
	else {
	    bot.send('#cywolf', c.bold(data.player) + ' joined Cywolf. ' + c.bold(_k(game.players).length) + ' people playing.');
	}
    });
    game.on('quitted', function(data) {
        bot.mode('#cywolf', '-v', data.player);
        bot.send('#cywolf', c.bold(data.player) + ' quit Cywolf. ' + c.bold(_k(game.players).length) + ' people playing.');
    });
    game.on('lynch', function(data) {
	bot.send('#cywolf', c.bold(data.from) + ' votes for ' + c.bold(data.to) + '.');
    });
    game.on('notice', function(data) {
	bot.notice(data.to, data.message);
    });
    game.on('message', function(data) {
	bot.send('#cywolf', data.message);
    });
    game.on('gameover', function() {
	_k(game.players).forEach(function(player) {
	    bot.mode('#cywolf', '-v', player);
	});
	over = true;
	game.removeAllListeners();
	bot.removeAllListeners('nick');
	bot.removeAllListeners('part');
	clearInterval(idleint);
	reset();
    });
    game.on('pm', function(data) {
	bot.send(data.to, data.message);
    });
    game.on('starting', function() {
        bot.send('#cywolf', _k(game.players).join(', ') + ': Welcome to Cywolf ' + game.c.bold('2.0') + ', the next generation of the game Wolfgame (or Mafia).');
	bot.mode('#cywolf', '+m');
    });
    bot.on('part', function(data) {
	if (_k(game.players).indexOf(data.nick) !== -1) {
	    if (game.phase !== 'start') {
		game.kill(data.nick, ' left the village, and died.');
	    }
	    else {
		game.emit('quit', {player: data.nick});
	    }
	}
    });
    bot.on('nick', function(data) {
	if (_k(game.players).indexOf(data.nick) !== -1) {
            if (game.phase !== 'start') {
                game.kill(data.nick, ' died of the horrible Nick-Changing Disease.');
            }
            else {
                game.emit('quit', {player: data.nick});
            }
	}
    });
    game.on('day#nodeath', function() {
	setTimeout(function() {
	    if (!game.over && !over) {
                bot.send('#cywolf', c.bold('☀') + ' It is now day. Nobody seems to have been killed during the night.');
                bot.send('#cywolf', 'The villagers must now decide who to lynch. Use ' + c.bold('!lynch [player]') + ' to do so.');
                bot.send('#cywolf', 'A majority of ' + c.bold(_k(process.game.players).length - 1) + ' votes will lynch. The villagers have only ' + c.bold(_k(process.game.players).length + ' minutes') + ' to lynch, otherwise night will start ' + c.bold.red('without warning') + '.');
                setTimeout(function() {
		    if (game.phase == 'day') {
			game.emit('night');
		    }
                }, _k(process.game.players).length * 60000);
            }
	}, 1000);
    });
    game.on('death', function(data) {
	if (data.isDay) {
            bot.send('#cywolf', c.bold('☀') + ' It is now day. The villagers search the village...');
            bot.send('#cywolf', c.bold('☠ ' + data.player) + (data.reason ? data.reason : ' was mauled by werewolves and died.') + ' After searching their pockets, it was revealed that they were a ' + c.bold(game.players[data.player]) + '.');
            bot.send('#cywolf', 'The villagers must now decide who to lynch. Use ' + c.bold('!lynch [player]') + ' to do so.');
            bot.send('#cywolf', 'A majority of ' + c.bold(_k(process.game.players).length - 1) + ' votes will lynch. The villagers have only ' + c.bold(_k(process.game.players).length + ' minutes') + ' to lynch, otherwise night will start ' + c.bold.red('without warning') + '.');
	    bot.mode('#cywolf', '-v', data.player);
	}
	else {
            bot.send('#cywolf', c.bold('☠ ' + data.player) + (data.reason ? data.reason : ' was mauled by werewolves and died.') + ' After searching their pockets, it was revealed that they were a ' + c.bold(game.players[data.player]) + '.');
	}
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
	    if (player.onNight) {
		player.onNight();
	    }
	});
        bot.send('#cywolf', c.bold('☾') + ' It is now ' + c.bold('night') + '. All players check for PMs from me for instructions. If you did not recieve one, simply sit back, relax and wait until morning (max 2 mins).');
    });
    bot.on('message', function(data) {
	idletimes[data.from] = new Date().getTime() / 1000;
	data.cmd = data.message.split(' ')[0];
	data.args = data.message.split(' ');
        if (data.cmd == '!freset' && data.from == 'whiskers75') {
            game.removeAllListeners();
            bot.removeAllListeners('nick');
            bot.removeAllListeners('part');
            reset();
        }
	if (data.cmd == '!fdie' && data.from == 'whiskers75') {
	    bot.say('#cywolf', c.bold.red('Software Update initiated...'));
	    bot.say('#cywolf', c.bold.red('Waiting for update...'));
	    bot.removeAllListeners();
	    game.removeAllListeners();
	}
	if (game.phase == 'start') {
	    if (data.cmd == '!join') {
		
		game.emit('join', {player: data.from.toString()});
	    }
	    if (data.cmd == '!quit' || data.cmd == '!leave') {
                
		game.emit('quit', {player: data.from.toString()});
	    }
	    if (data.cmd == '!away') {
		if (_k(game.players).indexOf(data.from) !== -1) {
		    game.emit('quit', {player: data.from.toString()});
		}
		bot.kick('#cywolf', data.from, 'You go be away somewhere else, or use /away next time.');
	    }
	    if (data.cmd == '!stats') {
		bot.send('#cywolf', 'Players: ' + _k(game.players).join(' '));
	    }
	    if (data.cmd == '!ping' && data.from == 'whiskers75') {
		bot.names('#cywolf', function(er, names) {
		    bot.send('#cywolf', 'PING (by operator)! ' + names.join(' '));
		});
	    }
	    if (data.cmd == '!voices' && data.from == 'whiskers75') {
		bot.names('#cywolf', function(er, name) {
		    bot.mode('#cywolf', '-v', name);
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
	    if (data.cmd == '!lynch' || data.cmd == '!vote') {
		game.lynch(data.args[1], data.from);
	    }
	}
    });
}
bot.on('join', function(data) {
    if (data.nick != 'cywolf2') {
	return;
    }
    reset();
});
setInterval(function() {
    if (typeof game != "undefined") {
	if (game.phase !== 'start') {
	    console.log('idle timers activated');
	_k(game.players).forEach(function(player) {
	    if ((new Date().getTime / 1000) - idletimes[player] >= 120) {
		bot.send(player, c.bold.red('You have been idling for a while. Say something soon in #cywolf or you may be declared dead.'));
	    }
            if ((new Date().getTime / 1000) - idletimes[player] >= 150) {
		game.kill(player, ' died of idling.');
	    }
	});
    }
    }
}, 5000);
