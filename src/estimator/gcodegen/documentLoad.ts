/**
 * Copied and rewritten from LaserWeb4 src/reducers/document.js
 */

import { mat2d } from 'gl-matrix';
import { Settings, Document } from './cam-gcode';
import uuidv4 from 'uuid/v4';
import { pathStrToRawPaths, hasClosedRawPaths } from './mesh'
import { getSnapNode } from './snap';
const dxfParse = require('dxf-parser');
import { forest, changedArray, object, getSubtreeIds, reduceSubtree, getParentIds, reduceParents } from './object'
import { processDXF } from './dxf';

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
    const parser = new dxfParse();
    const parsedDxf = parser.parseSync(file.data.toString());

    const docFile = {
        ...DOCUMENT_INITIALSTATE,
        id: id,
        type: 'document',
        name: file.filename,
        isRoot: true,
        children: <string[]> [],
        selected: false,
    };
    let state = [docFile];
    state = processDXF(state, docFile, parsedDxf);
    return state;
}

function loadSvg(settings: Settings, file: CNCFile, content: Content, id = uuidv4()) {
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

export function loadDocument(settings: Settings, file: CNCFile, content: any): Document[] {
    if (file.mimetype === 'image/svg+xml') {
        return loadSvg(settings, file, content);
    }

    if (file.filename.substr(-4).toLowerCase() === '.dxf') {
        return loadDxf(file);
    }

    throw new Error(`Unsupported file type: ${file.mimetype} ${file.filename}`);
};

const documentBase = object('document', DOCUMENT_INITIALSTATE);

export function document(state: any, action: any) {
    switch (action.type) {
        case 'DOCUMENT_TRANSFORM2D_SELECTED':
            if (state.selected && state.transform2d)
                return { ...state, transform2d: mat2d.multiply([], action.payload, state.transform2d) };
            else
                return state;
        case 'LOADED':
            state = { ...state };
            if (state.translate && state.scale && !state.transform2d) {
                if (state.dataURL && state.dpi)
                    state.transform2d = [state.scale[0] / state.dpi * 25.4, 0, 0, state.scale[1] / state.dpi * 25.4, state.translate[0], state.translate[1]];
                else
                    state.transform2d = [state.scale[0], 0, 0, state.scale[1], state.translate[0], state.translate[1]];
            }
            delete state.scale;
            delete state.translate;
            delete state.dpi;
            state.transform2d = state.transform2d || null;
            state.originalPixels = state.originalPixels || null;
            state.originalSize = state.originalSize || null;
            return documentBase(state, action);
        default:
            return documentBase(state, action);
    }
}

const documentsForest = forest('document', document);

export function cloneDocument(forest: any, rootId: any, renamer=(d: any, index: any)=>(d.name))
{
    let parent = forest.find((o: any) => o.id === rootId);
    let idMap: any={}
    let docs=getSubtreeIds(forest, rootId).map((i,index)=>{
            let o=forest.find((o: any) => o.id === i)
            if (o) {
                idMap[o.id]=uuidv4()
                return Object.assign({},o,{id: idMap[o.id], name: renamer(o,index), selected:false, isRoot: !index})
            }
        }).filter(e=>(e!==undefined)).map((item,index)=>{
            item.children=item.children.map((c: any)=>(idMap[c]));
            return item;
        })

    return docs;
}


export function documents(state: any, action: any) {
    state = documentsForest(state, action);
    switch (action.type) {
        case 'DOCUMENT_SELECT': {
            let ids = getSubtreeIds(state, action.payload.id);
            return state.map((o: any) => Object.assign({}, o, { selected: ids.includes(o.id) }));

        }

        case 'DOCUMENT_TOGGLE_SELECT': {
            let parent = state.find((o: any) => o.id === action.payload.id);
            if (!parent)
                return state;
            let selected = !parent.selected;
            state = reduceSubtree(state, action.payload.id, true, (o: any) => Object.assign({}, o, { selected }));
            if (!selected)
                state = reduceParents(state, action.payload.id, false, (o: any) => Object.assign({}, o, { selected: false }));
            return state;
        }

        case 'DOCUMENT_SELECT_META': {
            if (action.payload.meta===true || action.payload.meta===false){
                return state.map((o: any)=>{ return Object.assign({},o,{selected: action.payload.meta})})
            }
        }
        case 'DOCUMENT_TOGGLE_VISIBLE': {
            let parent = state.find((o: any) => o.id === action.payload.id);
            if (!parent)
                return state;
            let visible = !parent.visible;
            state = reduceSubtree(state, action.payload.id, true, (o: any) => Object.assign({}, o, { visible }));
            if (visible)
                state = reduceParents(state, action.payload.id, true, (o: any) => Object.assign({}, o, { visible: true }));
            return state;
        }

        case 'DOCUMENT_CLONE_SELECTED': {
            let clones: any =[];
            let tree=state.filter((d: any) => d.selected).filter((d: any,index: any,t: any)=>{
                return !t.find((i: any) =>(i.selected && i.children.includes(d.id)));
            })
            const countOf=(name: any)=>{ return state.filter((d: any)=>d.isRoot && (d.name.indexOf(name)>=0)).length;}

            tree.forEach((sel: any) => {
                let cloned=cloneDocument(state, sel.id,(d: any,index: any)=>{
                    if (index) return d.name
                    let re=/([^\(]+) \(([0-9]+)\)/gi
                    return d.name.match(re) ?  d.name.replace(re,(str: any,p: any)=>{
                        return `${p} (${countOf(p)})`
                    }) : `${d.name} (${countOf(d.name)})`
                })
                if (cloned.length)
                    clones= [...clones,...cloned];
            })

            return [...state,...clones];
        }

        case "DOCUMENT_REMOVE_SELECTED": {
            let ids: any = [];
            state.filter((d: any) => d.selected).forEach((sel: any) => { ids = [...ids, ...getSubtreeIds(state, sel.id)]; })
            return state.filter((o: any) => (!ids.includes(o.id))).map((parent: any) => {
                return Object.assign({}, parent, { children: parent.children.filter((c: any) => (!ids.includes(c))) })
            });
        }

        case "DOCUMENT_COLOR_SELECTED": {
            return state.map((o: any)=>{
                if (!o.selected) return o;
                return Object.assign({},o,action.payload.color)
            })
            return state;
        }

        case 'WORKSPACE_RESET':
            return [];
        default:
            return state;
    }
}
