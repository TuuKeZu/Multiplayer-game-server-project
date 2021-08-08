module.exports = class GameData{
    constructor(duration, RED_team, BLUE_team, isRanked, winnerID){
        this.duration = duration;
        this.RED_team = RED_team;
        this.BLUE_team = BLUE_team;
        this.isRanked = isRanked;
        this.winnerID = winnerID;
    }
}