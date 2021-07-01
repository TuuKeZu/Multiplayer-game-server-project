const mySQL = require('mysql'); //kertoo että tarvitsemme mysql kirjastosta

module.exports = class MySQL { //luo "classin", jonka sisällä tietoja pidetään.
    
    constructor(){ //nämä ovat "globaalit" muuttujat, eli niihin voidaan päästä käsiksi mistä vaan.
        this.database;
        this.table;
        this.con;
    }

    CreateConnection(){  
        this.con = mySQL.createConnection({ 
            host: "localhost", 
            user: "root", 
            password: "", 
            database: this.database
        });
    }
}
