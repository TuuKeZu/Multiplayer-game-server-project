const Console = require('../Config/console');
const ServerConsole = new Console();

let Connection = require('../connection');

module.exports = class LobbyBase{
    constructor(id){
        this.id = id;
        this.connections = [];
        this.ConnectionsByIDs = [];
        this.connection_IDs = [];
    }

    OnEnterLobby(connection = Connection){
        let lobby = this;
        let player = connection.player;

        lobby.connections.push(connection);
        lobby.connection_IDs.push(player.id);
        lobby.ConnectionsByIDs[player.id] = connection;

        player.lobby = lobby.id;
        connection.lobby = lobby;

        ServerConsole.LogEvent("user have joined the lobby", this.id, 0);
    }

    OnExitLobby(connection = Connection){
        let lobby = this;
        let player = connection.player;

        connection.lobby = undefined;

        let index = lobby.connections.indexOf(connection);
        let index2 = lobby.connection_IDs.indexOf(player.id);

        if(index > -1){
            lobby.connections.splice(index, 1);
        }

        if(index2 > -1){
            lobby.connection_IDs.splice(index2, 1);
        }

        delete this.ConnectionsByIDs[player.id];

        ServerConsole.LogEvent("User has left the lobby", this.id, 1);
    }
}