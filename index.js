// Import from your existing firebase-config.js
import { auth, db, googleProvider } from './firebase-config.js';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
    doc,
    setDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

let currentUser = null;

// ==================== MODAL FUNCTIONS ====================
window.showLoginModal = () => {
    document.getElementById('loginModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('loginModal').classList.add('show'), 10);
};

window.closeLoginModal = () => {
    document.getElementById('loginModal').classList.remove('show');
    setTimeout(() => document.getElementById('loginModal').classList.add('hidden'), 300);
};

function showModalMessage(message, type) {
    const msgBox = document.getElementById('modalMessage');
    msgBox.textContent = message;
    msgBox.className = `modal-message ${type}`;
    msgBox.classList.remove('hidden');
    setTimeout(() => msgBox.classList.add('hidden'), 4000);
}

// ==================== SAVE USER DATA ====================
async function saveUserData(user) {
    try {
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            lastLogin: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

// ==================== EMAIL LOGIN ====================
document.getElementById('modalLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('modalEmail').value;
    const password = document.getElementById('modalPassword').value;
    const btn = e.target.querySelector('.modal-btn-primary');
    const loader = btn.querySelector('.btn-loader');
    const span = btn.querySelector('span');

    span.style.opacity = '0';
    loader.classList.remove('hidden');
    btn.disabled = true;

    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await saveUserData(result.user);
        showModalMessage('✓ Login successful!', 'success');
        setTimeout(() => closeLoginModal(), 1500);
    } catch (error) {
        let msg = 'Login failed!';
        if (error.code === 'auth/user-not-found') msg = 'No account found';
        if (error.code === 'auth/wrong-password') msg = 'Wrong password';
        if (error.code === 'auth/invalid-credential') msg = 'Invalid credentials';
        showModalMessage(msg, 'error');
    } finally {
        span.style.opacity = '1';
        loader.classList.add('hidden');
        btn.disabled = false;
    }
});

// ==================== GOOGLE LOGIN ====================
window.googleLogin = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await saveUserData(result.user);
        showModalMessage('✓ Google login successful!', 'success');
        setTimeout(() => closeLoginModal(), 1500);
    } catch (error) {
        showModalMessage('Google login failed!', 'error');
    }
};

// ==================== ACCOUNT MODAL FUNCTIONS ====================
window.showAccountModal = () => {
    document.getElementById('accountModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('accountModal').classList.add('show'), 10);
};

window.closeAccountModal = () => {
    document.getElementById('accountModal').classList.remove('show');
    setTimeout(() => document.getElementById('accountModal').classList.add('hidden'), 300);
};

window.handleLogout = async () => {
    closeAccountModal();
    await signOut(auth);
    alert('✓ Successfully logged out!');
    location.reload();
};

// Helper function to get user initials
function getUserInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Helper function to update user UI elements
function updateUserUI(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    const initials = getUserInitials(displayName);
    const photoURL = user.photoURL;

    // Update navbar account button
    document.getElementById('navUserName').textContent = displayName;
    const navAvatarContainer = document.getElementById('navAvatarContainer');
    const navAvatarPlaceholder = document.getElementById('navAvatarPlaceholder');

    if (photoURL) {
        navAvatarContainer.innerHTML = `<img src="${photoURL}" alt="${displayName}">`;
    } else {
        navAvatarPlaceholder.textContent = initials;
    }

    // Update account modal
    document.getElementById('accountName').textContent = displayName;
    document.getElementById('accountEmail').textContent = user.email;
    const accountAvatar = document.getElementById('accountAvatar');
    const accountAvatarPlaceholder = document.getElementById('accountAvatarPlaceholder');

    if (photoURL) {
        accountAvatar.innerHTML = `<img src="${photoURL}" alt="${displayName}">`;
    } else {
        accountAvatarPlaceholder.textContent = initials;
    }

    // Placeholder stats - can be fetched from Firestore
    document.getElementById('accountTestsTaken').textContent = '0';
    document.getElementById('accountAvgScore').textContent = '0%';
    document.getElementById('accountStreak').textContent = '0';
}

// ==================== AUTH STATE LISTENER ====================
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const loggedOutButtons = document.getElementById('loggedOutButtons');
    const accountBtn = document.getElementById('accountBtn');
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');

    if (user) {
        console.log('User logged in:', user.email);

        // Hide login/signup buttons, show account button
        loggedOutButtons.classList.add('hidden');
        accountBtn.classList.remove('hidden');

        // Update all user UI elements
        updateUserUI(user);

    } else {
        console.log('No user logged in');

        // Show login/signup buttons, hide account button
        loggedOutButtons.classList.remove('hidden');
        accountBtn.classList.add('hidden');

        // Setup click handlers for login buttons
        loginBtn.onclick = showLoginModal;
        getStartedBtn.onclick = showLoginModal;
    }
});

// ==================== SIGNUP PLACEHOLDER ====================
window.showSignupForm = () => {
    alert('📝 Signup coming soon! Use Google login for now.');
};

// ==================== MOBILE MENU TOGGLE ====================
const mobileToggle = document.getElementById('mobileToggle');
const navbarActions = document.getElementById('navbarActions');
const overlay = document.getElementById('overlay');
const navbar = document.getElementById('navbar');

mobileToggle.addEventListener('click', () => {
    mobileToggle.classList.toggle('active');
    navbarActions.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = navbarActions.classList.contains('active') ? 'hidden' : '';
});

overlay.addEventListener('click', () => {
    mobileToggle.classList.remove('active');
    navbarActions.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
});

// ==================== NAVBAR SCROLL EFFECT ====================
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==================== TEST BUTTON HANDLERS ====================
const mcqTestBtn = document.getElementById('mcqTestBtn');
const textTestBtn = document.getElementById('textTestBtn');

mcqTestBtn.addEventListener('click', () => {
    if (currentUser) {
        // Navigate to MCQ test page
        window.location.href = 'mcq-test.html';
    } else {
        alert('🔐 Please login first to access MCQ Tests!');
        showLoginModal();
    }
});

textTestBtn.addEventListener('click', () => {
    if (currentUser) {
        // Navigate to text-based test page
        window.location.href = 'test.html';
    } else {
        alert('🔐 Please login first to access Text-Based Tests!');
        showLoginModal();
    }
});

// OCR Test Button
const ocrTestBtn = document.getElementById('ocrTestBtn');
if (ocrTestBtn) {
    ocrTestBtn.addEventListener('click', () => {
        if (currentUser) {
            window.location.href = 'ocr-scan.html';
        } else {
            alert('🔐 Please login first to access OCR Scan & Evaluate!');
            showLoginModal();
        }
    });
}

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});