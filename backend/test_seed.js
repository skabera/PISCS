const db = require('../backend/db');
setTimeout(() => {
  console.log('Checking database status...');
  db.all("SELECT * FROM fields", (err, rows) => {
    if (err) console.error('Fields Error:', err);
    else console.log('Fields count:', rows.length);
  });
  db.all("SELECT * FROM districts", (err, rows) => {
    if (err) console.error('Districts Error:', err);
    else console.log('Districts count:', rows.length);
  });
  db.all("SELECT * FROM churches", (err, rows) => {
    if (err) console.error('Churches Error:', err);
    else console.log('Churches count:', rows.length);
  });
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) console.error('Users Error:', err);
    else {
      console.log('Users count:', rows.length);
      const roles = rows.map(r => r.role).reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
      console.log('Roles:', roles);
    }
  });
}, 5000);
