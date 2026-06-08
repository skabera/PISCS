const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'piscs.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error('DB open error:', err.message);
    process.exit(1);
  }
  db.all("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }
    console.log('TABLES:');
    rows.forEach(r => console.log(r.name));
    const inv = rows.find(r => r.name === 'invitations');
    if (inv) {
      console.log('\nINVITATIONS DDL:\n' + inv.sql);
    } else {
      console.log('\nNO invitations TABLE FOUND');
    }
    const old = rows.find(r => r.name === 'invitations_old');
    if (old) {
      console.log('\nINVITATIONS_OLD DDL:\n' + old.sql);
    } else {
      console.log('\nNO invitations_old TABLE FOUND');
    }
    db.close();
  });
});
