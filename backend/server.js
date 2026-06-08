require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const multer = require('multer');
const path = require('path');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// --- PRO SECURITY & UTILITIES ---

// Simple Manual Rate Limiter
const rateLimitMap = new Map();
const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  if (!rateLimitMap.has(ip)) { rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); return next(); }
  const data = rateLimitMap.get(ip);
  if (now > data.resetTime) { rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); return next(); }
  if (data.count >= 30) return res.status(429).json({ error: 'Too many requests' });
  data.count++; next();
};

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- DB MIGRATIONS ---
// Safely add service_end_date to invitations if it doesn't exist yet
db.run('ALTER TABLE invitations ADD COLUMN service_end_date TEXT', (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Migration error (service_end_date):', err.message);
  }
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUDIT LOG HELPER ---
const logAudit = (userId, action, details) => {
  db.run(`INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)`, [userId, action, JSON.stringify(details)], (err) => {
    if (err) console.error('Audit Log Error:', err);
  });
};

// --- ADMIN SECURITY ROUTES ---
app.get('/api/admin/audit-logs', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  db.all(`
    SELECT al.*, u.name as user_name, u.role as user_role 
    FROM audit_logs al 
    LEFT JOIN users u ON al.user_id = u.id 
    ORDER BY al.timestamp DESC 
    LIMIT 200
  `, [], (err, logs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(logs);
  });
});

app.post('/api/admin/audit-logs', authenticateToken, (req, res) => {
  const { action, details } = req.body;
  if (!action) return res.status(400).json({ error: 'Action is required' });
  logAudit(req.user.id, action, details || {});
  res.json({ message: 'Audit log recorded' });
});

app.get('/api/admin/sessions', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  db.all(`
    SELECT id, name, email, role, last_login, is_archived 
    FROM users 
    WHERE last_login IS NOT NULL OR role = 'admin'
    ORDER BY last_login DESC
  `, [], (err, sessions) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(sessions);
  });
});

// --- AUTH ROUTES ---

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get(`
    SELECT u.*, f.name as field_name, d.name as district_name 
    FROM users u 
    LEFT JOIN fields f ON u.field_id = f.id 
    LEFT JOIN districts d ON u.district_id = d.id 
    WHERE u.email = ?
  `, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'User not found' });

    if (password) {
      const validPass = await bcrypt.compare(password, user.password);
      if (!validPass) return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, field_id: user.field_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Update last login
    const now = new Date().toISOString();
    db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);
    logAudit(user.id, 'LOGIN', { ip: req.ip, user_agent: req.headers['user-agent'] });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        field_id: user.field_id,
        field_name: user.field_name,
        district_id: user.district_id,
        district_name: user.district_name,
        profile_pic: user.profile_pic
      }
    });
  });
});

// User Registration
app.post('/api/auth/register', authenticateToken, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const isPastor = req.user.role === 'pastor';

  if (!isAdmin && !isPastor) {
    return res.status(403).json({ error: 'Access denied: Only admins or pastors can register users' });
  }

  const { name, email, password, role, field_id, district_id, church_id, church_name, phone, specialty } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing required fields' });

  const registerUser = async () => {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (name, email, password, plain_password, role, field_id, district_id, church_id, church_name, phone, specialty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, password, role, field_id || null, district_id || null, church_id || null, church_name || null, phone || null, specialty || null],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'User registered' });
      }
    );
  };

  if (isPastor) {
    if (role !== 'preacher') {
      return res.status(403).json({ error: 'Access denied: Pastors can only register preacher accounts' });
    }

    db.get('SELECT district_id FROM users WHERE id = ?', [req.user.id], async (err, pastor) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!pastor || pastor.district_id != district_id) {
        return res.status(403).json({ error: 'Access denied: You can only create preachers for your own district' });
      }
      registerUser();
    });
  } else {
    registerUser();
  }
});

// ── Lightweight preacher list (pastor + admin) ────────────────────────────
// FIX: /api/users?role=preacher was admin-only, so pastors got 403 and
// PreacherAvailability rendered an empty list. This endpoint returns only
// the fields the component needs and is accessible to pastors too.
// Must be registered BEFORE the admin-gated /api/users route below.
app.get('/api/preachers', authenticateToken, (req, res) => {
  const { role } = req.user;
  if (role !== 'pastor' && role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all(
    `SELECT id, name, phone, church_name, specialty
     FROM users
     WHERE role = 'preacher'
       AND is_archived = 0
     ORDER BY name ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});
// ─────────────────────────────────────────────────────────────────────────

// List Users (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const { role, church_id, field_id } = req.query;

  let query = 'SELECT id, name, email, role, field_id, district_id, church_id, phone, profile_pic, church_name, specialty, plain_password, is_archived, availability_status FROM users';
  const params = [];

  const conditions = [];
  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (church_id) {
    conditions.push('church_id = ?');
    params.push(church_id);
  }
  if (field_id) {
    conditions.push('field_id = ?');
    params.push(field_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Update User (Profile or Admin Edit)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const targetId = parseInt(req.params.id);

  if (req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { name, phone, specialty, church_name, availability_status, profile_pic, password, email, field_id, district_id, church_id, leave_dates } = req.body;

  const normalizedFieldId = field_id === '' ? null : field_id;
  const normalizedDistrictId = district_id === '' ? null : district_id;
  const normalizedChurchId = church_id === '' ? null : church_id;

  let query = 'UPDATE users SET name = ?';
  let params = [name];

  if (phone !== undefined) { query += ', phone = ?'; params.push(phone); }
  if (specialty !== undefined) { query += ', specialty = ?'; params.push(specialty); }
  if (church_name !== undefined) { query += ', church_name = ?'; params.push(church_name); }
  if (availability_status !== undefined) { query += ', availability_status = ?'; params.push(availability_status); }
  if (profile_pic !== undefined) { query += ', profile_pic = ?'; params.push(profile_pic); }
  if (email !== undefined) { query += ', email = ?'; params.push(email); }
  if (field_id !== undefined) { query += ', field_id = ?'; params.push(normalizedFieldId); }
  if (district_id !== undefined) { query += ', district_id = ?'; params.push(normalizedDistrictId); }
  if (church_id !== undefined) { query += ', church_id = ?'; params.push(normalizedChurchId); }

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    query += ', password = ?, plain_password = ?';
    params.push(hashedPassword, password);
  }

  query += ' WHERE id = ?';
  params.push(targetId);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAudit(req.user.id, 'USER_UPDATE', { target_id: targetId, fields: Object.keys(req.body).filter(k => k !== 'password') });

    const syncLeaveDates = (callback) => {
      if (!Array.isArray(leave_dates)) return callback();

      const normalizedDates = Array.from(new Set(
        leave_dates
          .filter((date) => typeof date === 'string' && date.trim())
          .map((date) => date.trim())
      )).sort();

      db.run('DELETE FROM pastor_leave_dates WHERE user_id = ?', [targetId], (deleteErr) => {
        if (deleteErr) return callback(deleteErr);
        if (normalizedDates.length === 0) return callback();

        const insertDate = (index) => {
          if (index >= normalizedDates.length) return callback();
          const date = normalizedDates[index];
          db.run(
            'INSERT OR IGNORE INTO pastor_leave_dates (user_id, leave_date, reason) VALUES (?, ?, ?)',
            [targetId, date, 'Unavailable'],
            (insertErr) => {
              if (insertErr) return callback(insertErr);
              insertDate(index + 1);
            }
          );
        };

        insertDate(0);
      });
    };

    syncLeaveDates((syncErr) => {
      if (syncErr) return res.status(500).json({ error: syncErr.message });

      db.get('SELECT id, name, email, role, field_id, district_id, church_id, phone, profile_pic, church_name, specialty, availability_status FROM users WHERE id = ?', [targetId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT leave_date FROM pastor_leave_dates WHERE user_id = ? ORDER BY leave_date ASC', [targetId], (leaveErr, leaveRows) => {
          if (leaveErr) return res.status(500).json({ error: leaveErr.message });
          user.leave_dates = Array.isArray(leaveRows) ? leaveRows.map((row) => row.leave_date) : [];
          res.json({ message: 'User updated', user });
        });
      });
    });
  });
});

// --- DIRECTORY ROUTES ---

// Unified Pastor Directory (with filters)
app.get('/api/directory/pastors', authenticateToken, (req, res) => {
  const { field_id, district_id, church_id, specialty, search } = req.query;
  const { id: currentUserId } = req.user;

  let query = `
    SELECT u.id, u.name, u.email, u.role, u.field_id, f.name as field_name, 
           u.district_id, d.name as district_name, u.church_id, c.name as church_name_assigned,
           COALESCE(c.name, u.church_name) as display_church,
           u.specialty, u.phone, u.availability_status 
    FROM users u 
    LEFT JOIN fields f ON u.field_id = f.id 
    LEFT JOIN districts d ON u.district_id = d.id
    LEFT JOIN churches c ON u.church_id = c.id
    WHERE u.role IN ('pastor', 'preacher') AND u.id != ? AND u.is_archived = 0
  `;
  let params = [currentUserId];

  if (field_id) {
    query += ' AND u.field_id = ?';
    params.push(field_id);
  }
  if (district_id) {
    query += ' AND u.district_id = ?';
    params.push(district_id);
  }
  if (church_id) {
    query += ' AND u.church_id = ?';
    params.push(church_id);
  }
  if (specialty) {
    query += ' AND u.specialty LIKE ?';
    params.push(`%${specialty}%`);
  }
  if (search) {
    query += ' AND (u.name LIKE ? OR u.church_name LIKE ? OR u.specialty LIKE ? OR d.name LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY u.name ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get secretary(ies) assigned to a given field
app.get('/api/fields/:id/secretaries', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, name, email, phone FROM users WHERE role = ? AND field_id = ?',
    ['secretary', req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});


// Create Invitation (Supports File Upload)
app.post('/api/invitations', authenticateToken, upload.single('attachment'), (req, res) => {
  const { role, id: authUserId } = req.user;
  if (role !== 'pastor' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  const {
    requesting_pastor_id,
    target_user_id,
    service_date,
    service_end_date,
    service_type,
    priority,
    pastor_note
  } = req.body;

  if (!target_user_id || !service_date || !service_type) {
    return res.status(400).json({ error: 'Missing required invitation fields' });
  }

  const finalRequesterId = role === 'admin' ? requesting_pastor_id : authUserId;
  const attachment_url = req.file ? `/uploads/${req.file.filename}` : '';
  const endDate = service_end_date || null;

  let conflictQuery, conflictParams;
  if (endDate) {
    conflictQuery = `
      SELECT id FROM invitations
      WHERE target_user_id = ?
        AND status NOT IN ('rejected', 'cancelled')
        AND service_date <= ?
        AND COALESCE(service_end_date, service_date) >= ?
    `;
    conflictParams = [target_user_id, endDate, service_date];
  } else {
    conflictQuery = `
      SELECT id FROM invitations
      WHERE target_user_id = ?
        AND status NOT IN ('rejected', 'cancelled')
        AND service_date <= ?
        AND COALESCE(service_end_date, service_date) >= ?
    `;
    conflictParams = [target_user_id, service_date, service_date];
  }

  db.get(conflictQuery, conflictParams, (err, conflict) => {
    if (err) return res.status(500).json({ error: err.message });
    if (conflict) {
      const msg = endDate
        ? 'Preacher already has a mission that overlaps with the selected date range.'
        : 'Preacher already has a mission on this date.';
      return res.status(400).json({ error: msg });
    }

    db.run(
      `INSERT INTO invitations
        (requesting_pastor_id, target_user_id, is_admin_created, service_date, service_end_date, service_type, priority, pastor_note, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalRequesterId, target_user_id, role === 'admin' ? 1 : 0, service_date, endDate, service_type, priority || 'Medium', pastor_note || '', attachment_url],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(authUserId, 'INVITATION_CREATE', { invitation_id: this.lastID, target_user_id, service_end_date: endDate });
        res.json({ id: this.lastID, status: 'pending_field1_secretary', attachment_url, service_end_date: endDate });
      }
    );
  });
});

// Get User's Invitations
app.get('/api/invitations', authenticateToken, (req, res) => {
  const { role, id, field_id } = req.user;
  const baseQuery = `
    SELECT 
      i.*, 
      tu.name as preacher_name, 
      tu.specialty as preacher_specialty, 
      u.name as pastor_name, 
      f_tu.name as preacher_field_name,
      d_tu.name as preacher_district_name,
      c_tu.name as preacher_church_name,
      f_u.name as requester_field_name,
      d_u.name as requester_district_name,
      s_u.name as requester_secretary_name,
      s_u.email as requester_secretary_email,
      s_u.phone as requester_secretary_phone,
      s_tu.name as target_secretary_name,
      s_tu.email as target_secretary_email,
      s_tu.phone as target_secretary_phone
    FROM invitations i 
    LEFT JOIN users tu ON i.target_user_id = tu.id
    LEFT JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f_tu ON tu.field_id = f_tu.id
    LEFT JOIN districts d_tu ON tu.district_id = d_tu.id
    LEFT JOIN churches c_tu ON tu.church_id = c_tu.id
    LEFT JOIN fields f_u ON u.field_id = f_u.id
    LEFT JOIN districts d_u ON u.district_id = d_u.id
    LEFT JOIN users s_u ON s_u.field_id = u.field_id AND s_u.role = 'secretary'
    LEFT JOIN users s_tu ON s_tu.field_id = tu.field_id AND s_tu.role = 'secretary'
  `;

  let query = baseQuery;
  let params = [];

  if (role === 'pastor' || role === 'preacher') {
    query += ' WHERE i.requesting_pastor_id = ? OR i.target_user_id = ?';
    params = [id, id];
  } else if (role === 'secretary') {
    query += ' WHERE u.field_id = ? OR tu.field_id = ? OR i.is_admin_created = 1';
    params = [field_id, field_id];
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Helper: create an in-app notification
function notify(userId, invitationId, title, message) {
  db.run(
    'INSERT INTO notifications (user_id, invitation_id, title, message) VALUES (?, ?, ?, ?)',
    [userId, invitationId, title, message]
  );
}

// Helper: get all secretary user IDs for a given field
function notifySecretariesOfField(fieldId, invitationId, title, message) {
  db.all('SELECT id FROM users WHERE role = ? AND field_id = ?', ['secretary', fieldId], (err, rows) => {
    if (err || !rows) return;
    rows.forEach(s => notify(s.id, invitationId, title, message));
  });
}

// Helper: notify all system administrators
function notifyAdmins(invitationId, title, message) {
  db.all('SELECT id FROM users WHERE role = ?', ['admin'], (err, rows) => {
    if (err || !rows) return;
    rows.forEach(a => notify(a.id, invitationId, title, message));
  });
}

// Update Status (with in-app notifications)
app.patch('/api/invitations/:id/status', authenticateToken, (req, res) => {
  const { status, note } = req.body;
  const { role, field_id, id: userId } = req.user;
  const invitationId = parseInt(req.params.id);

  db.get(`
    SELECT i.*,
      tu.field_id as target_field_id, tu.name as target_name, tu.district_id as preacher_district_id,
      u.field_id as pastor_field_id, u.name as pastor_name,
      d.pastor_id as preacher_district_pastor_id
    FROM invitations i
    JOIN users tu ON i.target_user_id = tu.id
    JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN districts d ON tu.district_id = d.id
    WHERE i.id = ?
  `, [invitationId], (err, inv) => {
    if (err || !inv) return res.status(404).json({ error: 'Invitation not found' });

    let updateQuery = '';
    let params = [];

    if (status === 'pending_field2_secretary') {
      if (role === 'admin' || (role === 'secretary' && field_id === inv.pastor_field_id && inv.status === 'pending_field1_secretary')) {
        updateQuery = 'UPDATE invitations SET status = ?, field1_secretary_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      }
    } else if (status === 'pending_preacher_confirmation') {
      if (role === 'admin' || (role === 'secretary' && field_id === inv.target_field_id && inv.status === 'pending_field2_secretary')) {
        updateQuery = 'UPDATE invitations SET status = ?, field2_secretary_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      }
    } else if (status === 'pending_district_pastor_approval') {
      if (role === 'admin' || ((role === 'preacher' || role === 'pastor') && userId === inv.target_user_id && inv.status === 'pending_preacher_confirmation')) {
        updateQuery = 'UPDATE invitations SET status = ?, preacher_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      }
    } else if (status === 'approved' || status === 'rejected') {
      if (role === 'admin') {
        updateQuery = 'UPDATE invitations SET status = ?, preacher_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      } else if ((role === 'preacher' || role === 'pastor') && userId === inv.target_user_id && inv.status === 'pending_preacher_confirmation') {
        updateQuery = 'UPDATE invitations SET status = ?, preacher_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      } else if (role === 'pastor' && userId === inv.preacher_district_pastor_id && inv.status === 'pending_district_pastor_approval') {
        updateQuery = 'UPDATE invitations SET status = ?, district_pastor_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      } else if (role === 'secretary' && field_id === inv.target_field_id && inv.status === 'pending_field2_secretary') {
        updateQuery = 'UPDATE invitations SET status = ?, preacher_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      }
    } else if (status === 'completed') {
      if (role === 'admin' || (role === 'pastor' && userId === inv.target_user_id && inv.status === 'approved')) {
        updateQuery = 'UPDATE invitations SET status = ? WHERE id = ?';
        params = [status, invitationId];
      }
    } else if (status === 'cancelled') {
      if (role === 'admin' || (role === 'pastor' && userId === inv.requesting_pastor_id && inv.status === 'pending_field1_secretary')) {
        updateQuery = 'UPDATE invitations SET status = ?, pastor_note = ? WHERE id = ?';
        params = [status, note, invitationId];
      }
    }

    if (!updateQuery) return res.status(403).json({ error: 'Unauthorized transition or insufficient permissions' });

    db.run(updateQuery, params, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logAudit(req.user.id, 'INVITATION_STATUS_CHANGE', { invitation_id: invitationId, new_status: status });

      const serviceDate = inv.service_date ? new Date(inv.service_date).toLocaleDateString('en-GB') : '—';
      const refId = `#${invitationId.toString().padStart(4, '0')}`;

      if (status === 'pending_field2_secretary') {
        notify(inv.requesting_pastor_id, invitationId,
          '📤 Invitation Progressing',
          `Your invitation ${refId} for ${serviceDate} has been approved by your field secretary and is now with the invited pastor's field for review.`);
        notifySecretariesOfField(inv.target_field_id, invitationId,
          '📋 New Invitation for Your Review',
          `An invitation ${refId} from ${inv.pastor_name} requesting ${inv.target_name} for ${serviceDate} needs your review.`);
        notifyAdmins(invitationId,
          '📤 Mission Flow: Sec 1 Approved',
          `Mission ${refId}: Field 1 secretary for ${inv.pastor_name} has approved. Now with Field 2 secretary.`);

      } else if (status === 'pending_preacher_confirmation') {
        notify(inv.requesting_pastor_id, invitationId,
          '✅ Field Secretary Approved',
          `Good news! The invited pastor's field secretary has approved invitation ${refId} for ${serviceDate}. Awaiting ${inv.target_name}'s confirmation.`);
        notify(inv.target_user_id, invitationId,
          '📩 You Have a Mission Invitation',
          `${inv.pastor_name} has invited you for a mission service on ${serviceDate}. Your field secretary has approved it. Please confirm or decline.`);
        notifySecretariesOfField(inv.pastor_field_id, invitationId,
          '🔔 Invitation Approved — Awaiting Pastor',
          `Invitation ${refId} has been approved by both field secretaries and is now awaiting ${inv.target_name}'s confirmation.`);
        notifyAdmins(invitationId,
          '✅ Mission Flow: Both Secretaries Approved',
          `Mission ${refId} has been cleared by both field secretaries. Awaiting response from Pr. ${inv.target_name}.`);

      } else if (status === 'pending_district_pastor_approval') {
        notify(inv.preacher_district_pastor_id, invitationId,
          '📬 Preacher Accepted — District Pastor Review Required',
          `${inv.target_name} has accepted invitation ${refId} for ${serviceDate}. Please review and approve from the district level.`);
        notify(inv.requesting_pastor_id, invitationId,
          '📬 Preacher Accepted — Awaiting District Approval',
          `Your invited preacher ${inv.target_name} has accepted invitation ${refId}. Awaiting approval from the district pastor.`);
        notifySecretariesOfField(inv.target_field_id, invitationId,
          '📬 Preacher Accepted — District Pastor Review',
          `${inv.target_name} has accepted invitation ${refId}. Your district pastor now needs to confirm the mission.`);
        notifyAdmins(invitationId,
          '📬 Preacher Approved — District Review',
          `Mission ${refId} has been accepted by the preacher and is pending district pastor approval.`);

      } else if (status === 'approved' && inv.status === 'pending_district_pastor_approval') {
        notify(inv.target_user_id, invitationId,
          '✅ Mission Fully Approved',
          `Your district pastor has approved invitation ${refId} for ${serviceDate}. The mission is now confirmed.`);
        notify(inv.requesting_pastor_id, invitationId,
          '✅ Mission Confirmed by District Pastor',
          `Invitation ${refId} has been approved by the preacher and the district pastor. The mission is confirmed.`);
        notifySecretariesOfField(inv.target_field_id, invitationId,
          '✅ Mission Fully Confirmed',
          `Invitation ${refId} is fully approved by the preacher and the district pastor.`);
        notifyAdmins(invitationId,
          '🎉 Mission Confirmation Complete',
          `Mission ${refId} for Pr. ${inv.target_name} on ${serviceDate} is fully approved.`);

      } else if (status === 'rejected') {
        const reasonText = note ? ` Reason: ${note}` : '';
        if (inv.status === 'pending_preacher_confirmation') {
          notify(inv.requesting_pastor_id, invitationId,
            '❌ Invitation Declined',
            `${inv.target_name} has declined your mission invitation ${refId} for ${serviceDate}.${reasonText}`);
          notifySecretariesOfField(inv.pastor_field_id, invitationId,
            '❌ Mission Declined',
            `Invitation ${refId}: ${inv.target_name} has declined the mission on ${serviceDate}.${reasonText}`);
        } else if (inv.status === 'pending_district_pastor_approval') {
          notify(inv.target_user_id, invitationId,
            '❌ District Pastor Declined',
            `Your district pastor has declined invitation ${refId} for ${serviceDate}.${reasonText}`);
          notify(inv.requesting_pastor_id, invitationId,
            '❌ Mission Declined by District Pastor',
            `Invitation ${refId} has been declined by the district pastor.${reasonText}`);
          notifySecretariesOfField(inv.target_field_id, invitationId,
            '❌ Mission Declined',
            `Invitation ${refId} has been declined by the district pastor.${reasonText}`);
        } else {
          notify(inv.requesting_pastor_id, invitationId,
            '❌ Invitation Declined',
            `${inv.target_name} has declined your mission invitation ${refId} for ${serviceDate}.${reasonText}`);
          notifySecretariesOfField(inv.pastor_field_id, invitationId,
            '❌ Mission Declined',
            `Invitation ${refId}: ${inv.target_name} has declined the mission on ${serviceDate}.${reasonText}`);
        }
      } else if (status === 'completed') {
        notify(inv.requesting_pastor_id, invitationId,
          '🏁 Mission Completed!',
          `${inv.target_name} has marked mission ${refId} on ${serviceDate} as successfully completed.`);
        notifySecretariesOfField(inv.pastor_field_id, invitationId,
          '🏁 Mission Reported Completed',
          `Invitation ${refId}: Mission served by ${inv.target_name} has been marked as completed.`);
        notifySecretariesOfField(inv.target_field_id, invitationId,
          '🏁 Mission Reported Completed',
          `Invitation ${refId}: ${inv.target_name} has reported the mission on ${serviceDate} as completed.`);
        notifyAdmins(invitationId,
          '🏁 Mission Lifecycle: COMPLETED',
          `Mission ${refId} (Pr. ${inv.target_name}) has been marked as completed.`);
      }

      res.json({ message: 'Status updated' });
    });
  });
});

// Update Feedback
app.patch('/api/invitations/:id/feedback', authenticateToken, (req, res) => {
  const { preacher_experience_note, preacher_rating, pastor_return_comment } = req.body;
  const { role, id: userId } = req.user;
  const invitationId = parseInt(req.params.id);

  db.get('SELECT * FROM invitations WHERE id = ?', [invitationId], (err, inv) => {
    if (err || !inv) return res.status(404).json({ error: 'Invitation not found' });

    let query = 'UPDATE invitations SET';
    let params = [];
    let updates = [];

    if (role === 'preacher' || (role === 'pastor' && inv.target_user_id === userId)) {
      if (preacher_experience_note !== undefined) {
        updates.push(' preacher_experience_note = ?');
        params.push(preacher_experience_note);
      }
      if (preacher_rating !== undefined) {
        updates.push(' preacher_rating = ?');
        params.push(preacher_rating);
      }
    }

    if (role === 'pastor' && inv.requesting_pastor_id === userId) {
      if (pastor_return_comment !== undefined) {
        updates.push(' pastor_return_comment = ?');
        params.push(pastor_return_comment);
      }
    }

    if (role === 'admin') {
      if (preacher_experience_note !== undefined) { updates.push(' preacher_experience_note = ?'); params.push(preacher_experience_note); }
      if (preacher_rating !== undefined) { updates.push(' preacher_rating = ?'); params.push(preacher_rating); }
      if (pastor_return_comment !== undefined) { updates.push(' pastor_return_comment = ?'); params.push(pastor_return_comment); }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update for your role' });

    query += updates.join(',') + ' WHERE id = ?';
    params.push(invitationId);

    db.run(query, params, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logAudit(userId, 'INVITATION_FEEDBACK_UPDATE', { invitation_id: invitationId });
      res.json({ message: 'Feedback updated successfully' });
    });
  });
});

// Update invitation details (pastor = own pending; admin = any)
app.patch('/api/invitations/:id', authenticateToken, (req, res) => {
  const { id: userId, role } = req.user;
  const invitationId = req.params.id;
  const { service_date, service_end_date, service_type, priority, pastor_note, target_user_id, requesting_pastor_id } = req.body;

  if (role !== 'pastor' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  db.get('SELECT * FROM invitations WHERE id = ?', [invitationId], (err, inv) => {
    if (err || !inv) return res.status(404).json({ error: 'Invitation not found' });

    if (role === 'pastor') {
      if (inv.requesting_pastor_id !== userId) return res.status(403).json({ error: 'You can only edit your own invitations' });
      if (inv.status !== 'pending_field1_secretary') return res.status(400).json({ error: 'Invitation can no longer be edited at this stage' });
    }

    const newTarget = (role === 'admin' && target_user_id) ? target_user_id : (target_user_id || inv.target_user_id);
    const newRequester = (role === 'admin' && requesting_pastor_id) ? requesting_pastor_id : inv.requesting_pastor_id;
    const newEndDate = service_end_date !== undefined ? (service_end_date || null) : inv.service_end_date;

    db.run(
      'UPDATE invitations SET service_date = ?, service_end_date = ?, service_type = ?, priority = ?, pastor_note = ?, target_user_id = ?, requesting_pastor_id = ? WHERE id = ?',
      [service_date || inv.service_date, newEndDate, service_type || inv.service_type, priority || inv.priority, pastor_note ?? inv.pastor_note, newTarget, newRequester, invitationId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Invitation updated successfully' });
      }
    );
  });
});

// Send Reminder (admin only)
app.post('/api/invitations/:id/remind', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const invitationId = req.params.id;

  db.get(`
    SELECT i.*, u.field_id as pastor_field_id, tu.field_id as target_field_id, tu.name as target_name
    FROM invitations i
    JOIN users u ON i.requesting_pastor_id = u.id
    JOIN users tu ON i.target_user_id = tu.id
    WHERE i.id = ?
  `, [invitationId], (err, inv) => {
    if (err || !inv) return res.status(404).json({ error: 'Invitation not found' });

    const refId = `#${invitationId.toString().padStart(4, '0')}`;
    const title = '🔔 Action Required: Mission Reminder';
    const message = `Admin has sent a reminder for Mission Request ${refId}. Please review and respond as soon as possible.`;

    if (inv.status === 'pending_field1_secretary') {
      notifySecretariesOfField(inv.pastor_field_id, invitationId, title, message);
    } else if (inv.status === 'pending_field2_secretary') {
      notifySecretariesOfField(inv.target_field_id, invitationId, title, message);
    } else if (inv.status === 'pending_preacher_confirmation') {
      notify(inv.target_user_id, invitationId, title, message);
    } else {
      return res.status(400).json({ error: 'No reminder needed for this status' });
    }

    res.json({ message: 'Reminder sent successfully' });
  });
});

// Delete invitation (admin only)
app.delete('/api/invitations/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const invitationId = req.params.id;
  db.run('DELETE FROM notifications WHERE invitation_id = ?', [invitationId]);
  db.run('DELETE FROM invitations WHERE id = ?', [invitationId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Invitation deleted' });
  });
});

// Get notifications for current user
app.get('/api/notifications', authenticateToken, (req, res) => {
  db.all(
    `SELECT n.*, i.status as invitation_status 
     FROM notifications n 
     LEFT JOIN invitations i ON n.invitation_id = i.id 
     WHERE n.user_id = ? 
     ORDER BY n.created_at DESC LIMIT 50`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authenticateToken, (req, res) => {
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Marked as read' });
    });
});

// Mark ALL notifications as read
app.patch('/api/notifications/read-all', authenticateToken, (req, res) => {
  db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'All marked as read' });
  });
});

// Broadcast notification to ALL users (Admin only)
app.post('/api/notifications/broadcast', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  db.all('SELECT id FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.json({ message: 'No users to notify' });

    const stmt = db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)');
    rows.forEach(user => {
      stmt.run(user.id, title, message);
    });
    stmt.finalize();

    res.json({ message: `Broadcast sent to ${rows.length} users successfully` });
  });
});

app.get('/api/pastor/calendar', authenticateToken, (req, res) => {
  if (req.user.role !== 'pastor') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, 
           tu.name as preacher_name, tu.specialty as preacher_specialty, f_tu.name as preacher_field,
           u.name as hosting_pastor_name, f_u.name as hosting_field
    FROM invitations i
    LEFT JOIN users tu ON i.target_user_id = tu.id
    LEFT JOIN fields f_tu ON tu.field_id = f_tu.id
    LEFT JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f_u ON u.field_id = f_u.id
    WHERE i.requesting_pastor_id = ? OR i.target_user_id = ?
    ORDER BY i.service_date ASC
  `, [req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Pastor's Requests
app.get('/api/pastor/my-requests', authenticateToken, (req, res) => {
  if (req.user.role !== 'pastor') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, tu.name as preacher_name, f.name as preacher_field_name, d.name as preacher_district_name, c.name as preacher_church_name, d.pastor_id as preacher_district_pastor_id
    FROM invitations i
    LEFT JOIN users tu ON i.target_user_id = tu.id
    LEFT JOIN fields f ON tu.field_id = f.id
    LEFT JOIN districts d ON tu.district_id = d.id
    LEFT JOIN churches c ON tu.church_id = c.id
    WHERE i.requesting_pastor_id = ?
      OR i.target_user_id = ?
      OR (i.status = 'pending_district_pastor_approval' AND d.pastor_id = ?)
    ORDER BY i.created_at DESC
  `, [req.user.id, req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/pastor/leave-dates', authenticateToken, (req, res) => {
  const userId = req.query.user_id ? req.query.user_id : req.user.id;
  db.all('SELECT id, leave_date, reason FROM pastor_leave_dates WHERE user_id = ?', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/pastor/leave-dates', authenticateToken, (req, res) => {
  const { date, reason } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  db.get('SELECT id FROM pastor_leave_dates WHERE user_id = ? AND leave_date = ?', [req.user.id, date], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      db.run('DELETE FROM pastor_leave_dates WHERE id = ?', [row.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Leave removed', active: false });
      });
    } else {
      db.run('INSERT INTO pastor_leave_dates (user_id, leave_date, reason) VALUES (?, ?, ?)', [req.user.id, date, reason || 'Unavailable'], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Leave added', active: true, id: this.lastID });
      });
    }
  });
});

app.get('/api/pastor/history', authenticateToken, (req, res) => {
  if (req.user.role !== 'pastor') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, u.name as pastor_name, f.name as pastor_field_name, tu.name as preacher_name
    FROM invitations i
    LEFT JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f ON u.field_id = f.id
    LEFT JOIN users tu ON i.target_user_id = tu.id
    WHERE (i.requesting_pastor_id = ? OR i.target_user_id = ?) 
      AND (i.status = 'completed' OR (i.status = 'approved' AND i.service_date < date('now')))
    ORDER BY i.service_date DESC
  `, [req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- PREACHER ROUTES ---

app.get('/api/preacher/invitations', authenticateToken, (req, res) => {
  if (req.user.role !== 'preacher') return res.status(403).json({ error: 'Access denied' });
  const query = `
    SELECT i.*, 
           u.name as requesting_pastor_name, u.name as pastor_name, f.name as pastor_field_name, d.name as pastor_district_name, c.name as pastor_church_name,
           tu.name as preacher_name, tu.name as invited_guest_name, tu.name as target_user_name, tu.specialty as preacher_specialty, f_tu.name as preacher_field_name, d_tu.name as preacher_district_name, c_tu.name as preacher_church_name
    FROM invitations i
    LEFT JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f ON u.field_id = f.id
    LEFT JOIN districts d ON u.district_id = d.id
    LEFT JOIN churches c ON u.church_id = c.id
    LEFT JOIN users tu ON i.target_user_id = tu.id
    LEFT JOIN fields f_tu ON tu.field_id = f_tu.id
    LEFT JOIN districts d_tu ON tu.district_id = d_tu.id
    LEFT JOIN churches c_tu ON tu.church_id = c_tu.id
    WHERE i.target_user_id = ?
    ORDER BY i.created_at DESC
  `;
  db.all(query, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/preacher/my-pastor', authenticateToken, (req, res) => {
  if (req.user.role !== 'preacher') return res.status(403).json({ error: 'Access denied' });

  db.get(`
    SELECT p.id, p.name, p.email, p.phone, p.specialty, p.field_id, p.district_id,
           f.name as field_name, d.name as district_name, c.name as church_name
    FROM users u
    JOIN districts d ON u.district_id = d.id
    LEFT JOIN users p ON p.id = d.pastor_id
    LEFT JOIN fields f ON p.field_id = f.id
    LEFT JOIN churches c ON p.church_id = c.id
    WHERE u.id = ?
  `, [req.user.id], (err, pastor) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!pastor || !pastor.id) return res.status(404).json({ error: 'District pastor not found' });
    res.json(pastor);
  });
});

app.get('/api/preacher/calendar', authenticateToken, (req, res) => {
  if (req.user.role !== 'preacher') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, 
           u.name as requesting_pastor_name, f_u.name as pastor_field,
           tu.name as preacher_name, f_tu.name as preacher_field
    FROM invitations i
    LEFT JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f_u ON u.field_id = f_u.id
    LEFT JOIN users tu ON i.target_user_id = tu.id
    LEFT JOIN fields f_tu ON tu.field_id = f_tu.id
    WHERE i.target_user_id = ?
    ORDER BY i.service_date ASC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/preacher/history', authenticateToken, (req, res) => {
  if (req.user.role !== 'preacher') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, u.name as pastor_name, f.name as pastor_field_name, tu.name as preacher_name
    FROM invitations i
    LEFT JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f ON u.field_id = f.id
    LEFT JOIN users tu ON i.target_user_id = tu.id
    WHERE i.target_user_id = ? 
      AND (i.status = 'completed' OR (i.status = 'approved' AND i.service_date < date('now')))
    ORDER BY i.service_date DESC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/preacher/leave-dates', authenticateToken, (req, res) => {
  if (req.user.role !== 'preacher') return res.status(403).json({ error: 'Access denied' });
  db.all('SELECT id, leave_date, reason FROM pastor_leave_dates WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/preacher/leave-dates', authenticateToken, (req, res) => {
  if (req.user.role !== 'preacher') return res.status(403).json({ error: 'Access denied' });
  const { date, reason } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  db.get('SELECT id FROM pastor_leave_dates WHERE user_id = ? AND leave_date = ?', [req.user.id, date], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      db.run('DELETE FROM pastor_leave_dates WHERE id = ?', [row.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Leave removed', active: false });
      });
    } else {
      db.run('INSERT INTO pastor_leave_dates (user_id, leave_date, reason) VALUES (?, ?, ?)', [req.user.id, date, reason || 'Unavailable'], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Leave added', active: true, id: this.lastID });
      });
    }
  });
});

// --- SECRETARY QUEUES ---

app.get('/api/secretary/outgoing-queue', authenticateToken, (req, res) => {
  if (req.user.role !== 'secretary') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, u.name as pastor_name, tu.name as preacher_name, f2.name as preacher_field_name
    FROM invitations i
    JOIN users u ON i.requesting_pastor_id = u.id
    JOIN users tu ON i.target_user_id = tu.id
    JOIN fields f2 ON tu.field_id = f2.id
    WHERE u.field_id = ? AND i.status = 'pending_field1_secretary'
  `, [req.user.field_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/secretary/incoming-queue', authenticateToken, (req, res) => {
  if (req.user.role !== 'secretary') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, u.name as pastor_name, f1.name as pastor_field_name, tu.name as preacher_name
    FROM invitations i
    JOIN users u ON i.requesting_pastor_id = u.id
    JOIN fields f1 ON u.field_id = f1.id
    JOIN users tu ON i.target_user_id = tu.id
    WHERE tu.field_id = ? AND i.status IN ('pending_field2_secretary', 'pending_preacher_confirmation')
  `, [req.user.field_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/secretary/history', authenticateToken, (req, res) => {
  if (req.user.role !== 'secretary') return res.status(403).json({ error: 'Access denied' });
  db.all(`
    SELECT i.*, u.name as pastor_name, f1.name as pastor_field_name, tu.name as preacher_name, f2.name as preacher_field_name
    FROM invitations i
    LEFT JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f1 ON u.field_id = f1.id
    LEFT JOIN users tu ON i.target_user_id = tu.id
    LEFT JOIN fields f2 ON tu.field_id = f2.id
    WHERE (u.field_id = ? OR tu.field_id = ?) 
      AND (i.status IN ('completed', 'rejected', 'approved'))
    ORDER BY i.service_date DESC
  `, [req.user.field_id, req.user.field_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// --- UNION ROUTES ---

app.get('/api/unions', (req, res) => {
  db.all('SELECT * FROM unions ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- FIELD ROUTES ---

app.get('/api/fields', (req, res) => {
  db.all('SELECT f.*, u.name as union_name FROM fields f JOIN unions u ON f.union_id = u.id ORDER BY f.name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/fields', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const { name, union_id, area, location, phone, email, pobox, office_hours } = req.body;
  if (!name || !union_id) return res.status(400).json({ error: 'Name and union are required' });

  db.run(
    'INSERT INTO fields (name, union_id, area, location, phone, email, pobox, office_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, union_id, area || '', location || '', phone || '', email || '', pobox || '', office_hours || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/fields/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const id = parseInt(req.params.id);
  const { name, union_id, area, location, phone, email, pobox, office_hours } = req.body;
  if (!name || !union_id) return res.status(400).json({ error: 'Name and union are required' });

  db.run(
    'UPDATE fields SET name = ?, union_id = ?, area = ?, location = ?, phone = ?, email = ?, pobox = ?, office_hours = ? WHERE id = ?',
    [name, union_id, area || '', location || '', phone || '', email || '', pobox || '', office_hours || '', id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Field not found' });
      res.json({ message: 'Field updated' });
    }
  );
});

app.delete('/api/fields/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  const id = parseInt(req.params.id);
  db.run('DELETE FROM fields WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Field not found' });
    res.json({ message: 'Field deleted' });
  });
});

app.get('/api/fields/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  db.get('SELECT f.*, u.name as union_name FROM fields f JOIN unions u ON f.union_id = u.id WHERE f.id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Field not found' });
    res.json(row);
  });
});

// --- DISTRICT ROUTES ---

app.get('/api/districts', (req, res) => {
  const { field_id } = req.query;
  let q = 'SELECT d.*, f.name as field_name FROM districts d JOIN fields f ON d.field_id = f.id';
  let params = [];
  if (field_id) {
    q += ' WHERE d.field_id = ?';
    params.push(field_id);
  }
  q += ' ORDER BY d.name';
  db.all(q, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/districts', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const { name, field_id } = req.body;
  if (!name || !field_id) return res.status(400).json({ error: 'Name and Field are required' });

  db.run(
    'INSERT INTO districts (name, field_id) VALUES (?, ?)',
    [name, field_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/districts/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const id = parseInt(req.params.id);
  const { name, field_id, pastor_id } = req.body;

  db.get('SELECT * FROM districts WHERE id = ?', [id], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!existing) return res.status(404).json({ error: 'District not found' });

    const updatedName = typeof name !== 'undefined' ? name : existing.name;
    const updatedFieldId = typeof field_id !== 'undefined' ? field_id : existing.field_id;
    const updatedPastorId = typeof pastor_id !== 'undefined' ? (pastor_id || null) : existing.pastor_id;

    db.run(
      'UPDATE districts SET name = ?, field_id = ?, pastor_id = ? WHERE id = ?',
      [updatedName, updatedFieldId, updatedPastorId, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'District updated' });
      }
    );
  });
});

app.delete('/api/districts/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const id = parseInt(req.params.id);
  db.run('DELETE FROM districts WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'District deleted' });
  });
});

// --- CHURCH ROUTES ---

app.get('/api/churches', (req, res) => {
  const { field_id, district_id } = req.query;
  let q = 'SELECT c.*, d.name as district_name, f.name as field_name FROM churches c LEFT JOIN districts d ON c.district_id = d.id LEFT JOIN fields f ON c.field_id = f.id WHERE 1=1';
  let params = [];

  if (district_id) {
    q += ' AND c.district_id = ?';
    params.push(district_id);
  } else if (field_id) {
    q += ' AND c.field_id = ?';
    params.push(field_id);
  }

  db.all(q, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/churches', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const { name, district_id, field_id, address, phone } = req.body;
  if (!name || !field_id) return res.status(400).json({ error: 'Name and Field are required' });

  db.run(
    'INSERT INTO churches (name, district_id, field_id, address, phone) VALUES (?, ?, ?, ?, ?)',
    [name, district_id || null, field_id, address || '', phone || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM churches WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.put('/api/churches/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const id = parseInt(req.params.id);
  const { name, district_id, field_id, address, phone, status } = req.body;

  db.run(
    'UPDATE churches SET name = ?, district_id = ?, field_id = ?, address = ?, phone = ?, status = ? WHERE id = ?',
    [name, district_id || null, field_id, address || '', phone || '', status || 'active', id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM churches WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.delete('/api/churches/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  const id = parseInt(req.params.id);
  db.run('DELETE FROM churches WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Church deleted' });
  });
});

app.get('/api/churches/:id/assignments', authenticateToken, (req, res) => {
  const churchId = parseInt(req.params.id);

  db.all(`
    SELECT 
      inv.id,
      inv.service_date,
      inv.service_type,
      inv.status,
      inv.priority,
      u.name as preacher_name,
      u.email as preacher_email,
      p.name as pastor_name
    FROM invitations inv
    JOIN churches c ON c.field_id = (SELECT field_id FROM churches WHERE id = ?)
    JOIN users u ON inv.target_user_id = u.id AND u.role = 'preacher'
    LEFT JOIN users p ON inv.requesting_pastor_id = p.id
    WHERE c.id = ?
    ORDER BY inv.service_date DESC
  `, [churchId, churchId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/churches/:churchId/assignments', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  const churchId = parseInt(req.params.churchId);
  const { service_date, service_type, target_user_id, priority, pastor_note } = req.body;

  if (!service_date || !target_user_id) {
    return res.status(400).json({ error: 'Service date and preacher are required' });
  }

  db.get('SELECT * FROM churches WHERE id = ?', [churchId], (err, church) => {
    if (err || !church) return res.status(404).json({ error: 'Church not found' });

    db.run(
      `INSERT INTO invitations (
        requesting_pastor_id, target_user_id, service_date, service_type, 
        priority, status, is_admin_created, pastor_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, target_user_id, service_date, service_type || '', priority || 'Medium', 'pending_preacher_confirmation', 1, pastor_note || ''],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const invitationId = this.lastID;

        db.run(
          `INSERT INTO notifications (user_id, invitation_id, notification_type, message, is_read)
           VALUES (?, ?, ?, ?, ?)`,
          [target_user_id, invitationId, 'assignment', `You have been assigned to ${church.name} for ${service_date}`, 0],
          (err) => {
            if (err) console.error('Notification creation error:', err);
            res.json({
              id: invitationId,
              message: 'Assignment created successfully',
              church_name: church.name
            });
          }
        );
      }
    );
  });
});

app.get('/api/health-centers', (req, res) => {
  const { field_id } = req.query;
  let q = 'SELECT * FROM health_centers';
  const params = [];
  if (field_id) {
    q += ' WHERE field_id = ?';
    params.push(field_id);
  }
  db.all(q, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Delete / Archive User
app.patch('/api/users/:id/archive', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  db.get('SELECT is_archived FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    const newStatus = row.is_archived === 1 ? 0 : 1;
    db.run('UPDATE users SET is_archived = ? WHERE id = ?', [newStatus, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: newStatus === 1 ? 'User archived' : 'User unarchived', is_archived: newStatus });
    });
  });
});

// --- SUPPORT REQUEST ROUTES ---

app.post('/api/support', authenticateToken, (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

  db.run(
    'INSERT INTO support_requests (user_id, role, subject, message) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, subject, message],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const requestId = this.lastID;
      logAudit(req.user.id, 'SUPPORT_REQUEST_CREATE', { request_id: requestId });

      db.all('SELECT id FROM users WHERE role = ?', ['admin'], (err, admins) => {
        if (!err && admins) {
          admins.forEach(admin => {
            notify(admin.id, null, '🆘 New Support Request', `A new support request from ${req.user.role} (Ref: SUP-${requestId}) requires your attention.`);
          });
        }
      });

      res.json({ id: requestId, message: 'Support request submitted successfully' });
    }
  );
});

app.get('/api/support', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  db.all(`
    SELECT sr.*, u.name as user_name, u.email as user_email 
    FROM support_requests sr 
    JOIN users u ON sr.user_id = u.id 
    ORDER BY sr.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/support/my-requests', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM support_requests WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.patch('/api/support/:id/reply', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  const { admin_reply } = req.body;
  if (!admin_reply) return res.status(400).json({ error: 'Reply content is required' });

  const requestId = req.params.id;
  const now = new Date().toISOString();

  db.get('SELECT user_id, subject FROM support_requests WHERE id = ?', [requestId], (err, request) => {
    if (err || !request) return res.status(404).json({ error: 'Support request not found' });

    db.run(
      'UPDATE support_requests SET admin_reply = ?, status = "replied", updated_at = ? WHERE id = ?',
      [admin_reply, now, requestId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        logAudit(req.user.id, 'SUPPORT_REQUEST_REPLY', { request_id: requestId });
        notify(request.user_id, null, '✉️ Support Feedback Received', `Admin has replied to your support request: "${request.subject}". Check the Support tab for details.`);

        res.json({ message: 'Reply sent successfully' });
      }
    );
  });
});

// --- REPORTING ROUTES ---

app.get('/api/reports/missions', authenticateToken, (req, res) => {
  const { startDate, endDate, districtId, preacherId, fieldId, status, serviceType } = req.query;

  let query = `
    SELECT 
      i.*, 
      tu.name as preacher_name, 
      tu.specialty as preacher_specialty,
      u.name as pastor_name, 
      f_tu.name as preacher_field_name,
      d_tu.id as preacher_district_id,
      d_tu.name as preacher_district_name,
      c_tu.name as preacher_church_name,
      f_u.name as requester_field_name,
      d_u.name as requester_district_name
    FROM invitations i 
    JOIN users tu ON i.target_user_id = tu.id
    JOIN users u ON i.requesting_pastor_id = u.id
    LEFT JOIN fields f_tu ON tu.field_id = f_tu.id
    LEFT JOIN districts d_tu ON tu.district_id = d_tu.id
    LEFT JOIN churches c_tu ON tu.church_id = c_tu.id
    LEFT JOIN fields f_u ON u.field_id = f_u.id
    LEFT JOIN districts d_u ON u.district_id = d_u.id
    WHERE 1=1
  `;
  const params = [];

  const { role, id: userId, field_id: userFieldId } = req.user;

  if (role === 'pastor') {
    query += ' AND (i.requesting_pastor_id = ? OR i.target_user_id = ?)';
    params.push(userId, userId);
  } else if (role === 'preacher') {
    query += ' AND i.target_user_id = ?';
    params.push(userId);
  } else if (role === 'secretary') {
    query += ' AND (u.field_id = ? OR tu.field_id = ?)';
    params.push(userFieldId, userFieldId);
  }

  if (startDate) {
    query += ' AND i.service_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND i.service_date <= ?';
    params.push(endDate);
  }
  if (fieldId) {
    query += ' AND tu.field_id = ?';
    params.push(fieldId);
  }
  if (districtId) {
    query += ' AND tu.district_id = ?';
    params.push(districtId);
  }
  if (preacherId) {
    query += ' AND i.target_user_id = ?';
    params.push(preacherId);
  }
  if (status) {
    if (status === 'pending') {
      query += " AND i.status LIKE 'pending%'";
    } else {
      query += ' AND i.status = ?';
      params.push(status);
    }
  }
  if (serviceType) {
    query += ' AND i.service_type = ?';
    params.push(serviceType);
  }

  query += ' ORDER BY i.service_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ======== INSURANCE DOCUMENT ROUTES ========

app.post('/api/insurance/upload', authenticateToken, upload.single('insurance_file'), (req, res) => {
  const { role, id: userId } = req.user;
  const { invitation_id, document_type } = req.body;
  const invitationId = parseInt(invitation_id);

  if (role !== 'pastor') {
    return res.status(403).json({ error: 'Only pastors can upload insurance documents' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  db.get(`
    SELECT i.*, i.target_user_id as preacher_id
    FROM invitations i
    WHERE i.id = ? AND i.status = 'approved'
  `, [invitationId], (err, inv) => {
    if (err || !inv) {
      return res.status(404).json({ error: 'Invitation not found or not yet approved' });
    }

    if (inv.requesting_pastor_id !== userId) {
      return res.status(403).json({ error: 'Only the pastor who invited can upload insurance' });
    }

    const documentUrl = `/uploads/${req.file.filename}`;
    const documentType = document_type || 'insurance';
    const fileName = req.file.originalname;

    db.run(`
      INSERT INTO insurance_documents 
      (invitation_id, preacher_id, uploaded_by_pastor_id, document_url, document_type, file_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [invitationId, inv.preacher_id, userId, documentUrl, documentType, fileName], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      logAudit(userId, 'INSURANCE_UPLOADED', {
        invitation_id: invitationId,
        preacher_id: inv.preacher_id,
        document_type: documentType,
        file_name: fileName
      });

      const refId = `#${invitationId.toString().padStart(4, '0')}`;
      notify(inv.preacher_id, invitationId,
        '📄 Insurance Document Uploaded',
        `Insurance documentation for invitation ${refId} has been uploaded by the pastor.`);

      res.json({
        id: this.lastID,
        message: 'Insurance document uploaded successfully',
        document_url: documentUrl
      });
    });
  });
});

app.get('/api/insurance/invitation/:id', authenticateToken, (req, res) => {
  const { role, id: userId, field_id } = req.user;
  const invitationId = parseInt(req.params.id);

  db.get(`
    SELECT i.requesting_pastor_id, i.target_user_id, i.status, u.field_id as pastor_field_id, 
           tu.field_id as preacher_field_id
    FROM invitations i
    JOIN users u ON i.requesting_pastor_id = u.id
    JOIN users tu ON i.target_user_id = tu.id
    WHERE i.id = ?
  `, [invitationId], (err, inv) => {
    if (err || !inv) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const canView = (role === 'admin') ||
                    (role === 'pastor' && userId === inv.requesting_pastor_id) ||
                    (role === 'preacher' && userId === inv.target_user_id) ||
                    (role === 'secretary' && (field_id === inv.pastor_field_id || field_id === inv.preacher_field_id));

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.all(`
      SELECT id, invitation_id, preacher_id, uploaded_by_pastor_id, document_url, 
             document_type, file_name, uploaded_at
      FROM insurance_documents
      WHERE invitation_id = ?
      ORDER BY uploaded_at DESC
    `, [invitationId], (err, docs) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(docs || []);
    });
  });
});

app.get('/api/insurance/preacher/:id', authenticateToken, (req, res) => {
  const { role, id: userId, field_id } = req.user;
  const preacherId = parseInt(req.params.id);

  if (role === 'preacher' && userId !== preacherId) {
    return res.status(403).json({ error: 'Can only view your own insurance documents' });
  }

  if (role === 'secretary' || role === 'pastor') {
    db.get(`SELECT field_id FROM users WHERE id = ?`, [preacherId], (err, preacher) => {
      if (err || !preacher || (role === 'secretary' && field_id !== preacher.field_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      fetchDocuments();
    });
  } else if (role === 'admin') {
    fetchDocuments();
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }

  function fetchDocuments() {
    db.all(`
      SELECT id, invitation_id, preacher_id, uploaded_by_pastor_id, document_url, 
             document_type, file_name, uploaded_at
      FROM insurance_documents
      WHERE preacher_id = ?
      ORDER BY uploaded_at DESC
      LIMIT 100
    `, [preacherId], (err, docs) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(docs || []);
    });
  }
});

app.delete('/api/insurance/:id', authenticateToken, (req, res) => {
  const { role, id: userId } = req.user;
  const documentId = parseInt(req.params.id);

  if (role !== 'pastor' && role !== 'admin') {
    return res.status(403).json({ error: 'Only pastors or admins can delete insurance documents' });
  }

  db.get(`SELECT * FROM insurance_documents WHERE id = ?`, [documentId], (err, doc) => {
    if (err || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (role === 'pastor' && doc.uploaded_by_pastor_id !== userId) {
      return res.status(403).json({ error: 'You can only delete documents you uploaded' });
    }

    db.run(`DELETE FROM insurance_documents WHERE id = ?`, [documentId], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      logAudit(userId, 'INSURANCE_DELETED', {
        document_id: documentId,
        invitation_id: doc.invitation_id
      });

      res.json({ message: 'Insurance document deleted' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`PISCS Server running on port ${PORT}`);
});