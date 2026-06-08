const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function verifySupportFlow() {
  try {
    console.log('--- Logging in as Pastor ---');
    const pastorLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'john@piscs.rw',
      password: 'password123'
    });
    const pastorToken = pastorLogin.data.token;
    console.log('Pastor Login Success');

    console.log('--- Submitting Support Request ---');
    const supportReq = await axios.post(`${API_URL}/support`, {
      subject: 'Test Ticket 1',
      message: 'This is a test support message.'
    }, {
      headers: { Authorization: `Bearer ${pastorToken}` }
    });
    const requestId = supportReq.data.id;
    console.log(`Support Request Submitted (ID: ${requestId})`);

    console.log('--- Logging in as Admin ---');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@piscs.rw',
      password: 'password123'
    });
    const adminToken = adminLogin.data.token;
    console.log('Admin Login Success');

    console.log('--- Admin Replying to Request ---');
    const reply = await axios.patch(`${API_URL}/support/${requestId}/reply`, {
      admin_reply: 'Hello, your request is being handled.'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Admin Reply Success');

    console.log('--- Verifying Feedback for User ---');
    const myRequests = await axios.get(`${API_URL}/support/my-requests`, {
      headers: { Authorization: `Bearer ${pastorToken}` }
    });
    const recentRequest = myRequests.data.find(r => r.id === requestId);
    if (recentRequest && recentRequest.admin_reply === 'Hello, your request is being handled.') {
      console.log('VERIFICATION SUCCESS: Support flow confirmed.');
    } else {
      console.log('VERIFICATION FAILED: Reply not found or mismatch.');
    }

  } catch (error) {
    console.error('VERIFICATION ERROR:', error.response ? error.response.data : error.message);
  }
}

verifySupportFlow();
