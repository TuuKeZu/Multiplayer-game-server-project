const Console = require('../console');
const ServerConsole = new Console();

const Debug = require('../debug');
const DEBUG = new Debug();

const fs = require('fs');

let LobbyBase = require('./lobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../connection');
const { connect } = require('http2');
module.exports = class GameLobby extends LobbyBase {
    constructor(id, setting = GameLobbySettings, password = String){
        super(id);
        this.settings = setting;
        this.password = null;
        this.public_chat = [];
        this.IsServerGenerated = null;
    }   

    CanEnterLobby(connection = Connection){
        let lobby = this;
        let maxPlayerCount = lobby.settings.maxPlayerCount;
        let CurrentPlayerCount = lobby.connections.length;

        if(CurrentPlayerCount + 1 > maxPlayerCount){
            ServerConsole.LogEvent("Connection to lobby ["+lobby.id+"] was declined. Reason : too many players!", null, null);
            return false;
        }
        else{
            ServerConsole.LogEvent("Connection to lobby ["+lobby.id+"] was allowed since this lobby's connection count is : "+CurrentPlayerCount+"/"+maxPlayerCount, null, null);
            return true;
        }
    }

    OnEnterLobby(connection = Connection){
        let lobby = this;

        super.OnEnterLobby(connection);

        //spawning;
        var returnData = {
            id: connection.player.id,
            username: connection.player.username
        }
        
        connection.socket.emit('spawn', returnData);
    }

    SendConnectionVerification(connection = Connection, id_){
        let lobby = this;
        connection.socket.emit('CreationSuccessfull', {id: id_});
    }

    GetLobbyConnections(connection = Connection){
        let lobby = this;
        return lobby.connections;
    }

    SendHandShake(connection = Connection, data){
        let lobby = this;
        
        let socket = connection.socket;

        connection.player.username = data.username; 
        socket.emit('verify', connection.player); 
        lobby.addPlayer(connection);

        ServerConsole.LogEvent("Handshake received! username: "+data.username, this.id, 1);
    }

    SendMessageToLobby(connection = Connection, data){
        if(connection == null || !connection.player.IsAlive){
            ServerConsole.LogEvent("Client Error", this.id, 2);
            return;
        }
        let lobby = this;

        let socket = connection.socket;

        var message = data.content;
        var username = data.username;

        //command manager
        if(message.lastIndexOf("/", 0) === 0){
            var array = [];
            array = message.split(' ');
            ServerConsole.LogEvent("Command was ran", 1);
                if(message == "/start"){
                    
                }
                if(message.lastIndexOf("/kick", 0) === 0){
                    if(array[1] != null){
                        
                    }
                }
                
        }

        ServerConsole.LogEvent("["+connection.player.id+"]<"+username+">: "+message+"", this.id, 3);
        ServerConsole.LogChatEvent("["+username+"]: "+message, this.id);
        this.public_chat.push("["+username+"]: "+message);
    
        socket.emit('MessageEventVerification', {content: message});

        socket.broadcast.to(lobby.id).emit("MessageEventReceived", {content: this.public_chat[this.public_chat.length -1]});
    }

    UpdateTarget(connection = Connection, data){
        if(connection == null || !connection.player.IsAlive){
            ServerConsole.LogEvent("Client Error", this.id, 2);
            return;
        }
        let lobby = this;
        let player = connection.player;

        player.lookingAt = data.target;
        //ServerConsole.LogEvent("Client ["+player.id+"] is looking at: ["+player.lookingAt+"].");
    }

    UpdatePosition(connection = Connection, data){
        //Error Checking
        if(connection == null || !connection.player.IsAlive){
            ServerConsole.LogEvent("Client Error", this.id, 2);
            return;
        }
        let lobby = this;
        let socket = connection.socket;
        let player = connection.player;
        if(connection.player.IsAlive){
            connection.player.position.x = data.position.X;
            connection.player.position.y = data.position.Y;
            connection.player.position.z = data.position.Z;

            socket.broadcast.to(lobby.id).emit('UpdatePosition', player);

            if(DEBUG.ShowPlayersMovementData){
                console.log("Client ["+data.ID+"] position is equal to : "+data.position.X + ","+data.position.Y+","+data.position.Z+" : Player is looking at: ["+connection.player.lookingAt+"].");
            }
        }
        
    }

    SendAttackPacket(connection = Connection, data){
        if(connection == null || !connection.player.IsAlive){
            ServerConsole.LogEvent("Client Error", this.id, 2);
            return;
        }

        let damage = parseInt(data.damage);
        let playerfound = false;
        let ID;

        if(damage > 70 || damage < 1){
            ServerConsole.LogEvent("Client Error : damage is invalid", this.id, 2);
            return;
        }

        if(connection.player.IsAlive){
            let thisPlayerID = connection.player.id;

            let Packet_Sender = thisPlayerID;
            let packet_effected = connection.player.lookingAt;

            ServerConsole.LogEvent(packet_effected+" Got shot by : "+Packet_Sender+" : "+data.damage, this.id, null);

            for (let index = 0; index < this.connections.length; index++) {
                if(this.connections[index].player.id == packet_effected){
                    playerfound = true;
                    ID = index;
                }
            }

            if(playerfound){
                ServerConsole.LogEvent(packet_effected+" Got shot by : "+Packet_Sender, this.id, null);

                if(packet_effected != thisPlayerID){
                    //PAYLOAD
                    let target = this.connections[ID];
                    let socket = target.socket;

                    ServerConsole.LogEvent(target.player.health, null, 3);

                    target.player.health -= damage;

                    socket.emit('UpdateHealth', target.player);
                    socket.broadcast.to(this.id).emit('UpdateHealth', target.player);

                    if(target.player.health < 2){
                        var username = target.player.username;
                        var sender_username = connection.player.username;

                        socket.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});
                        socket.broadcast.to(this.id).emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});

                        this.KillClient(target);
                    }

                    
                }
            }
            else{
                ServerConsole.LogEvent("Player was not found with an ID of : '"+packet_effected+"'/"+this.connections.length);
            }
        }
        else{
            
        }
    }

    KillClient(connection = Connection){
        let lobby = this;
        let target = connection.player;
        let targetSocket = connection.socket;

        target.IsAlive = false;

        //respawn position
        target.position.x = 77.855;
        target.position.y = -3.06;
        target.position.z = 33.191;

        targetSocket.broadcast.to(lobby.id).emit('UpdatePosition', target);
        targetSocket.emit('Die', target);


        ServerConsole.LogEvent("Killed client : "+connection.player.id, null, 2);
        setTimeout(() => {
            this.Respawn(connection)
        }, 1000);
        ServerConsole.LogEvent("Revived client", null, 0);

    }

    TeleportClient(connection = Connection, posX, posY, posZ){
        let lobby = this;
        let target = connection;
        let targetSocket = connection.socket;

        target.player.position.x = posX;
        target.player.position.y = posY;
        target.player.position.z = posZ;

/*
        77.855;
        -3.06;
        33.191;
*/

        targetSocket.broadcast.to(lobby.id).emit('UpdatePosition', target.player);
        targetSocket.emit('Move', target.player);
    }

    Respawn(connection = Connection){
        ServerConsole.LogEvent("respawning");
        let target = connection;

        let targetSocket = target.socket;

        ServerConsole.LogEvent("respawning...");

        target.player.health = 100;
        targetSocket.emit('UpdateHealth', target.player);
        targetSocket.broadcast.to(this.id).emit('UpdateHealth', target.player);

        target.player.IsAlive = true;
        targetSocket.broadcast.to(this.id).emit('UpdatePosition', target.player);
        targetSocket.emit('Respawn', target.player);
        targetSocket.broadcast.to(this.id).emit("MessageEventReceived", {content: "["+target.player.username+"] Respawned!"});
    }

    OnExitLobby(connection = Connection){
        let lobby = this;

        super.OnExitLobby(connection);

        lobby.removePlayer(connection);
    }

    addPlayer(connection = Connection){
        let lobby = this;
        let connections = lobby.connections;
        let socket = connection.socket;

        var returnData = {
            id: connection.player.id,
            username: connection.player.username
        }
        ServerConsole.LogEvent("spawned the player!", this.id, 0);

        socket.broadcast.to(lobby.id).emit('spawn', returnData);

        connections.forEach(c => {
            if(c.player.id != connection.player.id){
                socket.emit('spawn', {
                    id: c.player.id,
                    username: c.player.username
                });
            }
        })
    }

    removePlayer(connection = Connection){
        let lobby = this;

        connection.socket.broadcast.to(lobby.id).emit('disconnected', {
            id: connection.player.id
        })
    }

    
}