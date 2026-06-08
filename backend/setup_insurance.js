// Setup script to add insurance documents table and functionality
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'piscs.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to PISCS database');
    setupInsuranceTable();
  }
});

function setupInsuranceTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS insurance_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitation_id INTEGER NOT NULL,
      preacher_id INTEGER NOT NULL,
      uploaded_by_pastor_id INTEGER NOT NULL,
      document_url TEXT NOT NULL,
      document_type TEXT DEFAULT 'insurance' CHECK(document_type IN ('insurance', 'health', 'liability')),
      file_name TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id),
      FOREIGN KEY (preacher_id) REFERENCES users(id),
      FOREIGN KEY (uploaded_by_pastor_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating insurance_documents table:', err.message);
    } else {
      console.log('✅ insurance_documents table created/verified');
    }
    
    // Also add service_end_date column to invitations if not exists
    db.run('ALTER TABLE invitations ADD COLUMN service_end_date TEXT', (err) => {
      if (!err || (err && err.message.includes('duplicate column'))) {
        console.log('✅ invitations table verified');
      }
    });
    
    db.close();
  });
}
