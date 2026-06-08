const db = require('./backend/db');
db.get("PRAGMA integrity_check", [], (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Integrity check:', row);
  process.exit(0);
});
