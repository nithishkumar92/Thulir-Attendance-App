
import fetch from 'node-fetch';

const BASE_URL = 'https://thulir-attendance-app.vercel.app/api';

async function checkAttendanceFormat() {
    console.log('Fetching attendance from REMOTE...');
    const res = await fetch(`${BASE_URL}/attendance`);
    if (!res.ok) {
        console.error('Failed to fetch attendance:', await res.text());
        return;
    }

    const attendance = await res.json();
    if (attendance.length === 0) {
        console.log('No attendance records found.');
    } else {
        console.log('First record date format:', attendance[0].date);
        console.log('Full record:', attendance[0]);
    }
}

checkAttendanceFormat().catch(console.error);
