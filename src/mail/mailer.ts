import { SES } from 'aws-sdk';
import config from '../config';

interface SendEmailParams {
    subject: string;
    to: string[];
    cc?: string[];
    text: string;
    html?: string;
}

const getParams = (sendParams: SendEmailParams):  SES.Types.SendEmailRequest => ({
    Destination: { /* required */
        CcAddresses: sendParams.cc,
        ToAddresses: sendParams.to
    },
    Message: { /* required */
        Body: { /* required */
            Html: {
                Charset: 'UTF-8',
                Data: sendParams.html,
            },
            Text: {
                Charset: 'UTF-8',
                Data: sendParams.text,
            }
        },
        Subject: {
            Charset: 'UTF-8',
            Data: sendParams.subject,
        }
    },
    Source: config.ses.sendAs, /* required */
    ReplyToAddresses: [ config.ses.replyTo ],
});

export const sendEmail = async (params: SendEmailParams) => {
    const ses = new SES({ apiVersion: '2010-12-01' });
    await ses.sendEmail(getParams(params)).promise();
}


export const replyWithResult = async (incomingMail: IncomingEmail, result: any) => {
    const params = {
        to: [incomingMail.sourceEmail],
        subject: `RE:${incomingMail.subject}`,
        html: '<p>Successfully processed. The estimate is:</p>' +
            `<br/><p>${JSON.stringify(result)}</p>`,
        text: 'Success'
    };
    return sendEmail(params);
};

export const replyWithError = async (incomingMail: IncomingEmail, error: Error) => {
    const params = {
        to: [incomingMail.sourceEmail],
        subject: `RE:${incomingMail.subject}`,
        html: '<p>There was an error processing this request. Please see below for details:</p>' +
            `<br/><p>${error.message}</p><pre>${JSON.stringify(error)}</pre>`,
        text: 'There was an error'
    };
    return sendEmail(params);
};