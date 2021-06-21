const Console = require('./Config/console');
const ServerConsole = new Console();

const config = require('./Config/config');
const C = new config();

const Config = true;

let Connection_ = require('./connection');
let Player = require('./PlayerData/player');

let LobbyBase = require('./Lobbies/lobbyBase');
let Gamelobby = require('./Lobbies/GameLobby');
let GameLobbySettings = require('./Lobbies/GameLobbySettings');
const shortid = require('shortid');
const Connection = require('./connection');

module.exports = class Server {
    constructor(){
        this.connections = [];
        this.lobbies = [];
        this.lobby_IDs = [];
        this.connection_IDs = [];
        this.config = Config;

        this.lobbies[0] = new LobbyBase(0);
    }

    OnConnected(socket){
        let connection = new Connection_();
        connection.socket = socket;
        connection.player = new Player();
        connection.server = this;

        let player = connection.player;
        let lobbies = this.lobbies;

        this.connections[player.id] = connection;

        this.connection_IDs[this.connection_IDs.length + 1] = player.id;

        socket.join(player.lobby);
        connection.lobby = lobbies[player.lobby];
        connection.lobby.OnEnterLobby(connection);

        return connection;
    } 

    OnDisconnected(connection = Connection){
        let server = this;
        let id = connection.player.id;

        delete server.connections[id];

        let index = this.connection_IDs.indexOf(connection.player.id);

        if(index > -1){
            this.connection_IDs.splice(index, 1);
            this.connection_IDs.length -= 1;
        }
        if(Config.show_join_requests){
            ServerConsole.LogEvent("Client Have disconnected", connection.lobby.id, 2);
        }

        connection.socket.broadcast.to(connection.player.lobby).emit('disconnected', {
            id: id
        })

        server.lobbies[connection.player.lobby].OnExitLobby(connection);
    } 

    OnSwitchLobby(connection = Connection, lobbyID){
        let server = this;
        let lobbies = server.lobbies;

        connection.socket.join(lobbyID);
        connection.lobby = lobbies[lobbyID];
        lobbies[connection.player.lobby].OnExitLobby(connection);
        lobbies[lobbyID].OnEnterLobby(connection);
    }

    OnLobbyCheck(){
        for (let index = 0; index < this.lobby_IDs.length; index++) {
            let temp_lobbyID = this.lobby_IDs[index];

            if(temp_lobbyID != null){
                let lobby = this.lobbies[temp_lobbyID];

                //ServerConsole.LogEvent(lobby.id);

                if(lobby.connections.length < 1){
                    if(!lobby.IsServerGenerated){
                        this.KillLobby(lobby);
                    }
                }
            }
            
        }
    }

    OnPacketFrequencyCheck(){
        for (let index = 0; index < this.connection_IDs.length; index++) { 
            if(this.connection_IDs[index] != null){
                let currID = this.connection_IDs[index];
                let con = this.connections[currID];
                con.player.packetFrequencyAvarge = con.player.packetFrequency;
                con.player.packetFrequency = 0;

                let packetsAvarge = con.player.packetFrequencyAvarge;

                if(con.player.lobby == 0){
                    if(packetsAvarge > 5){
                        ServerConsole.LogEvent("Packet limit was overriden!", null, 2);
                        this.ForceDisconnect(con, "You are sending many packets!");
                    }
                }
                else{
                    if(packetsAvarge > 50){
                        ServerConsole.LogEvent("Packet limit was overriden!", null, 2);
                        this.ForceDisconnect(con, "You are sending many packets!");
                    }
                }
            }
        }
    }

    ForceDisconnect(connection = Connection, reason){

        let returnData = connection.socket;

        var data = {
            id: connection.player.id,
            reason: reason
        }

        returnData.emit('Kicked', data);
        returnData.disconnect();
    }




}