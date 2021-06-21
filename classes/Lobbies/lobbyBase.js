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
        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                if(!player.IsQuest){
                    if(player.uid != "user"){
                        ServerConsole.LogEvent(player.uid+" ["+player.id+"] has entered the lobby ["+lobby.id+"]", lobby.id, 0);
                    }
                    else{
                        ServerConsole.LogEvent("User ["+player.id+"] has entered the lobby ["+lobby.id+"]", lobby.id, 0);
                    }
                    
                }
                else{
                    ServerConsole.LogEvent("Guest ["+player.id+"] has entered the lobby ["+lobby.id+"]", lobby.id, 0);
                }
            }
        });
        //#endregion 

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
        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                ServerConsole.LogEvent("Client have left the lobby!", lobby.id, 1);
            }
        });
        //#endregion 
    }
}