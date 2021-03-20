const Console = require('../console');
const ServerConsole = new Console();

const Debug = require('../debug');
const DEBUG = new Debug();

let LobbyBase = require('./lobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../connection');
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

        lobby.addPlayer(connection);
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
        
        let socket = connection.socket;

        connection.player.username = data.username; 
        socket.emit('verify', connection.player); 

        ServerConsole.LogEvent("Handshake received!", this.id, 1);
    }

    SendMessageToLobby(connection = Connection, data){
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
        this.public_chat.push("["+username+"]: "+message);
    
        socket.emit('MessageEventVerification', {content: message});
        socket.broadcast.to(lobby.id).emit("MessageEventReceived", {content: this.public_chat[this.public_chat.length -1]});
    }

    UpdateTarget(connection = Connection, data){
        let lobby = this;
        let player = connection.player;

        player.lookingAt = data.target;
        //ServerConsole.LogEvent("Client ["+player.id+"] is looking at: ["+player.lookingAt+"].");
    }

    UpdatePosition(connection = Connection, data){
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

        socket.emit('spawn', returnData);
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