//ws://127.0.0.1:52300/socket.io/?EIO=3&transport=websocket
//ws://45.32.234.225:52300/socket.io/?EIO=3&transport=websocket



const io = require('socket.io')(process.env.PORT || 52300);  
const Server = require('./classes/server.js');

const Console = require('./classes/console');
const ServerConsole = new Console();

const fs = require('fs');

const Debug = require('./classes/debug');
const DEBUG = new Debug();

ServerConsole.LogEvent("Server started", null, 0);
fs.writeFile('Server_Logs.txt', "Server has been started"+"\n", (err) => {
    if(err) throw err;
});

let server = new Server();

DEBUG.ShowAttackpackets = false;
DEBUG.ShowPLayersTargetData = false;
DEBUG.ShowPlayersMovementData = false;

io.on('connection', function(socket){
    let connection = server.OnConnected(socket);
    connection.CreateEvents();
    connection.socket.emit('register', {'id':connection.player.id});
});

//server side command handler

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (text) {
  ServerConsole.LogEvent(text, null, null);
  if (text.trim() === 'stop') {
    quit();
  }
});

function quit() {
    ServerConsole.LogEvent('Server shut down!', null, 2);
    process.exit();
}

/*
var Player_list = []; 
var socket_list = []; 
var ID_list = []; 
var Player_username_list = []; 
var public_chat = []; 
var Player_Count = 0; 
var Gamedata = new _GameData();

io.on('connection', function(socket) { 
    var player = new _Player(); 
    var thisPlayerID = player.id; 
    ID_list.push(thisPlayerID); 
    Player_list[thisPlayerID] = player; 
    socket_list[thisPlayerID] = socket; 

    socket.on('handshake', function(data) {  
        player.username = data.username; 
        server_log("username : "+data.username, 0); 
        serverLogs_log("Client username: "+data.username);
        socket.emit('verify', player); 
        Player_username_list[thisPlayerID] = player.username; 

        socket.broadcast.emit('spawn', player); 

        for(var playerID in Player_list) { 
            if(playerID != thisPlayerID){ 
                socket.emit('spawn', Player_list[playerID]); 
                
            }
        }
        var ip = socket.request.connection.remoteAddress; 
        server_log("Client ["+thisPlayerID+"]["+ip+"] have connected to a server. New client count is "+Player_Count, 0);

        serverLogs_log("Client connected to the server!");
        serverLogs_log("Client ID: "+thisPlayerID);
        serverLogs_log("Client IP address: "+ip);

    });

    socket.emit('register', {id: thisPlayerID}); 
    socket.emit('spawn', player); 

    var MaxPlayers = 100;

    if(Player_Count > MaxPlayers){ 
        Disconnect();
    }

    
    
    //position packets

    socket.on('UpdatePosition', function(data) {
        if(player.IsAlive){
            player.position.x = data.position.X;
            player.position.y = data.position.Y;
            player.position.z = data.position.Z;
            
    
            socket.broadcast.emit('UpdatePosition', player);
            //server_log("Client ["+data.ID+"] position is equal to : "+data.position.X + ","+data.position.Y+","+data.position.Z+" : Player is looking at: ["+player.lookingAt+"]."); //käytetään koodin debuggaamiseen. Printtaa kaikkien liittyneiden liikeradat
        }
        
    });

    socket.on('UpdateTarget', function(data) {
        player.lookingAt = data.target;
        //server_log("Client ["+thisPlayerID+"] is looking at: ["+player.lookingAt+"].");nod
    });

    socket.on('SendAttackPacket', function(data) {
    if(player.IsAlive){
        Packet_Sender = thisPlayerID;
        packet_effected = player.lookingAt;
        //server_log(packet_effected+" Got shot by : "+Packet_Sender, 3);

        if(packet_effected != Packet_Sender){
            for (let index = 0; index < ID_list.length; index++) {
                if(packet_effected == ID_list[index]){

                    if(Gamedata.have_started && Player_list[ID_list[index]].team == Player_list[Packet_Sender].team){
                        server_log("Team grieffing is not cool my man!", 3);
                    }
                    else{
                        Player_list[ID_list[index]].health -= 10;

                        if(Player_list[ID_list[index]].health < 0){
                            var username = Player_list[ID_list[index]].username;
                            var sender_username = Player_list[thisPlayerID].username;

                            socket.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});
                            socket.broadcast.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});

                            KillClient(packet_effected);
                        }
                        else{
                            socket.emit('UpdateHealth', Player_list[ID_list[index]]);
                            socket.broadcast.emit('UpdateHealth', Player_list[ID_list[index]]);
        
                            server_log(Player_list[ID_list[index]].health, 3);
                        }
                    }

                }
            }
        }
        else{
            server_log("packet receiver cannot be sender!", 2);
        }
    }
    else{
        server_log("Cannot attack dead player!", 2);
    }
    });

    socket.on('SendMessageToServer', function(data) {
        var message = data.content;
        var username = data.username;

        //command manager
        if(message.lastIndexOf("/", 0) === 0){
            var array = [];
            array = message.split(' ');
            server_log("Command was ran", 1);
                if(message == "/start"){
                    StartGame();
                }
                if(message.lastIndexOf("/kick", 0) === 0){
                    if(array[1] != null){
                        Kick(array[1]);
                    }
                }
                
        }

        server_log("["+thisPlayerID+"]<"+username+">: "+message+"", 3);
        public_chat.push("["+username+"]: "+message);
    
        socket.emit('MessageEventVerification', {content: message});
        socket.broadcast.emit("MessageEventReceived", {content: public_chat[public_chat.length -1]});
        

    });


    

    socket.on('disconnect', function() {
        socket.emit('disconnected', player)
        socket.broadcast.emit('disconnected', player)
        Player_Count -= 1;
        server_log("A client ["+thisPlayerID+"] have disconnected", 1);
        delete Player_list[thisPlayerID];
        delete socket_list[thisPlayerID];
        IsConnected = false;

        for (let index = 0; index < ID_list.length; index++) {
            if(thisPlayerID == ID_list[index]){
                delete ID_list[index];
                ID_list.length -= 1;
            }
            
        }
    });

    function StartGame(){
        if(Player_Count  < 2){
            server_log("Cannot Start game since there are not enough players!", 2);
            return;
        }
        server_log("Game was started!", 0);

        socket.emit("MessageEventReceived", {content: "[SERVER] Game is starting soon"});
        socket.broadcast.emit("MessageEventReceived", {content: "[SERVER] Game is starting soon"});


        //RANDOM PARTIES

        for (let index = 0; index < ID_list.length; index++) {
            if(index+1 % 2 == 1){
                //red Team'
                id = ID_list[index];
                target = Player_list[id];
                targetSocket = socket_list[id];
                target.IsAlive = false;

                target.team = "RED";
                server_log("["+target.username+"] was assinged to the blue team!", 2);
                targetSocket.emit('SetTeam', target);
                targetSocket.broadcast.emit('SetTeam', target);

                target.position.x = 77.855;
                target.position.y = -3.06;
                target.position.z = 33.191;

                targetSocket.broadcast.emit('UpdatePosition', target);
                targetSocket.emit('Move', target);

                setTimeout(() => {
                    targetSocket.emit('Respawn', target);
                    target.IsAlive = true;
                }, 1000);

            }
            else{
                //blue team
                id = ID_list[index];
                target = Player_list[id];
                targetSocket = socket_list[id];
                target.IsAlive = false;

                target = Player_list[id];
                target.team = "BLUE";
                server_log("["+target.username+"] was assinged to the blue team!", 0);
                targetSocket.emit('SetTeam', target);
                targetSocket.broadcast.emit('SetTeam', target);

                target.position.x = -26;
                target.position.y = -3.6;
                target.position.z = -71.8

                targetSocket.broadcast.emit('UpdatePosition', target);
                targetSocket.emit('Move', target);

                setTimeout(() => {
                    targetSocket.emit('Respawn', target);
                    target.IsAlive = true;
                }, 1000);

            }
        }

        Gamedata.have_started = true;
    
    }

    function KillClient(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        target.IsAlive = false;

        target.position.x = 77.855;
        target.position.y = -3.06;
        target.position.z = 33.191;

        targetSocket.broadcast.emit('UpdatePosition', target);
        targetSocket.emit('Die', target);


        server_log("Killed client!", 2);
        setTimeout(() => {
            Respawn(ID);
        }, 1000);
        server_log("revived client!", 0);

    }

    function Respawn(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        target.health = 100;
        socket.emit('UpdateHealth', Player_list[ID]);
        socket.broadcast.emit('UpdateHealth', Player_list[ID]);

        target.IsAlive = true;
        targetSocket.broadcast.emit('UpdatePosition', target);
        targetSocket.emit('Respawn', target);
        socket.broadcast.emit("MessageEventReceived", {content: "["+target.username+"] Respawned!"});
    }

    function Kick(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        targetSocket.emit('disconnected', target)
        targetSocket.broadcast.emit('disconnected', target)
        Player_Count -= 0;
        server_log("A client ["+ID+"] have disconnected", 1);
        delete Player_list[ID];
        delete socket_list[ID];
        IsConnected = false;

        for (let index = 0; index < ID_list.length; index++) {
            if(ID == ID_list[index]){
                delete ID_list[index];
                ID_list.length -= 1;
            }
            
        }
    }

    function Disconnect(ID){
        targetSocket = socket_list[ID];
        targetSocket.emit('disconnected', player)
        targetSocket.broadcast.emit('disconnected', player)
        Player_Count -= 0;
        server_log("A client ["+ID+"] have disconnected", 1);
        delete Player_list[ID];
        delete socket_list[ID];
        IsConnected = false;

        for (let index = 0; index < ID_list.length; index++) {
            if(ID == ID_list[index]){
                delete ID_list[index];
                ID_list.length -= 1;
            }
            
        }
    }
    
});




















//Console Manager

    //0 = green
    //1 = yellow
    //2 = red
    //3 = white

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
        if(type == 3){
            console.log(content);
        }
    }


    function serverLogs_log(content){
        let currentDate = new Date();
        let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
        content_array = content.split('/');
        for (let index = 0; index < content_array.length; index++) {
            if(content_array[index] != null){
                var content_ = "["+time+"] "+content_array[index]+"\n";
                fs.appendFile('server_logs.txt', content_, (err) => {
                    if(err) throw err;
                });    
            }     
            
        }
    }

*/