import { handler } from './index';

// For development purposes. Call the lambda function and pass your own props to it

const params = {
    Records: [
        {
            eventSource: 'aws:ses',
            eventVersion: '1.0',
            ses: {
                mail: {
                    timestamp: '2019-10-27T02:29:58.801Z',
                    source: 'paul@pagnan.com.au',
                    // messageId: '3qsabcvncvtg1sh69bh187m7npfgr2ae47qmem81', // with attachments
                    // messageId: 'phti9lt90po7js60r60lheauihqif8r0rre4ss01', // no attachments
                    // messageId: 'vthpi0kfngl4n9frbismpskfg5g35ce1m0forco1', // SVG
                    // messageId: 'ljhhqmiisr8cdv8b4huo4742vgekvqo8r8bobeo1', // car-alt-solid.svg
                    // messageId: '33o7fa34sgnpgrb60ho32hbphlm3t6j0stgf5j01', // Drawing2.dxf
                    headers: [
                        {
                            name: 'Subject',
                            value: 'Cool email',
                        }
                    ]
                }
            },
        }
    ]
};

console.log('Calling the handler...');
handler(params).then((result: any) => {
    console.log(`Finished`);
}).catch((err: Error) => {
    console.error(err);
    process.exit(2);
});
