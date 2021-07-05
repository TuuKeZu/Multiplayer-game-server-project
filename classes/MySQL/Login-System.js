const mysql = require('./MySQLconnection');
const Connection = new mysql();

const Console = require('../Config/console');
const ServerConsole = new Console();

let Connection_ = require('../connection');

const crypto = require('crypto');
const { callbackify } = require('util');
const { strict } = require('assert');

module.exports = class Login_System {
    constructor(){

    }

    CreateToAccount(username, password, gmail){
        Connection.database = 'multiplayer_game_database';
        Connection.CreateConnection();

        let user = username;
        let pass = password;

        let id = crypto.randomBytes(20).toString('hex');
        var MYSQL_request = "INSERT INTO user_schema (user_id, user_name, user_uid, user_password, user_rating, user_JsonData, user_ISMuted, user_ISBanned, user_IP_address, user_gmail) VALUES ('"+id+"', '"+user+"', 'user', '"+pass+"', '0', '/kills:0/rank:unranked/wins:0/', false, false, ' ', '"+gmail+"');";
        Connection.con.query(MYSQL_request);
        ServerConsole.LogEvent("Created a new account : "+user, null, 1);
    }

    LoginToAccount(username, password, connection = Connection_, callback){
        Connection.database = 'multiplayer_game_database';
        Connection.CreateConnection();

        var MYSQL_request = "SELECT * FROM user_schema WHERE user_name = '"+username+"'";
        
        Connection.con.query(MYSQL_request, function(err, results, fields){
            if (err) return false;

            if(results[0] == null){
                return callback(false);
            }

            ServerConsole.LogEvent(results[0].user_password);
            
            if(username == results[0].user_name){
                ServerConsole.LogEvent("Username match");

                if(password.trim() == results[0].user_password.trim()){
                    ServerConsole.LogEvent("Password match");

                    connection.server.OnUsernameCheck(username, (status)=>{
                        if(status == true){
                            ServerConsole.LogEvent("user is already logged in!");
                            return callback("500");
                        }
                    });

                    

                    var user_data = {};
                    user_data.username = results[0].user_name;
                    user_data.user_uid = results[0].user_uid;
                    user_data.user_ID = results[0].user_id;
                    user_data.user_JSON = results[0].user_JsonData;
                    user_data.user_session_id = results[0].user_session_ID;
                    user_data.user_friend_ls = results[0].user_friend_list;
                    user_data.user_friend_req = results[0].user_friend_requests;

                    return callback(user_data)

                }
                else{
                    ServerConsole.LogEvent("Password is incorrect!");
                    return callback(false);
                }
            }
            

        });

    }

    LoginToAccountWithSessionID(sessionID, connection = Connection_, callback){
        Connection.database = 'multiplayer_game_database';
        Connection.CreateConnection();

        let userFound = false;

        var MYSQL_request = "SELECT * FROM user_schema";
        Connection.con.query(MYSQL_request, function(err, results, fields){
            if (err) return false;

            for (let index = 0; index < results.length; index++) {

                if(sessionID.trim() == results[index].user_session_ID.trim()){
                    ServerConsole.LogEvent("session ID match");

                    connection.server.OnUsernameCheck(results[index].user_name, (status)=>{
                        if(status == true){
                            ServerConsole.LogEvent("user is already logged in!");
                            return callback("500");
                        }
                    });
    
                    var user_data = {};
                    user_data.username = results[index].user_name;
                    user_data.user_uid = results[index].user_uid;
                    user_data.user_ID = results[index].user_id;
                    user_data.user_JSON = results[index].user_JsonData;
                    user_data.user_session_id = results[index].user_session_ID;
                    user_data.user_friend_ls = results[index].user_friend_list;
                    user_data.user_friend_req = results[index].user_friend_requests;

                    userFound = true;
                    return callback(user_data)
                }
                
            }

            if(!userFound){
                ServerConsole.LogEvent("session ID is incorrect!");
                return callback(false);
            }
            
            

        });

    }

    logOutOfTheAccount(connection){
        Connection.database = 'multiplayer_game_database';
        Connection.CreateConnection();

        var userID = connection.player.userID;
        let NewSessionID = crypto.randomBytes(10).toString('hex');

        var MYSQL_request = "SELECT * FROM user_schema where user_id = '"+userID+"'";
        var MYSQL_ChangeRequest = "UPDATE user_schema SET user_session_ID = '"+NewSessionID+"' WHERE user_id = '"+userID+"'";
        Connection.con.query(MYSQL_request, function(err, results, fields){
            ServerConsole.LogEvent("users with the ID : "+results.length);
            if(results.length != 0 && results.length < 2){

                ServerConsole.LogEvent("User is logging out : "+userID);

                if(results[0].user_session_ID != NewSessionID){
                    ServerConsole.LogEvent(NewSessionID + " : " + NewSessionID.length);
                    Connection.con.query(MYSQL_ChangeRequest);
                }
                else{
                    NewSessionID = crypto.randomBytes(10).toString('hex');
                    ServerConsole.LogEvent("The same sessionID was generated!");
                    logOutOfTheAccount();
                    return;
                }

                connection.server.ForceDisconnect(connection, "You logged out!");


                
            }
            else{
                ServerConsole.LogEvent("User failed to log out : "+userID);
            }
        });
    }

    Retrieve_data(username, callback){
        Connection.database = 'multiplayer_game_database';
        Connection.CreateConnection();

        var SQL_request = "SELECT * FROM user_schema WHERE user_name = '"+username+"'";

        Connection.con.query(SQL_request, function(err, results, fields){
            if(results.length > 0){
                results.forEach(result => {
                    var returndata = {
                        user_Json: result.user_JsonData,
                        user_name: result.user_name
                    }
                    return callback(returndata);
                });
            }
            else{
                return callback(false);
            }
        });
    }
}