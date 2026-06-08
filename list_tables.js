const db = require('./backend/db');
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Existing tables:', rows.map(r => r.name));
  process.exit(0);
});
