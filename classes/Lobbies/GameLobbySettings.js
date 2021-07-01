module.exports = class GameLobbySettings{
    constructor(gameMode, maxPlayers, timeInMin){
        this.gameMode = 'undefined';
        this.MapIndex = 1;
        this.maxPlayerCount = maxPlayers;
        this.timeInMin = timeInMin;
        this.isPlayerGenerated = false;
    }
}