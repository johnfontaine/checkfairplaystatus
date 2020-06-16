const fs = require('fs');
const rp = require('request-promise');
var myArgs = process.argv.slice(2);
if (myArgs.length != 1) {
    console.log("Usage: node index.js <username>");
    process.exit();
}
var games_x_opponent = {};
const USERNAME = myArgs[0];
async function get_player(username) {
    var player_info;
    try {
        player_info =  await rp({
            uri: 'https://api.chess.com/pub/player/' + username,
            json: true
        });
    } catch (error) {
        console.log('error', error);
    }
    return player_info;
}
async function find_cheaters(username) {
    var archives;

    var opponents = new Set();
    archives =  await rp({
        uri: 'https://api.chess.com/pub/player/'+ username + '/games/archives',
        json: true
    });
    //get last 4 months
    console.log("Fetching games and unique opponents for last 3 months")
    for (var i = archives.archives.length-1 ; i > archives.archives.length-4; i--) {
        
        if (i < 0) {
            break;
        }
        console.log("Getting " + i + " archive " + archives.archives[i])
        var games = await rp({
            uri: archives.archives[i],
            json: true
        });
        for (var game of games.games) {
            var opponent_name = game.white.username == username ? game.black.username : game.white.username;
            opponents.add(opponent_name);
            if (!games_x_opponent[opponent_name]) {
                games_x_opponent[opponent_name] = {games : [], player_info: {}};
            }
            game.opponent =  game.white.username == username ? game.black : game.white;
            games_x_opponent[opponent_name].games.push(game);
        }

    }
    var cheaters = [];
    console.log("Getting opponent data");
    var x = 0;
    for (var opponent of opponents.entries()) {
        x++;
        if (x % 10 == 0) {
            console.log("Fetched " + x + " of " +  opponents.size + " Opponents" )
        }
        var player = await get_player(opponent[0]);
        if (player.status == "closed:fair_play_violations") {
            cheaters.push(opponent[0]);
        } 
    }
    console.log("Got " + opponents.size + " Opponents" + " Found " + cheaters.length + " opponents with accounts closed for fairplay violations");
    return cheaters;
}

async function main() {
    let cheaters = await find_cheaters(USERNAME);
    console.log("Found Opponents with Fair Play Violation:");
    for(var cheat of cheaters) {
        console.log("\t " + cheat);
        for (var game of games_x_opponent[cheat].games) {
            console.log(`\t\t Opponent Rating: ${game.opponent.rating} Game: ${game.rules} Class: ${game.time_class} ${game.time_control} Opponent Result: ${game.opponent.result} Url: ${game.url}` );
        }
    }
}

main();