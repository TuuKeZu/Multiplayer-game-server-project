const mysql = require('./MySQLconnection');
const Connection = new mysql();

const Console = require('./console');
const ServerConsole = new Console();

const crypto = require('crypto'); //sisäänrakennettu kirjasto

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
        var MYSQL_request = "INSERT INTO user_schema (user_id, user_name, user_uid, user_password, user_rating, user_JsonData, user_ISMuted, user_ISBanned, user_IP_address, user_gmail) VALUES ('"+id+"', '"+user+"', 'user', '"+pass+"', '0', 'null', false, false, ' ', '"+gmail+"');";
        Connection.con.query(MYSQL_request);
        ServerConsole.LogEvent("Created a new account : "+user, null, 1);
    }

    LoginToAccount(username, password){
        Connection.database = 'multiplayer-game-database';
        Connection.CreateConnection();

        var MYSQL_request = "SELECT user_name, user_password FROM user_schema WHERE user_name = '"+username+"'";
        Connection.con.query(MYSQL_request, function(err, results, fields){
            if (err) return false;
            
            if(username == results[0].user_name){
                ServerConsole.LogEvent("Username match");

                if(password == results[0].user_password){
                    ServerConsole.LogEvent("Password match");
                    return results[0].user_JsonData;
                }
                else{
                    ServerConsole.LogEvent("Password is incorrect!");
                    return false;
                }
            }
            

        });

    }
}