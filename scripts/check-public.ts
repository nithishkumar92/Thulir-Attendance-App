import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Credentials (verified working)
const B2_KEY_ID = '00524b12a36228d0000000001';
const B2_APPLICATION_KEY = 'K005DE/9cgfWi7nRJjxjdlY8E1fq93M';
const B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = 'us-east-005';
const B2_BUCKET_NAME = 'thulir-construction';

async function checkPublicAccess() {
    console.log("Checking Public Access...");

    const s3 = new S3Client({
        endpoint: B2_ENDPOINT,
        region: B2_REGION,
        credentials: {
            accessKeyId: B2_KEY_ID,
            secretAccessKey: B2_APPLICATION_KEY
        }
    });

    try {
        // 1. Upload a test file
        const fileName = `public-test-${Date.now()}.txt`;
        console.log(`Uploading ${fileName}...`);

        await s3.send(new PutObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: fileName,
            Body: "Hello World",
            ContentType: "text/plain"
        }));

        // 2. Construct Public URL
        const publicUrl = `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileName}`;
        console.log(`Public URL: ${publicUrl}`);

        // 3. Try to Fetch it
        console.log("Attempting to download via HTTP...");
        const res = await fetch(publicUrl);

        if (res.ok) {
            console.log("SUCCESS! File is publicly accessible.");
            console.log("Content:", await res.text());
        } else {
            console.error(`FAILED. HTTP Generic Status: ${res.status} ${res.statusText}`);
            if (res.status === 403) {
                console.error("403 Forbidden -> The Bucket is PRIVATE.");
            }
        }

    } catch (err: any) {
        console.error("Error:", err);
    }
}

checkPublicAccess();
