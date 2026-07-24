/**
 * eResto - Horaires Page JavaScript
 * Manage weekly opening hours & workdays per user, persisted in localStorage
 */

'use strict';

const DAYS = [
  { key: 'lundi',     label: 'Lundi' },
  { key: 'mardi',     label: 'Mardi' },
  { key: 'mercredi',  label: 'Mercredi' },
  { key: 'jeudi',     label: 'Jeudi' },
  { key: 'vendredi',  label: 'Vendredi' },
  { key: 'samedi',    label: 'Samedi' },
  { key: 'dimanche',  label: 'Dimanche' },
];

const DEFAULT_HOURS = {
  lundi:    { open: true,  debut: '11:00', fin: '22:00', pauseActive: false, pauseDebut: '14:30', pauseFin: '18:00' },
  mardi:    { open: true,  debut: '11:00', fin: '22:00', pauseActive: false, pauseDebut: '14:30', pauseFin: '18:00' },
  mercredi: { open: true,  debut: '11:00', fin: '22:00', pauseActive: false, pauseDebut: '14:30', pauseFin: '18:00' },
  jeudi:    { open: true,  debut: '11:00', fin: '23:00', pauseActive: false, pauseDebut: '14:30', pauseFin: '18:00' },
  vendredi: { open: true,  debut: '11:00', fin: '23:30', pauseActive: false, pauseDebut: '14:30', pauseFin: '18:00' },
  samedi:   { open: true,  debut: '10:00', fin: '23:30', pauseActive: false, pauseDebut: '15:00', pauseFin: '18:00' },
  dimanche: { open: false, debut: '11:00', fin: '21:00', pauseActive: false, pauseDebut: '14:30', pauseFin: '18:00' },
};

let horaires = {};

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  loadHoraires();
  renderWorkdaySelector();
  renderHoraires();
  updateCurrentStatus();
  publishHorairesForClients();
});

// =====================================================
// USER UI
// =====================================================
function updateUserUI() {
  const user = eResto.state.currentUser;
  if (!user) return;
  const initials = eResto.getInitials(user.name || 'U');
  const color    = eResto.getAvatarColor(user.name || 'U');

  const sa = document.getElementById('sidebar-avatar');
  if (sa) { sa.textContent = initials; sa.style.background = color; }
  const sn = document.getElementById('sidebar-user-name');
  if (sn) sn.textContent = user.name;
  const se = document.getElementById('sidebar-user-email');
  if (se) se.textContent = user.email;
}

// =====================================================
// LOAD / SAVE
// =====================================================
function loadHoraires() {
  const saved = eResto.state.horaires;
  if (saved && Object.keys(saved).length > 0) {
    horaires = saved;
  } else {
    // New account → start with sensible defaults
    const user = eResto.state.currentUser;
    const isDemo = user && user.id === 'demo';
    horaires = isDemo ? { ...DEFAULT_HOURS } : {};
    DAYS.forEach(d => {
      if (!horaires[d.key]) {
        horaires[d.key] = { open: false, debut: '09:00', fin: '22:00', pauseActive: false, pauseDebut: '14:00', pauseFin: '18:00' };
      }
    });
  }
}

function saveHoraires() {
  eResto.state.horaires = horaires;
  eResto.saveUserData('horaires');
  publishHorairesForClients();
}

// Converts the admin's internal hours format (object keyed by day, with
// "debut"/"fin" fields) into the array shape the client reservation page
// reads, and publishes it under the restaurant-scoped key so a client can
// never book a day/time the restaurant isn't actually open for.
function publishHorairesForClients() {
  const restId = eResto.getMyRestaurantId ? eResto.getMyRestaurantId() : null;
  if (!restId) return;
  const publicSchedule = DAYS.map(d => {
    const day = horaires[d.key] || {};
    return {
      key: d.key,
      label: d.label,
      isOpen: !!day.open,
      open: day.debut || '',
      close: day.fin || '',
    };
  });
  localStorage.setItem(`eresto_horaires_${restId}`, JSON.stringify(publicSchedule));
}

// =====================================================
// WORKDAY SELECTOR RENDER
// =====================================================
function renderWorkdaySelector() {
  const container = document.getElementById('workday-chips-container');
  if (!container) return;

  container.innerHTML = DAYS.map(({ key, label }) => {
    const isOpen = horaires[key]?.open;
    return `
      <button
        class="day-chip ${isOpen ? 'active' : ''}"
        onclick="toggleWorkday('${key}')"
        type="button"
        aria-pressed="${isOpen}"
      >
        <span class="material-symbols-outlined chip-icon">
          ${isOpen ? 'check_circle' : 'cancel'}
        </span>
        ${label}
      </button>
    `;
  }).join('');
}

function toggleWorkday(key) {
  if (!horaires[key]) {
    horaires[key] = { open: false, debut: '09:00', fin: '22:00', pauseActive: false, pauseDebut: '14:00', pauseFin: '18:00' };
  }
  horaires[key].open = !horaires[key].open;
  saveHoraires();
  renderWorkdaySelector();
  renderHoraires();
  updateCurrentStatus();

  const label = DAYS.find(d => d.key === key)?.label || key;
  if (horaires[key].open) {
    eResto.showToast(`${label} ajouté aux jours de travail.`, 'success');
  } else {
    eResto.showToast(`${label} défini comme jour de repos.`, 'info');
  }
}

// =====================================================
// RENDER HORAIRES CARDS
// =====================================================
function renderHoraires() {
  const grid = document.getElementById('horaires-grid');
  if (!grid) return;

  const openDays   = DAYS.filter(d => horaires[d.key]?.open);
  const closedDays = DAYS.filter(d => !horaires[d.key]?.open);

  if (openDays.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 24px;background:var(--surface);border:1.5px dashed var(--outline-variant);border-radius:var(--radius-xl)">
        <span class="material-symbols-outlined" style="font-size:44px;color:var(--error);display:block;margin-bottom:12px">event_busy</span>
        <h3 style="font-family:var(--font-display);font-size:18px;font-weight:800;margin-bottom:6px">Aucun jour de travail sélectionné</h3>
        <p style="font-size:14px;color:var(--on-surface-variant);margin-bottom:16px">Cliquez sur les jours ci-dessus pour indiquer vos jours d'ouverture.</p>
        <button class="btn btn-primary btn-sm" onclick="presetWeekdays()">Activer la semaine classique (Lun–Sam)</button>
      </div>
    `;
    return;
  }

  let html = `
    <div style="grid-column:1/-1">
      <div class="horaires-section-title" style="color:var(--brand-green);margin-top:0">
        <span class="material-symbols-outlined">work</span>
        Jours de travail et horaires d'ouverture (${openDays.length}/7 jours)
      </div>
    </div>
  `;

  // Render open days
  html += openDays.map(({ key, label }) => renderCardMarkup(key, label, true)).join('');

  // Render closed days header & cards if any
  if (closedDays.length > 0) {
    html += `
      <div style="grid-column:1/-1">
        <div class="horaires-section-title" style="color:var(--on-surface-variant);opacity:0.8">
          <span class="material-symbols-outlined">block</span>
          Jours de repos / fermeture (${closedDays.length})
        </div>
      </div>
    `;
    html += closedDays.map(({ key, label }) => renderCardMarkup(key, label, false)).join('');
  }

  grid.innerHTML = html;
}

function renderCardMarkup(key, label, isOpen) {
  const h = horaires[key] || { debut: '09:00', fin: '22:00', pauseActive: false, pauseDebut: '14:00', pauseFin: '18:00' };

  return `
    <div class="horaire-card ${isOpen ? 'open' : 'closed'}" id="card-${key}">
      <div class="horaire-card-header">
        <div>
          <p class="horaire-day">${label}</p>
          <p class="horaire-status-label ${isOpen ? 'open' : 'closed'}">${isOpen ? 'Ouvert' : 'Jour de repos (Fermé)'}</p>
        </div>
        <button
          class="btn btn-ghost btn-sm"
          style="padding:6px 12px;font-size:12px;color:${isOpen ? 'var(--error)' : 'var(--brand-green)'}"
          onclick="toggleWorkday('${key}')"
        >
          <span class="material-symbols-outlined" style="font-size:16px">${isOpen ? 'remove_circle' : 'add_circle'}</span>
          ${isOpen ? 'Retirer' : 'Travailler'}
        </button>
      </div>

      <div class="horaire-times ${isOpen ? '' : 'hidden'}" id="times-${key}">
        <div class="time-row">
          <div class="time-group">
            <label class="time-label">Ouverture</label>
            <input type="time" class="time-input" id="debut-${key}" value="${h.debut}"
              onchange="updateTime('${key}','debut',this.value)">
          </div>
          <div class="time-separator">→</div>
          <div class="time-group">
            <label class="time-label">Fermeture</label>
            <input type="time" class="time-input" id="fin-${key}" value="${h.fin}"
              onchange="updateTime('${key}','fin',this.value)">
          </div>
        </div>

        <div class="pause-section">
          <label class="pause-toggle-label">
            <input type="checkbox" class="pause-checkbox" id="pause-${key}" ${h.pauseActive ? 'checked' : ''}
              onchange="togglePause('${key}', this.checked)">
            <span>Coupure de service</span>
          </label>
          <div class="pause-times ${h.pauseActive ? '' : 'hidden'}" id="pause-times-${key}">
            <input type="time" class="time-input sm" id="pauseDebut-${key}" value="${h.pauseDebut || '14:30'}"
              onchange="updateTime('${key}','pauseDebut',this.value)">
            <span style="opacity:0.5;font-size:12px">→</span>
            <input type="time" class="time-input sm" id="pauseFin-${key}" value="${h.pauseFin || '18:00'}"
              onchange="updateTime('${key}','pauseFin',this.value)">
          </div>
        </div>
      </div>
    </div>
  `;
}

// =====================================================
// ACTIONS
// =====================================================
function updateTime(key, field, value) {
  if (!horaires[key]) return;
  horaires[key][field] = value;
  saveHoraires();
  updateCurrentStatus();
}

function togglePause(key, active) {
  if (!horaires[key]) return;
  horaires[key].pauseActive = active;
  const pauseTimes = document.getElementById(`pause-times-${key}`);
  if (pauseTimes) pauseTimes.classList.toggle('hidden', !active);
  saveHoraires();
  updateCurrentStatus();
}

// =====================================================
// CURRENT STATUS BANNER
// =====================================================
function updateCurrentStatus() {
  const now    = new Date();
  const dayIdx = (now.getDay() + 6) % 7; // 0=lundi
  const dayKey = DAYS[dayIdx].key;
  const h      = horaires[dayKey];
  const banner = document.getElementById('current-status-banner');
  if (!banner) return;

  if (!h || !h.open) {
    banner.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">schedule</span> Aujourd'hui (${DAYS[dayIdx].label}) : Jour de repos / Fermé`;
    banner.className = 'status-banner closed';
    return;
  }

  const toMin = (t) => { const [hh, mm] = (t||'00:00').split(':').map(Number); return hh * 60 + mm; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const debutMin = toMin(h.debut);
  const finMin   = toMin(h.fin);

  const inPause = h.pauseActive && nowMin >= toMin(h.pauseDebut) && nowMin < toMin(h.pauseFin);
  const isOpen  = nowMin >= debutMin && nowMin < finMin && !inPause;

  if (isOpen) {
    banner.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">check_circle</span> Ouvert maintenant · Ferme à ${h.fin}`;
    banner.className = 'status-banner open';
  } else if (inPause) {
    banner.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">pause_circle</span> En coupure · Reprend à ${h.pauseFin}`;
    banner.className = 'status-banner pause';
  } else if (nowMin < debutMin) {
    banner.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">schedule</span> Ouvre aujourd'hui à ${h.debut}`;
    banner.className = 'status-banner upcoming';
  } else {
    banner.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">lock</span> Fermé pour aujourd'hui`;
    banner.className = 'status-banner closed';
  }
}

// =====================================================
// PRESET ACTIONS
// =====================================================
function presetWeekdays() {
  ['lundi','mardi','mercredi','jeudi','vendredi','samedi'].forEach(k => {
    horaires[k] = { open: true, debut: '11:00', fin: '22:00', pauseActive: false, pauseDebut: '14:30', pauseFin: '18:00' };
  });
  horaires['dimanche'] = { open: false, debut: '11:00', fin: '21:00', pauseActive: false, pauseDebut: '14:00', pauseFin: '18:00' };
  saveHoraires();
  renderWorkdaySelector();
  renderHoraires();
  updateCurrentStatus();
  eResto.showToast('Jours de travail configurés : Lun – Sam.', 'success');
}

function presetAllOpen() {
  DAYS.forEach(d => {
    horaires[d.key] = { open: true, debut: '09:00', fin: '23:00', pauseActive: false, pauseDebut: '15:00', pauseFin: '18:00' };
  });
  saveHoraires();
  renderWorkdaySelector();
  renderHoraires();
  updateCurrentStatus();
  eResto.showToast('Tous les jours (7j/7) configurés comme jours de travail.', 'success');
}
