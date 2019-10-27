import { getFilesFromS3Email } from './files/s3Loader';
import AWS from 'aws-sdk';
import config from './config';
import * as mailer from './mail/mailer';
import { Estimator } from './estimator/estimator';

export default class Main {
    constructor(private incomingEmail: IncomingEmail) {
        // Set the region that SES is located and configure auth
        AWS.config.update({
            region: config.aws.region,
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
        });
    }

    async process() {
        const { messageId } = this.incomingEmail;
        try {
            const files = await getFilesFromS3Email(messageId);
            if (!files || !files.length) throw new Error('No attachments found');

            const mappedFiles: CNCFile[] = files.map(f => ({
                filename: f.filename,
                mimetype: f.contentType,
                data: f.content,
            }));

            const estimator = new Estimator(mappedFiles);
            
            await estimator.estimate();

            console.log(files);
        } catch (err) {
            console.log('There was an error. Replying to the email with details');
            console.error(err);
            await mailer.replyWithError(this.incomingEmail, err);
        }
    }
}

// The Lambda function handler
export const handler = async (event: any): Promise<void> => {
    const { ses } = event.Records[0];
    const { mail } = ses;
    const { source: from, messageId, headers } = mail;

    const subject = (headers || []).find((h: any) => h.name.toLowerCase() === 'subject') || { value: '' };

    const main = new Main({
        sourceEmail: from,
        messageId,
        subject: subject.value,
    });
    await main.process();
};