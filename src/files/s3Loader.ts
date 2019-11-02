import { S3 } from 'aws-sdk';
import Config from '../config';
import { simpleParser } from 'mailparser';

const getFile = async (key: string) => {
    const { s3: s3Conf } = Config;

    const s3 = new S3({});
    const file = await s3
        .getObject({ Bucket:s3Conf.bucket, Key: key })
        .promise();

    return file;
};

export const getAttachemnts = async (email: string) => {
    const mail = await simpleParser(email);
    return mail.attachments;
};

export async function getFilesFromS3Email(messageId: string) {
    if (!messageId) throw new Error('Message id is required');

    const key = `${Config.s3.keyPrefix}/${messageId}`;
    const file = await getFile(key);

    console.log('Retrieving attachments');
    const attachments = await getAttachemnts(file.Body.toString());
    console.log(`Got files: `, attachments.map(x => x.filename).join(', '))
    return attachments;
};
