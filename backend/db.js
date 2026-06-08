const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'piscs.db');

// Open or create the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database open error:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

module.exports = db;
