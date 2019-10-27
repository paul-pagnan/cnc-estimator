class Point {
    // Class constructor...
    constructor(x, y) {
        // Init properties
        this.x = parseFloat(x)
        this.y = parseFloat(y)

        if (isNaN(this.x) || isNaN(this.y)) {
            console.error('new Point(', x, y, ')')
            throw new Error('Invalid input: x and y params must be float.')
        }
    }

    isEqual(point) {
        return this.x === point.x && this.y === point.y
    }
}

class Path {
    // Class constructor...
    constructor() {
        // Init properties
        this.points = []
        this.length = 0
    }

    getPoints() {
        return this.points
    }

    getFlattenPoints() {
        let points = []
        this.points.forEach(point => points.push(point.x, point.y))
        return points
    }

    getClipperPoints(scaleUp = 1) {
        let points = []
        this.points.forEach(point => points.push({ X: parseInt(point.x * scaleUp), Y: parseInt(point.y * scaleUp) }))
        return points
    }

    fromClipperPoints(points, scaleDown = 1) {
        this.points = []
        points.forEach(point => this.addPoint(parseFloat(point.X * scaleDown), parseFloat(point.Y * scaleDown)))
        return this
    }

    getPoint(i) {
        return this.points[i < 0 ? this.length + i : i] || null
    }

    addPoint(x, y) {
        this.points.push(new Point(x, y))
        this.length = this.points.length
    }

    addPoints(points) {
        // For each couple of points
        for (let i = 0, il = points.length; i < il; i += 2) {
            this.addPoint(points[i], points[i + 1])
        }
    }

    isClosed() {
        let firstPoint = this.getPoint(0)
        return firstPoint && firstPoint.isEqual(this.getPoint(-1))
    }

    close() {
        if (! this.isClosed() && this.length > 2) {
            let firstPoint = this.getPoint(0)
            this.addPoint(firstPoint.x, firstPoint.y)
            return true
        }

        return false
    }

    transform(matrix) {
        this.points = this.points.map(point => {
            return new Point(
                matrix[0] * point.x + matrix[2] * point.y + matrix[4],
                matrix[1] * point.x + matrix[3] * point.y + matrix[5]
            )
        })
    }
}

// Exports
export { Path, Point }
export default Path