export class Point {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    distanceTo(pt) {
        // don't do euclidean because then neighbours should be diagonally as well
        // because sqrt(2) < 2
        //  return Math.sqrt((pt.x - this.x) * (pt.x - this.x) + (pt.y - this.y) * (pt.y - this.y));
        return Math.abs(pt.x - this.x) + Math.abs(pt.y - this.y);
    }
    distanceToCoord(x, y) {
        // don't do euclidean because then neighbours should be diagonally as well
        // because sqrt(2) < 2
        //  return Math.sqrt((pt.x - this.x) * (pt.x - this.x) + (pt.y - this.y) * (pt.y - this.y));
        return Math.abs(x - this.x) + Math.abs(y - this.y);
    }
}
