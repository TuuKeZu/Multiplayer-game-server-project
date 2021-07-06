const FS = require('fs');
const Console = require('../Config/console');
const ServerConsole = new Console();

const config = require('../Config/config');
const C = new config();

let LobbyBase = require('./lobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../connection');
const Vector3 = require('../PlayerData/vector3');
const Quaternion = require('../PlayerData/quaternion');

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

        this.GameConfig = {};

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

    OnSetupLobbyConfig(){
        FS.readFile('./GameConfig.json', (err, data)=>{
            if(err) throw err;

            this.GameConfig = JSON.parse(data);
            ServerConsole.LogEvent("successfully retrieved GameConfig.json", this.id, 0);
        });

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

    ForceStartGame(connection = Connection){
        this.HaveStarted = true;
        this.GameHaveStarted = true;

        var player1Team = "";
        var player2Team = "";
        var Player1StartPosition;
        var Player2StartPosition;
        let currentIndex = 0;
        var mapIndex = this.settings.MapIndex;

        var ReturnData = {};


        player1Team = "RED";
        player2Team = "BLUE";

        Player1StartPosition = new Vector3(48, 15.5, 19);
        Player2StartPosition = new Vector3(-48, 15.5, 19);

        
        for (let index = 0; index < 2; index++){
            currentIndex++;

            //PLAYER 1
            if(currentIndex == 1){
                var returnData1 = {
                    team: player1Team,
                    map: mapIndex,
                    clientID: connection.player.id,
                    position: Player1StartPosition
                }

                ReturnData[currentIndex] = {returnData1};
            }
            
            //PLAYER 2
            if(currentIndex == 2){
                var returnData2 = {
                    team: player2Team,
                    map: mapIndex,
                    clientID: "000",
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
        };

        console.log(ReturnData);

        this.connections.forEach(con => {
            con.socket.emit('begin', {data: ReturnData});
        });
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

        connection.player.position = new Vector3(data.X, data.Y, data.Z);
        connection.socket.broadcast.to(this.id).emit('updated_position', {
            clientID: connection.player.id,
            position: connection.player.position
        });
    }


    UpdateRotation(connection = Connection, data){

        connection.player.rotation = new Vector3(data.X, data.Y, data.Z);

        connection.socket.broadcast.to(this.id).emit('updated_rotation', {
            clientID: connection.player.id,
            rotation: connection.player.rotation
        });
    }

    UpdateAnimationVelocity(connection = Connection, data){

        connection.player.VelocityX = data.X;
        connection.player.VelocityZ = data.Z;

        connection.socket.broadcast.to(this.id).emit('updated_velocity', {
            clientID: connection.player.id,
            x: connection.player.VelocityX,
            z: connection.player.VelocityZ
        });
    }

    UpdateAnimationState(connection = Connection, data){
        connection.player.AnimationScopingState = data.IsScoping;
        connection.player.AnimationDashingState = data.IsDashing;

        connection.socket.broadcast.to(this.id).emit('updated_animation_status', {
            clientID: connection.player.id,
            IsScoping: connection.player.AnimationScopingState,
            IsDashing: connection.player.AnimationDashingState
        });
    }

    UpdateCurrentGun(connection = Connection, data){
        connection.player.CurrentGun = data.GunID;
        console.log(data);

        switch(data.GunID){
            case 0:
                connection.player.CurrentAmmo = this.GameConfig.GunConfig.AK47.MaxAmmo;
                break;
            case 1:
                connection.player.CurrentAmmo = this.GameConfig.GunConfig.RPG.MaxAmmo;
                break;
            case 2:
                connection.player.CurrentAmmo = this.GameConfig.GunConfig.ShotGun.MaxAmmo;
                break;
            case 3:
                connection.player.CurrentAmmo = this.GameConfig.GunConfig.Sniper.MaxAmmo;
                break;
            case 4:
                connection.player.CurrentAmmo = this.GameConfig.GunConfig.StunGun.MaxAmmo;
                break;
        }
    }

    SendGunAttackPacket(connection = Connection, data){
            if(connection.player.AnimationScopingState == true){
                var returnData = {};

                switch(connection.player.CurrentGun){
                    case 0:
                        if(connection.player.CanShoot0){
                            returnData = {
                                clientID: connection.player.id,
                                gunID: connection.player.CurrentGun,
                                velocity: this.GameConfig.GunConfig.AK47.velocity,
                                direction: new Quaternion(data.ShootDirection.x, data.ShootDirection.y, data.ShootDirection.z, data.ShootDirection.w),
                                position: new Vector3(data.SpawnPosition.x, data.SpawnPosition.y, data.SpawnPosition.z)
                            }

                            connection.player.CanShoot0 = false;
                            this.UseAmmo(connection, 1, (HasAmmo)=>{
                                if(HasAmmo){
                                    setTimeout(() => {
                                        connection.player.CanShoot0 = true;
                                        connection.socket.emit('reset_gun_cooldown', {gunID: connection.player.CurrentGun});
                                    }, this.GameConfig.GunConfig.AK47.Cooldown*1000);
                                }
                                else{
                                    return;
                                }
                            });
                        }
                        else{
                            ServerConsole.LogEvent("Player was not allowed to shoot this gun");
                        }
                        break;

                    case 1:
                        if(connection.player.CanShoot1){
                            returnData = {
                                clientID: connection.player.id,
                                gunID: connection.player.CurrentGun,
                                velocity: this.GameConfig.GunConfig.RPG.velocity,
                                direction: new Quaternion(data.ShootDirection.x, data.ShootDirection.y, data.ShootDirection.z, data.ShootDirection.w),
                                position: new Vector3(data.SpawnPosition.x, data.SpawnPosition.y, data.SpawnPosition.z)
                            }

                            connection.player.CanShoot1 = false;
                            this.UseAmmo(connection, 1, (HasAmmo)=>{
                                if(HasAmmo){
                                    setTimeout(() => {
                                        connection.player.CanShoot1 = true;
                                        connection.socket.emit('reset_gun_cooldown', {gunID: connection.player.CurrentGun});
                                    }, this.GameConfig.GunConfig.RPG.Cooldown*1000);
                                }
                                else{
                                    return;
                                }
                            });
                        }
                        else{
                            ServerConsole.LogEvent("Player was not allowed to shoot this gun");
                        }
                        break;

                        case 2:
                            if(connection.player.CanShoot2){
                                returnData = {
                                    clientID: connection.player.id,
                                    gunID: connection.player.CurrentGun,
                                    velocity: this.GameConfig.GunConfig.ShotGun.velocity,
                                    direction: new Quaternion(data.ShootDirection.x, data.ShootDirection.y, data.ShootDirection.z, data.ShootDirection.w),
                                    position: new Vector3(data.SpawnPosition.x, data.SpawnPosition.y, data.SpawnPosition.z)
                                }
    
                                connection.player.CanShoot2 = false;
                                this.UseAmmo(connection, 1, (HasAmmo)=>{
                                    if(HasAmmo){
                                        setTimeout(() => {
                                            connection.player.CanShoot2 = true;
                                            connection.socket.emit('reset_gun_cooldown', {gunID: connection.player.CurrentGun});
                                        }, this.GameConfig.GunConfig.ShotGun.Cooldown*1000);
                                    }
                                    else{
                                        return;
                                    }
                                });
                            }
                            else{
                                ServerConsole.LogEvent("Player was not allowed to shoot this gun");
                            }
                            break;

                            case 3:
                                if(connection.player.CanShoot3){
                                    returnData = {
                                        clientID: connection.player.id,
                                        gunID: connection.player.CurrentGun,
                                        velocity: this.GameConfig.GunConfig.Sniper.velocity,
                                        direction: new Quaternion(data.ShootDirection.x, data.ShootDirection.y, data.ShootDirection.z, data.ShootDirection.w),
                                        position: new Vector3(data.SpawnPosition.x, data.SpawnPosition.y, data.SpawnPosition.z)
                                    }
        
                                    connection.player.CanShoot3 = false;
                                    this.UseAmmo(connection, 1, (HasAmmo)=>{
                                        if(HasAmmo){
                                            setTimeout(() => {
                                                connection.player.CanShoot3 = true;
                                                connection.socket.emit('reset_gun_cooldown', {gunID: connection.player.CurrentGun});
                                            }, this.GameConfig.GunConfig.Sniper.Cooldown*1000);
                                        }
                                        else{
                                            return;
                                        }
                                    });
                                }
                                else{
                                    ServerConsole.LogEvent("Player was not allowed to shoot this gun");
                                }
                                break;
                }

                if(returnData != {}){
                    connection.socket.broadcast.to(this.id).emit('gun_attack_packet', returnData);
                    console.log(returnData);
                }



            }
            else{
                ServerConsole.LogEvent("player is not scoping");
            }
    }

    UseAmmo(connection = Connection, count, callback){
        if(connection.player.CurrentAmmo - count > 0){
            connection.player.CurrentAmmo -= count;
            ServerConsole.LogEvent(connection.player.CurrentAmmo);
            return callback(true);
        }
        else{
            callback(false);
            connection.player.CanShoot0 = false;
            connection.player.CanShoot1 = false;
            connection.player.CanShoot2 = false;
            connection.player.CanShoot3 = false;
            ServerConsole.LogEvent("reloading...");

            setTimeout(() => {
                switch(connection.player.CurrentGun){
                    case 0:
                        connection.player.CurrentAmmo = this.GameConfig.GunConfig.AK47.MaxAmmo;
                        break;
                    case 1:
                        connection.player.CurrentAmmo = this.GameConfig.GunConfig.RPG.MaxAmmo;
                        break;
                    case 2:
                        connection.player.CurrentAmmo = this.GameConfig.GunConfig.ShotGun.MaxAmmo;
                        break;
                    case 3:
                        connection.player.CurrentAmmo = this.GameConfig.GunConfig.Sniper.MaxAmmo;
                        break;
                    case 4:
                        connection.player.CurrentAmmo = this.GameConfig.GunConfig.StunGun.MaxAmmo;
                        break;
                }
                connection.player.CanShoot0 = true;
                connection.player.CanShoot1 = true;
                connection.player.CanShoot2 = true;
                connection.player.CanShoot3 = true;
                connection.socket.emit('reset_gun_cooldown', {gunID: connection.player.CurrentGun});
            }, 2000);
        }
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