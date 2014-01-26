var irc = require('slate-irc');
var c = require('irc-colors');
var winston = require('winston');
var net = require('net');
var rate = true;
var rate2 = true;
var idletimes = {};
var over = false;
var away = [];
var fs = require('fs');
var Wolfgame = require('cywolf');
var stream = net.connect({
    port: process.env.IRC_PORT,
    host: process.env.IRC_HOST
});
var bot = irc(stream);
var nick = process.env.NICK || 'cywolf';
var chan = process.env.CHAN || '#cywolf';
var _k = Object.keys;
bot.pass(process.env.PASSWORD);
bot.nick(nick);
bot.user('cywolf', 'Cywolf');
bot.join(chan);
var game = new Wolfgame();
winston.info('Starting Cyril...');
winston.info('Determining package versions...')
var cyrilver = 2;
var cywolfver = 2;
try {
    var thispkg = require('./package.json');
    cyrilver = thispkg.version;
    winston.info('Determined Cyril version: ' + cyrilver);
    var thatpkg = require('./node_modules/cywolf/package.json');
    cywolfver = thatpkg.version;
    winston.info('Determined Cywolf version: ' + cywolfver);
} catch (e) {
    winston.error('Failed to determine versions: ' + e)
}

function g() {
    return game;
}

function reset() {
    winston.info('Cywolf reset!');
    bot.mode(chan, '-m');
    bot.send(chan, 'Welcome to Cywolf ' + cywolfver + ' (cyril ' + cyrilver + '). Start a game with !join.');
    game = new game.constructor();
    over = false;
}
game.on('joined', function (data) {
    bot.mode(chan, '+v', data.player);
    winston.info(data.player + ' joined Cywolf.')
    if (_k(game.players).length == 1) {
        bot.send(chan, c.bold(data.player) + ' started a game of Cywolf. !join to join, !quit to leave, and !start to start.');
    } else {
        bot.send(chan, c.bold(data.player) + ' joined Cywolf. ' + c.bold(_k(game.players).length) + ' people playing.');
    }
});
game.on('quitted', function (data) {
    bot.mode(chan, '-v', data.player);
    winston.info(data.player + ' quit Cywolf.')
    bot.send(chan, c.bold(data.player) + ' quit Cywolf. ' + c.bold(_k(game.players).length) + ' people playing.');
});
game.on('lynch', function (data) {
    bot.send(chan, c.bold(data.from) + ' votes for ' + c.bold(data.to) + '.');
});
game.on('notice', function (data) {
    bot.notice(data.to, data.message);
});
game.on('gameover', function (data) {
    if (data.win == 'wolves') {
        bot.send(chan, c.bold('Game over!') + ' The ' + c.bold.red('wolves') + ' outnumbering the villagers, eat everyone and win.');
    }
    if (data.win == 'villagers') {
        bot.send(chan, c.bold('Game over!') + ' All the wolves are dead! The ' + c.bold.green('villagers') + ' chop them up, BBQ them and eat a hearty meal.');
    }
    var endstr = '';
    var devoice = [];
    _k(game.players).forEach(function (player) {
        if (game.players[player].role.toString() !== 'villager') {
            endstr += c.bold(game.players[player].name) + ' was a ' + c.bold(game.players[player].role.toString()) + '. ';
        }
        devoice.push(player);
    });
    _k(game.dead).forEach(function (player) {
        if (game.dead[player].role.toString() !== 'villager') {
            endstr += c.bold(game.dead[player].name) + ' was a ' + c.bold(game.dead[player].role.toString()) + '. ';
        }
        devoice.push(player);
    });
    devoice.forEach(function (player) {

        bot.mode(chan, '-v', player);
    });
    bot.send(chan, c.bold('Thanks for playing Cywolf!') + ' ' + endstr);
    game.removeAllListeners();
    bot.removeListener('message', onMessage);
    reset();
});
game.on('pm', function (data) {
    bot.send(data.to, data.message);
});
game.on('starting', function () {
    bot.send(chan, _k(game.players).join(', ') + ': Welcome to Cywolf, the fun party game. This is version ' + cywolfver + ' of Cywolf, and ' + cyrilver + ' of Cyril.');
    bot.mode(chan, '+m');
});

function onMessage(data) {
    idletimes[data.from] = new Date().getTime() / 1000;
    data.cmd = data.message.split(' ')[0];
    data.args = data.message.split(' ');
    if (data.cmd == '!freset' && data.from == 'whiskers75') {
        _k(game.players).forEach(function (player) {
            bot.mode(chan, '-v', player);
        });
        over = true;
        game.removeAllListeners();
        bot.removeListener('message', onMessage);
        reset();
    }
    if (data.cmd == '!fkill' && data.from == 'whiskers75') {
        if (_k(game.players).indexOf(data.args[1]) !== -1) {
            if (game.phase != 'start') {
                game.kill(data.args[1], ' was smitten by an admin, ' + data.from + '.');
            } else {
                $
                game.emit('quit', {
                    player: data.args[1]
                });
            }
        }
    }
    if (game.phase != 'start') {
        if (data.cmd == '!stats') {
            bot.send(chan, 'Players: ' + _k(game.players).join(', '));
        }
        if (data.cmd == '!idle') {
            if (_k(game.players).indexOf(data.args[1])) {
                if ((new Date().getTime()) - idletimes[data.args[1]] >= 100) {
                    bot.send(chan, data.args[1] + ': ' + c.bold.red('You have been idling for a long time. Please say something soon or you may be declared dead.'));
                }
                if ((new Date().getTime()) - idletimes[data.args[1]] >= 150) {
                    game.kill(data.args[1], ' died of idling.');
                }
            }
        }
    }
    if (data.cmd == '!quit' || data.cmd == '!leave') {
        if (game.phase == 'start') {
            game.emit('quit', {
                player: data.from.toString()
            });
        } else {
            game.kill(data.from, ' was killed by a horrible disease.');
        }
    }
    if (game.phase == 'start') {
        if (data.cmd == '!join') {
            game.emit('join', {
                player: data.from.toString()
            });
        }
        if (data.cmd == '!away') {
            if (away.indexOf(data.from) == -1) {
                away.push(data.from);
                bot.notice(data.from, 'You are now marked as away.');
            } else {
                bot.notice(data.from, 'You are already marked as away.');
            }
        }
        if (data.cmd == '!back') {
            if (away.indexOf(data.from) !== -1) {
                away.splice(away.indexOf(data.from), 1);
                bot.notice(data.from, 'You are no longer marked as away.');
            } else {
                bot.notice(data.from, 'You are not marked as away.');
            }
        }
        if (data.cmd == '!stats') {
            bot.send(chan, 'Players: ' + _k(game.players).join(' '));
        }
        if (data.cmd == '!roles') {
            if (game.listRoles) {
                game.listRoles(function (roles) {
                    bot.send(chan, 'Implemented roles: ' + roles);
                });
            }
        }
        if (data.cmd == '!ping') {
            if (rate) {
                bot.names(chan, function (er, names) {
                    away.forEach(function (name) {
                        if (names.indexOf(name) !== -1) {
                            names.splice(names.indexOf(name), 1);
                        }
                    });
                    _k(game.players).forEach(function (name) {
                        if (names.indexOf(name) !== -1) {
                            names.splice(names.indexOf(name), 1);
                        }
                    });
                    names.splice(names.indexOf(nick), 1);
                    bot.send(chan, 'PING! ' + names.join(' '));
                });
                rate = false;
                setTimeout(function () {
                    rate = true;
                }, 120000);
            } else {
                bot.notice(data.from, 'This command is ratelimited.');
            }
        }
        if (data.cmd == '!voices' && data.from == 'whiskers75') {
            bot.names(chan, function (er, name) {
                bot.mode(chan, '-v', name);
            });
        }
        if (data.cmd == '!start') {
            if (_k(game.players).length >= 4 || data.from == 'whiskers75') {
                game.emit('start');
            } else {
                bot.notice(data.from, '4 or more players must be playing to use this.');
            }
        }
    }
    if (game.phase == 'night' && data.to == nick && _k(game.players).indexOf(data.from) !== -1) {
        if (game.players[data.from].role.canAct && data.cmd == game.players[data.from].role.actName) {
            if (game.players[data.from].role.canAct && !game.players[data.from].role.acted) {
                game.players[data.from].role.act(data.args[1]);
                var done = true;
                _k(game.players).forEach(function (player) {
                    if (!game.players[player].role.acted && game.players[player].role.canAct) {
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
        if (data.cmd == '!retract') {
            delete game.lynches[data.from];
            bot.send(chan, c.bold(data.from) + ' retracted their vote.');
        }
    }
    if (game.phase != 'start') {
        _k(game.players).forEach(function (player) {
            player = game.players[player];
            if (_k(player.role.commands).indexOf(data.cmd) !== -1 && data.from == player.name) {
                player.role.commands[data.cmd](data.args)
            }
        });
    }
}
bot.on('message', onMessage);
game.on('tolynch', function () {
    bot.send(chan, 'The villagers must now decide who to lynch. Use ' + c.bold('!lynch [player]') + ' to do so.');
    bot.send(chan, 'A majority of ' + c.bold(_k(process.game.players).length - (_k(process.game.players).length > 4 ? 2 : 1)) + ' votes will lynch. The villagers have only ' + c.bold(_k(process.game.players).length + ' minutes') + ' to lynch, otherwise the sun will set and night will fall.');
    game.timeouts.push(setTimeout(function () {
        if (game.phase == 'day') {
            game.emit('night');
        }
    }, _k(process.game.players).length * 60000));
    game.timeouts.push(setTimeout(function () {
        if (game.phase == 'day') {
            bot.send(chan, c.bold('As the sun sinks inexorably toward the horizon, the villagers are reminded that they only have one more minute to make their decision, otherwise the sun will set and night will fall.'));
        }
    }, (_k(process.game.players).length * 60000) - 60000));
});
game.on('death', function (data) {
    bot.send(chan, c.bold('☠ ' + data.player) + (data.reason ? data.reason : ' was mauled by werewolves and died.') + ' After searching their pockets, it was revealed that they were a ' + c.bold(data.role) + '.');
    bot.send(data.player, c.bold('☠ ') + ' You have died!');
    bot.mode('#cywolf', '-v+q', data.player);
});
game.on('night', function () {
    _k(game.players).forEach(function (player) {
        player = game.players[player];
        if (player.role.canAct && !player.role.acted) {
            bot.send(player.name, 'You are a ' + c.bold(player.role.toString()) + '.');
            bot.send(player.name, player.role.description);
            bot.send(player.name, 'You can ' + player.role.actName + ' the following: ' + _k(game.players).join(', '));
            bot.send(player.name, 'PM me "' + player.role.actName + ' [player]" when you have made your choice.');
        }
        if (player.onNight) {
            player.onNight();
        }
    });
    bot.send(chan, c.bold('☾') + ' It is now ' + c.bold('night') + '. All players check for PMs from me for instructions. If you did not recieve one, simply sit back, relax and wait until morning (max 2 mins).');
});
process.on('uncaughtException', function (err) {
    try {
        bot.send(chan, c.bold.red('Uncaught Exception: ' + err + '! More data printed to console.'));
        bot.mode(chan, '-m');
        bot.mode(chan, '+o', 'whiskers75');
    } catch (e) {
        console.log(e)
    }
    console.log(err + err.stack);
});

function onPart(data) {
    if (_k(game.players).indexOf(data.nick) !== -1) {
        if (game.phase !== 'start') {
            game.kill(data.nick, ' left the village, and died.');
        } else {
            game.emit('quit', {
                player: data.nick
            });
        }
    }
}
bot.on('part', onPart);

function onNick(data) {
    if (_k(game.players).indexOf(data.nick) !== -1) {
        if (game.phase !== 'start') {
            game.kill(data.nick, ' died of the horrible Nick-Changing Disease. Let this be a lesson to all!');
        } else {
            game.emit('quit', {
                player: data.nick
            });
        }
    }
}
bot.on('nick', onNick);
reset();
