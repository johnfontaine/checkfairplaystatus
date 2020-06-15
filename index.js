const fs = require('fs');
const rp = require('request-promise');
var myArgs = process.argv.slice(2);
if (myArgs.length != 1) {
    console.log("Usage: node index.js <username>");
    process.exit();
}
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
            if (game.white.username == username) {
                opponents.add(game.black.username);
            } else {
                opponents.add(game.black.username);
            }
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
            cheaters.push(player.username);
        } 
    }
    console.log("Got " + opponents.size + " Opponents" + " Found " + cheaters.length + " opponents with accounts closed for fairplay violations");
    return cheaters;
}

async function main() {
    let cheaters = await find_cheaters(USERNAME);
    console.log("Found Cheaters:");
    for(var cheat of cheaters) {
        console.log("\t " + cheat);
    }
}

main();