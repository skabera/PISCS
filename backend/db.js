const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'piscs.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database open error:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

db.run('PRAGMA foreign_keys = ON');

function initializeDatabase() {
  db.serialize(() => {
    // Unions
    db.run(`CREATE TABLE IF NOT EXISTS unions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`);

    // Fields
    db.run(`CREATE TABLE IF NOT EXISTS fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      union_id INTEGER,
      area TEXT DEFAULT '',
      location TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      pobox TEXT DEFAULT '',
      office_hours TEXT DEFAULT '',
      FOREIGN KEY (union_id) REFERENCES unions(id)
    )`);

    // Districts
    db.run(`CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      field_id INTEGER,
      pastor_id INTEGER,
      FOREIGN KEY (field_id) REFERENCES fields(id)
    )`);

    // Churches
    db.run(`CREATE TABLE IF NOT EXISTS churches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      district_id INTEGER,
      field_id INTEGER,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      status TEXT DEFAULT 'active'
    )`);

    // Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      plain_password TEXT,
      role TEXT NOT NULL,
      field_id INTEGER,
      district_id INTEGER,
      church_id INTEGER,
      church_name TEXT,
      phone TEXT,
      specialty TEXT,
      profile_pic TEXT,
      availability_status TEXT DEFAULT 'available',
      is_archived INTEGER DEFAULT 0,
      last_login TEXT,
      FOREIGN KEY (field_id) REFERENCES fields(id)
    )`);

    // Pastor leave dates
    db.run(`CREATE TABLE IF NOT EXISTS pastor_leave_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      leave_date TEXT NOT NULL,
      reason TEXT DEFAULT 'Unavailable',
      UNIQUE(user_id, leave_date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Invitations — includes service_end_date from the start
    db.run(`CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requesting_pastor_id INTEGER,
      target_user_id INTEGER,
      is_admin_created INTEGER DEFAULT 0,
      service_date TEXT,
      service_end_date TEXT,
      service_type TEXT,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'pending_field1_secretary',
      pastor_note TEXT DEFAULT '',
      field1_secretary_note TEXT,
      field2_secretary_note TEXT,
      preacher_note TEXT,
      district_pastor_note TEXT,
      pastor_return_comment TEXT,
      preacher_experience_note TEXT,
      preacher_rating INTEGER,
      attachment_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requesting_pastor_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating invitations table:', err.message);
      } else {
        // Migration: add service_end_date if this is an existing DB that predates it
        db.run('ALTER TABLE invitations ADD COLUMN service_end_date TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Migration error (service_end_date):', err.message);
          }
        });
      }
    });

    // Notifications
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      invitation_id INTEGER,
      notification_type TEXT DEFAULT 'general',
      title TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Audit logs
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Support requests
    db.run(`CREATE TABLE IF NOT EXISTS support_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      admin_reply TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Insurance documents
    db.run(`CREATE TABLE IF NOT EXISTS insurance_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitation_id INTEGER NOT NULL,
      preacher_id INTEGER NOT NULL,
      uploaded_by_pastor_id INTEGER NOT NULL,
      document_url TEXT NOT NULL,
      document_type TEXT DEFAULT 'insurance',
      file_name TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id),
      FOREIGN KEY (preacher_id) REFERENCES users(id)
    )`);

    // Health centers
    db.run(`CREATE TABLE IF NOT EXISTS health_centers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      field_id INTEGER,
      FOREIGN KEY (field_id) REFERENCES fields(id)
    )`);
  });
}

module.exports = db;