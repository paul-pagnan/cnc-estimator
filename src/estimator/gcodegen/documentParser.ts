/**
 *  Copied and rewritten from LaserWeb4 src/components/cam.js
 */
import Parser from './lw.svg-parser/parser';
import { imageTagPromise } from './imageFilter';
import { Document, Settings } from './cam-gcode';
import { loadDocument } from './documentLoad';
import { init } from './snap';

export async function parseFile(settings: Settings, file: CNCFile): Promise<Document[]> {
    await init();

    const { data, filename } = file;
    if (filename.substr(-4) === '.svg') {
        let parser = new Parser({});
        const tags = await parser.parse(data.toString());
        const _tags = await imageTagPromise(tags);
        const files = loadDocument(settings, file, { parser, tags: _tags });
        return files;
    }

    if (filename.substr(-4).toLowerCase() === '.dxf') {
        const files = loadDocument(settings, file, {});
        return files;
    }

    throw new Error(`Unsupported file: ${filename} of mimetype: ${file.mimetype}`);
};
