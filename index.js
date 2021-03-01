const io = require('socket.io')(process.env.PORT || 80); 

//custom classes

const _Player = require("./classes/player.js");
const _Player_data = require("./classes/player_data.js");
server_log('Server has started');

var Player_list = [];
var socket_list = [];

io.on('connection', function(socket) {

    var player = new _Player();
    var player_data = new _Player_data();
    var thisPlayerID = player.id;

    Player_list[thisPlayerID] = player;
    socket_list[thisPlayerID] = socket;

    //tell client that this is the unique id
    socket.emit('register', {id: thisPlayerID})

    socket.emit('spawn', player);
    socket.broadcast.emit('spawn', player);
    

    //tell client about everyone in the game

    for(var playerID in Player_list) {
        if(playerID != thisPlayerID){
            socket.emit('spawn', Player_list[playerID]);
        }
    }
    server_log("Client ["+thisPlayerID+"] have connected to a server", 0);
    
    //position packets

    socket.on('UpdatePosition', function(data) {
        player.position.x = data.position.X;
        player.position.z = data.position.Z;

        socket.broadcast.emit('test', player);
        server_log("Client ["+data.ID+"] position is equal to : "+data.position.X + ","+data.position.Y+","+data.position.Z);
    });

    socket.on('disconnect', function() {
        socket.broadcast.emit('disconnected', player)
        server_log("A client ["+thisPlayerID+"] have disconnected", 1);
        delete Player_list[thisPlayerID];
        delete socket_list[thisPlayerID];
    });
});




















//Console Manager

    //0 = green
    //1 = yellow
    //2 = red

    function server_log(content, type){
        let currentDate = new Date();
        let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
        var content = "["+time+"] "+content;
        if(type == null){
            console.log('\u001b[' + 90 + 'm' + content + '\u001b[0m');
        }
        if(type == 0){
            console.log('\u001b[' + 32 + 'm' + content + '\u001b[0m');
        }
        if(type == 1){
            console.log('\u001b[' + 93 + 'm' + content + '\u001b[0m');
        }
        if(type == 2){
            console.log('\u001b[' + 31 + 'm' + content + '\u001b[0m');
        }
    }