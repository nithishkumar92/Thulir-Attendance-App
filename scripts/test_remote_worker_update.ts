
import fetch from 'node-fetch';

const BASE_URL = 'https://thulir-attendance-app.vercel.app/api';

async function testWorkerUpdate() {
    console.log('1. Creating a temporary worker...');
    const createRes = await fetch(`${BASE_URL}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Worker',
            role: 'Helper',
            dailyWage: 500,
            phoneNumber: '9999999999',
            wageType: 'DAILY'
        })
    });

    if (!createRes.ok) {
        console.error('Failed to create worker:', await createRes.text());
        return;
    }

    const worker = await createRes.json();
    console.log('Worker created:', worker.id);

    console.log('2. Updating worker (Team, Role, Photo)...');
    const updateRes = await fetch(`${BASE_URL}/workers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: worker.id,
            name: 'Test Worker Updated',
            role: 'Mason',
            teamId: null, // Test unassigning or assigning if we had a team ID
            photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Small red dot
            isActive: true
        })
    });

    if (!updateRes.ok) {
        console.error('Failed to update worker:', await updateRes.text());
    } else {
        const updatedWorker = await updateRes.json();
        console.log('Update successful!');
        console.log('Updated Name:', updatedWorker.name);
        console.log('Updated Role:', updatedWorker.role);
        console.log('Updated Photo Length:', updatedWorker.photoUrl?.length);
    }

    console.log('3. Cleaning up (Deleting worker)...');
    const deleteRes = await fetch(`${BASE_URL}/workers?id=${worker.id}`, {
        method: 'DELETE'
    });

    if (deleteRes.ok) {
        console.log('Worker deleted.');
    } else {
        console.error('Failed to delete worker:', await deleteRes.text());
    }
}

testWorkerUpdate().catch(console.error);
