import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

// New Credentials
const B2_KEY_ID = '24b12a36228d';
const B2_APPLICATION_KEY = '005d38614c310b62710bac7bed628d225aecda711f';

const REGIONS = [
    { id: 'us-west-000', endpoint: 'https://s3.us-west-000.backblazeb2.com' },
    { id: 'us-west-001', endpoint: 'https://s3.us-west-001.backblazeb2.com' },
    { id: 'us-west-002', endpoint: 'https://s3.us-west-002.backblazeb2.com' },
    { id: 'us-east-003', endpoint: 'https://s3.us-east-003.backblazeb2.com' }, // Sometimes exists?
    { id: 'us-east-004', endpoint: 'https://s3.us-east-004.backblazeb2.com' },
    { id: 'us-east-005', endpoint: 'https://s3.us-east-005.backblazeb2.com' },
    { id: 'eu-central-003', endpoint: 'https://s3.eu-central-003.backblazeb2.com' }
];

async function findBucket() {
    console.log("Searching for correct B2 Region...");

    for (const region of REGIONS) {
        console.log(`Testing ${region.id}...`);

        const s3 = new S3Client({
            endpoint: region.endpoint,
            region: region.id,
            credentials: {
                accessKeyId: B2_KEY_ID,
                secretAccessKey: B2_APPLICATION_KEY
            }
        });

        try {
            const data = await s3.send(new ListBucketsCommand({}));
            console.log(`SUCCESS! Found valid region: ${region.id}`);
            console.log(`Endpoint: ${region.endpoint}`);
            if (data.Buckets) {
                console.log("Buckets:", data.Buckets.map(b => b.Name).join(", "));
            }
            return; // Stop after success
        } catch (err: any) {
            // console.log(`Failed ${region.id}: ${err.name} - ${err.message}`);
            if (err.name === 'InvalidAccessKeyId') {
                console.log(`- ${region.id}: Invalid Key (Wrong Cluster)`);
            } else {
                console.log(`- ${region.id}: Error ${err.name} ${err.message}`);
            }
        }
    }
    console.log("All regions failed.");
}

findBucket();
