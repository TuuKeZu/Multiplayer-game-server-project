const shortID = require('shortid');
const _Vector3 = require("./vector3.js");

module.exports = class Player {
    constructor() {
        this.username = '';
        this.id = shortID.generate();
        this.position = new _Vector3();
    }
}