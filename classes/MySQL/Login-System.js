const mysql = require('./MySQLconnection');
const Connection = new mysql();

const Console = require('../Config/console');
const ServerConsole = new Console();

const crypto = require('crypto');
const { callbackify } = require('util');
const { strict } = require('assert');

module.exports = class Login_System {
    constructor(){

    }

    CreateToAccount(username, password, gmail){
        Connection.database = 'multiplayer-game-database';
        Connection.CreateConnection();

        let user = username;
        let pass = password;

        let id = crypto.randomBytes(20).toString('hex');
        var MYSQL_request = "INSERT INTO user_schema (user_id, user_name, user_uid, user_password, user_rating, user_JsonData, user_ISMuted, user_ISBanned, user_IP_address, user_gmail) VALUES ('"+id+"', '"+user+"', 'user', '"+pass+"', '0', '/kills:0/rank:unranked/wins:0/', false, false, ' ', '"+gmail+"');";
        Connection.con.query(MYSQL_request);
        ServerConsole.LogEvent("Created a new account : "+user, null, 1);
    }

    LoginToAccount(username, password, callback){
        Connection.database = 'multiplayer-game-database';
        Connection.CreateConnection();

        var MYSQL_request = "SELECT * FROM user_schema WHERE user_name = '"+username+"'";
        Connection.con.query(MYSQL_request, function(err, results, fields){
            ServerConsole.LogEvent(results[0].user_password);
            if (err) return false;
            
            if(username == results[0].user_name){
                ServerConsole.LogEvent("Username match");

                if(password.trim() == results[0].user_password.trim()){
                    ServerConsole.LogEvent("Password match");

                    

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

    LoginToAccountWithSessionID(sessionID, callback){
        Connection.database = 'multiplayer-game-database';
        Connection.CreateConnection();

        let userFound = false;

        var MYSQL_request = "SELECT * FROM user_schema";
        Connection.con.query(MYSQL_request, function(err, results, fields){
            if (err) return false;

            for (let index = 0; index < results.length; index++) {

                if(sessionID.trim() == results[index].user_session_ID.trim()){
                    ServerConsole.LogEvent("session ID match");
    
                    var user_data = {};
                    user_data.username = results[index].user_name;
                    user_data.user_uid = results[index].user_uid;
                    user_data.user_ID = results[0].user_id;
                    user_data.user_JSON = results[index].user_JsonData;
                    user_data.user_session_id = results[index].user_session_ID;
                    user_data.user_friend_ls = results[0].user_friend_list;
                    user_data.user_friend_req = results[0].user_friend_requests;

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
        var userID = connection.player.userID;
        var MYSQL_request = "SELECT * FROM user_schema where user_uid = '"+userID+"'";
        Connection.con.query(MYSQL_request, function(err, results, fields){
            if(results.length != 0 || results.length <= 1){
                ServerConsole.LogEvent("User is logging out");
            }
        });
    }

    Retrieve_data(ID){

    }
}