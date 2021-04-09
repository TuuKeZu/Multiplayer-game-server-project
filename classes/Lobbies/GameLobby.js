//Copyright 2021, Tuukka Moilanen, All rights recerved

const Console = require('../console');
const ServerConsole = new Console();

const Debug = require('../debug');
const DEBUG = new Debug();

const config = require('../config');
const C = new config();

const fs = require('fs');

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
        this.timeElapsed = 600;
        this.HaveStarted;
        this.BLUE_kills = 0;
        this.RED_Kills = 0;
    }  
    
    LobbyTick(){
        let lobby = this;
        if(lobby.HaveStarted){
            lobby.timeElapsed -= 1;

            for (let index = 0; index < this.connection_IDs.length+2; index++) {
                let con = lobby.connections[index];
                if(con != null){
                    con.socket.emit('UpdateTimer', {timer: this.timeElapsed});
                }
            }
        }
    }

    CanEnterLobby(connection = Connection){
        let lobby = this;
        let maxPlayerCount = lobby.settings.maxPlayerCount;
        let CurrentPlayerCount = lobby.connections.length;

        //#region DEBUG
        C.Get(function(data){
            if(data.show_join_requests){
                ServerConsole.LogEvent("Connection to lobby ["+lobby.id+"] was declined. Reason : too many players!", null, null);
                return false;
            }
        });
        //#endregion 
    }

    OnEnterLobby(connection = Connection){
        let lobby = this;

        super.OnEnterLobby(connection);

        //spawning;
        var returnData = {
            id: connection.player.id,
            username: connection.player.username
        }
        
        connection.socket.emit('spawn', returnData);

        lobby.connection_count += 1;
    }

    SendConnectionVerification(connection = Connection, id_){
        let lobby = this;
        connection.socket.emit('CreationSuccessfull', {id: id_});
    }

    GetLobbyConnections(connection = Connection){
        let lobby = this;
        return lobby.connections;
    }

    SendHandShake(connection = Connection, data){
        let lobby = this;
        
        let socket = connection.socket;

        connection.player.username = data.username; 
        socket.emit('verify', connection.player); 
        lobby.addPlayer(connection);
        //#region DEBUG
        C.Get(function(data_){
            if(data_.show_join_requests){
                ServerConsole.LogEvent("Handshake received! username: "+data.username, lobby.id, 1);
                return false;
            }
        });
        //#endregion 
    }

    SendMessageToLobby(connection = Connection, data){
        if(connection == null || !connection.player.IsAlive){
            //#region DEBUG
            C.Get(function(data){
                if(data.show_chat){
                    ServerConsole.LogEvent("Client Error", lobby.id, 2);
                    return false;
                }
            });
            //#endregion 
            return;
        }
        let lobby = this;

        let socket = connection.socket;

        var message = data.content;
        var username = data.username;

        //command manager
        if(message.lastIndexOf("/", 0) === 0){
            var array = [];
            array = message.split(' ');
            ServerConsole.LogEvent("Command was ran", 1);
                if(message == "/start"){
                    lobby.StartGame(connection);
                }
                if(message.lastIndexOf("/kick", 0) === 0){
                    if(array[1] != null){
                        
                    }
                }
                
        }

            //#region DEBUG
            C.Get(function(data){
                if(data.show_chat){
                    ServerConsole.LogEvent("["+connection.player.id+"]<"+username+">: "+message+"", lobby.id, 3);
                }
            });
            //#endregion 
        ServerConsole.LogChatEvent("["+username+"]: "+message, this.id);
        this.public_chat.push("["+username+"]: "+message);
    
        socket.emit('MessageEventVerification', {content: message});

        socket.broadcast.to(lobby.id).emit("MessageEventReceived", {content: this.public_chat[this.public_chat.length -1]});
    }

    UpdateTarget(connection = Connection, data){
        if(connection == null || !connection.player.IsAlive){
            //#region DEBUG
            C.Get(function(data){
                if(data.show_look_packets){
                    ServerConsole.LogEvent("Client Error", lobby.id, 2);
                    return false;
                }
            });
            //#endregion 
            return;
        }
        let lobby = this;
        let player = connection.player;

        player.lookingAt = data.target;
            //#region DEBUG
            C.Get(function(data){
                if(data.show_look_packets){
                    ServerConsole.LogEvent("Client ["+player.id+"] is looking at: ["+player.lookingAt+"].");
                }
            });
            //#endregion 
    }

    UpdatePosition(connection = Connection, data){
        //Error Checking
        if(connection == null || !connection.player.IsAlive){
            //#region DEBUG
            C.Get(function(data){
                if(data.show_movement_packets){
                    ServerConsole.LogEvent("Client Error", lobby.id, 2);
                }
            });
            //#endregion 
            return;
        }
        let lobby = this;
        let socket = connection.socket;
        let player = connection.player;
        if(connection.player.IsAlive){
            connection.player.position.x = data.position.X;
            connection.player.position.y = data.position.Y;
            connection.player.position.z = data.position.Z;

            socket.broadcast.to(lobby.id).emit('UpdatePosition', player);

            //#region DEBUG
            C.Get(function(data1){
                if(data1.show_movement_packets){
                    console.log("Client ["+data.ID+"] position is equal to : "+data.position.X + ","+data.position.Y+","+data.position.Z+" : Player is looking at: ["+connection.player.lookingAt+"].");
                }
            });
            //#endregion 
        }
        
    }

    UpdateRotation(connection = Connection, data){
        //Error Checking
        if(connection == null || !connection.player.IsAlive){
            //#region DEBUG
            C.Get(function(data){
                if(data.show_rotation_packets){
                    ServerConsole.LogEvent("Client Error", lobby.id, 2);
                }
            });
            //#endregion 
            return;
        }
        let lobby = this;
        let socket = connection.socket;
        let player = connection.player;

        if(connection.player.IsAlive){
            connection.player.rotation.x = data.rotation.X;
            connection.player.rotation.y = data.rotation.Y;
            connection.player.rotation.z = data.rotation.Z;

            socket.broadcast.to(lobby.id).emit('UpdateRotation', player);

            //#region DEBUG
            C.Get(function(data1){
                if(data1.show_rotation_packets){
                    console.log("Client ["+data.ID+"] Rotation is equal to : "+data.rotation.X + ","+data.rotation.Y+","+data.rotation.Z+" : Player is looking at: ["+connection.player.lookingAt+"].");
                }
            });
            //#endregion 
        }
        
    }

    SendAttackPacket(connection = Connection, data){
        let lobby = this
        if(connection == null || !connection.player.IsAlive){
            //#region DEBUG
            C.Get(function(data){
                if(data.show_attack_packets){
                    ServerConsole.LogEvent("Client Error", lobby.id, 2);
                }
            });
            //#endregion 
            return;
        }

        let damage = parseInt(data.damage);
        let playerfound = false;
        let ID;

        if(damage > 70 || damage < 1){
            //#region DEBUG
            C.Get(function(data){
                if(data.show_attack_packets){
                    ServerConsole.LogEvent("Client Error : damage is invalid", lobby.id, 2);
                }
            });
            //#endregion 
            return;
        }
        if(!this.HaveStarted){
            //#region DEBUG
            C.Get(function(data){
                if(data.show_attack_packets){
                    ServerConsole.LogEvent("Client Error : Game has not started yet!", lobby.id, 2);
                }
            });
            //#endregion 
            return;
        }

        if(connection.player.IsAlive){
            let thisPlayerID = connection.player.id;

            let Packet_Sender = thisPlayerID;
            let packet_effected = connection.player.lookingAt;

            //#region DEBUG
            C.Get(function(data){
                if(data.show_attack_packets){
                    ServerConsole.LogEvent(packet_effected+" Got shot by : "+Packet_Sender+" : "+data.damage, lobby.id, null);
                }
            });
            //#endregion 

            for (let index = 0; index < this.connections.length; index++) {
                if(this.connections[index].player.id == packet_effected){
                    playerfound = true;
                    ID = index;
                }
            }

            if(playerfound){
                //#region DEBUG
                C.Get(function(data){
                    if(data.show_attack_packets){
                        ServerConsole.LogEvent(packet_effected+" Got shot by : "+Packet_Sender, lobby.id, null);
                    }
                });
                //#endregion 

                if(packet_effected != thisPlayerID){
                    //PAYLOAD
                    let target = this.connections[ID];
                    let socket = target.socket;

                    //ServerConsole.LogEvent(target.player.health, null, 3);

                    target.player.health -= damage;

                    socket.emit('UpdateHealth', target.player);
                    socket.broadcast.to(this.id).emit('UpdateHealth', target.player);

                    if(target.player.health < 2){
                        var username = target.player.username;
                        var sender_username = connection.player.username;

                        socket.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});
                        socket.broadcast.to(this.id).emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});

                        this.KillClient(target);
                    }

                    
                }
            }
            else{
                //#region DEBUG
                C.Get(function(data){
                    if(data.show_attack_packets){
                        ServerConsole.LogEvent("Player was not found with an ID of : '"+packet_effected+"'/"+lobby.connections.length);
                    }
                });
                //#endregion 
            }
        }
        else{
            
        }
    }

    StartGame(connection = Connection){
        let lobby = this;
        let socket = connection.socket;


        if(lobby.connection_count  < 1){
                //#region DEBUG
                C.Get(function(data){
                    if(data.show_lobby_events){
                        ServerConsole.LogEvent("Cannot start game : too few players");
                    }
                });
                //#endregion 
            return;
        }

        ServerConsole.LogEvent("Game have ben started!", lobby.is, 0);

        socket.emit("MessageEventReceived", {content: "[SERVER]:You started the game, have fun"});
        socket.broadcast.to(lobby.id).emit("MessageEventReceived", {content: "[SERVER]:Game Have Started"});

        ServerConsole.LogEvent("Started the game!");
        this.HaveStarted = true;


        //RANDOM PARTIES

        for (let index = 0; index < lobby.connection_IDs.length; index++) {
            if(index+1 % 2 == 1){
                
                let id = lobby.connection_IDs[index];
                let target = lobby.connections[index].player;
                let targetSocket = lobby.connections[index].socket;

                target.IsAlive = false;

                target.team = "RED";
                //#region DEBUG
                C.Get(function(data){
                    if(data.show_lobby_events){
                        ServerConsole.LogEvent("["+target.username+"] was assinged to the blue team!", null, 2);
                    }
                });
                //#endregion 
                targetSocket.emit('SetTeam', target);
                targetSocket.broadcast.to(lobby.id).emit('SetTeam', target);

                lobby.TeleportClient(lobby.connections[index], 77.855, -3.06, 33.191);

                setTimeout(() => {
                    targetSocket.emit('Respawn', target);
                    target.IsAlive = true;
                }, 500);

            }
            
            else{
                
                let id = lobby.connection_IDs[index];
                let target = lobby.connections[index].player;
                let targetSocket = lobby.connections[index].socket;

                target.IsAlive = false;

                target.team = "BLUE";
                //#region DEBUG
                C.Get(function(data){
                    if(data.show_lobby_events){
                        ServerConsole.LogEvent("["+target.username+"] was assinged to the blue team!", null, 0);
                    }
                });
                //#endregion 
                targetSocket.emit('SetTeam', target);
                targetSocket.broadcast.emit('SetTeam', target);

                lobby.TeleportClient(lobby.connections[index],-26, -3.06, -71.8);

                targetSocket.broadcast.to(lobby.id).emit('UpdatePosition', target);
                targetSocket.emit('Move', target);

                setTimeout(() => {
                    targetSocket.emit('Respawn', target);
                    target.IsAlive = true;
                }, 500);

            }
            
        }
    
    }


    KillClient(connection = Connection){
        let lobby = this;
        let target = connection.player;
        let targetSocket = connection.socket;

        target.IsAlive = false;
        
        if(this.HaveStarted){
            if(target.team == "BLUE"){
                this.RED_Kills += 1;
            }
            if(target.team == "RED"){
                this.BLUE_kills += 1;
            }
        }

        //respawn position
        target.position.x = 77.855;
        target.position.y = -3.06;
        target.position.z = 33.191;

        targetSocket.broadcast.to(lobby.id).emit('UpdatePosition', target);
        targetSocket.broadcast.to(lobby.id).emit('Update_Situation', {red: this.RED_Kills, blue: this.BLUE_kills});
        targetSocket.emit('Die', target);
        targetSocket.emit('Update_Situation', {red: this.RED_Kills, blue: this.BLUE_kills});

        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                ServerConsole.LogEvent("Killed client : "+connection.player.id, null, 2);
            }
        });
        //#endregion 

        setTimeout(() => {
            this.Respawn(connection)
        }, 1000);

        //#region DEBUG
            C.Get(function(data){
                if(data.show_lobby_events){
                    ServerConsole.LogEvent("Revived client", null, 0);
                }
            });
        //#endregion 

    }

    TeleportClient(connection = Connection, posX, posY, posZ){
        let lobby = this;
        let target = connection;
        let targetSocket = connection.socket;

        target.player.position.x = posX;
        target.player.position.y = posY;
        target.player.position.z = posZ;

/*
        77.855;
        -3.06;
        33.191;
*/

        targetSocket.broadcast.to(lobby.id).emit('UpdatePosition', target.player);
        targetSocket.emit('Move', target.player);
    }

    Respawn(connection = Connection){
        let lobby = this;
        let target = connection;

        let targetSocket = target.socket;

        target.player.health = 100;
        targetSocket.emit('UpdateHealth', target.player);
        targetSocket.broadcast.to(this.id).emit('UpdateHealth', target.player);

        target.player.IsAlive = true;
        targetSocket.broadcast.to(this.id).emit('UpdatePosition', target.player);
        targetSocket.emit('Respawn', target.player);
        targetSocket.broadcast.to(this.id).emit("MessageEventReceived", {content: "["+target.player.username+"] Respawned!"});
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