const db = require('./backend/db');
db.all("SELECT name FROM sqlite_master WHERE type='view'", [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Views:', rows);
  process.exit(0);
});
