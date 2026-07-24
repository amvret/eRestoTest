/**
 * eResto — Paramètres Page JavaScript
 */
'use strict';

// =====================================================
// HOURS DATA
// =====================================================
const DAYS = [
  { key: 'lundi',     label: 'Lundi',     open: '11:30', close: '22:30', isOpen: true },
  { key: 'mardi',     label: 'Mardi',     open: '11:30', close: '22:30', isOpen: true },
  { key: 'mercredi',  label: 'Mercredi',  open: '11:30', close: '22:30', isOpen: true },
  { key: 'jeudi',     label: 'Jeudi',     open: '11:30', close: '23:00', isOpen: true },
  { key: 'vendredi',  label: 'Vendredi',  open: '11:30', close: '23:30', isOpen: true },
  { key: 'samedi',    label: 'Samedi',    open: '12:00', close: '00:00', isOpen: true },
  { key: 'dimanche',  label: 'Dimanche',  open: '',      close: '',      isOpen: false },
];

const NOTIF_SETTINGS = [
  { key: 'new_order',    title: 'Nouvelle commande',       desc: 'Recevez une alerte dès qu\'une commande est passée.', on: true  },
  { key: 'order_ready',  title: 'Commande prête',          desc: 'Alerte quand une commande est prête à livrer.',      on: true  },
  { key: 'review',       title: 'Nouvel avis client',      desc: 'Soyez notifié des nouveaux avis sur votre page.',   on: true  },
  { key: 'low_stock',    title: 'Stock bas (plat épuisé)', desc: 'Quand un plat est désactivé automatiquement.',      on: false },
  { key: 'daily_report', title: 'Rapport quotidien',       desc: 'Résumé de la journée envoyé à 23h.',                on: true  },
  { key: 'newsletter',   title: 'Newsletters eResto',      desc: 'Mises à jour produit et conseils.',                 on: false },
];

const INVOICES = [
  { date: '22 juin 2024',  amount: '49 000 FCFA', status: 'paid'   },
  { date: '22 mai 2024',   amount: '49 000 FCFA', status: 'paid'   },
  { date: '22 avril 2024', amount: '49 000 FCFA', status: 'paid'   },
  { date: '22 mars 2024',  amount: '49 000 FCFA', status: 'paid'   },
];

let emergencyClosed = false;
let hoursData = JSON.parse(JSON.stringify(DAYS));

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  initUserUI();
  loadSavedSettings();
  renderHoursGrid();
  renderNotifToggles();
  renderInvoices();
  initMobileSidebar();
  handleHashNav();

  // Auto-publish horaires and tables under public restaurant-scoped keys
  // so client pages can check availability even if owner hasn't clicked Save yet
  const restId = eResto.getMyRestaurantId ? eResto.getMyRestaurantId() : null;
  if (restId && !localStorage.getItem(`eresto_horaires_${restId}`)) {
    localStorage.setItem(`eresto_horaires_${restId}`, JSON.stringify(hoursData));
    const capacity = parseInt(document.getElementById('s-capacity')?.value) || 10;
    localStorage.setItem(`eresto_tables_${restId}`, String(capacity));
  }
});

function handleHashNav() {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.querySelector(`[data-section="${hash}"]`)) {
    switchSection(hash);
  }
}

// =====================================================
// USER UI
// =====================================================
function initUserUI() {
  const user = eResto.state.currentUser;
  if (!user) return;
  const initials = eResto.getInitials(user.name || 'U');
  const color    = eResto.getAvatarColor(user.name || 'U');

  ['topbar-avatar','sidebar-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = initials; el.style.background = color; }
  });
  ['topbar-user-name','sidebar-user-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = user.name;
  });
  const em = document.getElementById('sidebar-user-email');
  if (em) em.textContent = user.email;

  // Pre-fill account section
  const nameInput  = document.getElementById('s-acc-name');
  const emailInput = document.getElementById('s-acc-email');
  if (nameInput)  nameInput.value  = user.name  || '';
  if (emailInput) emailInput.value = user.email || '';
}

// =====================================================
// SECTION SWITCHING
// =====================================================
function switchSection(section) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`section-${section}`);
  if (target) target.classList.add('active');

  const navBtn = document.querySelector(`[data-section="${section}"]`);
  if (navBtn) navBtn.classList.add('active');

  window.location.hash = section;
}

// =====================================================
// LOAD / SAVE SETTINGS
// =====================================================
function loadSavedSettings() {
  const saved = JSON.parse(localStorage.getItem('eresto_settings') || '{}');
  const rest  = saved.restaurant || {};

  const fill = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };

  fill('s-rest-name',   rest.name     || 'eResto Démo');
  fill('s-cuisine',     rest.cuisine  || 'française');
  fill('s-capacity',    rest.capacity || '60');
  fill('s-description', rest.desc     || '');
  fill('s-address',     rest.address  || '');
  fill('s-phone',       rest.phone    || '');
  fill('s-email',       rest.email    || '');
  fill('s-website',     rest.website  || '');
  fill('s-siret',       rest.siret    || '');

  if (saved.hours) hoursData = saved.hours;
}

function gatherSettings() {
  return {
    restaurant: {
      name:     document.getElementById('s-rest-name')?.value.trim(),
      cuisine:  document.getElementById('s-cuisine')?.value,
      capacity: document.getElementById('s-capacity')?.value,
      desc:     document.getElementById('s-description')?.value.trim(),
      address:  document.getElementById('s-address')?.value.trim(),
      phone:    document.getElementById('s-phone')?.value.trim(),
      email:    document.getElementById('s-email')?.value.trim(),
      website:  document.getElementById('s-website')?.value.trim(),
      siret:    document.getElementById('s-siret')?.value.trim(),
    },
    hours: hoursData,
    notifs: NOTIF_SETTINGS.reduce((acc, n) => {
      acc[n.key] = document.getElementById(`notif-${n.key}`)?.classList.contains('on') ?? n.on;
      return acc;
    }, {}),
  };
}

async function saveAllSettings() {
  const btn = document.querySelector('[onclick="saveAllSettings()"]');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>Enregistrement...`;

  await eResto.simulateRequest(800);

  const settings = gatherSettings();
  localStorage.setItem('eresto_settings', JSON.stringify(settings));

  // Publish horaires and total tables under restaurant-scoped keys (readable by clients)
  const restId = eResto.getMyRestaurantId ? eResto.getMyRestaurantId() : null;
  if (restId) {
    localStorage.setItem(`eresto_horaires_${restId}`, JSON.stringify(settings.hours));
    const capacity = parseInt(document.getElementById('s-capacity')?.value) || 10;
    localStorage.setItem(`eresto_tables_${restId}`, String(capacity));
  }

  // Update user name if changed
  const newName = document.getElementById('s-acc-name')?.value.trim();
  if (newName && eResto.state.currentUser) {
    eResto.state.currentUser.name = newName;
    localStorage.setItem('eresto_current_user', JSON.stringify(eResto.state.currentUser));
  }

  btn.disabled = false;
  btn.innerHTML = origHtml;
  eResto.showToast('Paramètres enregistrés avec succès !', 'success');
}

// =====================================================
// HOURS GRID
// =====================================================
function renderHoursGrid() {
  const grid = document.getElementById('hours-grid');
  if (!grid) return;

  grid.innerHTML = hoursData.map((day, i) => `
    <div class="hours-row">
      <div class="hours-day">${day.label}</div>

      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0">
        <button
          type="button"
          class="toggle-switch ${day.isOpen ? 'on' : ''}"
          id="hours-toggle-${day.key}"
          role="switch"
          aria-checked="${day.isOpen}"
          onclick="toggleDay('${day.key}', ${i})"
          aria-label="${day.label} ouvert"
        ></button>
        <span style="font-size:12px;font-weight:600;color:var(--on-surface-variant)">${day.isOpen ? 'Ouvert' : 'Fermé'}</span>
      </label>

      <div class="hours-inputs ${!day.isOpen ? 'disabled' : ''}" id="hours-inputs-${day.key}">
        <input
          class="hours-input"
          type="time"
          id="open-${day.key}"
          value="${day.open}"
          onchange="updateHourValue('${day.key}', 'open', this.value)"
          aria-label="Heure d'ouverture ${day.label}"
        >
        <span class="hours-sep">→</span>
        <input
          class="hours-input"
          type="time"
          id="close-${day.key}"
          value="${day.close}"
          onchange="updateHourValue('${day.key}', 'close', this.value)"
          aria-label="Heure de fermeture ${day.label}"
        >
        <span class="hours-closed-label" id="closed-label-${day.key}" style="${!day.isOpen ? 'display:block' : ''}">Fermé</span>
      </div>
    </div>
  `).join('');
}

function toggleDay(key, index) {
  const day      = hoursData[index];
  day.isOpen     = !day.isOpen;
  const toggle   = document.getElementById(`hours-toggle-${key}`);
  const inputs   = document.getElementById(`hours-inputs-${key}`);
  const label    = toggle?.nextElementSibling;
  const closedLb = document.getElementById(`closed-label-${key}`);

  if (toggle) { toggle.classList.toggle('on', day.isOpen); toggle.setAttribute('aria-checked', day.isOpen); }
  if (inputs) inputs.classList.toggle('disabled', !day.isOpen);
  if (label)  label.textContent = day.isOpen ? 'Ouvert' : 'Fermé';
  if (closedLb) closedLb.style.display = !day.isOpen ? 'block' : 'none';
}

function updateHourValue(key, field, value) {
  const day = hoursData.find(d => d.key === key);
  if (day) day[field] = value;
}

function toggleEmergencyClose() {
  emergencyClosed = !emergencyClosed;
  eResto.setRestaurantStatus(emergencyClosed ? 'closed' : 'open');
  const btn = document.getElementById('emergency-btn-text');
  if (btn) btn.textContent = emergencyClosed ? 'Rouvrir maintenant' : 'Fermer maintenant';
  eResto.showToast(
    emergencyClosed ? '🔒 Restaurant fermé exceptionnellement.' : '✅ Restaurant rouvert !',
    emergencyClosed ? 'error' : 'success'
  );
}

// =====================================================
// NOTIFICATIONS
// =====================================================
function renderNotifToggles() {
  const container = document.getElementById('notif-toggles-list');
  if (!container) return;
  const saved = JSON.parse(localStorage.getItem('eresto_settings') || '{}').notifs || {};

  container.innerHTML = NOTIF_SETTINGS.map(n => {
    const isOn = saved[n.key] !== undefined ? saved[n.key] : n.on;
    return `
      <div class="notif-toggle-row">
        <div class="notif-toggle-info">
          <p class="notif-toggle-title">${n.title}</p>
          <p class="notif-toggle-desc">${n.desc}</p>
        </div>
        <button
          type="button"
          class="toggle-switch ${isOn ? 'on' : ''}"
          id="notif-${n.key}"
          role="switch"
          aria-checked="${isOn}"
          aria-label="${n.title}"
          onclick="this.classList.toggle('on');this.setAttribute('aria-checked',this.classList.contains('on'));updateNotifLabel(this)"
        ></button>
      </div>
    `;
  }).join('');
}

function updateNotifLabel(btn) {
  // Visual feedback
  const label = btn.closest('.notif-toggle-row')?.querySelector('.notif-toggle-title')?.textContent;
  const isOn = btn.classList.contains('on');
  eResto.showToast(`Notification "${label}" : ${isOn ? 'activée' : 'désactivée'}`, 'info', 2000);
}

function playNotifSound(type) {
  const msgs = { ping: '🔔 Son "Ping" sélectionné', chime: '🎵 Son "Chime" sélectionné', off: '🔇 Notifications silencieuses' };
  eResto.showToast(msgs[type] || 'Son mis à jour', 'info', 2000);
}

// =====================================================
// ACCOUNT — Password
// =====================================================
function changePassword() {
  const oldPw  = document.getElementById('s-old-pw')?.value;
  const newPw  = document.getElementById('s-new-pw')?.value;
  const confPw = document.getElementById('s-confirm-pw')?.value;

  if (!oldPw) { eResto.showToast('Entrez votre mot de passe actuel.', 'error'); return; }
  if (newPw.length < 6) { eResto.showToast('Le nouveau mot de passe doit faire au moins 6 caractères.', 'error'); return; }
  if (newPw !== confPw) { eResto.showToast('Les mots de passe ne correspondent pas.', 'error'); return; }

  const user = eResto.state.currentUser;
  if (user && oldPw !== user.password) {
    eResto.showToast('Mot de passe actuel incorrect.', 'error');
    return;
  }

  // Simulate update
  eResto.simulateRequest(600).then(() => {
    if (user) {
      user.password = newPw;
      localStorage.setItem('eresto_current_user', JSON.stringify(user));
    }
    ['s-old-pw','s-new-pw','s-confirm-pw'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const meter = document.getElementById('pw-strength-meter');
    if (meter) meter.style.display = 'none';
    eResto.showToast('Mot de passe mis à jour avec succès !', 'success');
  });
}

function updatePasswordStrengthSettings(password) {
  const meter  = document.getElementById('pw-strength-meter');
  const bars   = document.querySelectorAll('#pw-strength-meter .strength-bar');
  const label  = document.getElementById('pw-strength-label');

  if (!password) { if (meter) meter.style.display = 'none'; return; }
  if (meter) meter.style.display = 'flex';

  const result = eResto.checkPasswordStrength(password);
  bars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (i < result.score) bar.classList.add(`active-${result.score}`);
  });
  const colors = { 1:'#ba1a1a', 2:'#f97316', 3:'#eab308', 4:'#2E9E5B', 5:'#006d38' };
  if (label) { label.textContent = `Force : ${result.label}`; label.style.color = colors[result.score] || 'var(--on-surface-variant)'; }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';
}

function logoutAllSessions() {
  eResto.confirm('Déconnecter toutes vos sessions ?', 'Sécurité du compte').then(ok => {
    if (ok) {
      eResto.showToast('Toutes les sessions ont été révoquées.', 'success');
      setTimeout(() => eResto.logout(), 1500);
    }
  });
}

// =====================================================
// ACCOUNT — Delete
// =====================================================
async function confirmDeleteAccount() {
  const ok = await eResto.confirm(
    'Cette action est irréversible. Toutes vos données seront supprimées. Continuer ?',
    'Supprimer le compte'
  );
  if (ok) {
    eResto.showToast('Compte supprimé. À bientôt !', 'error');
    setTimeout(() => {
      localStorage.clear();
      window.location.href = `${ERESTO_BASE}pages/auth/connexion.html`;
    }, 1500);
  }
}

// =====================================================
// LOGO PREVIEW
// =====================================================
function previewLogo(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { eResto.showToast('Format de fichier non supporté.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('logo-preview');
    if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="Logo du restaurant">`;
    eResto.showToast('Photo mise à jour !', 'success');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  const preview = document.getElementById('logo-preview');
  if (preview) preview.innerHTML = `<span class="material-symbols-outlined filled" style="font-size:36px;color:var(--primary)">restaurant</span>`;
  eResto.showToast('Photo supprimée.', 'info');
}

// =====================================================
// INVOICES
// =====================================================
function renderInvoices() {
  const list = document.getElementById('invoices-list');
  if (!list) return;
  list.innerHTML = INVOICES.map(inv => `
    <div class="invoice-row">
      <span class="invoice-date">${inv.date}</span>
      <span class="invoice-amount">${inv.amount}</span>
      <span class="invoice-status"><span class="badge badge-green">Payée</span></span>
      <button class="btn-icon" title="Télécharger la facture" onclick="downloadInvoice('${inv.date}')">
        <span class="material-symbols-outlined" style="font-size:18px">download</span>
      </button>
    </div>
  `).join('');
}

function downloadInvoice(date) {
  eResto.showToast(`Facture du ${date} téléchargée.`, 'success');
}

// =====================================================
// MOBILE SIDEBAR
// =====================================================
function initMobileSidebar() {
  const toggle  = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}
