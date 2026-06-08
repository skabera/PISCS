const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./piscs.db', sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error('DB open error:', err.message);
    process.exit(1);
  }
  db.all("SELECT i.id, i.status, i.target_user_id, u.name as target_name FROM invitations i JOIN users u ON i.target_user_id = u.id WHERE i.status = 'pending_preacher_confirmation' ORDER BY i.id", (err, rows) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }
    console.log('Pending preacher confirmations:', rows);
    db.close();
  });
});