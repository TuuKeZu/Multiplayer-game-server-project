//Copyright 2021, Tuukka Moilanen, All rights recerved

const Console = require('../Config/console');
const ServerConsole = new Console();

const config = require('../Config/config');
const C = new config();

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
        this.connection_count = 0;
        this.timeElapsed = setting.timeInMin*60;
        this.HaveStarted;
        this.BLUE_kills = 0;
        this.RED_Kills = 0;
    }

    OnExitLobby(connection = Connection){
        let lobby = this;

        super.OnExitLobby(connection);

        lobby.removePlayer(connection);

        lobby.connection_count -= 1;
    }

    addPlayer(connection = Connection){
        let lobby = this;
        let connections = lobby.connections;
        let socket = connection.socket;

        var returnData = {
            id: connection.player.id,
            username: connection.player.username
        }
        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                ServerConsole.LogEvent("spawned the player!", lobby.id, 0);
            }
        });
        //#endregion 

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