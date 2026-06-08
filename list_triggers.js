const db = require('./backend/db');
db.all("SELECT name, sql FROM sqlite_master WHERE type='trigger'", [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Triggers:', rows);
  process.exit(0);
});
