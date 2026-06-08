const fetch = require('node-fetch');

async function verify() {
  const baseUrl = 'http://localhost:5000/api';

  console.log('--- 1. Testing Registration without Token ---');
  try {
    const res = await fetch(`${baseUrl}/auth/register`, { method: 'POST' });
    console.log(`Status: ${res.status} (Expected: 401)`);
  } catch (e) { console.log('Server likely not running.'); return; }

  // Note: For full verification, we'd login as an admin first.
  // Since I don't have the admin password here (it's hashed in DB), 
  // I'll trust the logic if the manual test by user confirms.
}

verify();
