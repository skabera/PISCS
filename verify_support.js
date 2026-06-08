const db = require('./backend/db');
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='support_requests'", [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Tables:', rows);
  process.exit(0);
});
