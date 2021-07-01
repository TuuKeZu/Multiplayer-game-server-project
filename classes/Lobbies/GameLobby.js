//Copyright 2021, Tuukka Moilanen, All rights recerved

const Console = require('../Config/console');
const ServerConsole = new Console();

const config = require('../Config/config');
const C = new config();

let LobbyBase = require('./lobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../connection');
const Vector3 = require('../PlayerData/vector3');

module.exports = class GameLobby extends LobbyBase {
    constructor(id, setting = GameLobbySettings, password = String){
        super(id);
        this.settings = setting;
        this.password = null;
        this.public_chat = [];
        this.IsServerGenerated = null;
        this.connection_count = 0;

        this.timeElapsed = setting.timeInMin*60;
        this.HaveStarted = false;
        this.GameHaveStarted = false;
        this.BLUE_kills = 0;
        this.RED_Kills = 0;
    }

    OnExitLobby(connection = Connection){
        let lobby = this;
        let connections = lobby.connections;

        super.OnExitLobby(connection);
        lobby.removePlayer(connection);

        lobby.connection_count -= 1;

        if(this.HaveStarted && this.connection_count < 2){
            connections.forEach(con => {
                this.AbortGame(con, "Game has ended");
            });
        }
    }

    addPlayer(connection = Connection){
        let lobby = this;
        let connections = lobby.connections;
        let socket = connection.socket;

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

        ServerConsole.LogEvent("User : "+connection.player.username+" Joined the lobby! Starting the game", this.id);

        socket.emit('lobby_join_success', {id: lobby.id});
        socket.broadcast.to(lobby.id).emit('lobby_join_success', {id: lobby.id})

        socket.broadcast.to(lobby.id).emit('join', returnData);

        connections.forEach(con =>{
            if(con.player.id != connection.player.id){

                var returndata = {
                    id: con.player.id,
                    username:con.player.username
                }

                socket.emit('join', returndata);
            }
        });
    }

    ConfirmStart(connection = Connection){
        ServerConsole.LogEvent("User has confirmed one's abilities and is ready to start!", this.id, 0);

        connection.socket.emit('confirm', {IsEnemy: false})
        connection.player.IsReady = true;

        this.connections.forEach(con =>{
            if(con.player.id != connection.player.id){
                con.socket.emit('confirm', {IsEnemy: true});
            }
        });

        this.CheckIfReadyToStart((CanStart) =>{
            if(CanStart == true){
                ServerConsole.LogEvent("starting game...", this.id, 0);
                if(!this.GameHaveStarted){
                    this.StartGame();
                }
            }

            if(CanStart == false){
                ServerConsole.LogEvent("Both players are not ready to start");
            }
        });
    }

    CheckIfReadyToStart(callback){
        let CanStart = true;
        
        this.connections.forEach(con =>{
            if(!con.player.IsReady){
                CanStart = false;
                return callback(false);
            }
        });

        if(CanStart){
            return callback(true);
        }
    }

    StartGame(){
        this.GameHaveStarted = true;

        var RandomIndex = Math.round(Math.random());
        var player1Team = "";
        var player2Team = "";
        var Player1StartPosition;
        var Player2StartPosition;
        let currentIndex = 0;
        var mapIndex = this.settings.MapIndex;

        //#region SetTeams
        ServerConsole.LogEvent(RandomIndex);
        if(RandomIndex == 0){
            player1Team = "RED";
            player2Team = "BLUE";

            Player1StartPosition = new Vector3(48, 15.5, 1.5);
            Player2StartPosition = new Vector3(-48, 15.5, 1.5);
        }
        if(RandomIndex == 1){
            player1Team = "BLUE";
            player2Team = "RED";

            Player1StartPosition = new Vector3(-48, 15.5, 1.5);
            Player2StartPosition = new Vector3(48, 15.5, 1.5);
        }

        ServerConsole.LogEvent(player1Team);
        ServerConsole.LogEvent(player2Team);

        //#endregion
        
        this.connections.forEach(function(con){
            currentIndex++;

            //PLAYER 1
            if(currentIndex == 1){
                var returnData1 = {
                    team: player1Team,
                    map: mapIndex,
                    clientID: con.player.id,
                    position: Player1StartPosition
                }
                console.log(returnData1);
                con.socket.emit('begin', returnData1);
                return;
            }
            
            //PLAYER 2
            if(currentIndex == 2){
                var returnData2 = {
                    team: player2Team,
                    map: mapIndex,
                    clientID: con.player.id,
                    position: Player2StartPosition
                    
                }
                console.log(returnData2);
                con.socket.emit('begin', returnData2);
                return;
            }

            //last playercount check before the game
            if(currentIndex > 2 || currentIndex < 2){
                this.connections.forEach(con =>{
                    this.AbortGame(con, "There was error inside the lobby : 1001");
                });
                return;
            }
        });
    }


    removePlayer(connection = Connection){
        let lobby = this;

        connection.socket.broadcast.to(lobby.id).emit('disconnected', {
            id: connection.player.id
        })
    }

    AbortGame(connection = Connection, reason){
        connection.server.onExitGame(connection, reason);
    }

    
}