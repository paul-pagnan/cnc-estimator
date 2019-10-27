// Copyright 2014, 2016 Todd Fleming
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

'use strict';

import queue from 'queue';
import hhmmss from 'hhmmss';
const { Worker } = require('worker_threads');
import path from 'path';

export function getGcode(settings, documents, operations, onError, done, progress) {
    "use strict";

    let starttime=new Date().getTime()

    const QE = new queue();
    QE.timeout = 3600 * 1000;
    QE.concurrency = settings.gcodeConcurrency || 1;

    const gcode = Array(operations.length);
    const gauge = Array(operations.length*2).fill(0)
    const workers = [];
    let jobIndex = 0;

    for (let opIndex = 0; opIndex < operations.length; ++opIndex) {
        let op = operations[opIndex];

        const jobDone = (g, cb) => { 
            if (g !== false) { gcode[opIndex]=g; };  cb();
        }

        let invokeWorker = (props, cb, jobIndex) => {
            let peasant = new Worker('./workers/cam-lasercut.js', { data: props });
            peasant.onmessage = (e) => {
                let data = JSON.parse(e.data)
                if (data.event == 'onDone') {
                    gauge[props.opIndex*2+1]=100;
                    progress(gauge)
                    jobDone(data.gcode, cb)
                } else if (data.event == 'onProgress') {
                    gauge[props.opIndex*2+1]=data.progress;
                    progress(gauge)
                } else {
                    data.errors.forEach((item) => {
                        onError(item.message, item.level)
                    })
                    QE.end()
                }
            }
            workers.push(peasant)
        }

        let preflightPromise = (settings, documents, opIndex, op, workers) => {
            return new Promise((resolve, reject) => {
                console.log(documents);
                let geometry = [];
                let openGeometry = [];
                let tabGeometry = [];
                let filteredDocIds = [];

                const workerPath = path.join(__dirname, './workers/cam-preflight.js');

                const preflightData = { settings, documents, opIndex, op, geometry, openGeometry, tabGeometry };
                let preflight = new Worker(workerPath, { workerData: preflightData });
                preflight.on('message', (data) => {
                    if (data.event == 'onDone') {
                        if (data.geometry) geometry = data.geometry
                        if (data.openGeometry) openGeometry = data.openGeometry
                        if (data.tabGeometry) tabGeometry = data.tabGeometry
                        if (data.filteredDocIds) filteredDocIds = data.filteredDocIds
                        gauge[opIndex*2]=100;
                        resolve({ geometry, openGeometry, tabGeometry, filteredDocIds })
                    } else if (data.event == 'onProgress') {
                        gauge[opIndex*2]=data.percent;
                        progress(gauge)
                    } else if (data.event == 'onError') {
                        reject(data);
                    }
                });
                preflight.on('error', (err) => {
                    reject(err);
                });
                workers.push(preflight);
            })
        }

        if (op.enabled) QE.push((cb) => {
            console.log(op.type + "->" + jobIndex)
            preflightPromise(settings, documents, opIndex, op, workers)
                .then((preflight) => {
                    console.log("PREFLIGHT");
                    console.log(preflight);
                    let { geometry, openGeometry, tabGeometry } = preflight;

                    if (op.type === 'Laser Cut' || op.type === 'Laser Cut Inside' || op.type === 'Laser Cut Outside' || op.type === 'Laser Fill Path') {
                        invokeWorker({ settings, opIndex, op, geometry, openGeometry, tabGeometry }, cb, jobIndex)
                    }
                })
                .catch((err) => {
                    onError(err.message, err.level)
                    QE.end()
                })
        })

    } // opIndex

    QE.total = QE.length
    QE.chunk = 100 / QE.total

    progress(0)
    QE.on('success', (result, job) => {
        jobIndex++
        let p = parseInt(jobIndex * QE.chunk)
        progress(p);
    })
    QE.on('end', () => {
        workers.forEach((ww) => {
            ww.terminate();
        })

    })

    QE.start((err) => {
        progress(100)
        let ellapsed=(new Date().getTime()-starttime)/1000;
        onError("Ellapsed: "+hhmmss(ellapsed)+String(Number(ellapsed-Math.floor(ellapsed)).toFixed(3)).substr(1),"info");
        done(settings.gcodeStart + gcode.join('\r\n') + settings.gcodeEnd);
    })



    return QE;

} // getGcode
