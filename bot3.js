var winston = require('winston');
var Cywolf = require('cywolf');
var irc = require('irc');
var c = require('irc-colors');
var names = {};
var _k = Object.keys;
var hosts = {};
winston.info('Starting Cyril 3...');
var bot = new irc.Client('chat.freenode.net', 'cywolf', {
    userName: 'cywolf',
    nick: 'cywolf',
    password: process.env.PASSWORD,
    realName: 'by whiskers75 - http://whiskers75.com',
    port: 6667,
    debug: false,
    showErrors: false,
    autoRejoin: true,
    autoConnect: true,
    channels: ['#cywolf'],
    secure: false,
    selfSigned: false,
    certExpired: false,
    floodProtection: false,
    floodProtectionDelay: 1000,
    sasl: true,
    stripColors: false,
    channelPrefixes: "&#",
    messageSplit: 512
});
winston.info('Creating new Cywolf();')
var game = new Cywolf();
winston.info('Connecting to IRC...')
bot.mode = function (user, mode) {
    bot.send('MODE', '#cywolf', mode, user);
}

function reset() {
    game = new Cywolf();
    game.on('joined', function (data) {
        winston.info(data.player + ' joined Cywolf. Player count: ' + _k(game.players).length)
        say(c.bold(data.player) + ' (' + hosts[data.player] + ') joined Cywolf. Player count: ' + c.bold(_k(game.players).length))
        bot.send('MODE', '#cywolf', '+v', data.player);
    })
    game.on('quitted', function (data) {
        winston.info(data.player + ' left Cywolf. Player count: ' + _k(game.players).length)
        say(c.bold(data.player) + ' (' + hosts[data.player] + ') left Cywolf. Player count: ' + c.bold(_k(game.players).length))
        bot.send('MODE', '#cywolf', '-v', data.player);
    })
    game.on('starting', function () {
        winston.info('Cywolf is starting...');
        say(_k(game.players).join(', ') + ': Welcome to Cyril 3.0. This IRC bot uses the cywolf module (http://cywolf.co.uk).')
        bot.send('MODE', '#cywolf', '+m')
    })
    game.on('pm', function (data) {
        bot.say(data.to, data.message);
    });
    game.on('gameover', function (data) {
        if (data.win == 'wolves') {
            say(c.bold('Game over!') + ' The ' + c.bold.red('wolves') + ' outnumbering the villagers, eat everyone and win.');
        }
        if (data.win == 'villagers') {
            say(c.bold('Game over!') + ' All the wolves are dead! The ' + c.bold.green('villagers') + ' chop them up, BBQ them and eat a hearty meal.');
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
            bot.send('MODE', '#cywolf', '-v', player);
        });
        bot.send('MODE', '#cywolf', '-m')
        say(c.bold('Thanks for playing Cywolf!') + ' ' + endstr);
        reset();
    });
    game.on('death', function (data) {
        bot.say('#cywolf', c.bold('☠ ' + data.player) + (data.reason ? data.reason : ' was mauled by werewolves and died.') + ' After searching their pockets, it was revealed that they were a ' + c.bold(data.role) + '.');
        bot.send('MODE', '#cywolf', '-v', data.player);
    })
    game.on('lynch', function (data) {
        say(c.bold(data.from) + ' votes for ' + c.bold(data.to) + '.');
    });
    game.on('tolynch', function () {
        say('The villagers must now decide who to lynch. Use ' + c.bold('!lynch [player]') + ' to do so.');
        say('A majority of ' + c.bold(_k(game.players).length - (_k(game.players).length > 4 ? 2 : 1)) + ' votes will lynch. The villagers have only ' + c.bold(_k(game.players).length + ' minutes') + ' to lynch, otherwise the sun will set and night will fall.');
    });
    game.on('night', function () {
        winston.info('It is now night.');
        _k(game.players).forEach(function (player) {
            player = game.players[player];
            if (player.role.canAct && !player.role.acted) {
                bot.say(player.name, 'You are a ' + c.bold(player.role.toString()) + '.');
                bot.say(player.name, player.role.description);
                bot.say(player.name, 'You can ' + player.role.actName + ' the following: ' + _k(game.players).join(', '));
                bot.say(player.name, 'PM me "' + player.role.actName + ' [player]" when you have made your choice.');
            }
            if (player.onNight) {
                player.onNight();
            }
        });
        say(c.bold('☾') + ' It is now ' + c.bold('night') + '. All players check for PMs from me for instructions. If you did not recieve one, simply relax and wait for day.')
    })
    game.on('day', function () {
        say('It is now day.');
    })
    game.on('notice', function (data) {
        bot.say(data.to, data.message);
    });
}

function say(msg) {
    bot.say('#cywolf', msg);
}
bot.on('join#cywolf', function (nick) {
    if (nick == 'cywolf') {
        winston.info('Connected and joined #cywolf.')
        say('Welcome to Cyril 3.');
        bot.mode('-m');
        _k(names).forEach(function (name) {
            if (names[name] == '+') {
                bot.send('MODE', '#cywolf', '-v', name);
            }
        });
        reset();
        bot.on('names', function (n) {
            names = n;
        });
        bot.on('part#cywolf', function (nick) {
            if (game.phase == 'start') {
                game.emit('quit', {
                    player: nick
                });
            } else {
                game.kill(nick, ' fell off a cliff.')
            }
        });
        bot.on('nick', function (old, to) {
            if (_k(game.players).indexOf(old) !== -1) {
                game.players[to] = game.players[old];
                delete game.players[old];
                delete game.lynches[old];
            }
        })
        bot.on('message', function (nick, to, text, message) {
            var cmd = text.split(' ')[0];
            var args = text.split(' ');
            hosts[nick] = message.host;
            if (cmd == '!freset' && nick == 'whiskers75') {
                reset();
                say(c.bold.red('Cywolf has been reset.'));
                bot.send('MODE', '#cywolf', '-m')
            }
            if (game.phase == 'day' && to == '#cywolf') {
                if (cmd == '!lynch' || cmd == '!vote') {
                    game.lynch(args[1], nick)
                }
            }
            if (cmd == '!stats') {
                say(c.bold(_k(game.players).length) + ' players: ' + _k(game.players).join(', '));
            }
            if (cmd == '!quit' || cmd == '!leave') {
                if (game.phase == 'start') {
                    game.emit('quit', {
                        player: nick
                    });
                } else {
                    game.kill(nick, ' quit the game.');
                }
            }
            if (game.phase == 'start' && to == '#cywolf') {
                if (cmd == '!join') {
                    game.emit('join', {
                        player: nick
                    });
                }

                if (cmd == '!ping') {
                    var s = 'PING! ';
                    bot.once('names', function (names) {
                        _k(names).forEach(function (name) {
                            s += name + ' ';
                        });
                        say(s);
                    });
                    bot.send('NAMES', '#cywolf')
                }
                if (cmd == '!start') {
                    if (_k(game.players).length >= 4) {
                        game.emit('start');
                    } else {
                        say('Four or more people need to be playing to use this.');
                    }
                }
            }
            if (game.phase == 'night' && to == 'cywolf') {
                if (cmd == game.players[nick].role.actName && game.players[nick].role.canAct && !game.players[nick].role.acted) {
                    game.players[nick].role.act(args[1]);
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
        });
    }
});
bot.on('error', function (err) {
    winston.error(err);
})
bot.on('raw', function (data) {
    if (data.command != 'rpl_motd' && data.command != 'PING' && process.env.DEBUG == 'yes') {
        winston.info(data.command + ' ' + data.args.join(' '))
    }
});