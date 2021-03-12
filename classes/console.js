module.exports = class Server {
    constructor(){
    }

    LogEvent(content, lobby, colorcode){
        let currentDate = new Date();
        let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
        if(lobby != null){
            var log_content = "["+time+"] [Lobby : "+lobby+"]: "+content;
        }
        else{
            var log_content = "["+time+"]: "+content;
        }
        if(colorcode == null){
            console.log('\u001b[' + 90 + 'm' + log_content + '\u001b[0m');
        }
        if(colorcode == 0){
            console.log('\u001b[' + 32 + 'm' + log_content + '\u001b[0m');
        }
        if(colorcode == 1){
            console.log('\u001b[' + 93 + 'm' + log_content + '\u001b[0m');
        }
        if(colorcode == 2){
            console.log('\u001b[' + 31 + 'm' + log_content + '\u001b[0m');
        }
        if(colorcode == 3){
            console.log(log_content);
        }
    }
}

/*   //0 = green
    //1 = yellow
    //2 = red
    //3 = white

    function server_log(content, type){
        let currentDate = new Date();
        let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
        var content = "["+time+"] "+content;
        if(type == null){
            console.log('\u001b[' + 90 + 'm' + content + '\u001b[0m');
        }
        if(type == 0){
            console.log('\u001b[' + 32 + 'm' + content + '\u001b[0m');
        }
        if(type == 1){
            console.log('\u001b[' + 93 + 'm' + content + '\u001b[0m');
        }
        if(type == 2){
            console.log('\u001b[' + 31 + 'm' + content + '\u001b[0m');
        }
        if(type == 3){
            console.log(content);
        }
    }
*/