const FS = require('fs');
const Console = require('../Config/console');
const ServerConsole = new Console();

const config = require('../Config/config');

const CONFIGFILE = require('./GameConfig.json');

let LobbyBase = require('./lobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../connection');
const Vector3 = require('../PlayerData/vector3');
const Quaternion = require('../PlayerData/quaternion');
const shortid = require('shortid');
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
        this.HaveStarted = false;
        this.GameHaveStarted = false;
        this.BLUE_kills = 0;
        this.RED_Kills = 0;
        this.roundNumber = 1;

        this.GameConfig = {};

        this.cooldowns = [];
        this.ShieldObjects = [];
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
        var ConfigFile = require('./GameConfig.json');
        if(ConfigFile != null){
            this.GameConfig = ConfigFile;
            ServerConsole.LogEvent("Config-file were found and read successdully", this.id, 0);
        }
        else{
            throw "ConfigFile could not be found!";
        }

    }

    OnLobbyTick(){
        let lobby = this;
        if(this.HaveStarted){

            //COOLDOWNS
            this.cooldowns.forEach(function(cooldown, index) {
                if(cooldown.cooldown - 1 <= 0){
                    cooldown.con.socket.emit('reset_cooldown', {ability: cooldown.ability});

                    switch(cooldown.ability){
                        case "Q":
                            cooldown.con.player.CanCastQ = true;
                            break;
                        case "E":
                            cooldown.con.player.CanCastE = true;
                            break;
                        case "F":
                            cooldown.con.player.CanCastF = true;
                            break;
                    }

                    lobby.cooldowns.splice(index, 1);
                }
                else{
                    cooldown.cooldown -= 1;
                }
            });
            
            //SHIELD-OBJECTS
            this.ShieldObjects.forEach(shield => {
                if(shield.health - shield.lifetime_decreaser <= 0){

                }
                else{
                    shield.health = shield.health - shield.lifetime_decreaser;
                }
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

        connection.player.Q_ability = 1;
        connection.player.E_ability = 1;
        connection.player.F_ability = 2;


        player1Team = "RED";
        player2Team = "BLUE";

        Player1StartPosition = new Vector3(48, 10.6, 0);
        Player2StartPosition = new Vector3(-48, 10.6, 0);

        
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
                connection.player.TEAM = player1Team;
                connection.player.SpawnPosition = Player2StartPosition;
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
                connection.player.TEAM = player1Team;
                connection.player.SpawnPosition = Player2StartPosition;
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
            con.socket.emit('begin', {data: ReturnData, abilities: {
                Q: con.player.Q_ability,
                E: con.player.E_ability,
                F: con.player.F_ability
            }});
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

            Player1StartPosition = new Vector3(48, 10.6, 0);
            Player2StartPosition = new Vector3(-48, 10.6, 0);
        }
        if(RandomIndex == 1){
            player1Team = "BLUE";
            player2Team = "RED";

            Player1StartPosition = new Vector3(-48, 10.6, 0);
            Player2StartPosition = new Vector3(48, 10.6, 0);
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
                con.player.TEAM = player1Team;
                con.player.SpawnPosition = Player1StartPosition;

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
                con.player.TEAM = player2Team;
                con.player.SpawnPosition = Player2StartPosition;
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
            con.socket.emit('begin', {data: ReturnData, abilities: {
                Q: con.player.Q_ability,
                E: con.player.E_ability,
                F: con.player.F_ability
            }});
        });
    }

    UpdatePosition(connection = Connection, data){
        if(!connection.player.canMove){
            ServerConsole.LogEvent("Player is not allowed to move!");
            return;
        }

        var oPosition = connection.player.position;

        var DistanceTraveled = (
            Math.sqrt(Math.pow((oPosition.x - data.X),2) + Math.pow((oPosition.y - data.Y),2) + Math.pow((oPosition.z - data.Z),2))
        );

        connection.player.position = new Vector3(data.X, data.Y, data.Z);
        connection.socket.broadcast.to(this.id).emit('updated_position', {
            clientID: connection.player.id,
            position: connection.player.position,
            isFlash: false
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
                this.StunAbility(connection);
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
                            case 4:
                                console.log("StunGun!");
                                if(connection.player.CanCastE){
                                    returnData = {
                                        clientID: connection.player.id,
                                        gunID: connection.player.CurrentGun,
                                        velocity: this.GameConfig.GunConfig.Sniper.velocity,
                                        direction: new Quaternion(data.ShootDirection.x, data.ShootDirection.y, data.ShootDirection.z, data.ShootDirection.w),
                                        position: new Vector3(data.SpawnPosition.x, data.SpawnPosition.y, data.SpawnPosition.z)
                                    }

                                    connection.player.CurrentGun = 0;

                                    let data1 = {
                                        AbilityID: "E"
                                    }
                                    this.GoOnCooldown(connection, data1)
                                }
                                else{
                                    ServerConsole.LogEvent("Player was not allowed to shoot this gun");
                                }
                                break;
                }

                if(returnData != {}){
                    connection.socket.broadcast.to(this.id).emit('gun_attack_packet', returnData);
                }



            }
            else{
                ServerConsole.LogEvent("player is not scoping");
            }
    }

    UseAmmo(connection = Connection, count, callback){
        if(connection.player.CurrentAmmo - count > 0){
            connection.player.CurrentAmmo -= count;
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

    ShieldAbility(connection = Connection, data){

        if(connection.player.Q_ability != this.GameConfig.AbilityConfig.Shield_A.ID){
            ServerConsole.LogEvent("Player is not allowed to cast this ability!");
            return;
        }
        if(!connection.player.CanCastQ){
            ServerConsole.LogEvent("ability is on cooldown!");
            return;
        }

        var Sposition = new Vector3(data.posX, data.posY, data.posZ);
        var Srotation = new Vector3(data.rotX, data.rotY, data.rotZ);
        var playerposition = connection.player.position;

        var ObjectID = shortid.generate();

        var DistanceToShield = (
            Math.sqrt(Math.pow((playerposition.x - Sposition.x),2) + Math.pow((playerposition.y - Sposition.y),2) + Math.pow((playerposition.z - Sposition.z),2))
        );

        if(DistanceToShield > this.GameConfig.AbilityConfig.Shield_A.range){
            ServerConsole.LogEvent("Shield.A maximium range limit was hit!", this.id, 2);
            return;
        }

        this.ShieldObjects.push({
            lifetime_decreaser: (this.GameConfig.AbilityConfig.Shield_A.max_health / this.GameConfig.AbilityConfig.Shield_A.lifetime),
            ID: ObjectID,
            health: this.GameConfig.AbilityConfig.Shield_A.max_health 
        });

        this.connections.forEach(con =>{
            con.socket.emit('shield_object', {
                ID: ObjectID,
                position: Sposition,
                rotation: Srotation,
                lifetime: this.GameConfig.AbilityConfig.Shield_A.lifetime,
                health: this.GameConfig.AbilityConfig.Shield_A.max_health
            });
        });

        ServerConsole.LogEvent("created shield object with distance to player of : "+DistanceToShield);

        data = {
            AbilityID: "Q"
        }

        this.GoOnCooldown(connection, data)
    }

    HealAbility(connection = Connection, data){

        if(connection.player.E_ability != this.GameConfig.AbilityConfig.Heal_A.ID){
            ServerConsole.LogEvent("Player is not allowed to cast this ability!");
            return;
        }

        if(!connection.player.CanCastE){
            ServerConsole.LogEvent("ability is on cooldown!");
            return;
        }

        var healAmount = this.GameConfig.AbilityConfig.Heal_A.amount;
        if(connection.player.health + healAmount > 400){
            this.UpdateHealth(connection, 400);
        }
        else{
            this.UpdateHealth(connection, connection.player.health + healAmount);
        }

        data = {
            AbilityID: "F"
        }

        this.GoOnCooldown(connection, data);
    }

    FlashAbility(connection = Connection, data){

        if(connection.player.F_ability != this.GameConfig.AbilityConfig.Flash_A.ID){
            ServerConsole.LogEvent("Player is not allowed to cast this ability!");
            return;
        }

        if(!connection.player.CanCastF){
            ServerConsole.LogEvent("ability is on cooldown!");
            return;
        }

        let fPosition = new Vector3(data.X, data.Y, data.Z);
        let playerposition = connection.player.position;

        var DistanceToteleport = (
            Math.sqrt(Math.pow((playerposition.x - fPosition.x),2) + Math.pow((playerposition.y - fPosition.y),2) + Math.pow((playerposition.z - fPosition.z),2))
        );

        data = {
            AbilityID: "F"
        }

        this.GoOnCooldown(connection, data);

        this.TeleportPlayer(connection, fPosition);
    }

    StunAbility(connection = Connection){
        connection.player.CurrentGun = 4;
        connection.player.CurrentAmmo = 1;
    }

    GoOnCooldown(connection = Connection, data){
        switch(data.AbilityID){
            case "Q":
                connection.player.CanCastQ = false;

                this.cooldowns.push({
                    con: connection,
                    ability: "Q",
                    cooldown: this.GameConfig.AbilityConfig.CoolDowns.Q
                });

                ServerConsole.LogEvent("added ability Q to cooldown array!");
                break;
            case "E":
                connection.player.CanCastE = false;

                this.cooldowns.push({
                    con: connection,
                    ability: "E",
                    cooldown: this.GameConfig.AbilityConfig.CoolDowns.E
                });

                ServerConsole.LogEvent("added ability E to cooldown array!");
                break;
            case "F":
                connection.player.CanCastF = false;

                this.cooldowns.push({
                    con: connection,
                    ability: "F",
                    cooldown: this.GameConfig.AbilityConfig.CoolDowns.F
                });

                ServerConsole.LogEvent("added ability F to cooldown array!");
                break;
        }
    }

    OnProjectileHit(connection = Connection, data){
        console.log(data);

        if(data.IsExplosive){
            this.connections.forEach(con => {
                var playerposition = con.player.position;
                var DistanceToPlayer = (
                    Math.sqrt(Math.pow((playerposition.x - data.position.x),2) + Math.pow((playerposition.y - data.position.y),2) + Math.pow((playerposition.z - data.position.z),2))
                );

                if(DistanceToPlayer < 4.9){
                    var Damage = (this.GameConfig.GunConfig.RPG.damage - (15 * (3*DistanceToPlayer)));
                    this.UpdateHealth(con, con.player.health - Damage);
                }
            });
        }
        else{
            if(data.TargetID != null){
                let target = this.ConnectionsByIDs[data.TargetID];
                let playerposition = target.player.position;

                var DistanceToPlayer = (
                    Math.sqrt(Math.pow((playerposition.x - data.position.x),2) + Math.pow((playerposition.y - data.position.y),2) + Math.pow((playerposition.z - data.position.z),2))
                );
                
                if(DistanceToPlayer < 1.50){
                    let bulletGunID = data.GunID;
                    let damage = 0;
                    

                    switch(bulletGunID){
                        case 0:
                            damage = this.GameConfig.GunConfig.AK47.damage;
                            break;
                        case 2:
                            damage = this.GameConfig.GunConfig.ShotGun.damage;
                            break;
                        case 3:
                            damage = this.GameConfig.GunConfig.Sniper.damage;
                            break;
                        case 4:
                            this.StunPlayer(target);
                            break;
                    }

                    this.UpdateHealth(target, target.player.health - damage);
                }
            }
            
        }
    }

    UpdateHealth(connection = Connection, health){
        connection.player.health = health;
        if(health > 0){
            this.connections.forEach(con =>{
                con.socket.emit("updated_health", {
                    clientID: con.player.id,
                    health: con.player.health
                });
            })
        }
        else{
            this.PlayerKillEvent(connection);
        }
    }

    StunPlayer(connection = Connection){
        connection.player.canMove = false;
        ServerConsole.LogEvent("stunned player!");

        this.connections.forEach(con => {
            con.socket.emit('stunned', {
                clientID: connection.player.id,
                duration: this.GameConfig.AbilityConfig.Stun_A.duration
            });
        });

        setTimeout(() => {
            connection.player.canMove = true;
        }, this.GameConfig.AbilityConfig.Stun_A.duration);
    }

    PlayerKillEvent(connection){
        let player = connection.player;
        let playerDeathPosition = connection.player.position;

        if(player.IsAlive){
    
            let deathpacketData = {
                clientID: player.id,
                position: playerDeathPosition,
                rotation: player.rotation
            }
            
            this.connections.forEach(con => {
                con.socket.emit('death_packet', deathpacketData);
            });
    
            switch(connection.player.TEAM){
                case "RED":
                    this.BLUE_kills += 1;
                    ServerConsole.LogEvent("BLUE team scored");
                    break;
                case "BLUE":
                    this.RED_kills += 1;
                    ServerConsole.LogEvent("RED team scored");
                    break;
            }

            ServerConsole.LogEvent(this.BLUE_kills + " || "+this.RED_Kills);
    
            player.canMove = false;
            player.IsAlive = false;

            this.ResetRound();

        }
    }

    ResetRound(){
        this.connections.forEach(con => {
            this.MovePlayer(con, con.player.SpawnPosition);
            
            con.socket.emit('round_end', {
                blue: this.BLUE_kills,
                red: this.RED_Kills,
                round: this.roundNumber
            });

            con.player.IsAlive = true;
            this.UpdateHealth(con, 400);
        });

        this.roundNumber++;

        setTimeout(() => {

            this.connections.forEach(con => {
                con.socket.emit('round_start');
                con.player.canMove = true;
                con.player.canMove = true;
            });

        }, 3000);
    }

    TeleportPlayer(connection = Connection, NewPosition){
        connection.player.canMove = false;
        connection.player.position = NewPosition;

        this.connections.forEach(con => {
            con.socket.emit('updated_position', {
                clientID: connection.player.id,
                position: connection.player.position,
                isFlash: true
            })
        });
        connection.player.canMove = true;

        ServerConsole.LogEvent("teleported player successfully!");
    }

    MovePlayer(connection = Connection, NewPosition){
        connection.player.canMove = false;
        connection.player.position = NewPosition;

        this.connections.forEach(con => {
            con.socket.emit('updated_position', {
                clientID: connection.player.id,
                position: connection.player.position,
                isFlash: false
            })
        });
        connection.player.canMove = true;

        ServerConsole.LogEvent("Moved player successfully!");
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