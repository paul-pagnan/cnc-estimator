import * as path from 'path';
import { defaultGcodeSettings, GcodeSettings } from './settings';
const { Worker } = require('worker_threads');

export const processGcode = (gcode: string, settings?: GcodeSettings): Promise<GcodeAnalysis> => {
    const gcodeLines = gcode.split(/\s*[\r\n]+\s*/g);
    const _settings = settings || defaultGcodeSettings;
    const data = {
        gcodeLines,
        settings: _settings,
    };
    
    const workerPath = path.join(__dirname, './gcodeProcessor.js');
    const worker = new Worker(workerPath, { workerData: data });
    return new Promise((resolve, reject) => {
        worker.on('message', (e: any) => {
            if (e.result) {
                resolve(e.result);
            }
        });
        worker.on('error', (err: Error) => {
            reject(err);
        });
    })
}

// Results from the gcode analyser. Examples of the return field in the comment
export interface GcodeAnalysis {
    numberOfLines: number; // 272,
    printTime: string; // '4:07:19',
    accelerationTime: string; // '0:00 (0.0%)',
    constantSpeedTime: string; // '4:07:18 (100.0%)',
    moveCommandCount: number; // 249,
    reachTargetSpeedCount: string; // '249 (100.0%)',
    moveType: string; // '0 (0.0%) / 249 (100.0%)',
    limitedMaxSpeedX: number;
    limitedMaxSpeedY: number;
    limitedMaxSpeedZ: number;
    limitedMaxSpeedE: number;
    totalDistance: string; // '28.71 m',
    totalDistanceX: string; // '17.13 m',
    totalDistanceY: string; // '14.85 m',
    totalDistanceZ: string; // '0.00 m',
    totalDistanceE: string; // '0.00 m',
    accelerationDistance: string; // '0.01 m (0.0%)',
    constantSpeedDistance: string; // '28.70 m (100.0%)',
    printDistance: string; // '0.00 m (0.0%) / 28.71 m (100.0%)',
    averageSpeed: string; // '1.9 mm/s',
    averageSpeedX: string; // '1.2 mm/s',
    averageSpeedY: string; // '1.0 mm/s',
    averageSpeedZ: string; // '0.0 mm/s',
    averageSpeedE: string; // '0.0 mm/s',
    zHopCount: number; // 0
    zHopTime: string; // '0:00',
    retractCount: number; // 0
    retractTime: string; // '0:00',
    filamentUsage: string; // '0.00 m, 0.00 cm^3',
    xyFeedrate: string; // '100 (1.67mm/s) / 6000 (100.00mm/s)',
    filamentUsageRate: string; // '0.00 mm/s, 0.00 cm/min',
    filamentLineRatio: string; // 'NaN mm',
    printSpeed: string; // 'NaN mm/s',
    travelSpeed: string; // '1.9 mm/s'
}