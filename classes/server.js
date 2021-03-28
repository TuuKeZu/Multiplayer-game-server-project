const Console = require('./console');
const ServerConsole = new Console();


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

        ServerConsole.LogEvent("Added connection : ["+player.id+"] To the server! Connections lenght is now: "+this.connections.length+"... mitä");

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

        ServerConsole.LogEvent("Client Have disconnected", connection.lobby.id, 2);

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
        ServerConsole.LogEvent("Found a total of : "+GameLobbies.length+"/"+server.lobbies.length+" from the server!", connection.lobby.id, null);

        for (let index = 0; index < server.lobby_IDs.length; index++) {
            if(!LobbyFound){
                let lobbyID = server.lobby_IDs[index];

                if(server.lobbies[lobbyID] != null){
                    let CanJoin = server.lobbies[lobbyID].CanEnterLobby(connection);
                    ServerConsole.LogEvent("found one lobby");
                    
                    if(CanJoin){
                        LobbyFound = true;
                        server.OnSwitchLobby(connection, lobbyID);
                    }
                    else{
                        ServerConsole.LogEvent("lobby ["+lobbyID+"] was full");
                    }
                }
                else{
                    ServerConsole.LogEvent("there was a problem finding an lobby with an ID of : "+lobbyID);
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

        ServerConsole.LogEvent("started looking for lobby with an ID of : "+data.lobby+", and Password of : "+data.password);
        
        ServerConsole.LogEvent("Found a total of : "+GameLobbies.length+"/"+server.lobbies.length+" from the server!", connection.lobby.id, null);

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
                        ServerConsole.LogEvent("The lobby ["+server.lobby_IDs[index]+"] was full");
                    }
                }
                else{
                    ServerConsole.LogEvent("Password["+data.password+"] wasn't equal to ["+server.lobbies[server.lobby_IDs[index]].password+"]");
                    var e = {
                        type: "lobby",
                        msg: "411:incorrect password"
                    }

                    connection.socket.emit('ErrorReceived',e);
                }
            }
            
        }

        if(!LobbyFound){
            ServerConsole.LogEvent("Connection failed: No lobby found");
        }
    } 

    CreateLobbyOpen(settings = GameLobbySettings, connection = Connection){
        let server = this;
        let id = shortid.generate();

        ServerConsole.LogEvent("Creating new public lobby...", null, 1);
        let gamelobby = new Gamelobby(id, settings, null); 

        server.lobbies[id] = gamelobby;
        server.lobby_IDs[server.lobby_IDs.length +1] = id;

        ServerConsole.LogEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id, null, null);
        ServerConsole.LogServerEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id, gamelobby.id);
        server.OnSwitchLobby(connection, id);
    }

    CreateLobbyPrivate(settings = GameLobbySettings, password, connection = Connection_){
        let server = this;
        let id = shortid.generate();

        if(password != null){
            ServerConsole.LogEvent("Creating new private lobby...", null, 1);

            let gamelobby = new Gamelobby(id, settings, password);
            gamelobby.password = password;

            server.lobbies[id] = gamelobby;
            server.lobby_IDs[server.lobby_IDs.length +1] = id;

            ServerConsole.LogEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id+", Password of : "+gamelobby.password+", Maxplayers of : "+settings.maxPlayerCount, null, null);

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

        ServerConsole.LogEvent("Preparing to send new connection to : "+lobbyID);
        lobbies[connection.player.lobby].OnExitLobby(connection);
        lobbies[lobbyID].OnEnterLobby(connection);
    }

    KillLobby(lobby = Gamelobby){
        ServerConsole.LogEvent("starting lobby shutdown", lobby.id, 2);
        
        let target = lobby;

        if(target != null){
            for (let index = 0; index < this.lobby_IDs.length; index++) {
                if(this.lobby_IDs[index] == target.id){
                    this.lobby_IDs.splice(index, 1);
                    ServerConsole.LogEvent("Successfully deleted the lobby!", lobby.id);
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