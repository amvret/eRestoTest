/**
 * eResto - Inscription Page JavaScript
 */

'use strict';

let currentAccountType = 'client';
let registerForm, registerAlert, submitBtn;

document.addEventListener('DOMContentLoaded', () => {
  registerForm  = document.getElementById('register-form');
  registerAlert = document.getElementById('register-alert');
  submitBtn     = document.getElementById('register-submit');

  registerForm.addEventListener('submit', handleRegister);

  // Live validation
  ['full-name', 'reg-email', 'reg-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('blur', () => validateField(id));
    document.getElementById(id)?.addEventListener('input', () => clearError(id));
  });

  // Animate
  document.querySelector('.auth-form-wrapper')?.classList.add('animate-fade-in');
});

// =====================================================
// ACCOUNT TYPE SWITCHER
// =====================================================
function switchAccountType(type) {
  currentAccountType = type;

  const btnClient  = document.getElementById('btn-client');
  const btnOwner   = document.getElementById('btn-owner');
  const ownerFields = document.getElementById('owner-fields');
  const restInput  = document.getElementById('restaurant-name');
  const addrInput  = document.getElementById('restaurant-address');

  if (type === 'owner') {
    btnOwner.classList.add('active');
    btnOwner.setAttribute('aria-pressed', 'true');
    btnClient.classList.remove('active');
    btnClient.setAttribute('aria-pressed', 'false');

    ownerFields.classList.add('visible');
    ownerFields.setAttribute('aria-hidden', 'false');
    if (restInput) restInput.setAttribute('required', '');
    if (addrInput) addrInput.setAttribute('required', '');
  } else {
    btnClient.classList.add('active');
    btnClient.setAttribute('aria-pressed', 'true');
    btnOwner.classList.remove('active');
    btnOwner.setAttribute('aria-pressed', 'false');

    ownerFields.classList.remove('visible');
    ownerFields.setAttribute('aria-hidden', 'true');
    if (restInput) restInput.removeAttribute('required');
    if (addrInput) addrInput.removeAttribute('required');
  }
}

// =====================================================
// PASSWORD STRENGTH
// =====================================================
function updatePasswordStrength(password) {
  const meter    = document.getElementById('strength-meter');
  const bars     = document.querySelectorAll('.strength-bar');
  const label    = document.getElementById('strength-label');

  if (!password) {
    if (meter) meter.style.display = 'none';
    return;
  }

  if (meter) meter.style.display = 'flex';

  const result = eResto.checkPasswordStrength(password);

  bars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (i < result.score) bar.classList.add(`active-${result.score}`);
  });

  const colors = { 1: '#ba1a1a', 2: '#f97316', 3: '#eab308', 4: '#2E9E5B', 5: '#006d38' };
  if (label) {
    label.textContent = `Force : ${result.label}`;
    label.style.color = colors[result.score] || 'var(--on-surface-variant)';
  }
}

// =====================================================
// FIELD-LEVEL VALIDATION
// =====================================================
function validateField(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return true;
  const val = el.value.trim();

  if (fieldId === 'full-name') {
    if (!val) return setFieldError('name-error', 'Le nom est requis.', 'full-name');
    if (val.length < 2) return setFieldError('name-error', 'Nom trop court (min. 2 caractères).', 'full-name');
  }
  if (fieldId === 'reg-email') {
    if (!val) return setFieldError('reg-email-error', 'L\'email est requis.', 'reg-email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return setFieldError('reg-email-error', 'Email invalide.', 'reg-email');
  }
  if (fieldId === 'reg-password') {
    if (!val) return setFieldError('password-reg-error', 'Le mot de passe est requis.', 'reg-password');
    if (val.length < 6) return setFieldError('password-reg-error', 'Minimum 6 caractères.', 'reg-password');
  }
  return true;
}

function setFieldError(errorId, message, inputId) {
  const errorEl = document.getElementById(errorId);
  const inputEl = document.getElementById(inputId);
  if (errorEl) {
    errorEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">error</span> ${message}`;
    errorEl.classList.remove('hidden');
  }
  if (inputEl) inputEl.classList.add('error');
  return false;
}

function clearError(fieldId) {
  const map = {
    'full-name': ['name-error', 'full-name'],
    'reg-email': ['reg-email-error', 'reg-email'],
    'reg-password': ['password-reg-error', 'reg-password'],
  };
  const [errId, inputId] = map[fieldId] || [];
  if (errId) {
    document.getElementById(errId)?.classList.add('hidden');
    document.getElementById(inputId)?.classList.remove('error');
  }
  registerAlert?.classList.add('hidden');
}

function validateAll() {
  let valid = true;
  valid = validateField('full-name') && valid;
  valid = validateField('reg-email') && valid;
  valid = validateField('reg-password') && valid;

  // Terms
  const terms = document.getElementById('terms');
  const termsError = document.getElementById('terms-error');
  if (!terms?.checked) {
    if (termsError) termsError.classList.remove('hidden');
    valid = false;
  }

  // Owner fields
  if (currentAccountType === 'owner') {
    const restName = document.getElementById('restaurant-name');
    if (!restName?.value.trim()) {
      setFieldError('rest-name-error', 'Le nom du restaurant est requis.', 'restaurant-name');
      valid = false;
    }
  }

  return valid;
}

// =====================================================
// SUBMIT HANDLER
// =====================================================
async function handleRegister(e) {
  e.preventDefault();
  if (!validateAll()) {
    registerAlert.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">error</span> Veuillez corriger les erreurs ci-dessus.`;
    registerAlert.className = 'form-alert';
    return;
  }

  setLoading(true);

  try {
    await eResto.simulateRequest(1200);

    const data = {
      name: document.getElementById('full-name').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      password: document.getElementById('reg-password').value,
      type: currentAccountType,
    };

    if (currentAccountType === 'owner') {
      data.restaurantName = document.getElementById('restaurant-name')?.value.trim();
      data.cuisineType    = document.getElementById('cuisine-type')?.value;
      data.address        = document.getElementById('restaurant-address')?.value.trim();
      data.phone          = document.getElementById('restaurant-phone')?.value.trim();

      // Read restaurant image
      let restImg = document.getElementById('restaurant-image-url')?.value.trim();
      const fileInput = document.getElementById('restaurant-image-file');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
          restImg = await readFileAsDataURL(fileInput.files[0]);
        } catch(err) {
          console.error('Erreur lecture image restaurant:', err);
        }
      }
      data.restaurantImage = restImg || null;
    }

    const result = eResto.register(data);

    if (result.success) {
      setLoading(false);
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined filled">check_circle</span>
        Compte créé !
      `;
      submitBtn.style.background = 'var(--secondary)';

      registerAlert.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">check_circle</span> Inscription réussie ! Bienvenue sur eResto, ${data.name} !`;
      registerAlert.className = 'form-alert success';

      eResto.showToast(`Bienvenue ${data.name} ! Votre compte a été créé.`, 'success');

      setTimeout(() => {
        const returnUrl = localStorage.getItem('eresto_return_url');
        if (currentAccountType === 'client') {
          if (returnUrl) {
            localStorage.removeItem('eresto_return_url');
            window.location.href = returnUrl;
          } else {
            window.location.href = `${ERESTO_BASE}index.html`;
          }
        } else {
          window.location.href = `${ERESTO_BASE}pages/admin/dashboard.html`;
        }
      }, 1500);
    } else {
      setLoading(false);
      registerAlert.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">error</span> ${result.error}`;
      registerAlert.className = 'form-alert';
    }

  } catch (err) {
    setLoading(false);
    registerAlert.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">error</span> Une erreur est survenue. Réessayez.`;
    registerAlert.className = 'form-alert';
    console.error('Register error:', err);
  }
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  const btnText    = submitBtn.querySelector('.btn-text');
  const btnIcon    = submitBtn.querySelector('.material-symbols-outlined:not(.spinner-icon)');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');

  if (loading) {
    if (btnText) btnText.style.opacity = '0';
    if (btnIcon) btnIcon.style.opacity = '0';
    if (btnSpinner) {
      btnSpinner.classList.remove('hidden');
      btnSpinner.innerHTML = `<span class="spinner"></span><span style="font-size:14px">Création du compte...</span>`;
    }
  } else {
    if (btnText) btnText.style.opacity = '1';
    if (btnIcon) btnIcon.style.opacity = '1';
    if (btnSpinner) btnSpinner.classList.add('hidden');
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = isText ? 'visibility' : 'visibility_off';
}

function previewRestImage(fileInput) {
  const box = document.getElementById('rest-image-preview-box');
  const img = document.getElementById('rest-image-preview-img');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    if (box) box.style.display = 'none';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    if (img) img.src = e.target.result;
    if (box) box.style.display = 'block';
  };
  reader.readAsDataURL(fileInput.files[0]);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
