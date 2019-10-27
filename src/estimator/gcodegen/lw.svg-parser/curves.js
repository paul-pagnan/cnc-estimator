// Base code from : https://github.com/MadLittleMods/svg-curve-lib/blob/master/src/js/svg-curve-lib.js
import { Point } from './path'

const MATH_PI_2  = Math.PI * 2
const DEG_TO_RAD = Math.PI / 180

function mod(x, m) {
    return (x % m + m) % m
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max)
}

function distance(p0, p1) {
    return Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2))
}

function angle(v0, v1) {
    let p = v0.x * v1.x + v0.y * v1.y
    let n = Math.sqrt((Math.pow(v0.x, 2) + Math.pow(v0.y, 2)) * (Math.pow(v1.x, 2) + Math.pow(v1.y, 2)))
    return (v0.x * v1.y - v0.y * v1.x < 0 ? -1 : 1) * Math.acos(p / n)
}

// Abstract class
class TraceBase {
    constructor(settings) {
        // Set defaults properties
        this.path          = []   // Points collection [x,y, x,y, ...]
        this.linear        = true // Linear trace mode
        this.step          = 0.01 // Step resolution if linear mode = false
        this.resolution    = 500  // Number of segments we use to approximate arc length
        this.segmentLength = 0.1  // Segment length

        // Update properties from user settings
        Object.assign(this, settings || {})

        // Arc length properties
        this.arcLength    = null
        this.arcLengthMap = null
    }

    _clearPath() {
        this.path = []
    }

    getPath() {
        return this.path
    }

    getPointAtT(t) {
        return new Point(0, 0)
    }

    _addPoint(point) {
        this.path.push(point.x, point.y)
    }

    _postTrace() {
        // Do additional tasks
    }

    _approximateLength() {
        let arcLength    = 0
        let arcLengthMap = []
        let prevPoint    = this.getPointAtT(0)

        let i, t, nextPoint

        for(i = 0; i < this.resolution; i++) {
            t          = clamp(i * (1 / this.resolution), 0, 1)
            nextPoint  = this.getPointAtT(t)
            arcLength += distance(prevPoint, nextPoint)

            arcLengthMap.push({ t: t, arcLength: arcLength })

            prevPoint = nextPoint
        }

        // Last stretch to the endpoint
        nextPoint  = this.getPointAtT(1)
        arcLength += distance(prevPoint, nextPoint)

        arcLengthMap.push({ t: 1, arcLength: arcLength })
        Object.assign(this, { arcLength, arcLengthMap })
    }

    getPointAtU(u) {
        u = clamp(u, 0, 1)

        let targetDistanceFromStartingPoint = u * this.arcLength

        let resultantT    = 0
        let prevArcLength = 0
        let prevT         = 0

        this.arcLengthMap.every(entry => {
            let t         = entry.t
            let arcLength = entry.arcLength

            // Once we go a past our target
            // Lets interpolate from a previous to current
            if (arcLength >= targetDistanceFromStartingPoint) {
                let endDiff      = arcLength - targetDistanceFromStartingPoint
                let startDiff    = targetDistanceFromStartingPoint - prevArcLength
                let linearFactor = (startDiff / (endDiff + startDiff)) || 0

                resultantT = prevT + (t - prevT) * linearFactor

                // Break
                return false
            }

            prevArcLength = arcLength
            prevT = t

            return true
        })

        return this.getPointAtT(resultantT)
    }

    trace(settings) {
        // Update properties from user settings
        Object.assign(this, settings || {})

        // Default getPoint settings
        let getPoint = 'getPointAtT'
        let step     = this.step

        // Linear mode ?
        if (this.linear) {
            this._approximateLength()

            let segments = Math.round(this.arcLength / this.segmentLength)

            getPoint = 'getPointAtU'
            step     = 1 / segments
        }

        // Clear points list
        this._clearPath()

        // Trace the path
        for (let t = 0; t <= 1; t += step) {
            this._addPoint(this[getPoint](t))
        }

        // Do additional tasks
        this._postTrace()

        // Return the path
        return this.getPath()
    }
}

// Rewrite from https://github.com/MadLittleMods/svg-curve-lib/blob/master/src/js/svg-curve-lib.js#L84
class Arc extends TraceBase {
    init(settings) {
        // Update properties from user settings
        Object.assign(this, settings || {})

        // Get angle in radians
        this.radians = mod(this.angle, 360) * DEG_TO_RAD

        // If the endpoints are identical, then this is equivalent
        // to omitting the elliptical arc segment entirely.
        if(this.p1.x === this.p2.x && this.p1.y === this.p2.y) {
            return this.path
        }

        this.rx = Math.abs(this.rx)
        this.ry = Math.abs(this.ry)

        // If rx = 0 or ry = 0 then this arc is treated as
        // a straight line segment joining the endpoints.
        if (this.rx === 0 || this.ry === 0) {
            this.__addPoint(this.p1)
            this.__addPoint(this.p2)
            return this.path
        }

        // Following "Conversion from endpoint to center parameterization"
        // http://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter

        // Step #1: Compute transformedPoint
        let dx = (this.p1.x - this.p2.x) / 2
        let dy = (this.p1.y - this.p2.y) / 2

        let transformedPoint = {
            x:  Math.cos(this.radians) * dx + Math.sin(this.radians) * dy,
            y: -Math.sin(this.radians) * dx + Math.cos(this.radians) * dy
        }

        // Ensure radii are large enough
        let radiiCheck = Math.pow(transformedPoint.x, 2) / Math.pow(this.rx, 2) + Math.pow(transformedPoint.y, 2) / Math.pow(this.ry, 2)

        if (radiiCheck > 1) {
            this.rx = Math.sqrt(radiiCheck) * this.rx
            this.ry = Math.sqrt(radiiCheck) * this.ry
        }

        // Step #2: Compute transformedCenter
        let cSquareNumerator = Math.pow(this.rx, 2) * Math.pow(this.ry, 2) - Math.pow(this.rx, 2) * Math.pow(transformedPoint.y, 2) - Math.pow(this.ry, 2) * Math.pow(transformedPoint.x, 2)
        let cSquareRootDenom = Math.pow(this.rx, 2) * Math.pow(transformedPoint.y, 2) + Math.pow(this.ry, 2) * Math.pow(transformedPoint.x, 2)
        let cRadicand        = cSquareNumerator / cSquareRootDenom

        // Make sure this never drops below zero because of precision
        cRadicand = cRadicand < 0 ? 0 : cRadicand
        let cCoef = (this.large !== this.sweep ? 1 : -1) * Math.sqrt(cRadicand)
        let transformedCenter = {
            x: cCoef * ( (this.rx * transformedPoint.y) / this.ry),
            y: cCoef * (-(this.ry * transformedPoint.x) / this.rx)
        }

        // Step #3: Compute center
        this.center = {
            x: Math.cos(this.radians) * transformedCenter.x - Math.sin(this.radians) * transformedCenter.y + ((this.p1.x + this.p2.x) / 2),
            y: Math.sin(this.radians) * transformedCenter.x + Math.cos(this.radians) * transformedCenter.y + ((this.p1.y + this.p2.y) / 2)
        }

        // Step #4: Compute start/sweep angles
        // Start angle of the elliptical arc prior to the stretch and rotate operations.
        // Difference between the start and end angles
        let startVector = {
            x: (transformedPoint.x - transformedCenter.x) / this.rx,
            y: (transformedPoint.y - transformedCenter.y) / this.ry
        }

        let endVector = {
            x: (-transformedPoint.x - transformedCenter.x) / this.rx,
            y: (-transformedPoint.y - transformedCenter.y) / this.ry
        }

        this.startAngle = angle({ x: 1, y: 0 }, startVector)
        this.sweepAngle = angle(startVector, endVector)

        if (! this.sweep && this.sweepAngle > 0) {
            this.sweepAngle -= MATH_PI_2
        }

        else if (this.sweep && this.sweepAngle < 0) {
            this.sweepAngle += MATH_PI_2
        }

        // We use % instead of `mod(..)` because we want it to be -360deg to 360deg(but actually in radians)
        this.sweepAngle %= MATH_PI_2
    }

    trace(settings) {
        this.init(settings)
        return super.trace()
    }

    getPointAtT(t) {
        let angle = this.startAngle + (this.sweepAngle * t)

        let x = this.rx * Math.cos(angle)
        let y = this.ry * Math.sin(angle)

        return new Point(
            Math.cos(this.radians) * x - Math.sin(this.radians) * y + this.center.x,
            Math.sin(this.radians) * x + Math.cos(this.radians) * y + this.center.y
        )
    }

    _postTrace() {
        // Add last point in the path
        this._addPoint(this.p2)
    }
}

class CubicBezier extends TraceBase {
    _B1(t) { return t*t*t }
    _B2(t) { return 3*t*t*(1-t) }
    _B3(t) { return 3*t*(1-t)*(1-t) }
    _B4(t) { return (1-t)*(1-t)*(1-t) }

    _C1(p1, p2, p3, p4, t) {
        return p1*this._B1(t) + p2*this._B2(t) + p3*this._B3(t) + p4*this._B4(t)
    }

    getPointAtT(t) {
        return new Point(
            this._C1(this.p1.x, this.p2.x, this.p3.x, this.p4.x, t),
            this._C1(this.p1.y, this.p2.y, this.p3.y, this.p4.y, t)
        )
    }

    _addPoint(point) {
        this.path.unshift(point.x, point.y)
    }
}

class QuadricBezier extends TraceBase {
    _B1(t) { return t*t }
    _B2(t) { return 2*t*(1-t) }
    _B3(t) { return (1-t)*(1-t) }

    _C1(p1, p2, p3, t) {
        return p1*this._B1(t) + p2*this._B2(t) + p3*this._B3(t)
    }

    getPointAtT(t) {
        return new Point(
            this._C1(this.p1.x, this.p2.x, this.p3.x, t),
            this._C1(this.p1.y, this.p2.y, this.p3.y, t)
        )
    }

    _addPoint(point) {
        this.path.unshift(point.x, point.y)
    }
}

// Exports
export { Arc, CubicBezier, QuadricBezier }
