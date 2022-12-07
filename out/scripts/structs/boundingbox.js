export class BoundingBox {
    minX = Number.MAX_VALUE;
    minY = Number.MAX_VALUE;
    maxX = Number.MIN_VALUE;
    maxY = Number.MIN_VALUE;
    get width() {
        return this.maxX - this.minX + 1;
    }
    get height() {
        return this.maxY - this.minY + 1;
    }
}
