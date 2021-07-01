const Console = require('../Config/console');
const ServerConsole = new Console();

const config = require('../Config/config');
const C = new config();

let Connection = require('../connection');

module.exports = class LobbyBase{
    constructor(id){
        this.id = id;
        this.connections = [];
        this.connection_IDs = [];
    }

    OnEnterLobby(connection = Connection){
        let lobby = this;
        let player = connection.player;

        lobby.connections.push(connection);
        lobby.connection_IDs.push(player.id);

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

        ServerConsole.LogEvent("User has left the lobby", this.id);
    }
}