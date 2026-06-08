const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'piscs.db');
const db = new sqlite3.Database(dbPath);

const userId = 29;

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

db.all(query, [userId], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Found rows:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
