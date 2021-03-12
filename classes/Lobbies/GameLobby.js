const Console = require('../console');
const ServerConsole = new Console();


let LobbyBase = require('./lobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../connection');
module.exports = class GameLobby extends LobbyBase {
    constructor(id, setting = GameLobbySettings){
        super(id);
        this.settings = setting;
    }   

    CanEnterLobby(connection = Connection){
        let lobby = this;
        let maxPlayerCount = lobby.settings.maxPlayerCount;
        let CurrentPlayerCount = lobby.connections.length;

        if(CurrentPlayerCount + 1 > maxPlayerCount){
            return false;
        }

        return true;
    }

    OnEnterLobby(connection = Connection){
        let lobby = this;

        super.OnEnterLobby(connection);

        //spawning;

        lobby.addPlayer(connection);
    }

    UpdatePosition(connection = Connection, data){
        if(connection.player.IsAlive){
            connection.player.position.x = data.position.X;
            connection.player.position.y = data.position.Y;
            connection.player.position.z = data.position.Z;

            //console.log("Client ["+data.ID+"] position is equal to : "+data.position.X + ","+data.position.Y+","+data.position.Z+" : Player is looking at: ["+connection.player.lookingAt+"]."); //käytetään koodin debuggaamiseen. Printtaa kaikkien liittyneiden liikeradat
        }
    }

    SendHandShake(connection = Connection, data){
        let socket = connection.socket;

        connection.player.username = data.username; 
        socket.emit('verify', connection.player); 

        ServerConsole.LogEvent("Handshake received!", this.id, 1);
    }

    SendAttackPacket(connection = Connection, data){

    }

    OnExitLobby(connection = Connection){
        let lobby = this;

        super.OnExitLobby();

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