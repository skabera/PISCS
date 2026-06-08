const db = require('./backend/db');
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='invitations'", [], (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Invitations Schema:', row ? row.sql : 'NOT FOUND');
  process.exit(0);
});
