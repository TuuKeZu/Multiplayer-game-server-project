const Console = require('./console');
const ServerConsole = new Console();


let Connection_ = require('./connection');
let Player = require('./player');

let LobbyBase = require('./Lobbies/lobbyBase');
let Gamelobby = require('./Lobbies/GameLobby');
let GameLobbySettings = require('./Lobbies/GameLobbySettings');

module.exports = class Server {
    constructor(){
        this.connections = [];
        this.lobbies = [];

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

        socket.join(player.lobby);
        connection.lobby = lobbies[player.lobby];
        connection.lobby.OnEnterLobby(connection);

        return connection;
    } 

    OnDisconnected(connection = Connection){
        let server = this;
        let id = connection.player.id;

        delete server.connections[id];
        ServerConsole.LogEvent("Client Have disconnected", connection.lobby.id, 2);

        connection.socket.broadcast.to(connection.player.lobby).emit('disconnected', {
            id: id
        })

        server.lobbies[connection.player.lobby].OnExitLobby(connection);
    } 

    OnAttemptToJoinGame(connection = Connection){
        let server = this;
        let LobbyFound = false;

        let GameLobbies = server.lobbies.filter(item => {
            return item instanceof Gamelobby;
        })
        ServerConsole.LogEvent("Found a total of : "+GameLobbies.length+" from the server!", connection.lobby.id, null);

        GameLobbies.forEach(lobby => {
            if(!LobbyFound){
                let CanJoin = lobby.CanEnterLobby(connection);

                if(CanJoin){
                    LobbyFound = true;
                    server.OnSwitchLobby(connection, lobby.id);
                }
            }
        })

        if(!LobbyFound){
            ServerConsole.LogEvent("Creating new game lobby...", connection.lobby.id);
            let gamelobby = new Gamelobby(GameLobbies.length + 1, new GameLobbySettings('NORMAL', 2));
            server.lobbies.push(gamelobby);
            server.OnSwitchLobby(connection, gamelobby.id);
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





}