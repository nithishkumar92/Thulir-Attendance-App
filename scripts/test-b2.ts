import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

// Credentials provided by user
const B2_KEY_ID = '0054e11912d30745b1d31dca3c74da83e122c891c4'; // Application Key
const B2_KEY_NAME_ID = '24b12a36228d'; // Key ID
const B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = 'us-east-005';

async function findBucket() {
    console.log(`Connecting to B2 at ${B2_ENDPOINT}...`);

    const s3 = new S3Client({
        endpoint: B2_ENDPOINT,
        region: B2_REGION,
        credentials: {
            accessKeyId: B2_KEY_NAME_ID,
            secretAccessKey: B2_KEY_ID
        }
    });

    try {
        const data = await s3.send(new ListBucketsCommand({}));
        console.log("Success! Connected.");
        console.log("Buckets found:", data.Buckets?.length);
        if (data.Buckets && data.Buckets.length > 0) {
            data.Buckets.forEach(b => {
                console.log(`- Name: ${b.Name}`);
            });
        } else {
            console.log("No buckets found in this account.");
        }
    } catch (err: any) {
        console.error("Connection Failed:", err);
    }
}

findBucket();
