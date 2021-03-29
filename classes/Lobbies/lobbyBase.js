const Console = require('../console');
const ServerConsole = new Console();

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

        ServerConsole.LogEvent("Client ["+player.id+"] has entered the lobby ["+lobby.id+"]", lobby.id, 0);

        lobby.connections.push(connection);
        lobby.connection_IDs.push(player.id);

        player.lobby = lobby.id;
        connection.lobby = lobby;
    }

    OnExitLobby(connection = Connection){
        let lobby = this;
        let player = connection.player;

        connection.lobby = undefined;

        let index = lobby.connections.indexOf(connection);
        let index2 = lobby.connection_IDs.indexOf(player.id);

        //ServerConsole.LogEvent("preparing to remove ["+connection.player.id+"] from connections list", lobby.id, null);

        if(index > -1){
            lobby.connections.splice(index, 1);
        }

        if(index2 > -1){
            lobby.connection_IDs.splice(index2, 1);
        }
        ServerConsole.LogEvent("Client have left the lobby!", lobby.id, 1);
    }
}