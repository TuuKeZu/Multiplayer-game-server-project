const fs = require('fs');

module.exports = class config{
    Get(callback){
        fs.readFile('./config.json', (err, data) =>{
            if (err) {
                console.log(`Error reading file from disk: ${err}`);
            } else {
        
                const CONFIG = JSON.parse(data);
                var returndata = {};
                returndata.show_movement_packets = CONFIG[0].debug.show_movement_packets;
                returndata.show_attack_packets = CONFIG[0].debug.show_attack_packets;
                returndata.show_look_packets = CONFIG[0].debug.show_look_packets;
                returndata.show_join_requests = CONFIG[0].debug.show_join_requests;
                returndata.show_chat = CONFIG[0].debug.show_chat;
                returndata.show_lobby_events = CONFIG[0].debug.show_lobby_events;
                returndata.show_rotation_packets = CONFIG[0].debug.show_rotation_packets;

                returndata.send_crash_reports = CONFIG[0].utility.send_crash_reports;
                returndata.enable_CTRL_C = CONFIG[0].utility.enable_CTRL_C;

                return callback(returndata);

            }

        });
    }

    Set(){

    }
}