import { JSDOM } from 'jsdom';
import Bluebird from 'bluebird';
import * as path from 'path';
const window = require('svgdom')
const document = window.document
const {SVG, registerWindow} = require('@svgdotjs/svg.js')
// register window and document
registerWindow(window , document)


export async function init() {
    if (window.Snap) return;

    const url = path.join(__dirname, './jsdom/index.html');
    const dom: any = await JSDOM.fromFile(url, {
        runScripts: 'dangerously',
        resources: 'usable'
    });


    // have to be sure the snap module is loaded before proceeding
    await ((async () => {
        while (!dom.window.Snap) {
            await Bluebird.delay(100);
        }

        window.Snap = dom.window.Snap;
    })());
}

export const getSnap = () => {
    return window.Snap;
}

export function getSnapNode(tag: any): any {
    if (!window.Snap) throw new Error('Snap not initialised');

    const getNode = (tag: any): any => {
        if (tag.parent) {
            const parent = getNode(tag.parent);
            const canvas = SVG(tag.element);
            return Object.assign(canvas.node, { parentNode: parent });
        }
        return SVG(tag.element).node;
    };

    const node = getNode(tag);

    return window.Snap(node);
}