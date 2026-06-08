const db = require('./backend/db');
db.all("PRAGMA foreign_key_check", [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Foreign Key Check:', rows);
  process.exit(0);
});
