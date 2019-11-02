import { getLaserCutGcodeFromOp } from '../cam-gcode-laser-cut.js'
import { workerData, parentPort } from 'worker_threads';

let {settings, opIndex, op, geometry = [], openGeometry = [], tabGeometry = []} = workerData;

const errors = [];

const showAlert = (message, level) => {
    errors.push({ message, level })
};
const progress = () => {
    parentPort.postMessage({ event: "onProgress", gcode, errors })
};
const done = (gcode) => {
    if (gcode === false && errors.length) {
        parentPort.postMessage({ event: "onError", errors })
    } else {
        parentPort.postMessage({ event: "onDone", gcode })
    }
    // self.close();
};

try{
    getLaserCutGcodeFromOp.apply(this, [settings, opIndex, op, geometry, openGeometry, tabGeometry, showAlert, done, progress])
}catch(e){
    console.error(e);
    parentPort.postMessage({ event: "onError", errors:[{ message:e, level:10 }]})
}