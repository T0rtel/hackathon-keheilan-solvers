const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const db_farms = require('./db_farms');
const ai = require('./ai_mock');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./keheilan.db');

// Existing users table
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// New tables for agritech platform
db.run(`
    CREATE TABLE IF NOT EXISTS farms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        location TEXT NOT NULL,
        crop_type TEXT NOT NULL,
        area_feddans REAL NOT NULL,
        expected_yield_tons REAL,
        soil_quality TEXT,
        irrigation TEXT,
        weather_region TEXT,
        status TEXT DEFAULT 'pending'
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS farm_financials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER UNIQUE,
        requested_investment_egp REAL NOT NULL,
        expected_revenue_egp REAL,
        input_costs_egp REAL,
        historical_profits_egp REAL,
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS farmer_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        age INTEGER,
        experience_years INTEGER,
        previous_loans_count INTEGER,
        repayment_history TEXT,
        equipment_quality TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS external_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        data_type TEXT,
        value_json TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS ai_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER UNIQUE,
        risk_score REAL,
        predicted_yield_tons REAL,
        match_ranking INTEGER,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS capital_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER UNIQUE,
        requested_egp REAL NOT NULL DEFAULT 0,
        funded_egp REAL NOT NULL DEFAULT 0,
        items_json TEXT DEFAULT '[]',
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )
`);

// Investments table (used by admin and investor)
db.run(`
    CREATE TABLE IF NOT EXISTS investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER NOT NULL,
        investor_id INTEGER NOT NULL,
        amount_egp REAL NOT NULL,
        profit_share_percent REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'active',
        invested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(id),
        FOREIGN KEY(investor_id) REFERENCES users(id)
    )
`);

// Add status column to users if not present (for admin user management)
db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`, (err) => {
    // Ignore error if column already exists
});

// Initialize db_farms module
db_farms.init(db);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'keheilan-auth-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) return res.redirect('/');
    next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.session.userId) return res.redirect('/');
        db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
            if (err || !user || user.role !== role) {
                return res.status(403).send('Access denied');
            }
            next();
        });
    };
}

// --- Existing auth routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });
        if (password.length < 6) return res.status(400).json({ success: false, message: 'Password too short' });

        const existing = await new Promise((resolve, reject) =>
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => err ? reject(err) : resolve(row))
        );
        if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

        const hashed = await bcrypt.hash(password, 10);
        const result = await new Promise((resolve, reject) =>
            db.run('INSERT INTO users (email, password, role) VALUES (?,?,?)', [email, hashed, role], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            })
        );
        req.session.userId = result.id;
        res.status(201).json({ success: true, user: { email, role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        req.session.userId = user.id;
        res.json({ success: true, user: { email: user.email, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/me', (req, res) => {
    if (!req.session.userId) return res.json({ authenticated: false });
    db.get('SELECT email, role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) return res.json({ authenticated: false });
        res.json({ authenticated: true, user });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

app.get('/dashboard', requireAuth, (req, res) => {
    db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) return res.redirect('/');
        if (user.role === 'investor') return res.redirect('/investor');
        if (user.role === 'farmer') return res.redirect('/operator');
        res.redirect('/');
    });
});

app.get('/investor', requireRole('investor'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'investor.html')));
app.get('/operator', requireRole('farmer'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'operator.html')));

// --- NEW: Farm & AI Routes ---

// GET /api/farms – role-based
app.get('/api/farms', requireAuth, (req, res) => {
    db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        const role = user.role;
        let query, params;
        if (role === 'investor') {
            query = 'SELECT * FROM farms WHERE status = "active"';
            params = [];
        } else if (role === 'farmer') {
            query = 'SELECT * FROM farms WHERE owner_id = ?';
            params = [req.session.userId];
        } else {
            return res.status(403).json({ error: 'Invalid role' });
        }
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
});

// POST /api/farms – operator adds a farm
app.post('/api/farms', requireRole('farmer'), (req, res) => {
    const { location, crop_type, area_feddans, expected_yield_tons, soil_quality, irrigation, weather_region } = req.body;
    if (!location || !crop_type || !area_feddans) {
        return res.status(400).json({ error: 'Location, crop type, and area are required' });
    }
    db.run(
        `INSERT INTO farms (owner_id, location, crop_type, area_feddans, expected_yield_tons, soil_quality, irrigation, weather_region, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [req.session.userId, location, crop_type, area_feddans, expected_yield_tons || null, soil_quality || null, irrigation || null, weather_region || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            // Auto-trigger AI analysis for the new farm
            ai.analyzeFarm(this.lastID, db, (aiErr) => {
                if (aiErr) console.error('AI analysis failed:', aiErr);
                res.status(201).json({ id: this.lastID, message: 'Farm added and analysis started' });
            });
        }
    );
});

// DELETE /api/farms/:id – operator deletes his farm
app.delete('/api/farms/:id', requireRole('farmer'), (req, res) => {
    const farmId = req.params.id;
    db.get('SELECT owner_id FROM farms WHERE id = ?', [farmId], (err, farm) => {
        if (err || !farm) return res.status(404).json({ error: 'Farm not found' });
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Not your farm' });

        db.run('DELETE FROM farms WHERE id = ?', [farmId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            db.run('DELETE FROM farm_financials WHERE farm_id = ?', [farmId]);
            db.run('DELETE FROM ai_results WHERE farm_id = ?', [farmId]);
            res.json({ message: 'Farm deleted' });
        });
    });
});

// POST /api/farms/:id/analyze – manual AI analysis trigger
app.post('/api/farms/:id/analyze', requireRole('farmer'), (req, res) => {
    const farmId = req.params.id;
    db.get('SELECT owner_id FROM farms WHERE id = ?', [farmId], (err, farm) => {
        if (err || !farm) return res.status(404).json({ error: 'Farm not found' });
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Not your farm' });
        ai.analyzeFarm(farmId, db, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(result);
        });
    });
});

// GET /api/investor/match – ranked farms for investor
app.get('/api/investor/match', requireRole('investor'), (req, res) => {
    const query = `
        SELECT f.*, a.risk_score, a.predicted_yield_tons, a.match_ranking
        FROM farms f
        LEFT JOIN ai_results a ON f.id = a.farm_id
        WHERE f.status = 'active'
        ORDER BY a.match_ranking ASC, a.risk_score ASC
    `;
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- Capital Request ---

// Get capital request for a farm
app.get('/api/farms/:id/capital', requireRole('farmer'), (req, res) => {
    const farmId = req.params.id;
    db.get('SELECT * FROM capital_requests WHERE farm_id = ?', [farmId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            // Return default empty
            res.json({ requested_egp: 0, funded_egp: 0, items: [] });
        } else {
            res.json({
                requested_egp: row.requested_egp,
                funded_egp: row.funded_egp,
                items: JSON.parse(row.items_json)
            });
        }
    });
});

// Update capital request for a farm
app.put('/api/farms/:id/capital', requireRole('farmer'), (req, res) => {
    const farmId = req.params.id;
    const { requested_egp, funded_egp, items } = req.body;

    db.get('SELECT id FROM capital_requests WHERE farm_id = ?', [farmId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const itemsJson = JSON.stringify(items || []);
        if (row) {
            // Update existing
            db.run(
                'UPDATE capital_requests SET requested_egp=?, funded_egp=?, items_json=? WHERE farm_id=?',
                [requested_egp, funded_egp, itemsJson, farmId],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                }
            );
        } else {
            // Insert new
            db.run(
                'INSERT INTO capital_requests (farm_id, requested_egp, funded_egp, items_json) VALUES (?,?,?,?)',
                [farmId, requested_egp, funded_egp, itemsJson],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                }
            );
        }
    });
});

// GET /api/farms/:id – full farm details
app.get('/api/farms/:id', requireAuth, (req, res) => {
    const farmId = req.params.id;
    db.get(`
        SELECT f.*, a.risk_score, a.predicted_yield_tons, a.match_ranking
        FROM farms f
        LEFT JOIN ai_results a ON f.id = a.farm_id
        WHERE f.id = ?
    `, [farmId], (err, farm) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!farm) return res.status(404).json({ error: 'Farm not found' });
        // Also ensure it belongs to the owner (unless you want to share)
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Access denied' });
        res.json(farm);
    });
});

// GET /api/farms/:id/investors – returns investors who invested in this farm (operator only)
app.get('/api/farms/:id/investors', requireRole('farmer'), (req, res) => {
    const farmId = req.params.id;
    // Verify ownership
    db.get('SELECT owner_id FROM farms WHERE id = ?', [farmId], (err, farm) => {
        if (err || !farm) return res.status(404).json({ error: 'Farm not found' });
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Not your farm' });

        db.all(
            `SELECT u.email, i.amount_egp, i.profit_share_percent, i.invested_at
             FROM investments i
             JOIN users u ON i.investor_id = u.id
             WHERE i.farm_id = ?
             ORDER BY i.invested_at DESC`,
            [farmId],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            }
        );
    });
});

// ==================== ADMINISTRATOR SYSTEM ====================

// Create default admin user if not exists
(async function seedAdmin() {
    try {
        const adminEmail = 'admin@keheilan.com';
        const adminPassword = 'Admin@2026'; // Change in production!
        const existing = await new Promise((resolve, reject) =>
            db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!existing) {
            const hashed = await bcrypt.hash(adminPassword, 10);
            await new Promise((resolve, reject) =>
                db.run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [adminEmail, hashed, 'admin'], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                })
            );
            console.log('Default admin account created.');
        }
    } catch (err) {
        console.error('Admin seeding error:', err);
    }
})();

// Admin auth middleware
function requireAdmin(req, res, next) {
    if (!req.session.userId) return res.redirect('/admin');
    db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            req.session.destroy();
            return res.redirect('/admin');
        }
        next();
    });
}

// Serve admin login page
app.get('/admin', (req, res) => {
    if (req.session.userId) {
        db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
            if (!err && user && user.role === 'admin') return res.redirect('/admin/dashboard');
            res.sendFile(path.join(__dirname, 'public', 'admin.html'));
        });
    } else {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM users WHERE email = ? AND role = "admin"', [email], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        req.session.userId = user.id;
        res.json({ success: true, user: { email: user.email, role: 'admin' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin dashboard page (protected)
app.get('/admin/dashboard', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Admin API: Platform Overview Stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const queries = {
        totalFarmers: 'SELECT COUNT(*) AS count FROM users WHERE role="farmer"',
        totalInvestors: 'SELECT COUNT(*) AS count FROM users WHERE role="investor"',
        activeInvestments: 'SELECT COUNT(*) AS count FROM investments WHERE status="active"',
        totalFunding: 'SELECT IFNULL(SUM(amount_egp), 0) AS total FROM investments WHERE status="active"',
        avgRiskScore: 'SELECT AVG(risk_score) AS avg FROM ai_results',
        avgPredictedYield: 'SELECT AVG(predicted_yield_tons) AS avg FROM ai_results'
    };
    const stats = {};
    let completed = 0;
    const keys = Object.keys(queries);
    keys.forEach(key => {
        db.get(queries[key], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats[key] = row[Object.keys(row)[0]] || 0;
            completed++;
            if (completed === keys.length) res.json(stats);
        });
    });
});

// Admin API: User Management (list, filter, search)
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const { role, search, status } = req.query;
    let sql = 'SELECT id, email, role, status, created_at FROM users WHERE role != "admin"';
    const params = [];

    if (role) { sql += ' AND role = ?'; params.push(role); }
    if (search) { sql += ' AND email LIKE ?'; params.push(`%${search}%`); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin API: Update user status (approve/suspend)
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { status } = req.body; // 'active' or 'suspended'
    if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    db.run('UPDATE users SET status = ? WHERE id = ? AND role != "admin"', [status, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    });
});

// Admin API: Delete user
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const userId = req.params.id;
    db.run('DELETE FROM users WHERE id = ? AND role != "admin"', [userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    });
});

// Admin API: AI Monitoring – Risk Score Distribution
app.get('/api/admin/ai/risks', requireAdmin, (req, res) => {
    db.all(
        `SELECT f.id, f.location, f.crop_type, a.risk_score
         FROM farms f
         JOIN ai_results a ON f.id = a.farm_id
         ORDER BY a.risk_score DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Admin API: AI Monitoring – Crop Yield Predictions
app.get('/api/admin/ai/yields', requireAdmin, (req, res) => {
    db.all(
        `SELECT f.id, f.location, f.crop_type, a.predicted_yield_tons
         FROM farms f
         JOIN ai_results a ON f.id = a.farm_id
         ORDER BY a.predicted_yield_tons DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Admin API: AI Monitoring – Farm-Investor Matching Rankings
app.get('/api/admin/ai/matching', requireAdmin, (req, res) => {
    db.all(
        `SELECT f.id, f.location, f.crop_type, a.match_ranking, a.risk_score,
                (SELECT COUNT(*) FROM investments i WHERE i.farm_id = f.id) AS investor_count
         FROM farms f
         LEFT JOIN ai_results a ON f.id = a.farm_id
         ORDER BY a.match_ranking ASC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Admin API: Investment Monitoring
app.get('/api/admin/investments', requireAdmin, (req, res) => {
    db.all(
        `SELECT i.id, u.email AS investor_email, f.location, f.crop_type,
                i.amount_egp, i.profit_share_percent, i.status, i.invested_at
         FROM investments i
         JOIN users u ON i.investor_id = u.id
         JOIN farms f ON i.farm_id = f.id
         ORDER BY i.invested_at DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Endpoint for investor to actually invest (callable from investor dashboard)
app.post('/api/invest', requireRole('investor'), (req, res) => {
    const { farm_id, amount_egp, profit_share_percent } = req.body;
    if (!farm_id || !amount_egp || !profit_share_percent) {
        return res.status(400).json({ error: 'Missing investment details' });
    }
    db.run(
        `INSERT INTO investments (farm_id, investor_id, amount_egp, profit_share_percent, status) VALUES (?, ?, ?, ?, 'active')`,
        [farm_id, req.session.userId, amount_egp, profit_share_percent],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, message: 'Investment successful' });
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`Keheilan server running on http://localhost:${PORT}`);
});