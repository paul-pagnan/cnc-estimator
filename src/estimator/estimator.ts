import { getGcode, Settings, Operation } from './gcodegen/cam-gcode';
import { defaultSettings, defaultOperation } from './gcodegen/defaults';
import { parseFile } from './gcodegen/documentParser';
import { flatten } from 'lodash';
import uuidv4 from 'uuid/v4';
import * as fs from 'fs';

export class Estimator {
    constructor(private files: CNCFile[]) {
    }
    async parseDocuments(settings: Settings) {
        const docPromises = this.files.map((file) => parseFile(settings, file));
        const documents = await Promise.all(docPromises);
        return flatten(documents);
    }
    async getGcode(cutRate: number) {
        const settings = defaultSettings;
        const documents = await this.parseDocuments(settings);
        const operations: Operation[] = [{
            ...defaultOperation,
            documents: documents.map(x => x.id),
            id: uuidv4(),
            name: 'Main cuts',
            cutRate,
        }];

        return new Promise((resolve, reject) => {
            const onError = (message: string) => reject(message);
            const onDone = (gcode: string) => resolve(gcode);

            const onProgress = (gauge: number[]) => {
                console.log(gauge);
            };
    
            getGcode(settings, documents, operations, onError, onDone, onProgress);
        });
    }
    async estimate() {
        const cutRate = 100; // in mm/min
        const gcode = await this.getGcode(cutRate);
        console.log(gcode);

        fs.writeFileSync('text.gcode', gcode);

        // return gcode;
    }
}