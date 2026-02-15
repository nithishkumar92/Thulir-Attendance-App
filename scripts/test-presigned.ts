import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const B2_KEY_ID = '00524b12a36228d0000000001';
const B2_APPLICATION_KEY = 'K005DE/9cgfWi7nRJjxjdlY8E1fq93M';
const B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = 'us-east-005';
const B2_BUCKET_NAME = 'thulir-construction';

async function testPresigned() {
    console.log("Testing Presigned URL Generation...");

    const s3 = new S3Client({
        endpoint: B2_ENDPOINT,
        region: B2_REGION,
        credentials: {
            accessKeyId: B2_KEY_ID,
            secretAccessKey: B2_APPLICATION_KEY
        }
    });

    try {
        // Assume check-public.ts created this file, or we pick a known one:
        // We uploaded 'public-test-1771132158934.txt' earlier.
        // Let's use a dynamic one if possible or just upload a new one.
        const fileName = `presigned-test-${Date.now()}.txt`;

        // Let's upload it first to be sure
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        await s3.send(new PutObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: fileName,
            Body: "Presigned Access Works!",
            ContentType: "text/plain"
        }));
        console.log(`Uploaded: ${fileName}`);

        // GENERATE SIGNED URL
        const command = new GetObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: fileName
        });

        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        console.log(`\nSigned URL (Expires in 1h):\n${signedUrl}\n`);

        // TEST FETCH
        console.log("Attempting to download with Signed URL...");
        const res = await fetch(signedUrl);
        if (res.ok) {
            console.log("SUCCESS! Downloaded content:", await res.text());
        } else {
            console.error(`FAILED. Status: ${res.status} ${res.statusText}`);
        }

    } catch (err: any) {
        console.error("Error:", err);
    }
}

testPresigned();
