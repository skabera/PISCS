const db = require('./db.js');
db.serialize(() => {
  db.each("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('districts', 'churches', 'users');", (err, row) => {
    console.log(row.name + ' schema: ' + row.sql);
  });
});
