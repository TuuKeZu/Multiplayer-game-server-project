module.exports = class Vector3 {
    constructor(X = 0, Y = 0, Z = 0) {
        this.x = X;
        this.y = Y;
        this.z = Z;
    }

    Magnitude(){
        return Math.sqrt((this.x * this.x) + (this.z * this.z));
    }

    Normalized(){
        var mag = this.Magnitude();
        return new Vector2(this.x / mag, this.z / mag);
    }

    Distance(otherVect = Vector2){
        var direction = new Vector2();
        direction.x = otherVect.x - this.x;
        direction.z = otherVect.z - this.z;
        return direction.Magnitude();
    }
    ConsoleOutput(){
        return '(' + this.x + ',' +this.z + ')';
    }
}