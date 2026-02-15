import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const B2_KEY_ID = '00524b12a36228d0000000001';
const B2_APPLICATION_KEY = 'K005DE/9cgfWi7nRJjxjdlY8E1fq93M';
const B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = 'us-east-005';

async function testB2() {
    console.log("Starting B2 Connection Test (New Credentials)...");
    console.log("Endpoint:", B2_ENDPOINT);
    console.log("Region:", B2_REGION);
    console.log("Key ID:", B2_KEY_ID);
    console.log("App Key (Length):", B2_APPLICATION_KEY.length);

    const s3 = new S3Client({
        endpoint: B2_ENDPOINT,
        region: B2_REGION,
        credentials: {
            accessKeyId: B2_KEY_ID.trim(),
            secretAccessKey: B2_APPLICATION_KEY.trim()
        }
    });

    try {
        console.log("Attempting ListBuckets...");
        const data = await s3.send(new ListBucketsCommand({}));
        console.log("ListBuckets Success!");
        console.log("Buckets:", data.Buckets?.map(b => b.Name).join(", "));

        console.log("Attempting Upload...");
        const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        const buffer = Buffer.from(base64Image.split(',')[1], 'base64');

        await s3.send(new PutObjectCommand({
            Bucket: 'thulir-construction',
            Key: 'verify-test-new.png',
            Body: buffer,
            ContentType: 'image/png'
        }));
        console.log("Upload Success!");

    } catch (err: any) {
        console.error("B2 Error:", err.name, err.message);
    }
}

testB2();
