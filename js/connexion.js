/**
 * eResto - Connexion Page JavaScript
 * Handles login form validation, submission, and UI interactions
 */

'use strict';

// =====================================================
// DOM REFS
// =====================================================
let loginForm, emailInput, passwordInput, submitBtn, loginAlert, loginAlertMsg;
let emailError, passwordError;

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  loginForm       = document.getElementById('login-form');
  emailInput      = document.getElementById('login-email');
  passwordInput   = document.getElementById('login-password');
  submitBtn       = document.getElementById('login-submit');
  loginAlert      = document.getElementById('login-alert');
  loginAlertMsg   = document.getElementById('login-alert-msg');
  emailError      = document.getElementById('email-error');
  passwordError   = document.getElementById('password-error');

  // Check if already logged in
  const saved = localStorage.getItem('eresto_current_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user && user.id) {
        if (user.type === 'client') {
          window.location.href = '/index.html';
        } else {
          window.location.href = '/pages/admin/dashboard.html';
        }
        return;
      }
    } catch(e) {}
  }

  // Remember me - pre-fill if saved
  const rememberedEmail = localStorage.getItem('eresto_remember_email');
  if (rememberedEmail && emailInput) {
    emailInput.value = rememberedEmail;
    const rememberCheckbox = document.getElementById('remember-me');
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // Bind events
  loginForm.addEventListener('submit', handleLogin);
  emailInput.addEventListener('input', () => clearFieldError('email'));
  passwordInput.addEventListener('input', () => clearFieldError('password'));

  // Animate in
  document.querySelector('.auth-form-wrapper')?.classList.add('animate-fade-in');
});

// =====================================================
// VALIDATION
// =====================================================
function validateForm() {
  let valid = true;

  // Email
  const email = emailInput.value.trim();
  if (!email) {
    showFieldError('email', 'L\'email est requis.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('email', 'Veuillez entrer un email valide.');
    valid = false;
  }

  // Password
  const password = passwordInput.value;
  if (!password) {
    showFieldError('password', 'Le mot de passe est requis.');
    valid = false;
  } else if (password.length < 4) {
    showFieldError('password', 'Le mot de passe est trop court.');
    valid = false;
  }

  return valid;
}

function showFieldError(field, message) {
  const input = field === 'email' ? emailInput : passwordInput;
  const errorEl = field === 'email' ? emailError : passwordError;
  input.classList.add('error');
  if (errorEl) {
    errorEl.querySelector('span:last-child') || (errorEl.lastChild.textContent = message);
    errorEl.classList.remove('hidden');
    errorEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">error</span> ${message}`;
  }
}

function clearFieldError(field) {
  const input = field === 'email' ? emailInput : passwordInput;
  const errorEl = field === 'email' ? emailError : passwordError;
  input.classList.remove('error');
  if (errorEl) errorEl.classList.add('hidden');
  // Also hide general alert
  if (loginAlert) loginAlert.classList.add('hidden');
}

function showAlert(message, type = 'error') {
  if (!loginAlert) return;
  loginAlert.className = `form-alert ${type}`;
  const icon = type === 'error' ? 'error' : 'check_circle';
  loginAlert.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">${icon}</span><span>${message}</span>`;
}

// =====================================================
// SUBMIT HANDLER
// =====================================================
async function handleLogin(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const rememberMe = document.getElementById('remember-me')?.checked;

  // Show loading state
  setLoading(true);

  try {
    // Simulate network delay
    await eResto.simulateRequest(900);

    const result = eResto.login(email, password);

    if (result.success) {
      // Save remember-me
      if (rememberMe) {
        localStorage.setItem('eresto_remember_email', email);
      } else {
        localStorage.removeItem('eresto_remember_email');
      }

      // Success feedback
      setLoading(false);
      submitBtn.textContent = '';
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined filled">check_circle</span>
        Connexion réussie !
      `;
      submitBtn.style.background = 'var(--secondary)';

      eResto.showToast(`Bienvenue, ${result.user.name} !`, 'success');

      // Redirect after brief delay
      setTimeout(() => {
        const returnUrl = localStorage.getItem('eresto_return_url');
        if (result.user.type === 'client') {
          if (returnUrl) {
            localStorage.removeItem('eresto_return_url');
            window.location.href = returnUrl;
          } else {
            window.location.href = '/index.html';
          }
        } else {
          window.location.href = '/pages/admin/dashboard.html';
        }
      }, 800);

    } else {
      setLoading(false);
      showAlert(result.error || 'Email ou mot de passe incorrect.');
      passwordInput.value = '';
      passwordInput.focus();

      // Shake animation
      loginForm.style.animation = 'none';
      requestAnimationFrame(() => {
        loginForm.style.animation = 'shake 0.4s ease';
      });
    }

  } catch (err) {
    setLoading(false);
    showAlert('Une erreur est survenue. Veuillez réessayer.');
    console.error('Login error:', err);
  }
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  const btnText = submitBtn.querySelector('.btn-text');
  const btnIcon = submitBtn.querySelector('.material-symbols-outlined:not(.spinner-icon)');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');

  if (loading) {
    if (btnText) btnText.style.opacity = '0';
    if (btnIcon) btnIcon.style.opacity = '0';
    if (btnSpinner) {
      btnSpinner.classList.remove('hidden');
      btnSpinner.innerHTML = `<span class="spinner"></span><span style="font-size:14px">Connexion...</span>`;
    }
  } else {
    if (btnText) btnText.style.opacity = '1';
    if (btnIcon) btnIcon.style.opacity = '1';
    if (btnSpinner) btnSpinner.classList.add('hidden');
  }
}

// =====================================================
// TOGGLE PASSWORD VISIBILITY
// =====================================================
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';

  btn.setAttribute('aria-label', isPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
}

// =====================================================
// FILL DEMO CREDENTIALS
// =====================================================
function fillDemoCredentials() {
  if (emailInput) {
    emailInput.value = 'demo@eresto.com';
    emailInput.dispatchEvent(new Event('input'));
  }
  if (passwordInput) {
    passwordInput.value = 'demo1234';
    passwordInput.dispatchEvent(new Event('input'));
  }
  eResto.showToast('Identifiants de démonstration remplis !', 'info', 2500);
}

// =====================================================
// FORGOT PASSWORD
// =====================================================
function handleForgotPassword(e) {
  e.preventDefault();
  const email = emailInput?.value.trim();

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    eResto.showToast(`Un email de réinitialisation a été envoyé à ${email}`, 'success');
  } else {
    eResto.showToast('Veuillez entrer votre email pour recevoir un lien de réinitialisation.', 'info');
    emailInput?.focus();
  }
}

// =====================================================
// SHAKE ANIMATION (CSS)
// =====================================================
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(shakeStyle);
