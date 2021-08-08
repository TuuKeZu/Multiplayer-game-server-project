//ws://127.0.0.1:52300/socket.io/?EIO=3&transport=websocket
//ws://45.32.234.225:52300/socket.io/?EIO=3&transport=websocket



const io = require('socket.io')(process.env.PORT || 52300);  
const Server = require('./classes/server.js');

const Login_System = require('./classes/MySQL/Login-System');
const LoginSystem = new Login_System();

let GameLobbySettings = require('./classes/Lobbies/GameLobbySettings');

const Console = require('./classes/Config/console');
const ServerConsole = new Console();

const mysql = require('./classes/MySQL/MySQLconnection');
const mySQL = new mysql();

ServerConsole.LogEvent("Server started", null, 0);

let server = new Server();

setInterval(() => {
    server.OnLobbyCheck();
}, 5000);

setInterval(() => {
    server.OnPacketFrequencyCheck();
}, 500);

setInterval(() => {
    server.OnLobbyTick();
}, 1000);

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
    console_array = text.trim().split(' ');

    if(text.trim() === 'stop') {
        quit();
    }
    if(text.trim() === 'connection ls'){
        ListCon();
    }
    if(text.trim() ==='queue ls'){
        ListQueue();
    }
    if(text.trim() === 'lobby ls'){
        Listlobbies();
    }
    if(console_array[0] == 'user' && console_array[1] != null){
        ServerConsole.LogEvent("Retrieving data from user ["+console_array[1]+"]...");

        LoginSystem.Retrieve_data(console_array[1], (returnData)=>{
            if(returnData != false){
                console.log(returnData);
            }
            else{
                ServerConsole.LogEvent("couldn't find any information with username : "+console_array[1]);
            }
        });
    }

    if(console_array[0] == 'msg' && console_array.length > 2){
        let msgContent = '';
        let targetUser = console_array[1];
        let targetConnection = null;

        console_array.forEach(content => {
            if(content == console_array[0] || content == console_array[1]){
                return;
            }
            else{
                msgContent += content + ' ';
            }
        });

        server.connections.forEach(con => {
            if(con.player.username == targetUser.trim()){
                targetConnection = con;
            }
        });

        if(targetConnection != null){
            targetConnection.socket.emit('message_received', {msg: msgContent});
        }
        else{
            ServerConsole.LogEvent("Couldnt find user with username of: "+targetUser)
        }
    }
});

//server side functions

function quit() {
    ServerConsole.LogEvent('Server shut down!', null, 2);
    ServerConsole.LogEvent("Server shutting down...", null, 2);
    process.exit(1);
}

function ListCon(){
    let connectionCount = 0;

    server.connection_IDs.forEach(i => {
        var con = server.connections[i];
        var player = con.player;
        var br = '\n';

        var userInfo = br+
        'Is logged in : '+player.isLoggedIn+br+
        '---------------------'+br+
        'username : '+player.username+br+
        'uid : '+player.uid+br+
        'connection ID : '+i+br+
        'lobby : '+player.lobby+br+
        'userID : '+player.userID+br+
        'userdata : '+player.userData+br+"-----------------------------------";

        ServerConsole.LogEvent(userInfo, null, 1);

        connectionCount++;
    });

    ServerConsole.LogEvent("Finished connection query : "+connectionCount+" results were found!");
}

function ListQueue(){
    let queueLenght = 0;

    server.queueList.forEach(function(queue, index){
        ServerConsole.LogEvent("["+index+"] - ["+queue.ID+"] Hosted by ["+queue.connection.player.username+"]", null, 1);
        queueLenght ++;
    });

    ServerConsole.LogEvent("Finished lobby queury : "+queueLenght+" results were found!");
}

function Listlobbies(){
    let lobbyCount = 0;
    server.lobbies.forEach(function(lobby, index){
        ServerConsole.LogEvent("["+index+"] - ["+lobby.id+"] - with connections of "+lobby.connection_IDs.length);
        lobbyCount++;
    });

    ServerConsole.LogEvent("Finished lobby query : "+lobbyCount+" results were found!");
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
    io.emit("kicked", {reason: "Server is shutting down"});
    ServerConsole.LogEvent(error.stack, null, 2);
    
    setTimeout(() => {
        process.exit(1);
    }, 300);
});

process.on('SIGINT', function(){
    ServerConsole.LogEvent("Server shutting down...", null, 2);
    io.emit("kicked", {reason: "Server is shutting down"});

    setTimeout(() => {
        process.exit(1);
    }, 300);
});
