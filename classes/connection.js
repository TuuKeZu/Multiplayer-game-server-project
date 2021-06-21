const Login_System = require('./MySQL/Login-System');
const LoginSystem = new Login_System();

const Console = require('./Config/console');
const ServerConsole = new Console();

const GameLobbySettings = require('./Lobbies/GameLobbySettings');
const Player = require('./PlayerData/player');

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

        socket.on('ping', function(data){
            connection.player.packetFrequency += 1;
            if(data != null){
                if(Object.keys(data).length == 3){
                    if(JSON.stringify(data).length < 10000){
                        ServerConsole.LogEvent("Updated position");
                    }
                    else{
                        this.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
            
        });

        socket.on('login_session', function(data){
            connection.player.packetFrequency += 1;
            if(data.SessionID != null){
                if(Object.keys(data).length == 1){
                    if(JSON.stringify(data).length < 1000){

                        LoginSystem.LoginToAccountWithSessionID(data.SessionID, function(user_dat){
                            if(user_dat != false){
                                let returndata = {
                                    sessionID: user_dat.user_session_id,
                                    username: user_dat.username,
                                    user_uid: user_dat.user_uid,
                                    user_ID: user_dat.user_ID,
                                    user_Json: user_dat.user_JSON,
                                    user_FriendLS: user_dat.user_friend_ls,
                                    user_FriendREQ: user_dat.user_friend_req
                                }

                                connection.socket.emit('login-response-session', returndata);
                                ServerConsole.LogEvent("login with sessionID was succesfull", null, 0);

                                connection.player.userID = user_dat.user_ID;
                                connection.player.userData = user_dat.user_JSON;
                                connection.player.isLoggedIn = true;
                                connection.player.username = user_dat.username;
                                ServerConsole.LogEvent(connection.player.username);
                                
                            }
                            if(user_dat == false){
                                ServerConsole.LogEvent("login was aborted: invalid session ID", null, 2);
                                connection.socket.emit('login-failed', {reason: "501"});
                            }
                        });
                    }
                    else{
                        this.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('login', function(data){
            connection.player.packetFrequency += 1;
            if(data != null){
                if(Object.keys(data).length == 2){
                    if(JSON.stringify(data).length < 1000){
                        
                        LoginSystem.LoginToAccount(data.username, data.password, function(user_dat){
                            if(user_dat != false){
                                let returndata = {
                                    sessionID: user_dat.user_session_id,
                                    username: user_dat.username,
                                    user_uid: user_dat.user_uid,
                                    user_Json: user_dat.user_JSON,
                                    user_FriendLS: user_dat.user_friend_ls,
                                    user_FriendREQ: user_dat.user_friend_req
                                }
                                ServerConsole.LogEvent(user_dat.user_session_id);

                                connection.socket.emit('login-response', returndata);
                                ServerConsole.LogEvent("login was succesfull", null, 0);

                                connection.player.userID = user_dat.user_ID;
                                connection.player.userData = user_dat.user_JSON;
                                ServerConsole.LogEvent(userData.user_JSON);
                            }
                            if(user_dat == false){
                                connection.socket.emit('login-failed', {reason: "502"});
                            }
                        });
                    }
                    else{
                        this.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('logout', function(data){
            
        });

        socket.on('retrieve_stats', function(data){

        });
            
        
    }
}