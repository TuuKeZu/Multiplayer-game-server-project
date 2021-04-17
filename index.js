//ws://127.0.0.1:52300/socket.io/?EIO=3&transport=websocket
//ws://45.32.234.225:52300/socket.io/?EIO=3&transport=websocket



const io = require('socket.io')(process.env.PORT || 52300);  
const Server = require('./classes/server.js');

const DC = require('../MultiplayerGameServer - DiscordConnection');
const Discord = new DC();

const config = require('./classes/Config/config');
const C = new config();

const Login_System = require('./classes/Login-System');
const LoginSystem = new Login_System();

let GameLobbySettings = require('./classes/Lobbies/GameLobbySettings');

const Console = require('./classes/console');
const ServerConsole = new Console();

const mysql = require('./classes/MySQLconnection');
const mySQL = new mysql();

const fs = require('fs');

const Debug = require('./classes/debug');
const MySQL = require('./classes/MySQLconnection');
const { settings } = require('cluster');
const DEBUG = new Debug();

ServerConsole.LogEvent("Server started", null, 0);
fs.writeFile('Server_Logs.txt', "Server has been started"+"\n", (err) => {
    if(err) throw err;
});
fs.writeFile('Chat_Logs.txt', "Server has been started"+"\n", (err) => {
    if(err) throw err;
});

let server = new Server();

setInterval(() => {
    server.OnLobbyCheck();
}, 5000);

let CanSendCrashReport;

io.on('connection', function(socket){
    let connection = server.OnConnected(socket);
    connection.CreateEvents();
    connection.socket.emit('register', {'id':connection.player.id});
});

//server side command handler

process.stdin.resume();
process.stdin.setEncoding('utf8');



//Server side commands
process.stdin.on('data', function (text) {
  ServerConsole.LogEvent(text, null, null);
  console_array = text.split(' ');

  if (text.trim() === 'stop') {
        quit();
  }

  if (text.trim() === 'lobby ls') {
        LobbyList();
  }

  if (text.trim() === 'connection ls') {
        connectionList();
  }

  if (console_array[0].trim() === 'get') {
        if(console_array[1] != null){
            GetConnectionData(console_array[1])
        }
  }

  if (console_array[0].trim() === 'kick') {
    if(console_array[1] != null){
        Kick(console_array[1])
    }
    else{
        ServerConsole.LogEvent("Invalid arguments", null, 2);
    }
}

if (console_array[0].trim() === 'msg') {
    if(console_array[1] != null && console_array[2] != null){
        msg(console_array[1], console_array[2]);
    }
    else{
        ServerConsole.LogEvent("Invalid arguments", null, 2);
    }
}

if (text.trim() === 'mysql') { //jos konsoliin kirjoitetaan "mysql", jotain tapahtuu.
    LoginSystem.LoginToAccount('test', 'test1');
}

if (text.trim() === 'crash') { 
    debug.log(dasöälkädsöfk);
}

  if (console_array[0].trim() === 'create') {
    if(console_array[1] != null && console_array[2] != null){
        CreateLobby(console_array[1], console_array[2]);
    }
    else{
        ServerConsole.LogEvent("Invalid command argument!", null, 2);
    }
}

if (console_array[0].trim() === 'createA') {
    if(console_array[1] != null && console_array[2] != null){
        LoginSystem.CreateToAccount(console_array[1], console_array[2], 'default@gmail.com');
    }
    else{
        ServerConsole.LogEvent("Invalid command argument!", null, 2);
    }
}

if (console_array[0].trim() === 'kill') {
    if(console_array[1] != null){
        Kill(console_array[1])
    }
    else{
        ServerConsole.LogEvent("Invalid arguments", null, 2);
    }
}

if (console_array[0].trim() === 'find') {
    if(console_array[1] != null){
        Find(console_array[1])
    }
    else{
        ServerConsole.LogEvent("Invalid arguments", null, 2);
    }
}

if (console_array[0].trim() === 'getlobby') {
    if(console_array[1] != null){
        GetLobbyConnections(console_array[1])
    }
    else{
        ServerConsole.LogEvent("Invalid arguments", null, 2);
    }
}

if (console_array[0].trim() === 'config') {
    Config.Get(function(data){
        console.log(data);
    });
}



});

//server side functions

function quit() {
    ServerConsole.LogEvent('Server shut down!', null, 2);
    ServerConsole.LogEvent("Server shutting down...", null, 2);
    for (let index = 0; index < server.connection_IDs.length; index++) {
        let tempID = server.connection_IDs[index];

        if(server.connections[tempID] != null){
            var connection = server.connections[tempID];
            Kick(tempID, "server shutting down");
            ServerConsole.LogEvent("Kicked : "+connection.player.id, null, 2);
        }
        
    }
    process.exit();
}


function LobbyList(){
    ServerConsole.LogEvent("Heres a list of open lobbies at the moment:", null, 0);
    for (let index = 0; index < server.lobby_IDs.length; index++) {
        if(server.lobby_IDs[index] != null){
            ServerConsole.LogEvent(server.lobby_IDs[index]+" : "+server.lobbies[server.lobby_IDs[index]].isServerGenerated, null);
        }
    }
}
function CreateLobby(password, maxPlayers){
    let settings = new GameLobbySettings('NORMAL', maxPlayers);
    settings.isPlayerGenerated = false;
    server.CreateLobbyPrivate(settings, password, null);
}

function connectionList(){
    ServerConsole.LogEvent("Heres a list of open connections at the moment:", null, 0);

    for (let index = 0; index < server.connection_IDs.length; index++) {
        let connectionID = server.connection_IDs[index + 1];
        ServerConsole.LogEvent('"'+connectionID+'"');
        
    }
}
function GetConnectionData(id){
    ServerConsole.LogEvent(id.trim()+", there should better not be a damn whitespace");
    returnData = server.connections[id.trim()];
    if(returnData != null){
        ServerConsole.LogEvent("Heres connection data of a client ["+id.trim()+"]"+'\n'+"ID : "+returnData.player.id+'\n'
        +"Lobby: "+returnData.player.lobby+'\n'
        +"IP-Address: "+returnData.socket.request.connection.remoteAddress+'\n'
        +"Socket ID: "+returnData.socket.id , null, 1);
    }
    else{
        ServerConsole.LogEvent("No connection with ["+'"'+id+'"'+"] was found", null, 1);
    }
}
function Kick(id, reason){
    returnData = server.connections[id.trim()];
    if(reason == null){
        reason == "404";
    }

    if(returnData != null){
        
        var data = {
            id: returnData.player.id,
            reason: reason
        }

        returnData.socket.emit('Kicked', data);
        returnData.socket.disconnect();
    }
    else{
        ServerConsole.LogEvent("No connection with ["+'"'+id+'"'+"] was found", null, 1);
    }
}
function msg(id, content){
    returnData = server.connections[id.trim()];
    if(returnData != null){
        returnData.socket.emit("MessageEventReceived", {content: "[SERVER]: "+content});
        ServerConsole.LogEvent("Message succesfully sent", null, 1);
    }
    else{
        ServerConsole.LogEvent("No connection with ["+'"'+id+'"'+"] was found", null, 1);
    }
}

function Kill(id) {
    returnData = server.connections[id.trim()];
    if(returnData != null){
        returnData.lobby.KillClient(returnData);
    }
    else{
        ServerConsole.LogEvent("No connection with ["+'"'+id+'"'+"] was found", null, 1);
    }
}

function Find(username) {
    for (let index = 0; index < server.connection_IDs.length; index++) {
        if(server.connection_IDs[index+1] != null){
            var tempID = server.connection_IDs[index + 1].trim();

            if(server.connections[tempID] != null){
                var target = server.connections[tempID];
    
                if(target.player.username == username.trim()){
                    ServerConsole.LogEvent("Found player : "+username.trim()+" with ID of ["+target.player.id+"]", null, 1);
                }
            }
        }
        
    }
}

function GetLobbyConnections(lobby_ID) {
    if(server.lobbies[lobby_ID.trim()] != null){
        let tempLobby = server.lobbies[lobby_ID.trim()];
        ServerConsole.LogEvent("Found a lobby with connections of: "+tempLobby.connection_IDs.length);

        for (let index = 0; index < tempLobby.connection_IDs.length; index++) {
            ServerConsole.LogEvent("Client : "+tempLobby.connection_IDs[index]+" - "+tempLobby.connections[index].player.username, null, 1);
        }
    }
    else{
        ServerConsole.LogEvent(" no lobby were found with that ID!");
    }
}




//Error handeling:

async function SendCrashReport(error){
    if(CanSendCrashReport != false){
        Discord.LogEvent(error, "CRASH");
        ServerConsole.LogEvent("Sent crash report");
        CanSendCrashReport = false;
    }
}

process.on('uncaughtException', (error)  => {
    
    ServerConsole.LogEvent("Server shutting down...", null, 2);

    //#region DEBUG
    C.Get(function(data){
        console.log(data);
        if(data.send_crash_reports){
            SendCrashReport(error.stack);
        }
        else{
            ServerConsole.LogEvent("Crash reports are disabled");
        }
    });
    //#endregion 
    
    ServerConsole.LogEvent(error.stack, null, 2);
    


    for (let index = 0; index < server.connection_IDs.length; index++) {
        let tempID = server.connection_IDs[index];

        if(server.connections[tempID] != null){
            var connection = server.connections[tempID];
            Kick(tempID, "server shutting down");
            ServerConsole.LogEvent("Kicked : "+connection.player.id, null, 2);
        }
        
    }
    setTimeout(() => {
        process.exit(1); // exit application  
    }, 300); 
    

});

process.on('SIGINT', signal => {
    C.Get(function(data){
        if(data.enable_CTRL_C){
            ServerConsole.LogEvent("Server shutting down...", null, 2);
            for (let index = 0; index < server.connection_IDs.length; index++) {
                let tempID = server.connection_IDs[index];
                ServerConsole.LogEvent(server.connection_IDs[index]);
        
                if(server.connections[tempID] != null){
                    var connection = server.connections[tempID];
                    Kick(tempID, "server shutting down");
                    ServerConsole.LogEvent("Kicked : "+connection.player.id, null, 2);
                }
                
            }
            process.exit(0)
        }
        else{
            ServerConsole.LogEvent("CTRL + C is disabled on this server!");
        }
    });

})