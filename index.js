const io = require('socket.io')(process.env.PORT || 52300); 

//custom classes

const _Player = require("./classes/player.js");
server_log('Server has started');

var Player_list = [];
var socket_list = [];
var public_chat = [];
var Player_Count = 0;

io.on('connection', function(socket) {

    var player = new _Player();
    var thisPlayerID = player.id;
    var IsConnected = false;
    Player_Count += 1;

    Player_list[thisPlayerID] = player;
    socket_list[thisPlayerID] = socket;

    //tell client that this is the unique id
    server_log("Request coming", 0);

    socket.on('handshake', function(data) {
        player.username = data.username;
        server_log("username : "+data.username, 2);
        socket.emit('verify', player);
    });

    socket.emit('register', {id: thisPlayerID});
    
    
    socket.emit('spawn', player);
    socket.broadcast.emit('spawn', player);
    
    

    //tell client about everyone in the game

    for(var playerID in Player_list) {
        if(playerID != thisPlayerID){
            socket.emit('spawn', Player_list[playerID]);
        }
    }
    server_log("Client ["+thisPlayerID+"] : ["+player.username+"] have connected to a server. New client count is "+Player_Count, 0);
    
    //position packets

    socket.on('UpdatePosition', function(data) {
        player.position.x = data.position.X;
        player.position.y = data.position.Y;
        player.position.z = data.position.Z;
        

        socket.broadcast.emit('UpdatePosition', player);
        server_log("Client ["+data.ID+"] position is equal to : "+data.position.X + ","+data.position.Y+","+data.position.Z+" : Player is looking at: ["+player.lookingAt+"].");
    });

    socket.on('UpdateTarget', function(data) {
        player.lookingAt = data.target;
        server_log("Client ["+data.ID+"] is looking at: ["+player.lookingAt+"].");
    });

    

    socket.on('disconnect', function() {
        socket.broadcast.emit('disconnected', player)
        Player_Count += 0;
        server_log("A client ["+thisPlayerID+"] have disconnected", 1);
        delete Player_list[thisPlayerID];
        delete socket_list[thisPlayerID];
        IsConnected = false;
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