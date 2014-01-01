String.prototype.repeat = function( num ) {
    return new Array( num + 1 ).join( this );
};
var irc = require('irc');
var c = require('irc-colors');
var winston = require('winston');
var ready = false;
var players = [];
var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var server = http.createServer(app).listen(process.env.PORT);
var io = require('socket.io').listen(server);
io.configure(function() {
    io.set('transports', ['xhr-polling']);
});
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));
var rate = true;
var phase = 'joins';
var dead = [];
var taken = '';
var lynches = {};
var firstnight = true;
var proles = {};
var flair = {whiskers75: 'cywolf/admin', NeonWabbit: 'cywolf/betatester', redcorn: 'cywolf/betatester', kholerabbi: 'cywolf/betatester'};
var admins = ['whiskers75'];
var debug = true;
var timer = false;
var killed = false;
var names = {};
var actions = [];
var wreset = false;
var seen = false;
var Chance = require('chance');
var chance = new Chance();
var bot = new irc.Client('znc.whiskers75.com', 'cywolf', {
    userName: 'cywolf/freenode',
    password: process.env.PASSWORD,
    realName: 'by whiskers75 - http://whiskers75.com',
    port: 1025,
    debug: false,
    showErrors: false,
    autoRejoin: true,
    autoConnect: true,
    channels: [],
    secure: false,
    selfSigned: false,
    certExpired: false,
    floodProtection: false,
    floodProtectionDelay: 1000,
    sasl: false,
    stripColors: false,
    channelPrefixes: "&#",
    messageSplit: 512
});
winston.info('Starting Cywolf...');
bot.on('names#cywolf', function(newnames) {
    winston.info('In channel: ' + JSON.stringify(newnames));
    process.names = newnames;
    var ops = [];
    if ('whiskers75' in Object.keys(process.names)) {
	ops.push('whiskers75');
    }
    io.sockets.emit('ops', {ops: ops});
    if (wreset) {
	reset();
    }
});
bot.on('nick', function(oldn, newn) {
    if (players.indexOf(oldn) !== -1) {
	players.push(newn);
	players.splice(players.indexOf(oldn), 1);
	proles[newn] = proles[oldn];
	delete proles[oldn];
    }
});
bot.on('join#cywolf', function(nick) {
    if (nick == 'cywolf') {
	return;
    }
    if (phase == 'joins') {
	bot.say(nick, 'Welcome to Cywolf!');
	bot.say(nick, 'Join the game with !join.');
    }
    else {
	bot.say(nick, 'Welcome to Cywolf!');
	bot.say(nick, 'There\'s currently a game in progress, but when it\'s finished you can join the game with !join.');
    }
    bot.say(nick, c.bold('Cywolf website: ') + 'http://cywolf.herokuapp.com/ (updates in real-time!');
    bot.say(nick, c.blue('Cywolf is in beta!') + ' Help by submitting bug reports at bit.ly/cywolfbugs, and please bear with us!');
    bot.say(nick, 'One last thing - ' + c.bold('please don\'t idle') + '. It\'s annoying for other players.');
});
bot.on('part#cywolf', function(nick) {
    winston.info('part: ' + nick);
    if (players.indexOf(nick) !== -1) {
	if (phase !== 'joins') {
	    bot.say('#cywolf', c.bold(nick) + ' didn\'t get out of bed for a long time and died. It appears he/she was a ' + c.bold(proles[nick]) + '.');
	}
        players.splice(players.indexOf(killed), 1);
        if (killed == taken) {
            proles[process.doppelganger] = proles[killed];
            bot.say(process.doppelganger, 'You are now a ' + c.bold(proles[killed]) + '!');
            process[(proles[killed] == 'cursed villager' ? 'cursed' : proles[killed])] = process.doppelganger;
            process.doppelganger = '';
        }
        var wv = 0;
        var vi = 0;
        players.forEach(function(p) {
            if (proles[p] == 'wolf') {
                wv++;
            }
            else {
                vi++;
            }
        });
        if (wv >= vi || vi == 0 || wv == 0) {
            if (wv >= vi) {
                bot.say('#cywolf', 'The wolves, being the same number as the villagers, can now overpower everyone. They do so, and win.');
            }
            if (wv == 0) {
                bot.say('#cywolf', 'All the wolves are now dead.');
            }
            if (vi == 0) {
                bot.say('#cywolf', 'All the villagers are now dead.');
            }
            bot.say('#cywolf', c.bold('Game over!') + ' The ' + (wv == 0 ? c.bold.green('villagers') : c.bold.red('wolves')) + ' win!');
            var endStr = '';
            Object.keys(proles).forEach(function(name) {
                if (proles[name] == 'villager') {
                    return;
                }
                endStr += name + ' was a ' + c.bold(proles[name]) + '. ';
            });
            bot.say('#cywolf', endStr);
	    bot.say('#cywolf', c.bold('Please wait until you get the "Welcome to Cywolf" message before running commands.'));
            reset();
            return;
        }
    }
    io.sockets.emit('players', {players: players});
});
function day() {
    if (!killed || killed && proles[killed]) {
	phase = 'day';
        io.sockets.emit('phase', {phase: phase});
	firstnight = false;
	clearTimeout(timer);
	bot.say('#cywolf', c.bold('☀') + ' It is now day. The villagers wake up and look around...');
	winston.warn('Debug: arguments.callee.caller.toString() = ' + arguments.callee.caller.toString());
	if (killed) {
	    bot.say('#cywolf', 'The corpse of ' + c.bold(killed) + ' is found. Upon searching his/her pockets, it was revealed that he/she was a ' + c.bold(proles[killed]) + '.');
	    players.splice(players.indexOf(killed), 1);
            bot.send('MODE', '#cywolf', '-v', killed);
	    if (killed == taken) {
		proles[process.doppelganger] = proles[killed];
		bot.say(process.doppelganger, 'You are now a ' + c.bold(proles[killed]) + '!');
		process[(proles[killed] == 'cursed villager' ? 'cursed' : proles[killed])] = process.doppelganger;
		process.doppelganger = '';
	    }
	    var wv = 0;
	    var vi = 0;
	    players.forEach(function(p) {
		if (proles[p] == 'wolf') {
		    wv++;
		}
		else {
		    vi++;
		}
	    });
	    if (wv >= vi || vi == 0 || wv == 0) {
		if (wv >= vi) {
		    bot.say('#cywolf', 'The wolves, being the same number as the villagers, can now overpower everyone. They do so, and win.');
		}
		if (wv == 0) {
		    bot.say('#cywolf', 'All the wolves are now dead.');
		}
		if (vi == 0) {
		    bot.say('#cywolf', 'All the villagers are now dead.');
		}
		bot.say('#cywolf', c.bold('Game over!') + ' The ' + (wv == 0 ? c.bold.green('villagers') : c.bold.red('wolves')) + ' win!');
		var endStr = '';
		Object.keys(proles).forEach(function(name) {
		    if (proles[name] == 'villager') {
			return;
		    }
		    endStr += name + ' was a ' + c.bold(proles[name]) + '. ';
		});
		bot.say('#cywolf', endStr);
		bot.say('#cywolf', c.bold('Please wait until you get the "Welcome to Cywolf" message before running commands.'));
		reset();
		return;
	    }
	}
	else {
            var ted = players[chance.integer({min: 0, max: players.length - 1})];
            bot.say('#cywolf', 'The corpse of ' + c.bold(ted + '\'s teddy bear') + ' is found.');
	    bot.say('#cywolf', ted + ' mourns the tragedy, but the other villagers are not amused.');
	}
	killed = false;
	seen = false;
	
	bot.say('#cywolf', 'The villagers must now decide who to lynch with ' + c.bold('!lynch [player]') + '. A majority of ' + c.bold(players.length - (players.length - 1 + (players.length > 4 ? 1 : 0))) + ' votes will lynch.');
	bot.say('#cywolf', 'The villagers only have ' + c.bold('4 minutes') + ' to decide, otherwise the sun will set and night will start ' + c.bold('without warning') + '.');
	timer = setTimeout(function() {
            if (phase == 'day') {
		night();
            }
	}, 240000);
    }
    io.sockets.emit('players', {players: players});
}
function lynch(killed) {
    bot.say('#cywolf', 'As ' + c.bold(killed) + ' is being dragged to be lynched, he/she throws a grenade on the ground. It explodes early and ' + killed + ' dies.');
    bot.say('#cywolf', 'Upon searching his/her pockets, it was revealed that the villagers lynched a ' + c.bold(proles[killed]) + '.');
    players.splice(players.indexOf(killed), 1);
    if (killed == taken) {
        proles[process.doppelganger] = proles[killed];
        bot.say(process.doppelganger, 'You are now a ' + c.bold(proles[killed]) + '!');
        process[(proles[killed] == 'cursed villager' ? 'cursed' : proles[killed])] = process.doppelganger;
        process.doppelganger = '';
    }
    bot.send('MODE', '#cywolf', '-v', killed);
    var wv = 0;
    var vi = 0;
    players.forEach(function(p) {
        if (proles[p] == 'wolf') {
            wv++;
        }
        else {
            vi++;
        }
    });
    clearTimeout(timer);
    if (wv >= vi || vi == 0 || wv == 0) {
        if (wv >= vi) {
            bot.say('#cywolf', 'The wolves, being the same number as the villagers, can now overpower everyone. They do so, and win.');
        }
        if (wv == 0) {
            bot.say('#cywolf', 'All the wolves are now dead.');
        }
        if (vi == 0) {
            bot.say('#cywolf', 'All the villagers are now dead.');
        }
        bot.say('#cywolf', c.bold('Game over!') + ' The ' + (wv == 0 ? c.bold.green('villagers') : c.bold.red('wolves')) + ' win!');
        var endStr = '';
        Object.keys(proles).forEach(function(name) {
            if (proles[name] == 'villager') {
                return;
            }
            endStr += name + ' was a ' + c.bold(proles[name]) + '. ';
        });
        bot.say('#cywolf', endStr);
        bot.say('#cywolf', c.bold('Please wait until you get the "Welcome to Cywolf" message before running commands.'));
        reset();
    }
    else {
	night();
    }
    io.sockets.emit('players', {players: players});
}
function checkLynches() {
    var votes = {};
    winston.info('Checking lynches..');
    Object.keys(lynches).forEach(function(lynch) {
	lynch = lynches[lynch];
	if (!votes[lynch]) {
	    votes[lynch] = 0;
	}
	votes[lynch]++;
	winston.info('votes for ' + lynch + ': ' + votes[lynch]);
    });
    Object.keys(votes).forEach(function(vote) {
	var voted = votes[vote];
	winston.info('votes for ' + voted + ': ' + vote);
        if (voted >= (players.length - 1 + (players.length > 4 ? 1 : 0))) {
	    winston.info('lynching');
	    lynch(vote);
	    return;
	}
    });
}

function checkDay() {
    if (killed && seen) {
	day();
    }
}
function kill(target, wolf) {
    if (phase != 'night') {
	bot.say(wolf, c.bold.red('It is not night.'));
	return;
    }
    players.forEach(function(p) {
        if (p.indexOf(target) !== -1) {
            target = p;
        }
    });
    if (players.indexOf(target) == -1) {
	bot.say(wolf, c.bold.red('That person is not playing.'));
	return;
    }
    if (target == wolf) {
	bot.say(wolf, 'Suicide is not permitted.');
	return;
    }
    killed = target;
    bot.say(wolf, c.red('You have selected ') + c.bold.red(killed) + c.red(' to die.'));
    checkDay();
}
function see(player, seer) {
    if (phase != 'night') {
        bot.say(seer, c.bold.red('It is not night.'));
        return;
    }
    if (seen) {
	bot.say(seer, 'You have already seen.');
	return;
    }
    players.forEach(function(p) {
	if (p.indexOf(player) !== -1) {
	    player = p;
	}
    });
    if (player == seer) {
	bot.say(seer, 'You see that yourself is a seer. You hit yourself on the head and see a proper person.');
	return;
    }
    if (players.indexOf(player) == -1) {
        bot.say(seer, c.bold.red('That person is not playing.'));
        return;
    }
    bot.say(seer, c.green('You have a vision, in that vision you see that ' + player + ' is a ') + c.bold.green((proles[player] == 'cursed villager' ? 'wolf': proles[player])) + c.green('!'));
    seen = true;
    checkDay();
}
function allocRoles() {
    if (firstnight) {
	winston.info('Allocating roles..');
	var roled = []; // Players with roles
        var wolf = players[chance.integer({min: 0, max: players.length - 1})];
	process.wolves.push(wolf);
	proles[wolf] = 'wolf';
	roled.push(wolf);
	winston.info('Allocated wolf');
	players.splice(players.indexOf(wolf), 1); // To avoid 'wolfseers'
	if (players.length < 1) {
            roled.forEach(function(player) { // Restore players
		players.push(player);
            });
	    bot.say('#cywolf', c.bold.red('Role allocation error. Not enough players?'));
	    reset();
	    return false;
	}
	process.seer = players[chance.integer({min: 0, max: players.length - 1})];
	proles[process.seer] = 'seer';
	winston.info('Allocated seer');
	roled.push(process.seer);
	players.splice(players.indexOf(process.seer), 1);
	if (players.length >= 4) {
            process.cursed = players[chance.integer({min: 0, max: players.length - 1})];
	    proles[process.cursed] = 'cursed villager';
	    winston.info('Allocated cursed vil');
	    roled.push(process.cursed);
	    players.splice(players.indexOf(process.cursed), 1);
	}
	if (players.length >= 5) {
            process.doppelganger = players[chance.integer({min: 0, max: players.length - 1})];
	    proles[process.doppelganger] = 'doppelganger';
	    winston.info('Allocated doppelganger');
	    roled.push(process.doppelganger);
	    players.splice(players.indexOf(process.cursed), 1);
	}
	roled.forEach(function(player) { // Restore players
	    players.push(player);
	});
	roled = [];
    }
    process.wolves.forEach(function(wolf) {
	bot.say(wolf, 'You are a ' + c.bold.red('wolf!'));
	bot.say(wolf, 'Players to ' + c.red('kill') + ': ' + players.join(', '));
	bot.say(wolf, 'PM me "kill [player]" when you have made your choice.');
    });
    bot.say(process.seer, c.green('You are a ') + c.bold.green('seer!'));
    bot.say(process.seer, 'Players to see: ' + players.join(', '));
    bot.say(process.seer, 'PM me "see [player]" when you have made your choice.');
    if (process.doppelganger) {
	bot.say(process.doppelganger, 'You are a ' + c.bold.purple('doppelganger!'));
	bot.say(process.doppelganger, 'Choose someone to assume the role of (when they die).');
	bot.say(process.doppelganger, 'PM me "take [player]" when you have made your choice.');
    }
    players.forEach(function(player) {
	if (!proles[player]) {
	    proles[player] = 'villager';
	}
	winston.info('Role of ' + player + ': ' + proles[player]);
    });
    winston.info('Done allocating');
    return true;
}
function night() {
    killed = '';
    lynches = {};
    winston.info('It is now night.');
    phase = 'night';
    io.sockets.emit('phase', {phase: phase});
    if (allocRoles()) {
	bot.say('#cywolf', c.bold('☾') + ' It is now ' + c.bold('night') + '. All players check for PMs from me for instructions. If you did not recieve one, simply sit back, relax and wait until morning (max 2 mins).');
	timer = setTimeout(function() {
	    if (phase == 'night') {
		day();
	    }
	}, 120000);
    }
}
function start() {
    bot.say('#cywolf', players.join(', ') + ': Welcome to Cywolf, a JS variant of the popular party game Werewolf. This game was created by whiskers75.');
    winston.info('Starting game.');
    bot.send('MODE', '#cywolf', '+mnt');
    night();
}
function reset() {
    winston.info('Resetting Cywolf');
    bot.send('#cywolf', c.red('Please wait, resetting Cywolf...'));
    bot.send('MODE', '#cywolf', '-m');
    process.wolves = [];
    process.seer = '';
    process.doppelganger = '';
    Object.keys(process.names).forEach(function(name) {
        if (name == 'cywolf') {
            return;
        }
        if (process.names[name] == '+') {
            bot.send('MODE', '#cywolf', '-v', name);
        }
        if (process.names[name] == '@' && name != 'cywolf') {
            bot.send('MODE', '#cywolf', '-o', name);
            bot.send('MODE', '#cywolf', '-v', name);
        }
    });
    phase = 'joins';
    players = [];
    dead = [];
    proles = {};
    taken = '';
    lynches = {};
    killed = false;
    firstnight = true;
    seen = false;
    io.sockets.emit('phase', {phase: phase});
    bot.say('#cywolf', c.bold.green('Welcome to Cywolf!') + ' Commands: !join, !leave, !stats.');
    bot.say('#cywolf', c.blue('New Cywolf website!') + ' http://cywolf.herokuapp.com/');
    io.sockets.emit('players', {players: players});
}
io.sockets.on('connection', function(socket) {
    socket.emit('phase', {phase: phase});
    io.sockets.emit('players', {players: players});
});
bot.on('registered', function() {
    ready = true;
    wreset = true;
    bot.join('#cywolf');
    bot.send('NICK', 'cywolf');
    bot.say('ChanServ', 'OP #cywolf cywolf');
    winston.info('Cywolf started');
});
app.get('/', function(req, res) {
    res.render('index');
});
bot.on('message', function(nick, to, text, raw) {
    winston.info('<' + nick + '> ' + text);
    if (to == '#cywolf') {
    if (nick == 'whiskers75' && text == '!shutdown') {
	console.log('shutting down');
	bot.say('#cywolf', c.bold.red('Shutting down cywolf... (via command)'));
	setTimeout(function() {
	    bot.disconnect();
	    process.exit(0);
	}, 1000);
    }
    if (nick == 'whiskers75' && text == '!freset') {
	bot.say('#cywolf', c.bold.red('- Forcing a reset of Cywolf!'));
	bot.action('#cywolf', 'suddenly wakes up again, remembering nothing...');
	reset();
    }
    if (nick == 'whiskers75' && text == '!dump') {
	bot.say('#cywolf', 'proles = ' + JSON.stringify(proles));
    }
    if (nick == 'whiskers75' && text.split(' ')[0] == '!frole') {
	proles[text.split(' ')[1]] = text.split(' ')[2];
	bot.say('#cywolf', 'proles[' + text.split(' ')[1] + '] = ' + text.split(' ')[2]);
    }
    if (nick == 'whiskers75' && text == '!fstart') {
	start();
    }
    if (text == '!ping') {
	if (process.names && rate) {
	    var pingarray = [];
	    Object.keys(process.names).forEach(function(name) {
		if (players.indexOf(name) == -1 && name !== 'cywolf') {
		    pingarray.push(name);
		}
	    });
	    bot.say('#cywolf', 'PING! ' + pingarray.join(' '));
	    rate = false;
	    setTimeout(function() {
		rate = true;
	    }, 60000);
	}
	else {
	    bot.notice(nick, 'This command is ratelimited.');
	}
    }
    if (text == '!away') {
	bot.send('KICK', '#cywolf', nick, 'Leave if you want to idle!');
    }
    if (text == '!stats') {
	bot.say('#cywolf', c.bold(players.length) + ' players: ' + players.join(', '));
    }
    if (text == '!roles') {
        bot.say('#cywolf', '[4] wolf/seer [6] cursed villager [8] doppelganger (https://en.wikipedia.org/wiki/Ultimate_Werewolf#Roles)');
    }
    if (text == '!start') {
	if (players.length >= 4) {
	    start();
	}
	else {
	    bot.say('#cywolf', 'For now, 4 or more players need to be playing to use this.');
	}
    }
    if (text == '!dead') {
        bot.say('#cywolf', c.bold(dead.length) + ' dead players: ' + dead.join(', '));
    }
    if (text.split(' ')[0] == '!retract' && phase == 'day') {
	delete lynches[nick];
	bot.say('#cywolf', c.bold(nick) + ' retracted his/her vote.');
    }
    if (text.split(' ')[0] == '!votes' && phase == 'day') {
	bot.say('#cywolf', c.bold(Object.keys(lynches).length) + ' people have voted. Votes (JSON): ' + JSON.stringify(lynches));
    }
    if ((text.split(' ')[0] == '!lynch' || text.split(' ')[0] == '!vote') && phase == 'day') {
	var target = text.split(' ')[1];
        players.forEach(function(p) {
            if (p.indexOf(target) !== -1) {
                target = p;
            }
        });
        if (players.indexOf(target) == -1) {
	    bot.notice(nick, 'That player does not exist.');
	    return;
	}
	bot.say('#cywolf', c.bold(nick) + ' votes for ' + c.bold(target) + '.');
	lynches[nick] = target;
	checkLynches();
    }
    if (text.split(' ')[0] == '!join' && phase == 'joins') {
	if (players.indexOf(nick) !== -1) {
	    return bot.notice(nick, 'You are already playing.');
	}
	players.push(nick);
        bot.send('MODE', '#cywolf', '+v', nick);
	if (flair[nick]) {
	    bot.say('#cywolf', c.bold(nick) + ' (' + flair[nick] + ') has joined Cywolf. ' + c.bold(players.length) + ' have joined so far.');
	}
	else {
            bot.say('#cywolf', c.bold(nick) + ' (' + raw.host + ') has joined Cywolf. ' + c.bold(players.length) + ' have joined so far.');
	}
        io.sockets.emit('players', {players: players});
    }
    if ((text.split(' ')[0] == '!leave' || text.split(' ')[0] == '!quit') && players.indexOf(nick) !== -1) {
	players.splice(players.indexOf(nick), 1);
        bot.send('MODE', '#cywolf', '-v', nick);
        bot.say('#cywolf', c.bold(nick) + ' (' + raw.host + ') died of an unknown disease. ' + c.bold(players.length) + ' still remain.');
	if (players.length < 1) {
	    bot.say('#cywolf', c.bold('No players left!') + ' Resetting game.');
	    reset();
	}
        io.sockets.emit('players', {players: players});
    }
	}
    if (to == 'cywolf') {
	// Personal commands
        if (text.split(' ')[0] == 'see' && proles[nick] == 'seer') {
	    see(text.split(' ')[1], nick);
	}
	if (text.split(' ')[0] == 'kill' && proles[nick] == 'wolf') {
	    kill(text.split(' ')[1], nick);
	}
        if (text.split(' ')[0] == 'take' && proles[nick] == 'doppelganger') {
            taken = text.split(' ')[1];
            players.forEach(function(p) {
                if (p.indexOf(taken) !== -1) {
                    taken = p;
                }
            });
            if (players.indexOf(taken) == -1) {
                bot.notice(nick, 'That player does not exist.');
                return;
            }
	    bot.say(nick, 'You have chosen to assume the role of ' + c.bold(taken) + '.');
        }
    }
});
bot.on('error', function(err) {
    console.log(JSON.stringify(err));
});
process.on('SIGTERM', function() {
    bot.say('#cywolf', c.bold.red('Bot shutting down! (killed by console)'));
    process.exit(0);
});
process.on('uncaughtException', function(err) {
    bot.say('#cywolf', c.bold.red('- ERROR: ' + err));
    throw err;
});

