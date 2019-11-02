import { getGcode, Settings, Operation } from './gcodegen/cam-gcode';
import { defaultSettings, defaultOperation } from './gcodegen/defaults';
import { parseFile } from './gcodegen/documentParser';
import { flatten } from 'lodash';
import uuidv4 from 'uuid/v4';
import * as fs from 'fs';
import { processGcode } from './gcodeanlayse';

export class Estimator {
    constructor(private files: CNCFile[]) {
    }
    async parseDocuments(settings: Settings) {
        const docPromises = this.files.map((file) => parseFile(settings, file));
        const documents = await Promise.all(docPromises);
        return flatten(documents);
    }
    async getGcode(cutRate: number): Promise<string> {
        console.log(`Generatting GCode... Cut rate ${cutRate} mm/min`);
        const settings = defaultSettings;
        const documents = await this.parseDocuments(settings);
        const operations: Operation[] = [{
            ...defaultOperation,
            documents: documents.map(x => x.id),
            id: uuidv4(),
            name: 'Main cuts',
            type: 'Water Cut',
            cutRate,
        }];

        return new Promise((resolve, reject) => {
            const onError = (message: string) => reject(message);
            const onDone = (gcode: string) => resolve(gcode);

            const onProgress = (gauge: number[]) => {
                // console.log(gauge);
            };
    
            getGcode(settings, documents, operations, onError, onDone, onProgress);
        });
    }

    async analyseGcode(gcode: string) {
        if (!gcode) throw new Error('No gcode provided');
        const output = await processGcode(gcode);
        return output;
    }

    async estimate() {
        const cutRate = 500; // in mm/min
        const gcode = await this.getGcode(cutRate);

        console.log('Done generating Gcode. Analysing it now...')
        const analysis = await this.analyseGcode(gcode);

        return {
            time: analysis.printTime,
            totalDistance: analysis.totalDistance,
        }
    }
}