import Queue from 'queue';

export interface Settings {
    comAccumulatedJobTime: number;
    comInterfaces: any[];
    comPorts: any[];
    comServerConnect: boolean;
    comServerIP: string;
    comServerVersion: string;
    connectBaud: string;
    connectIP: string;
    connectPort: string;
    connectVia: string;
    dpiBitmap: number;
    forcePxPerInch: boolean;
    gcodeCheckSizePower: number;
    gcodeConcurrency: number;
    gcodeCurvePrecision: number;
    gcodeEnd: string;
    gcodeGenerator: string;
    gcodeHoming: string;
    gcodeLaserIntensity: string;
    gcodeLaserIntensitySeparateLine: boolean;
    gcodeSMaxValue: number;
    gcodeSMinValue: number;
    gcodeStart: string;
    gcodeToolOff: string;
    gcodeToolOn: string;
    gcodeToolTestDuration: number;
    gcodeToolTestPower: number;
    jogFeedXY: number;
    jogFeedZ: number;
    jogStepsize: number;
    machineAEnabled: boolean;
    machineBeamDiameter: number;
    machineBlowerEnabled: boolean;
    machineBlowerGcodeOff: string;
    machineBlowerGcodeOn: string;
    machineBottomLeftX: number;
    machineBottomLeftY: number;
    machineFeedRange: {
        A: { min: number; max: number; }
        S: { min: number; max: number; }
        XY: { min: number; max: number; }
        Z: { min: number; max: number; }
    };
    machineHeight: number;
    machineWidth: number;
    machineXYProbeOffset: number;
    machineZEnabled: boolean;
    machineZMatThickness: number;
    machineZProbeOffset: number;
    machineZStartHeight: string;
    machineZToolOffset: number;
    macros: {
        [key: string]: { label: string; gcode: string; keybinding: string; _locked: boolean; };
    };
    pxPerInch: number;
    showMachine: boolean;
    toolCncMode: boolean;
    toolCreateEmptyOps: boolean;
    toolDisplayCache: boolean;
    toolFeedUnits: string;
    toolGridHeight: number;
    toolGridMajorSpacing: number;
    toolGridMinorSpacing: number;
    toolGridWidth: number;
    toolImagePosition: string;
    toolSafetyLockDisabled: boolean;
    toolTestDuration: number;
    toolTestSValue: number;
    toolUseGamepad: boolean;
    toolUseNumpad: boolean;
    toolVideoDevice: any;
    toolVideoFov: {
        x: number; y: number;
    };
    toolVideoLens: {
        F: number;
        a: number;
        b: number;
        scale: number;
    };
    toolVideoOMR: boolean;
    toolVideoOMRMarkerSize: number;
    toolVideoOMROffsetX: number;
    toolVideoOMROffsetY: number;
    toolVideoPerspective: {
        enabled: boolean;
    }
    toolVideoResolution: string;
    toolWebcamUrl: string;
    uiFcDrag: any;
    __latestRelease: string;
    __selectedProfile: any;
    __version: string;
}

export interface Document {
    children: string[];
    color: string;
    dataURL: string;
    fillColor: number[];
    id: string;
    isRoot: boolean;
    mimeType: string;
    name: string;
    originalPixels: any;
    originalSize: any;
    rawPaths: any;
    selected: boolean;
    strokeColor: any;
    transform2d: any;
    type: string;
    visible: boolean;
}

export interface Operation {
    aAxisDiameter: number;
    brightness: number;
    burnWhite: boolean;
    contrast: number;
    cutRate: number;
    cutWidth: number;
    diagonal: boolean;
    direction: string;
    dithering: boolean;
    documents: string[]
    enabled: boolean;
    expanded: boolean;
    filterFillColor: any;
    filterStrokeColor: any;
    gamma: number;
    grayscale: string;
    hookOperationEnd: string;
    hookOperationStart: string;
    hookPassEnd: string;
    hookPassStart: string;
    id: string;
    invertColor: boolean;
    joinPixel: boolean;
    laserDiameter: number;
    laserPower: number;
    laserPowerRange: { min: number; max: number; }
    latheFace: boolean;
    latheFaceEndDiameter: number;
    latheFinishDepth: number;
    latheFinishExtraPasses: number;
    latheFinishFeed: number;
    latheRapidToDiameter: number;
    latheRapidToZ: number;
    latheRoughingDepth: number;
    latheRoughingFeed: number;
    latheStartZ: number;
    latheToolBackSide: boolean;
    latheTurns: any[];
    lineAngle: number;
    lineDistance: number;
    margin: number;
    millEndZ: number;
    millRapidZ: number;
    millStartZ: number;
    name: string;
    overScan: number;
    passDepth: number;
    passes: number;
    plungeRate: number;
    ramp: boolean;
    segmentLength: number;
    shadesOfGray: number;
    smoothing: boolean;
    startHeight: string;
    stepOver: number;
    tabDepth: number;
    tabDocuments: any[];
    toolAngle: number;
    toolDiameter: number;
    toolSpeed: number;
    trimLine: boolean;
    type: string;
    useA: boolean;
    useBlower: boolean;
    verboseGcode: boolean;
    _docs_visible: boolean;
}

export function getGcode(
    settings: Settings,
    documents: Document[],
    operations: Operation[],
    onError: (message: string, level: number) => void,
    done: (gcode: string) => void,
    progress: (guage: number[]) => void,
): Queue;

