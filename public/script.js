let selectedRole = null;

// ---------- PORTAL MODAL CONTROL ----------
const portalModal = document.getElementById('portal-modal');
const overlay = document.getElementById('modal-overlay');
const portalContent = document.getElementById('portal-content');

function openPortal() {
    overlay.style.display = 'block';
    portalModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    showPortalView('options');
}

function closePortal() {
    overlay.style.display = 'none';
    portalModal.style.display = 'none';
    document.body.style.overflow = '';
    // reset forms when closed
    document.getElementById('portal-content').innerHTML = '';
}

// Close portal when clicking overlay
overlay.addEventListener('click', () => {
    closePortal();
});

// Close button in modal
document.getElementById('portal-close').addEventListener('click', closePortal);

// ---------- PORTAL VIEWS ----------
function showPortalView(view) {
    let html = '';

    switch (view) {
        case 'options':
            html = `
                <h2>Welcome to Keheilan</h2>
                <div class="portal-options">
                    <div class="portal-option-card" onclick="showPortalView('login')">
                        <h3>Log In</h3>
                        <p>Access your existing account</p>
                    </div>
                    <div class="portal-option-card" onclick="showPortalView('role')">
                        <h3>Sign Up</h3>
                        <p>Create a new investor or farm operator account</p>
                    </div>
                </div>
            `;
            break;

        case 'login':
            html = `
                <div class="modal-back" onclick="showPortalView('options')">← Back</div>
                <h2>Welcome Back</h2>
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="field">
                        <label for="login-email">Email</label>
                        <input type="email" id="login-email" placeholder="name@example.com" required>
                    </div>
                    <div class="field">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" placeholder="Your password" required>
                    </div>
                    <button type="submit" class="btn btn-primary full">Log In</button>
                </form>
            `;
            break;

        case 'role':
            html = `
                <div class="modal-back" onclick="showPortalView('options')">← Back</div>
                <h2>Choose your account type</h2>
                <div class="role-grid">
                    <div class="role-option" onclick="selectRole('farmer')">
                        <div class="role-icon">🌾</div>
                        <span class="role-label">Farm Operator</span>
                        <span class="role-desc">List your farm, request capital, and document performance with AI.</span>
                    </div>
                    <div class="role-option" onclick="selectRole('investor')">
                        <div class="role-icon">📈</div>
                        <span class="role-label">Investor</span>
                        <span class="role-desc">Discover farm opportunities, allocate capital, and monitor your portfolio.</span>
                    </div>
                </div>
            `;
            break;

        case 'signup':
            // role info text
            let roleInfo = '';
            if (selectedRole === 'farmer') {
                roleInfo = `
                    <strong>Farm Operator</strong><br>
                    <small>List your farm, request capital from verified investors, and let AI help you document performance and maximise funding success.<br>
                    🌾 AI-Assisted Listings &nbsp; 📊 Capital Request Builder<br>
                    📈 Yield Documentation &nbsp; 📋 Investor Reporting</small>`;
            } else {
                roleInfo = `
                    <strong>Investor</strong><br>
                    <small>Discover farm opportunities, allocate capital, and monitor your Shariah-compliant agricultural portfolio with AI-powered insights.<br>
                    🤖 AI Risk Profiling &nbsp; 🌱 Farm Opportunity Discovery<br>
                    📊 Portfolio Monitoring &nbsp; 🔍 Automated Due Diligence</small>`;
            }
            html = `
                <div class="modal-back" onclick="showPortalView('role')">← Back</div>
                <h2>Create Account</h2>
                <div class="role-info">${roleInfo}</div>
                <form id="signup-form" onsubmit="handleSignup(event)">
                    <div class="field">
                        <label for="signup-email">Email</label>
                        <input type="email" id="signup-email" placeholder="name@example.com" required>
                    </div>
                    <div class="field">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" placeholder="Minimum 6 characters" required minlength="6">
                    </div>
                    <div class="field">
                        <label for="signup-confirm">Confirm Password</label>
                        <input type="password" id="signup-confirm" placeholder="Re-enter password" required>
                        <span class="match-msg" id="match-msg"></span>
                    </div>
                    <button type="submit" class="btn btn-primary full">Create Account</button>
                </form>
            `;
            break;

        case 'success':
            html = `
                <div class="success-mark">✔️</div>
                <h2 id="success-title">Success</h2>
                <p id="success-msg" style="text-align:center">Redirecting...</p>
                <button class="btn btn-primary full" id="success-continue">Continue to Dashboard</button>
            `;
            break;
    }

    portalContent.innerHTML = html;

    // Set up password match listener after injecting signup form
    if (view === 'signup') {
        document.getElementById('signup-password').addEventListener('input', checkPasswordMatch);
        document.getElementById('signup-confirm').addEventListener('input', checkPasswordMatch);
    }
}

// ---------- ROLE SELECTION ----------
function selectRole(role) {
    selectedRole = role;
    // highlight
    document.querySelectorAll('.role-option').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    // slight delay then show signup
    setTimeout(() => showPortalView('signup'), 200);
}

// ---------- PASSWORD MATCH ----------
function checkPasswordMatch() {
    const p = document.getElementById('signup-password')?.value || '';
    const c = document.getElementById('signup-confirm')?.value || '';
    const msg = document.getElementById('match-msg');
    if (!msg) return;
    if (!c) { msg.textContent = ''; return; }
    if (p === c) {
        msg.textContent = '✓ Passwords match';
        msg.style.color = 'var(--success)';
    } else {
        msg.textContent = '✗ Passwords do not match';
        msg.style.color = 'var(--error)';
    }
}

// ---------- SIGNUP ----------
async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (!email || !password || !confirm) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    if (!selectedRole) {
        showToast('Please select an account type', 'error');
        showPortalView('role');
        return;
    }

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password, role: selectedRole })
        });
        const data = await res.json();
        if (data.success) {
            // Show success within portal
            showPortalView('success');
            document.getElementById('success-title').textContent = 'Account Created!';
            document.getElementById('success-msg').textContent = `Welcome to Keheilan, ${data.user.email}`;
            document.getElementById('success-continue').onclick = () => {
                window.location.href = data.user.role === 'investor' ? '/investor' : '/operator';
            };
        } else {
            showToast(data.message || 'Signup failed', 'error');
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
    }
}

// ---------- LOGIN ----------
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            showPortalView('success');
            document.getElementById('success-title').textContent = 'Welcome Back';
            document.getElementById('success-msg').textContent = `Signed in as ${data.user.email}`;
            document.getElementById('success-continue').onclick = () => {
                window.location.href = data.user.role === 'investor' ? '/investor' : '/operator';
            };
        } else {
            showToast(data.message || 'Invalid credentials', 'error');
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
    }
}

// ---------- TOAST ----------
let toastTimer;
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = type;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---------- CURSOR GLOW ----------
const glow = document.getElementById('cursor-glow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
(function animateGlow() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    requestAnimationFrame(animateGlow);
})();

// ---------- NAV BUTTON ----------
document.getElementById('portal-btn-nav').addEventListener('click', openPortal);

// ---------- SMOOTH SCROLL ----------
function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// ---------- CHECK AUTH STATUS (on page load) ----------
(async function () {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.authenticated) {
            window.location.href = data.user.role === 'investor' ? '/investor' : '/operator';
        }
    } catch (e) {}
})();