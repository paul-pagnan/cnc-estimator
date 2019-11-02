export const defaultGcodeSettings: GcodeSettings = {
    maxSpeed:  [100, 100, 10, 100], // ["maxSpeedX", "maxSpeedY", "maxSpeedZ", "maxSpeedE"] "unit": "mm/s" 
    maxPrintAcceleration:  [1000, 1000, 100, 10000], // ["maxPrintAccelerationX", "maxPrintAccelerationY", "maxPrintAccelerationZ", "maxPrintAccelerationE"] "unit": "mm/s^2"
    maxTravelAcceleration:  [1000, 1000, 100, 10000], // ["maxTravelAccelerationX", "maxTravelAccelerationY", "maxTravelAccelerationZ", "maxTravelAccelerationE"] "unit": "mm/s^2"
    maxJerk:  [10, 10, 1, 10], // ["maxJerkX", "maxJerkY", "maxJerkZ", "maxJerkE"] "unit": "mm/s"
    absoluteExtrusion:  false,
    feedrateMultiplyer:  100,
    filamentDiameter:  1.75,
    firmwareRetractLength:  2,
    firmwareUnretractLength:  2,
    firmwareRetractSpeed:  50,
    firmwareUnretractSpeed:  50,
    firmwareRetractZhop:  0,
    timeScale:  1.01,
    lookAheadBuffer:  16,
}


export interface GcodeSettings {
    maxSpeed: number[];
    maxPrintAcceleration: number[];
    maxTravelAcceleration: number[];
    maxJerk: number[];
    absoluteExtrusion: boolean;
    feedrateMultiplyer: number;
    filamentDiameter: number;
    firmwareRetractLength: number;
    firmwareUnretractLength: number;
    firmwareRetractSpeed: number;
    firmwareUnretractSpeed: number;
    firmwareRetractZhop: number;
    timeScale: number;
    lookAheadBuffer: number;
}