const shortID = require('shortid');
const _Vector3 = require("./vector3.js");

module.exports = class Player {
    constructor() {
        this.username = 'Default_Player';
        this.uid = null;
        this.IsQuest = true;
        this.isLoggedIn = false;
        this.userID = "";
        this.userData = {};
        this.id = shortID.generate();
        this.packetFrequency = 0;
        this.packetFrequencyAvarge = 0;
        this.lobby = 0;
        this.IsInQueue = false;

        this.Q_ability = 0;
        this.E_ability = 0;
        this.F_ability = 0;
        this.IsReady = false;
        this.IsSpawned = false;

        this.position = new _Vector3();
        this.health = 100;
        this.IsAlive = true;
        this.CanShoot = true;
        this.lookingAt = null;
        this.team = null;
    }
}