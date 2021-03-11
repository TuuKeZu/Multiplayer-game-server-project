const shortID = require('shortid');
const _Vector3 = require("./vector3.js");

module.exports = class Player {
    constructor() {
        this.username = '';
        this.id = shortID.generate();
        this.position = new _Vector3();
        this.health = 100;
        this.IsAlive = true;
        this.CanShoot = true;
        this.lookingAt = null;

        this.team = null;
    }
}