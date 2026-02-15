import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// User Credentials
// Key ID: 24b12a36228d
// App Key: 0054e11912d30745b1d31dca3c74da83e122c891c4
const B2_KEY_ID = process.env.B2_KEY_ID || '00524b12a36228d0000000001';
const B2_APPLICATION_KEY = process.env.B2_APP_KEY || 'K005DE/9cgfWi7nRJjxjdlY8E1fq93M';
const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = process.env.B2_REGION || 'us-east-005';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'thulir-construction';

// S3 Client Config
const s3 = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY
    }
});

// Helper to convert Base64 to Buffer
// Data URL format: "data:image/jpeg;base64,/9j/4AAQSw..."
const decodeBase64 = (dataString: string) => {
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return { type: null, buffer: null };
    }
    return {
        type: matches[1],
        buffer: Buffer.from(matches[2], 'base64')
    };
};

export const uploadImageToB2 = async (base64String: string, folder: string = 'workers'): Promise<string | null> => {
    try {
        if (!base64String || !base64String.startsWith('data:image')) {
            if (base64String?.startsWith('http')) return base64String;
            return null;
        }

        const { type, buffer } = decodeBase64(base64String);
        if (!type || !buffer) return null;

        const ext = type.split('/')[1];
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        await s3.send(new PutObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: type
        }));

        // Public URL Construction
        // Pattern: https://<endpoint>/<bucket>/<key>
        // Example: https://s3.us-east-005.backblazeb2.com/thulir-construction/workers/test.jpg
        const url = `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileName}`;
        return url;

    } catch (error) {
        console.error('B2 Upload Error:', error);
        return null;
    }
};

export const deleteImageFromB2 = async (fileUrl: string) => {
    try {
        const urlParts = fileUrl.split(B2_BUCKET_NAME + '/');
        if (urlParts.length < 2) return;
        const key = urlParts[1];

        await s3.send(new DeleteObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: key
        }));
    } catch (error) {
        console.error('B2 Delete Error:', error);
    }
};
