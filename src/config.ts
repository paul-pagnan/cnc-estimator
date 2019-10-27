// Import the development environment variables
require('dotenv').config();

const env = process.env;
const mandatoryEnvVars = [
    'awsAccessKeyId',
    'awsSecretAccessKey',
    'sendAs',
    'replyTo',
];

// Ensure that the correct Env vars are passed in
for (const param of mandatoryEnvVars) {
    if (!env[param]) throw new Error(`${param} was not found in the ENV variables. Please add it`);
}

export default {
    aws: {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey,
        region: env.region || 'us-east-1',
    },
    s3: {
        bucket: env.s3Bucket || 'eds-cnc-files',
        keyPrefix: env.s3KeyPrefix || 'incoming',
    },
    ses: {
        sendAs: env.sendAs,
        replyTo: env.replyTo,
    }
}