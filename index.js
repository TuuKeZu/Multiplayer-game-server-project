//molempien omistamieni servereiden ip osoitteet

//ws://127.0.0.1:52300/socket.io/?EIO=3&transport=websocket
//ws://45.32.234.225:52300/socket.io/?EIO=3&transport=websocket



const io = require('socket.io')(process.env.PORT || 52300);  //avaa portin liittymistä varten

const _Player = require("./classes/player.js"); //"class" on käytännössä datan tallennus paikka, jossa pidän kaikki tiedot pelaajasta.
const Vector3 = require('./classes/vector3.js');
const sleep = require('system-sleep');

server_log('Server has started'); //"server_log" on komento, jolla voidaan kirjoittaa konsoliin.

var Player_list = []; //lista pelaajista
var socket_list = []; //lista yhteyksistä
var ID_list = []; //lista liittyneiden yhteyksien uniikeista kiirjaintunnuksista
var Player_username_list = []; //lista pelaajien nimistä
var public_chat = []; //chat, eli pelaajille pelissä näkyvä kirjoitusalusta
var Player_Count = 0; //liittyneiden pelaajien määrä

var CanMove = true;

io.on('connection', function(socket) {
    var player = new _Player();
    var thisPlayerID = player.id;
    var IsConnected = false;
    ID_list.push(thisPlayerID);
    Player_Count += 1;
    Player_list[thisPlayerID] = player;
    socket_list[thisPlayerID] = socket;

    socket.on('handshake', function(data) {
        player.username = data.username;
        server_log("username : "+data.username, 0);
        socket.emit('verify', player);
        Player_username_list[thisPlayerID] = player.username;

        socket.broadcast.emit('spawn', player);

        for(var playerID in Player_list) {
            if(playerID != thisPlayerID){
                socket.emit('spawn', Player_list[playerID]);
                server_log("Client is verifying it's name! ID : "+playerID+". Username : "+Player_username_list[playerID], 0);
            }
        }
        server_log("Client ["+thisPlayerID+"] have connected to a server. New client count is "+Player_Count, 0);
    });

    socket.emit('register', {id: thisPlayerID});
    socket.emit('spawn', player);

    if(Player_Count > 2){
        //Disconnect();
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
        server_log("Client ["+thisPlayerID+"] is looking at: ["+player.lookingAt+"].");
    });

    socket.on('SendAttackPacket', function(data) {
        Packet_Sender = thisPlayerID;
        packet_effected = player.lookingAt;

        if(packet_effected != "Client : "+Packet_Sender){
            for (let index = 0; index < ID_list.length; index++) {
                if(packet_effected == ID_list[index]){
                    //server_log(ID_list[index]+" Got shot by : "+Packet_Sender, 3);

                    Player_list[ID_list[index]].health -= 10;

                    if(Player_list[ID_list[index]].health < 1){
                        var username = Player_list[ID_list[index]].username;
                        var sender_username = Player_list[thisPlayerID].username;
                        KillClient(packet_effected);

                        socket.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});
                        socket.broadcast.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});
                    }
                    else{
                        socket.emit('UpdateHealth', Player_list[ID_list[index]]);
                        socket.broadcast.emit('UpdateHealth', Player_list[ID_list[index]]);
    
                        server_log(Player_list[ID_list[index]].health, 3);
                    }

                }
            }
        }
        else{
            server_log("packet receiver cannot be sender!", 2);
        }
    });

    socket.on('SendMessageToServer', function(data) {
        var message = data.content;
        var username = data.username;
        server_log("["+thisPlayerID+"]<"+username+">: "+message+"", 3);
        public_chat.push("["+username+"]: "+message);

        socket.emit('MessageEventVerification', {content: message});
        socket.broadcast.emit("MessageEventReceived", {content: public_chat[public_chat.length -1]});

    });


    

    socket.on('disconnect', function() {
        socket.emit('disconnected', player)
        socket.broadcast.emit('disconnected', player)
        Player_Count -= 0;
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

    function KillClient(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        target.IsAlive = false;
        target.username = "Dead";

        target.position.x = 0;
        target.position.y = 0;
        target.position.z = 0;

        targetSocket.broadcast.emit('UpdatePosition', target);
        targetSocket.emit('Die', target);


        server_log("Killed client!", 2);
        sleep(3000);
        Respawn(ID);
        server_log("revived client!", 0);

    }

    function Respawn(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        target.IsAlive = true;
        targetSocket.broadcast.emit('UpdatePosition', target);
        targetSocket.emit('Respawn', target);
    }

    function Disconnect(){
        socket.emit('disconnected', player)
        socket.broadcast.emit('disconnected', player)
        Player_Count -= 0;
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