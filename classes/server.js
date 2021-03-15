const Console = require('./console');
const ServerConsole = new Console();


let Connection_ = require('./connection');
let Player = require('./player');

let LobbyBase = require('./Lobbies/lobbyBase');
let Gamelobby = require('./Lobbies/GameLobby');
let GameLobbySettings = require('./Lobbies/GameLobbySettings');
const shortid = require('shortid');

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

        /*GameLobbies.forEach(lobby => {
            if(!LobbyFound){
                let CanJoin = lobby.CanEnterLobby(connection);

                if(CanJoin && lobby.password == null){
                    LobbyFound = true;
                    server.OnSwitchLobby(connection, lobby.id);
                }
            }
        })
        */

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
                }
            }
            
        }

        if(!LobbyFound){
            ServerConsole.LogEvent("Connection failed: No lobby found");
        }
    } 

    //for lobby without password
    CreateLobbyOpen(settings = GameLobbySettings, connection = Connection){
        let server = this;
        let id = shortid.generate();

        ServerConsole.LogEvent("Creating new public lobby...", null, 1);
        let gamelobby = new Gamelobby(id, settings, null); 

        server.lobbies[id] = gamelobby;
        server.lobby_IDs[server.lobby_IDs.length +1] = id;

        ServerConsole.LogEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id, null, null);
        server.OnSwitchLobby(connection, id);
    }

    //for lobby with password
    CreateLobbyPrivate(settings = GameLobbySettings, password){
        let server = this;
        let id = shortid.generate();

        if(password != null){
            ServerConsole.LogEvent("Creating new private lobby...", null, 1);
            let gamelobby = new Gamelobby(id, settings, password);
            gamelobby.password = password;

            server.lobbies[id] = gamelobby;
            server.lobby_IDs[server.lobby_IDs.length +1] = id;

            ServerConsole.LogEvent("successfully created a new GameLobby with an ID of : "+gamelobby.id+", Password of : "+gamelobby.password+", Maxplayers of : "+settings.maxPlayerCount, null, null);
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
        
        let index = this.lobbies.indexOf(lobby);

        if(index > -1){
            this.lobbies.splice(index, 1)
            ServerConsole.LogEvent("Successfully removed the lobby!");
        }
    }





}