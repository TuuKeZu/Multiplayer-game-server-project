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

        this.cooldowns = [];
    }

    OnExitLobby(connection = Connection){
        let lobby = this;
        let connections = lobby.connections;

        super.OnExitLobby(connection);
        lobby.removePlayer(connection);

        lobby.connection_count -= 1;

        if(this.HaveStarted && this.connection_count < 2){
            connections.forEach(con => {
                con.player.IsReady = false;
                this.AbortGame(con, "Game has ended");
            });
        }
    }

    OnLobbyTick(){
        if(this.HaveStarted){

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

        var ReturnData = {};

        if(RandomIndex == 0){
            player1Team = "RED";
            player2Team = "BLUE";

            Player1StartPosition = new Vector3(48, 15.5, 19);
            Player2StartPosition = new Vector3(-48, 15.5, 19);
        }
        if(RandomIndex == 1){
            player1Team = "BLUE";
            player2Team = "RED";

            Player1StartPosition = new Vector3(-48, 15.5, 19);
            Player2StartPosition = new Vector3(48, 15.5, 19);
        }
        
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

                ReturnData[currentIndex] = {returnData1};
            }
            
            //PLAYER 2
            if(currentIndex == 2){
                var returnData2 = {
                    team: player2Team,
                    map: mapIndex,
                    clientID: con.player.id,
                    position: Player2StartPosition
                }

                ReturnData[currentIndex] = {returnData2};
            }

            if(currentIndex > 2){
                this.connections.forEach(con =>{
                    this.AbortGame(con, "There was error inside the lobby : 1001");
                });
                return;
            }
        });

        console.log(ReturnData);

        this.connections.forEach(con => {
            con.socket.emit('begin', {data: ReturnData});
        });
    }

    UpdatePosition(connection = Connection, data){
        var oPosition = connection.player.position;

        var DistanceTraveled = (
            Math.sqrt(Math.pow((oPosition.x - data.X),2) + Math.pow((oPosition.y - data.Y),2) + Math.pow((oPosition.z - data.Z),2))
        );

        //ServerConsole.LogEvent(data.X+","+data.Y+","+data.Z+" | Traveled distance : "+DistanceTraveled, this.id);

        connection.player.position = new Vector3(data.X, data.Y, data.Z);
        connection.socket.broadcast.to(this.id).emit('updated_position', {
            clientID: connection.player.id,
            position: connection.player.position
        });
    }


    UpdateRotation(connection = Connection, data){

        //ServerConsole.LogEvent(data.X+","+data.Y+","+data.Z, this.id);

        connection.player.rotation = new Vector3(data.X, data.Y, data.Z);

        connection.socket.broadcast.to(this.id).emit('updated_rotation', {
            clientID: connection.player.id,
            rotation: connection.player.rotation
        });
    }

    UpdateAnimationVelocity(connection = Connection, data){
        ServerConsole.LogEvent(data.X+","+data.Z, this.id);

        connection.player.VelocityX = data.X;
        connection.player.VelocityZ = data.Z;

        connection.socket.broadcast.to(this.id).emit('updated_velocity', {
            clientID: connection.player.id,
            x: connection.player.VelocityX,
            z: connection.player.VelocityZ
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