
//© 2021, Tuukka Moilanen. All rights reserved


//ws://127.0.0.1:52300/socket.io/?EIO=3&transport=websocket
//ws://45.32.234.225:52300/socket.io/?EIO=3&transport=websocket



const io = require('socket.io')(process.env.PORT || 52300);  //avaa portin liittymistä varten käyttäen socket.io nimustä kirjastoa.

const _Player = require("./classes/player.js"); //"class" on käytännössä datan tallennus paikka, jossa pidän kaikki tiedot pelaajasta.
const _GameData = require("./classes/game_data");
const _Vector3 = require('./classes/vector3.js'); //taas, tämä on vertaus vector3 nimiseen "classiin", jota käytän pelaajan koordinaatiston tallentamiseen. 
const sleep = require('system-sleep'); //

server_log('Server has started'); //"server_log" on komento, jolla voidaan kirjoittaa konsoliin. Tässä tapauksessa se ilmoittaa kun serveri käynnistää.

var Player_list = []; //lista pelaajista
var socket_list = []; //lista yhteyksistä
var ID_list = []; //lista liittyneiden yhteyksien uniikeista kiirjaintunnuksista
var Player_username_list = []; //lista pelaajien nimistä
var public_chat = []; //chat, eli pelaajille pelissä näkyvä kirjoitusalusta
var Player_Count = 0; //liittyneiden pelaajien määrä
var Gamedata = new _GameData();

io.on('connection', function(socket) { //kun joku yrittää liittyä porttiin.
    var player = new _Player(); //luo uuden pelaaja "classin", jota myöhemmin käytetään pelaajan tietojen tallentamiseen. Tässä vaiheessa sen siällä on jo kuitenkin pelaajan uniikki "id", joka on uniikki kirjaintunnus.
    var thisPlayerID = player.id; //asettaa muuttujan, jota voidaan käyttään, kun haetaan pelaajan uniikkia tunnusta.
    ID_list.push(thisPlayerID); //Hieman monimutkaisempi. Huomasit varmaan, että esimerkiksi muuttujassa "Player_List", oli sen arvo []. Tämä tarkoittaa sitä, että se on lista, eli array. Push-komennolla voidaan lisätä listaan jokin muuttuja, joka on tässä tapauksessa uniikki kirjaintunnus.
    Player_Count += 1; //lisää pelaajamäärää yhdellä
    Player_list[thisPlayerID] = player; //taas, käytetään listoja. "Player_List[thisPlayerID]"" tarkoittaa sitä, että listaan lisätään vähän niinkuin kansio, jonka nimi on tämän pelaajan kirjaintunnus. Kansion sisälle sitten laitetaan pelaajan tideot."
    socket_list[thisPlayerID] = socket; //taas luodaan kansio. Tässä tapauksessa kansion sisälle tulee "socket", eli pelaajan yhteys.

    socket.on('handshake', function(data) {  //tämän jälkeen suoritetaan "handshake", joka periaatteessa tarkoittaa sitä, että liittyvän laitteen täytyy lähettää liittymispyynnönlisäksi toinen pyyntö, jossa kertoo pelaajanimensänimensä.
        player.username = data.username; //tallentaa pyynnön mukana tulleen nimen player "classiin".
        server_log("username : "+data.username, 0); //kirjoittaa pelaajan nimen konsoliin
        socket.emit('verify', player); //emit() komento lähettää serveriltä, eli tästä koodista, pyynnön takaisin laitteelle. vastaanottaessa pyynnön laite tietää että liityminen onnistui.
        Player_username_list[thisPlayerID] = player.username; //luo kansion "Player_username_list" nimiseen listaan, kansion nimi on kirjaintunnus, ja sisältö on pelaajan nimi.

        socket.broadcast.emit('spawn', player); //broadcast.emit() on komento, joka lähettää pyynnön kaikille liittyneille laitteile, paitsi sille, joka sen lähettää. Tässä serveri siis lähettää kaikille (paitsi sille joka liityi) laitteille tiedon että uusi laite on liittynyt

        for(var playerID in Player_list) { //tavallinen looppi, joka tapahtuu niin monta kertaa, kuin Player_listissä on muutujia sisällä.
            if(playerID != thisPlayerID){ //jos laitteen kirjaintunnus ei ole littyvän laitteen
                socket.emit('spawn', Player_list[playerID]); //kertoo liityvälle pelaajalle kaikista muista (toistuu siis niin monta kertaa kun muita on).
                //server_log("Client is verifying it's name! ID : "+playerID+". Username : "+Player_username_list[playerID], 0); //muutettu kommentiksi koska käytetään vain koodia testatessa, kun halutaan tietää kuka ja milloin liitty.
            }
        }
        var ip = socket.request.connection.remoteAddress; //hakee yhteyden IP osoitteen ja kirjoittaa sen konsoliin
        server_log("Client ["+thisPlayerID+"]["+ip+"] have connected to a server. New client count is "+Player_Count, 0);
    });

    socket.emit('register', {id: thisPlayerID}); //menee taas vain liittyvälle laitteele, kertoo uniikin kirjaintunnuksen.
    socket.emit('spawn', player); //pyytää laitetta luomaan itsensä pelimaailmaan.

    var MaxPlayers = 100;

    if(Player_Count > MaxPlayers){ //jos yhteyksiä serveriin on enemmän kuin sallittu määrä, serveri poistaa tämän yhteyden.
        Disconnect();
    }

    //en tule kirjoittamaan enempää dokumentatiota suomeksi. -----------------------------------------------------------------------------------------------------------------
    
    //position packets

    socket.on('UpdatePosition', function(data) {
        if(player.IsAlive){
            player.position.x = data.position.X;
            player.position.y = data.position.Y;
            player.position.z = data.position.Z;
            
    
            socket.broadcast.emit('UpdatePosition', player);
            //server_log("Client ["+data.ID+"] position is equal to : "+data.position.X + ","+data.position.Y+","+data.position.Z+" : Player is looking at: ["+player.lookingAt+"]."); //käytetään koodin debuggaamiseen. Printtaa kaikkien liittyneiden liikeradat
        }
        
    });

    socket.on('UpdateTarget', function(data) {
        player.lookingAt = data.target;
        //server_log("Client ["+thisPlayerID+"] is looking at: ["+player.lookingAt+"].");nod
    });

    socket.on('SendAttackPacket', function(data) {
    if(player.IsAlive){
        Packet_Sender = thisPlayerID;
        packet_effected = player.lookingAt;
        //server_log(packet_effected+" Got shot by : "+Packet_Sender, 3);

        if(packet_effected != "Client : "+Packet_Sender){
            for (let index = 0; index < ID_list.length; index++) {
                if(packet_effected == ID_list[index]){

                    Player_list[ID_list[index]].health -= 10;

                    if(Player_list[ID_list[index]].health < 0){
                        var username = Player_list[ID_list[index]].username;
                        var sender_username = Player_list[thisPlayerID].username;
                        KillClient(packet_effected);

                        socket.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});
                        socket.broadcast.emit("MessageEventReceived", {content: "["+username+"] Was Shot by: ["+sender_username+"]"});
                    }
                    else{
                        socket.emit('UpdateHealth', Player_list[ID_list[index]]);
                        socket.broadcast.emit('UpdateHealth', Player_list[ID_list[index]]);
    
                        server_log(Player_list[ID_list[index]].health, 3);
                    }

                }
            }
        }
        else{
            server_log("packet receiver cannot be sender!", 2);
        }
    }
    });

    socket.on('SendMessageToServer', function(data) {
        var message = data.content;
        var username = data.username;

        //command manager
        if(message.lastIndexOf("/", 0) === 0){
            var array = [];
            array = message.split(' ');
            server_log("Command was ran", 1);
                if(message == "/start"){
                    StartGame();
                }
                if(message.lastIndexOf("/kick", 0) === 0){
                    if(array[1] != null){
                        Kick(array[1]);
                    }
                }
                
        }

        server_log("["+thisPlayerID+"]<"+username+">: "+message+"", 3);
        public_chat.push("["+username+"]: "+message);
    
        socket.emit('MessageEventVerification', {content: message});
        socket.broadcast.emit("MessageEventReceived", {content: public_chat[public_chat.length -1]});
        

    });


    

    socket.on('disconnect', function() {
        socket.emit('disconnected', player)
        socket.broadcast.emit('disconnected', player)
        Player_Count -= 1;
        server_log("A client ["+thisPlayerID+"] have disconnected", 1);
        delete Player_list[thisPlayerID];
        delete socket_list[thisPlayerID];
        IsConnected = false;

        for (let index = 0; index < ID_list.length; index++) {
            if(thisPlayerID == ID_list[index]){
                delete ID_list[index];
                ID_list.length -= 1;
            }
            
        }
    });

    function StartGame(){
        if(Player_Count  < 2){
            server_log("Cannot Start game since there are not enough players!", 2);
            return;
        }
        server_log("Game was started!", 0);

        socket.emit("MessageEventReceived", {content: "[SERVER] Game is starting soon"});
        socket.broadcast.emit("MessageEventReceived", {content: "[SERVER] Game is starting soon"});

        //RANDOM PARTIES

        for (let index = 0; index < ID_list.length; index++) {
            if(index+1 % 2 == 1){
                //red Team
                id = ID_list[index];
                target = Player_list[id];
                target.team = "RED";
                server_log("["+target.username+"] was assinged to the blue team!", 2);
            }
            else{
                //blue team
                id = ID_list[index];
                target = Player_list[id];
                target.team = "BLUE";
                server_log("["+target.username+"] was assinged to the blue team!", 0);
            }
        }

        Gamedata.have_started = true;
    
    }

    function KillClient(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        target.IsAlive = false;

        target.position.x = 77.855;
        target.position.y = -3.06;
        target.position.z = 33.191;

        targetSocket.broadcast.emit('UpdatePosition', target);
        targetSocket.emit('Die', target);


        server_log("Killed client!", 2);
        sleep(300);
        Respawn(ID);
        server_log("revived client!", 0);

    }

    function Respawn(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        target.health = 100;
        socket.emit('UpdateHealth', Player_list[ID]);
        socket.broadcast.emit('UpdateHealth', Player_list[ID]);

        target.IsAlive = true;
        targetSocket.broadcast.emit('UpdatePosition', target);
        targetSocket.emit('Respawn', target);
        socket.broadcast.emit("MessageEventReceived", {content: "["+target.username+"] Respawned!"});
    }

    function Kick(ID){
        target = Player_list[ID];
        targetSocket = socket_list[ID];
        targetSocket.emit('disconnected', target)
        targetSocket.broadcast.emit('disconnected', target)
        Player_Count -= 0;
        server_log("A client ["+ID+"] have disconnected", 1);
        delete Player_list[ID];
        delete socket_list[ID];
        IsConnected = false;

        for (let index = 0; index < ID_list.length; index++) {
            if(ID == ID_list[index]){
                delete ID_list[index];
                ID_list.length -= 1;
            }
            
        }
    }

    function Disconnect(ID){
        targetSocket = socket_list[ID];
        targetSocket.emit('disconnected', player)
        targetSocket.broadcast.emit('disconnected', player)
        Player_Count -= 0;
        server_log("A client ["+ID+"] have disconnected", 1);
        delete Player_list[ID];
        delete socket_list[ID];
        IsConnected = false;

        for (let index = 0; index < ID_list.length; index++) {
            if(ID == ID_list[index]){
                delete ID_list[index];
                ID_list.length -= 1;
            }
            
        }
    }
    
});




















//Console Manager

    //0 = green
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