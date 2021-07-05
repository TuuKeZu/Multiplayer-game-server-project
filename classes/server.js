const Console = require('./Config/console');
const ServerConsole = new Console();

const config = require('./Config/config');
const C = new config();

const Config = true;
let Player = require('./PlayerData/player');

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

        this.queueList = [];

        this.lobbies[0] = new LobbyBase(0);
        
    }

    OnConnected(socket){
        let connection = new Connection();
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
        let player = connection.player;

        if(player.IsInQueue){
            player.IsInQueue = false;
            this.RemoveFromQueueList(player.username);
        }

        delete server.connections[id];

        let index = this.connection_IDs.indexOf(connection.player.id);

        if(index > -1){
            this.connection_IDs.splice(index, 1);
            this.connection_IDs.length -= 1;
        }

        connection.socket.broadcast.to(connection.player.lobby).emit('disconnected', {
            id: id
        })

        server.lobbies[connection.player.lobby].OnExitLobby(connection);
    } 

    OnSwitchLobby(connection = Connection, lobbyID){
        let server = this;
        let lobbies = server.lobbies;

        connection.socket.join(lobbyID);
        connection.socket.emit("switch_lobby", {ID: lobbyID});

        connection.lobby = lobbies[lobbyID];
        lobbies[connection.player.lobby].OnExitLobby(connection);
        lobbies[lobbyID].OnEnterLobby(connection);
    }

    OnLobbyCheck(){
        for (let index = 0; index < this.lobby_IDs.length; index++) {
            let temp_lobbyID = this.lobby_IDs[index];

            if(temp_lobbyID != null){
                let lobby = this.lobbies[temp_lobbyID];

                if(lobby.connections.length < 1){
                    if(!lobby.IsServerGenerated){
                        this.KillLobby(lobby);
                    }
                }
            }
            
        }
    }

    OnLobbyTick(){
        this.lobby_IDs.forEach(lobby => {
            this.lobbies[lobby].OnLobbyTick();
        });
    }

    OnRequestQueue(connection = Connection){
        let server = this;
        let QueueLenght = 0;
        var queueListRequest = {}

        ServerConsole.LogEvent("Queue list were requested");


        this.queueList.forEach(queue => {
            QueueLenght += 1;
            if(queue != null){
                queueListRequest[QueueLenght] = {id: queue.ID, host: queue.connection.player.username};
            }
        });

        queueListRequest["lenght"] = QueueLenght;

        connection.socket.emit('queue_list', queueListRequest);
    }

    OnJoinQueue(connection = Connection, data){
        let server = this;
        if(data == "NORMAL"){
            if(!connection.player.IsInQueue){
                let LobbyID = shortid.generate();

                let Lobby = new Gamelobby(LobbyID, new GameLobbySettings('NORMAL', 2, 60), null);
                Lobby.IsServerGenerated = false;
                
                server.lobbies[LobbyID] = Lobby;
                server.lobby_IDs[server.lobby_IDs.length +1] = LobbyID;
    
                connection.player.IsInQueue = true;
    
                ServerConsole.LogEvent("Created lobby: "+LobbyID);

                this.queueList[this.queueList.length + 1] = {ID: LobbyID, connection: connection};
    
                this.OnSwitchLobby(connection, LobbyID);
                Lobby.addPlayer(connection);

                connection.socket.emit("entered_queue", {ID: LobbyID});
            }
            else{
                this.EmitError(connection, "You are already in queue", 601);
            }
        }
    }

    OnExitQueue(connection = Connection){
        ServerConsole.LogEvent("user exiting lobby...");
        this.RemoveFromQueueList(connection.player.username);
        this.OnSwitchLobby(connection, 0);
        connection.socket.emit("exited_queue");
        connection.player.IsInQueue = false;
    }

    OnJoinGameFromQueue(connection = Connection, ID){
        let server = this;
        let lobbyFound = false;
        let targetQueue = null;
        this.queueList.forEach(queue => {
            if(queue.ID == ID){
                lobbyFound = true;
                targetQueue = queue;
            }
        });

        if(lobbyFound){
            if(targetQueue.connection.player.username != connection.player.username){
                let lobby = this.lobbies[targetQueue.ID];
                if(!lobby.HaveStarted && lobby.connection_count == 1){
                    this.OnSwitchLobby(connection, targetQueue.ID);
                    this.lobbies[targetQueue.ID].addPlayer(connection);

                    this.RemoveFromQueueList(targetQueue.connection.player.username);
                    this.RemoveFromQueueList(connection.player.username);
                    
                    ServerConsole.LogEvent("user succesfully entered lobby");
                }
                else{
                    this.EmitError(connection, "Game has already started or the max amount of players is achieved", 702);
                }
            }
            else{
                ServerConsole.LogEvent("user is trying to join its own queue");
                this.EmitError(connection, "You tried to join your own queue...", 701);
            }
        }
        else{
            ServerConsole.LogEvent("lobby was not found. Maybe it was destroyed?");
            this.EmitError(connection, "Lobby with that ID was not found.", 700);
        }
    }

    OnConfirmStart(connection = Connection){
        this.lobbies[connection.player.lobby].ConfirmStart(connection);
    }

    onExitGame(connection = Connection, reason_){
        this.OnSwitchLobby(connection, 0);
        connection.socket.emit('exit_game', {reason: reason_});
        connection.player.IsInQueue = false;
    }


    OnPacketFrequencyCheck(){
        for (let index = 0; index < this.connection_IDs.length; index++) { 
            if(this.connection_IDs[index] != null){
                let currID = this.connection_IDs[index];
                let con = this.connections[currID];
                con.player.packetFrequencyAvarge = con.player.packetFrequency;
                con.player.packetFrequency = 0;

                let packetsAvarge = con.player.packetFrequencyAvarge;

                if(con.player.lobby == 0){
                    if(packetsAvarge > 5){
                        ServerConsole.LogEvent("Packet limit was overriden!", null, 2);
                        this.ForceDisconnect(con, "You are sending many packets!");
                    }
                }
                else{
                    if(packetsAvarge > 100){
                        ServerConsole.LogEvent("Packet limit was overriden!", null, 2);
                        this.ForceDisconnect(con, "You are sending many packets!");
                    }
                }
            }
        }
    }

    OnUsernameCheck(username, callback){
        let FoundUser;
        if(username != null){

            this.connection_IDs.forEach(conID => {
                if(this.connections[conID] != null){
                    if(this.connections[conID].player.username == username){
                        FoundUser = true;
                    }
                }
            });

            if(FoundUser){
                return callback(true);
            }
            else{
                return callback(false);
            }
        }
    }

    ForceDisconnect(connection = Connection, reason){

        let returnData = connection.socket;

        var data = {
            id: connection.player.id,
            reason: reason
        }

        returnData.emit('Kicked', data);
        returnData.disconnect();
    }

    RemoveFromQueueList(hostname){
        if(hostname != null){
            this.queueList.forEach((queue, index)=>{
                if(queue.connection.player.username == hostname){
                    delete this.queueList[index];
                    ServerConsole.LogEvent("removed user["+hostname+"] from queue");
                }
            });
        }
    }

    KillLobby(lobby = Gamelobby){
        let server = this;

        this.lobby_IDs.forEach(function(lobbyID, index){
            if(lobbyID == lobby.id){
                delete server.lobbies[lobbyID];
                delete server.lobby_IDs[index];
                ServerConsole.LogEvent(lobbyID+" Have been deleted", lobbyID, 2);
            }
        })
    }

    EmitError(connection = Connection, error_, errorcode){
        if(connection != null && error_ != null && errorcode != null){
            let returndata = {
                error: error_,
                code: errorcode
            }
    
            connection.socket.emit('error_', returndata);
        }
        else{
            ServerConsole.LogEvent("something went wrong with error submitting!");
        }
    }




}