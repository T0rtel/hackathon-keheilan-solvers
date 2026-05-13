const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const initSqlJs = require('sql.js');
const fs = require('fs');
const db_farms = require('./db_farms');
const ai = require('./ai_mock');

const app = express();
const PORT = process.env.PORT || 3000;

// Database path (persistent volume in production)
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'keheilan.db');

// Helper: create a promise‑based wrapper around sql.js
class Database {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                this.sqlDb.run(sql, params);
                // sql.js run() doesn't return lastID like sqlite3, so we use get after insert
                if (/^\s*insert/i.test(sql)) {
                    const result = this.sqlDb.exec("SELECT last_insert_rowid() as id");
                    resolve({ lastID: result[0].values[0][0] });
                } else {
                    resolve({ changes: this.sqlDb.getRowsModified() });
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                const stmt = this.sqlDb.prepare(sql);
                stmt.bind(params);
                if (stmt.step()) {
                    const columns = stmt.getColumnNames();
                    const values = stmt.get();
                    const row = {};
                    columns.forEach((col, i) => row[col] = values[i]);
                    stmt.free();
                    resolve(row);
                } else {
                    stmt.free();
                    resolve(null);
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                const stmt = this.sqlDb.prepare(sql);
                stmt.bind(params);
                const rows = [];
                while (stmt.step()) {
                    const columns = stmt.getColumnNames();
                    const values = stmt.get();
                    const row = {};
                    columns.forEach((col, i) => row[col] = values[i]);
                    rows.push(row);
                }
                stmt.free();
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        });
    }

    // Used to run multiple statements without returning data
    exec(sql) {
        this.sqlDb.run(sql);
    }

    // Save the database to disk
    save() {
        const data = this.sqlDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

let db;

// Load or create the SQLite database file
(async () => {
    const SQL = await initSqlJs();
    let sqlDb;
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(fileBuffer);
    } else {
        sqlDb = new SQL.Database();
    }
    db = new Database(sqlDb);

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.exec(`
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
    db.exec(`
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
    db.exec(`
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
    db.exec(`
        CREATE TABLE IF NOT EXISTS external_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER,
            data_type TEXT,
            value_json TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.exec(`
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
    db.exec(`
        CREATE TABLE IF NOT EXISTS capital_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER UNIQUE,
            requested_egp REAL NOT NULL DEFAULT 0,
            funded_egp REAL NOT NULL DEFAULT 0,
            items_json TEXT DEFAULT '[]',
            FOREIGN KEY(farm_id) REFERENCES farms(id)
        )
    `);
    db.exec(`
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
    db.save();

    // Initialize db_farms module with the wrapper
    db_farms.init(db);

    // Seed admin user
    const adminEmail = 'admin@keheilan.com';
    const adminPassword = 'Admin@2026';
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (!existing) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        await db.run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [adminEmail, hashed, 'admin']);
        db.save();
        console.log('Default admin account created.');
    }

    // Start server after DB is ready
    app.listen(PORT, () => {
        console.log(`Keheilan server running on http://localhost:${PORT}`);
    });
})();

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
    return async (req, res, next) => {
        if (!req.session.userId) return res.redirect('/');
        try {
            const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
            if (!user || user.role !== role) {
                return res.status(403).send('Access denied');
            }
            next();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

// --- Auth routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });
        if (password.length < 6) return res.status(400).json({ success: false, message: 'Password too short' });

        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

        const hashed = await bcrypt.hash(password, 10);
        const result = await db.run('INSERT INTO users (email, password, role) VALUES (?,?,?)', [email, hashed, role]);
        req.session.userId = result.lastID;
        db.save();
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

        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
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

app.get('/api/me', async (req, res) => {
    if (!req.session.userId) return res.json({ authenticated: false });
    try {
        const user = await db.get('SELECT email, role FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.json({ authenticated: false });
        res.json({ authenticated: true, user });
    } catch (err) {
        res.json({ authenticated: false });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.redirect('/');
        if (user.role === 'investor') return res.redirect('/investor');
        if (user.role === 'farmer') return res.redirect('/operator');
        res.redirect('/');
    } catch (err) {
        res.redirect('/');
    }
});

app.get('/investor', requireRole('investor'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'investor.html')));
app.get('/operator', requireRole('farmer'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'operator.html')));

// --- Farm routes ---
app.get('/api/farms', requireAuth, async (req, res) => {
    try {
        const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        const role = user.role;
        if (role === 'investor') {
            const rows = await db.all('SELECT * FROM farms WHERE status = "active"');
            res.json(rows);
        } else if (role === 'farmer') {
            const rows = await db.all('SELECT * FROM farms WHERE owner_id = ?', [req.session.userId]);
            res.json(rows);
        } else {
            res.status(403).json({ error: 'Invalid role' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/farms', requireRole('farmer'), async (req, res) => {
    try {
        const { location, crop_type, area_feddans, expected_yield_tons, soil_quality, irrigation, weather_region } = req.body;
        if (!location || !crop_type || !area_feddans) {
            return res.status(400).json({ error: 'Location, crop type, and area are required' });
        }
        const result = await db.run(
            `INSERT INTO farms (owner_id, location, crop_type, area_feddans, expected_yield_tons, soil_quality, irrigation, weather_region, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [req.session.userId, location, crop_type, area_feddans, expected_yield_tons || null, soil_quality || null, irrigation || null, weather_region || null]
        );
        db.save();
        ai.analyzeFarm(result.lastID, db, (aiErr) => {
            if (aiErr) console.error('AI analysis failed:', aiErr);
        });
        res.status(201).json({ id: result.lastID, message: 'Farm added and analysis started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/farms/:id', requireRole('farmer'), async (req, res) => {
    try {
        const farmId = req.params.id;
        const farm = await db.get('SELECT owner_id FROM farms WHERE id = ?', [farmId]);
        if (!farm) return res.status(404).json({ error: 'Farm not found' });
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Not your farm' });

        await db.run('DELETE FROM farms WHERE id = ?', [farmId]);
        await db.run('DELETE FROM farm_financials WHERE farm_id = ?', [farmId]);
        await db.run('DELETE FROM ai_results WHERE farm_id = ?', [farmId]);
        db.save();
        res.json({ message: 'Farm deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/farms/:id/analyze', requireRole('farmer'), async (req, res) => {
    try {
        const farmId = req.params.id;
        const farm = await db.get('SELECT owner_id FROM farms WHERE id = ?', [farmId]);
        if (!farm) return res.status(404).json({ error: 'Farm not found' });
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Not your farm' });
        ai.analyzeFarm(farmId, db, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(result);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/investor/match', requireRole('investor'), async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT f.*, a.risk_score, a.predicted_yield_tons, a.match_ranking
            FROM farms f
            LEFT JOIN ai_results a ON f.id = a.farm_id
            WHERE f.status = 'active'
            ORDER BY a.match_ranking ASC, a.risk_score ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Capital Request ---
app.get('/api/farms/:id/capital', requireRole('farmer'), async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM capital_requests WHERE farm_id = ?', [req.params.id]);
        if (!row) {
            res.json({ requested_egp: 0, funded_egp: 0, items: [] });
        } else {
            res.json({
                requested_egp: row.requested_egp,
                funded_egp: row.funded_egp,
                items: JSON.parse(row.items_json)
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/farms/:id/capital', requireRole('farmer'), async (req, res) => {
    try {
        const farmId = req.params.id;
        const { requested_egp, funded_egp, items } = req.body;
        const itemsJson = JSON.stringify(items || []);
        const row = await db.get('SELECT id FROM capital_requests WHERE farm_id = ?', [farmId]);
        if (row) {
            await db.run(
                'UPDATE capital_requests SET requested_egp=?, funded_egp=?, items_json=? WHERE farm_id=?',
                [requested_egp, funded_egp, itemsJson, farmId]
            );
        } else {
            await db.run(
                'INSERT INTO capital_requests (farm_id, requested_egp, funded_egp, items_json) VALUES (?,?,?,?)',
                [farmId, requested_egp, funded_egp, itemsJson]
            );
        }
        db.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/farms/:id', requireAuth, async (req, res) => {
    try {
        const farmId = req.params.id;
        const farm = await db.get(`
            SELECT f.*, a.risk_score, a.predicted_yield_tons, a.match_ranking
            FROM farms f
            LEFT JOIN ai_results a ON f.id = a.farm_id
            WHERE f.id = ?
        `, [farmId]);
        if (!farm) return res.status(404).json({ error: 'Farm not found' });
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Access denied' });
        res.json(farm);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/farms/:id/investors', requireRole('farmer'), async (req, res) => {
    try {
        const farmId = req.params.id;
        const farm = await db.get('SELECT owner_id FROM farms WHERE id = ?', [farmId]);
        if (!farm) return res.status(404).json({ error: 'Farm not found' });
        if (farm.owner_id !== req.session.userId) return res.status(403).json({ error: 'Not your farm' });

        const rows = await db.all(
            `SELECT u.email, i.amount_egp, i.profit_share_percent, i.invested_at
             FROM investments i
             JOIN users u ON i.investor_id = u.id
             WHERE i.farm_id = ?
             ORDER BY i.invested_at DESC`,
            [farmId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Admin routes ---
function requireAdmin(req, res, next) {
    if (!req.session.userId) return res.redirect('/admin');
    db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]).then(user => {
        if (!user || user.role !== 'admin') {
            req.session.destroy();
            return res.redirect('/admin');
        }
        next();
    }).catch(() => res.redirect('/admin'));
}

app.get('/admin', (req, res) => {
    if (req.session.userId) {
        db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]).then(user => {
            if (user && user.role === 'admin') return res.redirect('/admin/dashboard');
            res.sendFile(path.join(__dirname, 'public', 'admin.html'));
        }).catch(() => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await db.get('SELECT * FROM users WHERE email = ? AND role = "admin"', [email]);
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        req.session.userId = user.id;
        res.json({ success: true, user: { email: user.email, role: 'admin' } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/admin/dashboard', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const stats = {
            totalFarmers: (await db.get('SELECT COUNT(*) AS count FROM users WHERE role="farmer"')).count,
            totalInvestors: (await db.get('SELECT COUNT(*) AS count FROM users WHERE role="investor"')).count,
            activeInvestments: (await db.get('SELECT COUNT(*) AS count FROM investments WHERE status="active"')).count,
            totalFunding: (await db.get('SELECT IFNULL(SUM(amount_egp), 0) AS total FROM investments WHERE status="active"')).total,
            avgRiskScore: (await db.get('SELECT AVG(risk_score) AS avg FROM ai_results')).avg || 0,
            avgPredictedYield: (await db.get('SELECT AVG(predicted_yield_tons) AS avg FROM ai_results')).avg || 0
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const { role, search, status } = req.query;
        let sql = 'SELECT id, email, role, status, created_at FROM users WHERE role != "admin"';
        const params = [];
        if (role) { sql += ' AND role = ?'; params.push(role); }
        if (search) { sql += ' AND email LIKE ?'; params.push(`%${search}%`); }
        if (status) { sql += ' AND status = ?'; params.push(status); }
        sql += ' ORDER BY created_at DESC';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;
        if (!status || !['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        await db.run('UPDATE users SET status = ? WHERE id = ? AND role != "admin"', [status, userId]);
        db.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        await db.run('DELETE FROM users WHERE id = ? AND role != "admin"', [userId]);
        db.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/ai/risks', requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT f.id, f.location, f.crop_type, a.risk_score
             FROM farms f
             JOIN ai_results a ON f.id = a.farm_id
             ORDER BY a.risk_score DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/ai/yields', requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT f.id, f.location, f.crop_type, a.predicted_yield_tons
             FROM farms f
             JOIN ai_results a ON f.id = a.farm_id
             ORDER BY a.predicted_yield_tons DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/ai/matching', requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT f.id, f.location, f.crop_type, a.match_ranking, a.risk_score,
                    (SELECT COUNT(*) FROM investments i WHERE i.farm_id = f.id) AS investor_count
             FROM farms f
             LEFT JOIN ai_results a ON f.id = a.farm_id
             ORDER BY a.match_ranking ASC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/investments', requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT i.id, u.email AS investor_email, f.location, f.crop_type,
                    i.amount_egp, i.profit_share_percent, i.status, i.invested_at
             FROM investments i
             JOIN users u ON i.investor_id = u.id
             JOIN farms f ON i.farm_id = f.id
             ORDER BY i.invested_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/invest', requireRole('investor'), async (req, res) => {
    try {
        const { farm_id, amount_egp, profit_share_percent } = req.body;
        if (!farm_id || !amount_egp || !profit_share_percent) {
            return res.status(400).json({ error: 'Missing investment details' });
        }
        await db.run(
            `INSERT INTO investments (farm_id, investor_id, amount_egp, profit_share_percent, status) VALUES (?, ?, ?, ?, 'active')`,
            [farm_id, req.session.userId, amount_egp, profit_share_percent]
        );
        db.save();
        res.status(201).json({ message: 'Investment successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});