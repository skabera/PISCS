const db = require('./db.js');
db.serialize(() => {
  db.all("SELECT * FROM districts", (err, districts) => {
    if (err) console.error(err);
    console.log("Districts:");
    console.table(districts);
  });
  db.all("SELECT id, name, role, district_id, church_id FROM users WHERE role='pastor'", (err, pastors) => {
    if (err) console.error(err);
    console.log("Pastors:");
    console.table(pastors);
  });
});
