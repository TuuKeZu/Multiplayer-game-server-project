//ws://127.0.0.1:52300/socket.io/?EIO=3&transport=websocket
//ws://45.32.234.225:52300/socket.io/?EIO=3&transport=websocket



const io = require('socket.io')(process.env.PORT || 52300);  
const Server = require('./classes/server.js');

const config = require('./classes/Config/config');
const C = new config();

const Login_System = require('./classes/MySQL/Login-System');
const LoginSystem = new Login_System();

let GameLobbySettings = require('./classes/Lobbies/GameLobbySettings');

const Console = require('./classes/Config/console');
const ServerConsole = new Console();

const mysql = require('./classes/MySQL/MySQLconnection');
const mySQL = new mysql();

const { settings } = require('cluster');

ServerConsole.LogEvent("Server started", null, 0);

let server = new Server();

setInterval(() => {
    server.OnLobbyCheck();
}, 5000);

setInterval(() => {
    server.OnPacketFrequencyCheck();
}, 500);

let CanSendCrashReport;

io.on('connection', function(socket){
    let connection = server.OnConnected(socket);
    connection.CreateEvents();
    connection.socket.emit('register', {'id':connection.player.id});
});

//server side command handler

setInterval(() => {
}, 2000);



process.stdin.resume();
process.stdin.setEncoding('utf8');



//Server side commands
process.stdin.on('data', function (text) {

    ServerConsole.LogEvent(text, null, null);
    console_array = text.split(' ');

    if(text.trim() === 'stop') {
        quit();
    }



});

//server side functions

function quit() {
    ServerConsole.LogEvent('Server shut down!', null, 2);
    ServerConsole.LogEvent("Server shutting down...", null, 2);
    process.exit(1);
}




//Error handeling:

async function SendCrashReport(error){
    if(CanSendCrashReport != false){
        //Discord.LogEvent(error, "CRASH");
        ServerConsole.LogEvent("Sent crash report");
        CanSendCrashReport = false;
    }
}

process.on('uncaughtException', (error)  => {
    
    ServerConsole.LogEvent("Server shutting down...", null, 2);
    
    ServerConsole.LogEvent(error.stack, null, 2);
    process.exit(1);
    

});
