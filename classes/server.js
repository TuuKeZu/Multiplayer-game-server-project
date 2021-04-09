const Console = require('./console');
const ServerConsole = new Console();

const config = require('./config');
const C = new config();

const Config = true;


let Connection_ = require('./connection');
let Player = require('./player');

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
    UpdateLobbyTick(){
        let server = this;

        for (let index = 0; index < server.lobby_IDs.length; index++) {
            let lobby = server.lobbies[server.lobby_IDs[index]];
            if(lobby != null){
                lobby.LobbyTick();
            }
        }
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

    OnAttemptToJoinGame(connection = Connection){ //join open random lobby
        let server = this;
        let LobbyFound = false;

        let GameLobbies = server.lobbies.filter(item => {
            return item instanceof Gamelobby;
        })
        //#region DEBUG
            C.Get(function(data){
                if(data.show_lobby_events){
                    ServerConsole.LogEvent("Found a total of : "+GameLobbies.length+"/"+server.lobbies.length+" from the server!", connection.lobby.id, null);
                }
            });
        //#endregion 

        for (let index = 0; index < server.lobby_IDs.length; index++) {
            if(!LobbyFound){
                let lobbyID = server.lobby_IDs[index];

                if(server.lobbies[lobbyID] != null){
                    let CanJoin = true;
                    //let CanJoin = server.lobbies[lobbyID].CanEnterLobby(connection);
                    //#region DEBUG
                    C.Get(function(data){
                        if(data.show_lobby_events){
                            ServerConsole.LogEvent("found one lobby");
                        }
                    });
                    //#endregion 
                    
                    if(CanJoin){
                        LobbyFound = true;
                        server.OnSwitchLobby(connection, lobbyID);
                    }
                    else{
                    //#region DEBUG
                        C.Get(function(data){
                            if(data.show_lobby_events){
                                ServerConsole.LogEvent("lobby ["+lobbyID+"] was full");
                            }
                        });
                    //#endregion 
                    }
                }
                else{
                    //#region DEBUG
                    C.Get(function(data){
                        if(data.show_lobby_events){
                            ServerConsole.LogEvent("there was a problem finding an lobby with an ID of : "+lobbyID);
                        }
                    });
                    //#endregion 
                }   
            }
            
        }

        if(!LobbyFound){
            server.CreateLobbyOpen(new GameLobbySettings('NORMAL', 3), connection);
        }
    } 

    OnAttemptToJoinGamePrivate(connection = Connection_, data){ //Join lobby with an id and password
        let server = this;
        let LobbyFound = false;

        let GameLobbies = server.lobbies.filter(item => {
            return item instanceof Gamelobby;
        });

        for (let index = 0; index < this.lobby_IDs.length; index++) {
            if(this.lobby_IDs[index] == data.lobby){

                //ServerConsole.LogEvent("One lobby with that specified request was found");

                if(server.lobbies[server.lobby_IDs[index]].password == data.password){
                    //ServerConsole.LogEvent("Password macthed");

                    let Canjoin = server.lobbies[server.lobby_IDs[index]].CanEnterLobby(connection);

                    if(Canjoin){
                        LobbyFound = true;
                        server.OnSwitchLobby(connection, data.lobby);
                    }
                    else{
                        
                    }
                }
                else{
                    var e = {
                        type: "lobby",
                        msg: "411:incorrect password"
                    }

                    connection.socket.emit('ErrorReceived',e);
                }
            }
            
        }

        if(!LobbyFound){
        }
    } 

    CreateLobbyOpen(settings = GameLobbySettings, connection = Connection){
        let server = this;
        let id = shortid.generate();
        //#region DEBUG
            C.Get(function(data){
                if(data.show_lobby_events){
                    ServerConsole.LogEvent("Creating new public lobby...", null, 1);
                }
            });
        //#endregion 
        let gamelobby = new Gamelobby(id, settings, null); 

        server.lobbies[id] = gamelobby;
        server.lobby_IDs[server.lobby_IDs.length +1] = id;

        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                ServerConsole.LogEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id, null, null);
            }
        });
        //#endregion 
        ServerConsole.LogServerEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id, gamelobby.id);
        server.OnSwitchLobby(connection, id);
    }

    CreateLobbyPrivate(settings = GameLobbySettings, password, connection = Connection_){
        let server = this;
        let id = shortid.generate();

        if(password != null){
        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                ServerConsole.LogEvent("Creating new public lobby...", null, 1);
            }
        });
    //#endregion 

            let gamelobby = new Gamelobby(id, settings, password);
            gamelobby.password = password;

            server.lobbies[id] = gamelobby;
            server.lobby_IDs[server.lobby_IDs.length +1] = id;

        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                ServerConsole.LogEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id, null, null);
            }
        });
        //#endregion 

            if(settings.isPlayerGenerated){
                gamelobby.IsServerGenerated = false;
            }
            else{
                gamelobby.IsServerGenerated = true;
            }
        
            if(connection != null){
                server.OnSwitchLobby(connection, gamelobby.id);
            }
        }
    }

    OnSwitchLobby(connection = Connection, lobbyID){
        let server = this;
        let lobbies = server.lobbies;

        connection.socket.join(lobbyID);
        connection.lobby = lobbies[lobbyID];
        lobbies[connection.player.lobby].OnExitLobby(connection);
        lobbies[lobbyID].OnEnterLobby(connection);
    }

    KillLobby(lobby = Gamelobby){
        //#region DEBUG
        C.Get(function(data){
            if(data.show_lobby_events){
                ServerConsole.LogEvent("starting lobby shutdown", lobby.id, 2);
            }
        });
        //#endregion 
        
        let target = lobby;

        if(target != null){
            for (let index = 0; index < this.lobby_IDs.length; index++) {
                if(this.lobby_IDs[index] == target.id){
                    this.lobby_IDs.splice(index, 1);
                    //#region DEBUG
                    C.Get(function(data){
                        if(data.show_lobby_events){
                            ServerConsole.LogEvent("Successfully deleted the lobby!", lobby.id);
                        }
                    });
                    //#endregion 
                }
                
            }


        }

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




}