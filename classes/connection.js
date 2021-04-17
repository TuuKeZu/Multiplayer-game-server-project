const Login_System = require('./Login-System');
const LoginSystem = new Login_System();

const Console = require('./console');
const ServerConsole = new Console();

const GameLobbySettings = require('./Lobbies/GameLobbySettings');

module.exports = class Connection{
    constructor(){
        this.socket;
        this.player;
        this.server;
        this.lobby;
    }

    CreateEvents(){
        let connection = this;
        let socket = connection.socket;
        let server = connection.server;
        let player = connection.player;

        socket.on('disconnect', function(data){
            server.OnDisconnected(connection);
        });
    }
}