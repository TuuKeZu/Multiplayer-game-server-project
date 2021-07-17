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

        this.CurrentGun = 0;
        this.CurrentAmmo = 50;
        this.Q_ability = 0; 
        this.E_ability = 0;
        this.F_ability = 0;
        this.IsReady = false;

        this.position = new _Vector3();
        this.rotation = new _Vector3();
        this.VelocityX = 0;
        this.VelocityZ = 0;
        this.AnimationScopingState = false;
        this.AnimationDashingState = false;
        
        this.health = 400;
        this.IsAlive = true;
        this.canMove = true;

        this.CanShoot0 = true;
        this.CanShoot1 = true;
        this.CanShoot2 = true;
        this.CanShoot3 = true;
        this.CanShoot4 = true;

        this.CanCastQ = true;
        this.CanCastE = true;
        this.CanCastF = true;

        this.IsCastingE = false;

        this.lookingAt = null;
        this.team = null;
    }
}