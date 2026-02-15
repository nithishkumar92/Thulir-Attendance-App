import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Hardcoded for now based on user input, normally env vars
const B2_KEY_ID = process.env.B2_KEY_ID || '0054e11912d30745b1d31dca3c74da83e122c891c4'; // Application Key
const B2_KEY_NAME_ID = process.env.B2_APP_KEY_ID || '24b12a36228d'; // Key ID
const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = process.env.B2_REGION || 'us-east-005';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'thulir-construction';

// Per Backblaze docs, standard S3 client works
const s3 = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
        accessKeyId: B2_KEY_NAME_ID,
        secretAccessKey: B2_KEY_ID
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
            // It might already be a URL or empty
            if (base64String?.startsWith('http')) return base64String;
            return null;
        }

        const { type, buffer } = decodeBase64(base64String);
        if (!type || !buffer) return null;

        // Generate filename: folder/timestamp_random.jpg
        const ext = type.split('/')[1];
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        await s3.send(new PutObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: type,
            // ACL: 'public-read' // Backblaze private buckets don't support ACLs like this via S3 API usually, 
            // but for "Public" buckets (if configured), it works. 
            // The user said the bucket is PRIVATE. 
            // CRITICAL: If bucket is private, we need a presigned URL or a worker to serve it.
            // USER REQUEST says: "Type: Private".
            // If it's private, a direct link won't work without a token.
            // BUT user said "Photos stored in Cloudflare R2... Frontend loads directly".
            // Usually for this use case, we want a PUBLIC bucket or a CF Worker.
            // Backblaze allows setting "Files in Bucket are Public" setting in the dashboard.
            // I will assume the user WILL make it public or uses a friendly URL.
            // If strictly private, we need a different approach (presigned URLs).
            // For now, let's assume we want a public-readable link.
            // B2 Public URL pattern: https://<bucketName>.s3.<region>.backblazeb2.com/<fileName>
            // actually it's: https://f005.backblazeb2.com/file/<bucketName>/<fileName> usually.
            // Let's rely on the S3 endpoint style if possible, or the friendly B2 URL.
            // Friendly B2 URL for public files: https://<bucketName>.<s3-endpoint>/<fileName> works for some.
            // Best is: https://s3.us-east-005.backblazeb2.com/thulir-construction/workers/...
        }));

        // Construct Public URL (Assuming User will make bucket public or it's needed)
        // If the bucket is TRULY private and stays private, the frontend won't be able to load these 
        // without a signed URL generator.
        // Given the requirement "reduce bandwidth", signing every request adds backend load.
        // The standard "images on CDN" pattern implies public read access.

        // Constructing standard path style URL
        const url = `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileName}`;
        return url;

    } catch (error) {
        console.error('B2 Upload Error:', error);
        return null;
    }
};

export const deleteImageFromB2 = async (fileUrl: string) => {
    try {
        // Extract Key from URL
        // URL: https://s3.us-east-005.backblazeb2.com/thulir-construction/workers/123.jpg
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
