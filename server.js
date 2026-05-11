const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// SQLite database - stores data in a file
const db = new sqlite3.Database('./keheilan.db');

// Create users table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'keheilan-auth-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Check if email exists
        const existing = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                [email, hashedPassword, role],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });

        req.session.userId = result.id;

        res.status(201).json({ 
            success: true, 
            message: 'Account created successfully',
            user: { email, role }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Find user
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        req.session.userId = user.id;

        res.json({ 
            success: true, 
            message: 'Login successful',
            user: { email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.json({ authenticated: false });
    }

    db.get('SELECT email, role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) {
            return res.json({ authenticated: false });
        }
        res.json({ authenticated: true, user });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dashboard</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; 
                    background: #f5f5dc; 
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .card { 
                    background: white; 
                    padding: 60px; 
                    border-radius: 24px; 
                    box-shadow: 0 4px 40px rgba(0,0,0,0.08);
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                }
                .card h1 { 
                    color: #1a4d2e; 
                    font-size: 2rem; 
                    font-weight: 600;
                    margin-bottom: 12px;
                    letter-spacing: -0.5px;
                }
                .card p { 
                    color: #666; 
                    margin-bottom: 30px;
                    font-size: 1rem;
                    line-height: 1.5;
                }
                .btn { 
                    background: #1a4d2e; 
                    color: #f5f5dc; 
                    border: none; 
                    padding: 14px 40px; 
                    border-radius: 12px; 
                    cursor: pointer; 
                    font-size: 1rem;
                    font-weight: 500;
                    font-family: inherit;
                    transition: all 0.2s ease;
                }
                .btn:hover { 
                    background: #0f2e1b; 
                    transform: translateY(-1px);
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Welcome</h1>
                <p>You have successfully signed in to your account.</p>
                <button class="btn" onclick="logout()">Sign Out</button>
            </div>
            <script>
                async function logout() {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = '/';
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Keheilan server running on http://localhost:${PORT}`);
    console.log('Database: SQLite (keheilan.db)');
});