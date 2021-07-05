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
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
            
        });

        socket.on('login_session', function(data){
            connection.player.packetFrequency += 1;
            if(data.SessionID != null){
                if(Object.keys(data).length == 1){
                    if(JSON.stringify(data).length < 1000){
                        let CanLogin = true;
                        LoginSystem.LoginToAccountWithSessionID(data.SessionID, connection, function(user_dat){
                            if(user_dat == "500"){
                                ServerConsole.LogEvent("login was aborted: user is already logged in", null, 2);
                                connection.socket.emit('login-failed', {reason: "500"});
                                CanLogin = false;
                                return;
                            }

                            if(user_dat == false){
                                ServerConsole.LogEvent("login was aborted: invalid session ID", null, 2);
                                connection.socket.emit('login-failed', {reason: "501"});
                                CanLogin = false;
                                return;
                            }

                            if(user_dat != false && user_dat != "500" && CanLogin){
                                let returndata = {
                                    sessionID: user_dat.user_session_id,
                                    username: user_dat.username,
                                    user_uid: user_dat.user_uid,
                                    user_ID: user_dat.user_ID,
                                    user_Json: user_dat.user_JSON,
                                    user_FriendLS: user_dat.user_friend_ls,
                                    user_FriendREQ: user_dat.user_friend_req,
                                    clientID: connection.player.id
                                }

                                connection.socket.emit('login-response-session', returndata);
                                ServerConsole.LogEvent("login with sessionID was succesfull", null, 0);

                                connection.player.userID = user_dat.user_ID;
                                connection.player.uid = user_dat.user_uid;
                                connection.player.userData = user_dat.user_JSON;
                                connection.player.isLoggedIn = true;
                                connection.player.username = user_dat.username;
                                
                                
                            }
                        });
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('login', function(data){
            ServerConsole.LogEvent("login event");
            connection.player.packetFrequency += 1;
            if(data != null){
                if(Object.keys(data).length == 2){
                    if(JSON.stringify(data).length < 1000){
                        let Canlogin = true;
                        LoginSystem.LoginToAccount(data.username, data.password, connection, function(user_dat){
                            if(user_dat == "500"){
                                ServerConsole.LogEvent("login was aborted: user is already logged in", null, 2);
                                connection.socket.emit('login-failed', {reason: "500"});
                                Canlogin = false;
                                return;
                            }
                            
                            if(user_dat == false){
                                connection.socket.emit('login-failed', {reason: "502"});
                                Canlogin = false;
                                return;
                            }
                            
                            if(user_dat != false && user_dat != "500" && Canlogin){
                                let returndata = {
                                    sessionID: user_dat.user_session_id,
                                    username: user_dat.username,
                                    user_uid: user_dat.user_uid,
                                    user_Json: user_dat.user_JSON,
                                    user_FriendLS: user_dat.user_friend_ls,
                                    user_FriendREQ: user_dat.user_friend_req,
                                    clientID: connection.player.id
                                }
                                ServerConsole.LogEvent(user_dat.user_session_id);

                                connection.socket.emit('login-response', returndata);
                                ServerConsole.LogEvent("login was succesfull", null, 0);

                                connection.player.userID = user_dat.user_ID;
                                connection.player.uid = user_dat.user_uid;
                                connection.player.userData = user_dat.user_JSON;
                                connection.player.isLoggedIn = true;
                                connection.player.username = user_dat.username;
                            }
                        });
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('logout', function(data){
            LoginSystem.logOutOfTheAccount(connection);
        });

        socket.on('retrieve_stats', function(data){
            connection.player.packetFrequency += 1;
            if(data != null){
                if(Object.keys(data).length == 1){
                    if(JSON.stringify(data).length < 10000){
                        LoginSystem.Retrieve_data(data.username, (user_dat)=>{
                            if(user_dat == false){
                                ServerConsole.LogEvent("There was a problem retrieving the data...");

                                let returndata = {
                                    error: "Data retrieval went wrong",
                                    code: 800
                                }

                                connection.socket.emit('error_', returndata)
                                return;
                            }

                            if(user_dat != false){
                                ServerConsole.LogEvent("successfully retrieved userdata");
                                connection.socket.emit('stats', user_dat);
                            }
                        });
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('join_lobby', function(data){
            connection.player.packetFrequency += 1;
            if(data != null){
                if(Object.keys(data).length == 1){
                    if(JSON.stringify(data).length < 10000){
                        
                        connection.server.OnJoinQueue(connection, "NORMAL");
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('join_lobby_game', function(data){
            connection.player.packetFrequency += 1;
            if(data != null){
                if(Object.keys(data).length == 1){
                    if(JSON.stringify(data).length < 10000){
                        
                        connection.server.OnJoinGameFromQueue(connection, data.ID);
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('confirm_abilities', function(data){
            if(data != null){
                if(Object.keys(data).length == 3){
                    if(JSON.stringify(data).length < 10000){
                        connection.player.Q_ability = data.Q;
                        connection.player.E_ability = data.E;
                        connection.player.F_ability = data.F;
                        connection.server.OnConfirmStart(connection);
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('exit_lobby', function(data){
            connection.player.packetFrequency++;
            connection.server.OnExitQueue(connection);
        });
        

        socket.on('request_lobby_list', function(data){
            connection.player.packetFrequency++;
            connection.server.OnRequestQueue(connection);
        });


        //------------------------------------------------------------

        socket.on('update_position', function(data){
            connection.player.packetFrequency++;
            if(data != null && data.X != null && data.Y != null && data.Z != null){
                if(Object.keys(data).length == 3){
                    if(JSON.stringify(data).length < 10000){
                        
                        connection.server.lobbies[connection.player.lobby].UpdatePosition(connection, data);
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('update_rotation', function(data){
            connection.player.packetFrequency++;
            if(data != null && data.X != null && data.Y != null && data.Z != null){
                if(Object.keys(data).length == 3){
                    if(JSON.stringify(data).length < 10000){

                        connection.server.lobbies[connection.player.lobby].UpdateRotation(connection, data);
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });

        socket.on('update_velocity', function(data){
            connection.player.packetFrequency++;
            if(data != null && data.X != null && data.Z != null){
                if(Object.keys(data).length == 2){
                    if(JSON.stringify(data).length < 10000){

                        connection.server.lobbies[connection.player.lobby].UpdateAnimationVelocity(connection, data);
                    }
                    else{
                        connection.server.ForceDisconnect(this, "You are sending too big packets!");
                    }
                }
            }
        });
            
        
    }
}