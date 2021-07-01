//Copyright 2021, Tuukka Moilanen, All rights recerved

const Console = require('../Config/console');
const ServerConsole = new Console();

const config = require('../Config/config');
const C = new config();

let LobbyBase = require('./lobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../connection');
const { connect } = require('http2');
const { start } = require('repl');
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

        ServerConsole.LogEvent("User joined the gamelobby lobby!");

        this.connection_count++;

        if(this.connection_count == 2){
            this.Start(connection);
            this.HaveStarted = true;
        }
    }

    Start(connection = Connection){
        let lobby = this;
        let connections = lobby.connections;
        let socket = connection.socket;

        var returnData = {
            id: connection.player.id,
            username: connection.player.username
        }

        socket.emit('lobby_join_success', {id: lobby.id});
        socket.broadcast.to(lobby.id).emit('lobby_join_success', {id: lobby.id})

        socket.broadcast.to(lobby.id).emit('join', returnData);

        connections.forEach(con =>{
            if(con.player.id != connection.player.id){

                var returndata = {
                    id: con.player.id,
                    username:con.player.username
                }

                socket.emit('join', returnData);
            }
        });
    }

    Spawn(connection = Connection){
        let lobby = this;
        let connections = lobby.connections;
        let socket = connection.socket;

        var returnData = {
            id: connection.player.id,
            username: connection.player.username
        }

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