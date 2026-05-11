let selectedRole = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupPasswordMatch();
    setupCursorGlow();
    setupMagneticButtons();
    setupInputAnimations();
});

// ========================================
// CURSOR GLOW EFFECT
// ========================================
function setupCursorGlow() {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        glowX += (mouseX - glowX) * 0.08;
        glowY += (mouseY - glowY) * 0.08;
        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';
        requestAnimationFrame(animate);
    }
    animate();
}

// ========================================
// MAGNETIC BUTTON EFFECT
// ========================================
function setupMagneticButtons() {
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            btn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transition = 'transform 0.1s ease-out';
        });
    });
}

// ========================================
// INPUT FOCUS ANIMATIONS
// ========================================
function setupInputAnimations() {
    const inputs = document.querySelectorAll('input');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.closest('.field')?.classList.add('focused');
        });

        input.addEventListener('blur', () => {
            input.parentElement.closest('.field')?.classList.remove('focused');
        });
    });
}

// ========================================
// SCREEN NAVIGATION
// ========================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'login-screen') {
        document.getElementById('login-form').reset();
        resetBtn('login-btn');
    }
    if (screenId === 'signup-screen') {
        document.getElementById('signup-form').reset();
        resetBtn('signup-btn');
        document.getElementById('match-msg').textContent = '';
        document.getElementById('match-msg').className = 'match-msg';
    }
}

// ========================================
// ROLE SELECTION
// ========================================
function selectRole(role) {
    selectedRole = role;
    const el = event.currentTarget;
    document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
    el.classList.add('selected');

    setTimeout(() => {
        const label = role === 'farmer' ? 'Farmer Account' : 'Investor Account';
        document.getElementById('signup-role-display').textContent = label;
        showScreen('signup-screen');
    }, 300);
}

// ========================================
// PASSWORD TOGGLE
// ========================================
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';

    btn.innerHTML = isHidden 
        ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4C5 4 1.5 7 1.5 10s3.5 6 8.5 6 8.5-3 8.5-6-3.5-6-8.5-6z" stroke="currentColor" stroke-width="1.5"/><path d="M4 4l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4C5 4 1.5 7 1.5 10s3.5 6 8.5 6 8.5-3 8.5-6-3.5-6-8.5-6z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;

    // Animate the icon change
    btn.style.transform = 'translateY(-50%) scale(0.8)';
    setTimeout(() => {
        btn.style.transform = 'translateY(-50%) scale(1)';
    }, 150);
}

// ========================================
// PASSWORD MATCH
// ========================================
function setupPasswordMatch() {
    const p = document.getElementById('signup-password');
    const c = document.getElementById('signup-confirm');
    const msg = document.getElementById('match-msg');

    function check() {
        if (!c.value) { msg.textContent = ''; msg.className = 'match-msg'; return; }
        if (p.value === c.value) {
            msg.textContent = 'Passwords match';
            msg.className = 'match-msg match';
        } else {
            msg.textContent = 'Passwords do not match';
            msg.className = 'match-msg no-match';
        }
    }
    p.addEventListener('input', check);
    c.addEventListener('input', check);
}

// ========================================
// FORM HANDLING
// ========================================
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
        shake('signup-password');
        return;
    }
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        shake('signup-confirm');
        return;
    }

    setLoading('signup-btn', true);

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: selectedRole })
        });
        const data = await res.json();

        if (data.success) {
            showSuccess('Account Created', `Welcome to Keheilan, ${data.user.email}`);
        } else {
            showToast(data.message || 'Signup failed', 'error');
            setLoading('signup-btn', false);
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
        setLoading('signup-btn', false);
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }

    setLoading('login-btn', true);

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            showSuccess('Welcome Back', `Signed in as ${data.user.email}`);
        } else {
            showToast(data.message || 'Invalid credentials', 'error');
            setLoading('login-btn', false);
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
        setLoading('login-btn', false);
    }
}

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.authenticated) {
            showSuccess('Welcome Back', `You are signed in as ${data.user.email}`);
        }
    } catch (e) {}
}

// ========================================
// UI HELPERS
// ========================================
function setLoading(id, loading) {
    const btn = document.getElementById(id);
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
}

function resetBtn(id) {
    setLoading(id, false);
}

function shake(id) {
    const el = document.getElementById(id);
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 450);
}

function showSuccess(title, msg) {
    document.getElementById('success-title').textContent = title;
    document.getElementById('success-msg').textContent = msg;
    showScreen('success-screen');
}

let toastTimer = null;
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = type;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const active = document.querySelector('.screen.active');
        if (active.id === 'login-screen' || active.id === 'role-screen') showScreen('welcome-screen');
        else if (active.id === 'signup-screen') showScreen('role-screen');
    }
});