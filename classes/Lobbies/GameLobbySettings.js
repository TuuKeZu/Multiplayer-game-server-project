module.exports = class GameLobbySettings{
    constructor(gameMode, maxPlayers){
        this.gameMode = 'undefined';
        this.maxPlayerCount = maxPlayers;
        this.isPlayerGenerated = false;
    }
}