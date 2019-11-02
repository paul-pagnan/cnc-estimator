/**
 * Copied and rewritten from LaserWeb4 src/reducers/document.js
 */

import { mat2d } from 'gl-matrix';
import { Settings, Document } from './cam-gcode';
import uuidv4 from 'uuid/v4';
import { pathStrToRawPaths, hasClosedRawPaths } from './mesh'
import { getSnapNode } from './snap';

export const DOCUMENT_INITIALSTATE: Document = {
    id: '',
    type: '?',
    name: '',
    mimeType: '',
    isRoot: false,
    children: [],
    selected: false,
    visible: true,
    transform2d: null,
    rawPaths: null,
    strokeColor: null,
    fillColor: null,
    dataURL: '',
    originalPixels: null,
    originalSize: null,
    color: null,
};

export interface Content { parser: any; tags: any; attrs: any; };

function loadDxf(file: CNCFile, id = uuidv4()) {
    return {
        ...DOCUMENT_INITIALSTATE,
        id: id,
        type: 'document',
        name: file.filename,
        isRoot: true,
        children: <string[]> [],
        selected: false,
    };
}

async function loadSvg(settings: Settings, file: CNCFile, content: Content, id = uuidv4()) {
    const docs: Document[] = [];

    let { parser, tags, attrs = {} } = content;


    let pxPerInch = (settings.pxPerInch) ? + settings.pxPerInch : 96;
    let allPositions = [];

    if (tags.element.width && parser.document.viewBox.width && !settings.forcePxPerInch) {
        let v = tags.element.width.baseVal;
        v.convertToSpecifiedUnits(v.SVG_LENGTHTYPE_IN);
        let w = v.valueInSpecifiedUnits;
        if (w)
            pxPerInch = parser.document.viewBox.width / w;
    }

    function getColor(c: string) {
        // let sc = window.Snap.color(c);
        // if (sc.r === -1 || sc.g === -1 || sc.b === -1)
        return [0, 0, 0, 0];
        // else
            // return [sc.r / 255, sc.g / 255, sc.b / 255, 1];
    }

    function mat2dFromSnap(m: any) {
        return [m.a, m.b, m.c, m.d, m.e / pxPerInch * 25.4, m.f / pxPerInch * 25.4];
    }

    let viewBoxDeltaX = -parser.document.viewBox.x / pxPerInch * 25.4;
    let viewBoxDeltaY = (parser.document.viewBox.y + parser.document.viewBox.height) / pxPerInch * 25.4;

    function applyToPoint(t: number[], x: number, y: number) {
        return [
            x * t[0] + y * t[2] + t[4],
            x * t[1] + y * t[3] + t[5]
        ]
    }

    function addChildren(parent: any, tag: any, parentMat: any, precision = 0.1) {
        for (let child of tag.children) {

            let localMat = mat2dFromSnap(getSnapNode(child).transform().localMatrix);

            let combinedMat = mat2d.mul([], parentMat, localMat);
            let c = {
                ...DOCUMENT_INITIALSTATE,
                id: uuidv4(),
                type: child.name,
                name: child.name + ': ' + (child.attrs.title || child.attrs.id),
                isRoot: false,
                children: <string[]> [],
                selected: false,
            };

            let rawPaths = [];
            let addPoint = (path: any[], svgX: number, svgY: number) => {
                let x = (combinedMat[0] * svgX + combinedMat[2] * svgY) / pxPerInch * 25.4 + combinedMat[4];
                let y = (combinedMat[1] * svgX + combinedMat[3] * svgY) / pxPerInch * 25.4 + combinedMat[5];
                let [tx, ty] = applyToPoint(attrs.transform2d || [1, 0, 0, 1, 0, 0], viewBoxDeltaX + x, viewBoxDeltaY - y)
                path.push(tx, ty);
            };
            if (child.name === 'path') {
                let paths = pathStrToRawPaths(child.attrs.d, 25.4, 1, Math.max(precision,0.1) * pxPerInch / 25.4, (error: Error) => console.log(error));
                if (paths)
                    for (let path of paths) {
                        let p: any[] = [];
                        for (let i = 0; i < path.length; i += 2)
                            addPoint(p, path[i], path[i + 1]);
                        if (p.length)
                            rawPaths.push(p);
                    }
            } else {
                for (let path of child.getPaths()) {
                    let p: any[] = [];
                    for (let point of path.points)
                        addPoint(p, point.x, point.y);
                    if (p.length)
                        rawPaths.push(p);
                }
            }

            if (rawPaths.length) {
                allPositions.push(rawPaths);
                c.rawPaths = rawPaths;
                c.transform2d = [1, 0, 0, 1, 0, 0];
                c.strokeColor = getColor(child.attrs.stroke);
                c.fillColor = getColor(child.attrs.fill);
                if (hasClosedRawPaths(rawPaths)) {
                    if (!c.fillColor[3] && !c.strokeColor[3])
                        c.fillColor[3] = .8;
                } else if (!c.strokeColor[3])
                    c.strokeColor[3] = .8;
            } else if (child.name === 'image') {
                let element = child.element;
                let dataURL = element.getAttribute('xlink:href');
                if (dataURL.substring(0, 5) !== 'data:')
                    continue;
                let rawX = element.x.baseVal.value;
                let rawY = element.y.baseVal.value;
                let rawW = element.width.baseVal.value;
                let rawH = element.height.baseVal.value;
                let x = rawX / pxPerInch * 25.4;
                let y = rawY / pxPerInch * 25.4;
                let w = (rawX + rawW) / pxPerInch * 25.4 - x;
                let h = (rawY + rawH) / pxPerInch * 25.4 - y;
                let t = [w / child.naturalWidth, 0, 0, -h / child.naturalHeight, x, y + h];
                t = mat2d.mul([], combinedMat, t);
                t = mat2d.mul([], [1, 0, 0, -1, viewBoxDeltaX, viewBoxDeltaY], t);
                c = {
                    ...c,
                    transform2d: t,
                    mimeType: file.mimetype,
                    dataURL: dataURL,
                };
            }
            docs.push(c);
            parent.children.push(c.id);
            addChildren(c, child, combinedMat)
        }
    }

    const doc = {
        ...DOCUMENT_INITIALSTATE,
        id: id,
        type: 'document',
        name: file.filename,
        isRoot: true,
        children: <string[]> [],
        selected: false,
    };
    addChildren(doc, tags, [1, 0, 0, 1, 0, 0], settings.gcodeCurvePrecision);
    return docs;
}

export function loadDocument(settings: Settings, file: CNCFile, content: any): Promise<Document[]> {
    if (file.mimetype === 'image/svg+xml') {
        return loadSvg(settings, file, content);
    }

    if (file.filename.substr(-4).toLowerCase() === '.dxf') {
        return Promise.resolve([loadDxf(file)]);
    }

    throw new Error(`Unsupported file type: ${file.mimetype} ${file.filename}`);
};
