
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api'; // Testing locally first

async function checkAttendanceFormat() {
    console.log('Fetching attendance...');
    const res = await fetch(`${BASE_URL}/attendance`);
    if (!res.ok) {
        console.error('Failed to fetch attendance:', await res.text());
        return;
    }

    const attendance = await res.json();
    if (attendance.length === 0) {
        console.log('No attendance records found. Creating one...');
        // Create dummy record
        await fetch(`${BASE_URL}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workerId: 'temp-worker-id', // Needs valid UUID usually, but let's see if DB accepts
                date: '2026-02-11',
                status: 'PRESENT',
                siteId: null,
                punchInTime: new Date().toISOString()
            })
        });
        // Fetch again
        const res2 = await fetch(`${BASE_URL}/attendance`);
        const attendance2 = await res2.json();
        console.log('First record date format:', attendance2[0]?.date);
        console.log('Type of date:', typeof attendance2[0]?.date);
    } else {
        console.log('First record date format:', attendance[0].date);
        console.log('Full record:', attendance[0]);
    }
}

checkAttendanceFormat().catch(console.error);
