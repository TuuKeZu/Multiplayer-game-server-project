module.exports = class GameLobbySettings{
    constructor(gameMode, maxPlayers, timeInMin){
        this.gameMode = 'undefined';
        this.maxPlayerCount = maxPlayers;
        this.timeInMin = timeInMin;
        this.isPlayerGenerated = false;
    }
}