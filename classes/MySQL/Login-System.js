const mysql = require('./MySQLconnection');
const Connection = new mysql();

const Console = require('./console');
const ServerConsole = new Console();

const crypto = require('crypto'); //sisäänrakennettu kirjasto
const { callbackify } = require('util');

module.exports = class Login_System {
    constructor(){

    }

    CreateToAccount(username, password, gmail){
        Connection.database = 'multiplayer-game-database';
        Connection.CreateConnection();

        let user = username;
        let pass = password;

        //luodaan 20-kirjainta pitkä kirjaintunnus
        let id = crypto.randomBytes(20).toString('hex');

        //käytetään samaa koodinpätkää joka luo käyttäjän.
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
                    user_data.user_JSON = results[0].user_JsonData;

                    return callback(user_data)

                }
                else{
                    ServerConsole.LogEvent("Password is incorrect!");
                    return callback(false);
                }
            }
            

        });

    }
}