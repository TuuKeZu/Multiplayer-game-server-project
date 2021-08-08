const mysql = require('./MySQLconnection');
const Connection = new mysql();

const crypt = require('crypto');

const Game_Data = require('../PlayerData/Game-Data');

const Console = require('../Config/console');
const ServerConsole = new Console();

module.exports = class game_history_manager{
    constructor(){

    }

    SaveGame(data = Game_Data){
        if(data != null){
            Connection.database = 'multiplayer_game_database';
            Connection.CreateConnection();

            var ID = '';
            var curDate = new Date();
            var FormattedDate = `${curDate.getFullYear()}-${curDate.getMonth()}-${curDate.getDate()} ${curDate.getHours()}:${curDate.getMinutes()}:${curDate.getSeconds()}`

            crypt.randomBytes(20, (err, buffer)=>{
                ID = buffer.toString('hex');

                ServerConsole.LogEvent("saving the game...", null, 0);

                var SQL_reguest = `INSERT INTO game_schema (game_id, game_player_RED, game_player_BLUE, game_winner_id, game_replay_path, game_ranked, game_duration, game_date) 
                VALUES ('${ID}', '${data.RED_team}', '${data.BLUE_team}', '${data.winnerID}', '', ${data.isRanked}, ${data.duration}, '${FormattedDate}')`;
    
                ServerConsole.LogEvent(SQL_reguest);
                
                Connection.con.query(SQL_reguest, function(err, results, fields){
                    if(err){
                        ServerConsole.LogEvent("Failed to save game data!", null, 2);
                        throw err;
                    }
    
                    if(results.affectedRows == 1){
                        ServerConsole.LogEvent("successfully saved the game...", null, 0);
                    }
                });
                
            });

        }
    }
}