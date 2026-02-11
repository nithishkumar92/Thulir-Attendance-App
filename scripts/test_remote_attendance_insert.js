
import fetch from 'node-fetch';

const BASE_URL = 'https://thulir-attendance-app.vercel.app/api';


async function testInsert() {
    console.log('1. Creating Temp Worker...');
    const workerRes = await fetch(`${BASE_URL}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Date Test Worker',
            role: 'Tester',
            teamId: null,
            dailyWage: 500,
            wageType: 'day',
            phoneNumber: '9998887776',
            isActive: true
        })
    });

    if (!workerRes.ok) {
        console.error('Failed to create worker:', await workerRes.text());
        return;
    }
    const worker = await workerRes.json();
    console.log('Worker created:', worker.id);

    const targetDate = '2026-02-11';
    console.log(`2. Attempting to insert record for date: ${targetDate}`);

    const res = await fetch(`${BASE_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workerId: worker.id,
            date: targetDate,
            status: 'PRESENT',
            siteId: null,
            punchInTime: new Date().toISOString()
        })
    });

    if (!res.ok) {
        console.error('Failed to create record:', await res.text());
        // cleanup worker
        await fetch(`${BASE_URL}/workers?id=${worker.id}`, { method: 'DELETE' });
        return;
    }

    const record = await res.json();
    console.log('Record created!');
    console.log(`Sent Date: ${targetDate}`);
    console.log(`Returned Date: ${record.date}`);

    if (record.date === targetDate) {
        console.log('SUCCESS: Date matches.');
    } else {
        console.error(`FAILURE: Date does not match. Expected ${targetDate}, got ${record.date}`);
    }

    // Cleanup
    console.log('Cleaning up worker...');
    await fetch(`${BASE_URL}/workers?id=${worker.id}`, { method: 'DELETE' });
    // Attendance cascades? Or manual delete?
    // If not cascase, we leave bad data. But it's test worker.
}


testInsert().catch(console.error);
