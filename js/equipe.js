/**
 * eResto - Équipe (Team) Page JavaScript
 * Staff CRUD, stats, dual view (cards/table)
 */

'use strict';

let currentStaffFilter = 'all';
let currentDeptFilter  = 'all';
let currentStaffView   = 'cards';

const ROLE_LABELS = {
  'Executive Chef': 'Chef Exécutif',
  'Sous Chef':      'Sous Chef',
  'Line Cook':      'Cuisinier',
  'Floor Manager':  'Manager de Salle',
  'Senior Waiter':  'Serveur Senior',
  'Wait Staff':     'Serveur',
  'Bartender':      'Barman',
  'Cashier':        'Caissier',
};

const DEPT_LABELS = {
  Kitchen:    'Cuisine',
  Floor:      'Salle',
  Bar:        'Bar',
  Management: 'Direction',
};

const SCHEDULE_LABELS = {
  'Full-Time': 'Temps plein',
  'Part-Time': 'Temps partiel',
  'Contract':  'CDD',
  'Seasonal':  'Saisonnier',
};

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  renderDeptFilters();
  renderStaffMetrics();
  renderStaff();
  initStaffSearch();
  initModalEvents();
  initStatusMenu();
});

// =====================================================
// USER UI
// =====================================================
function updateUserUI() {
  const user = eResto.state.currentUser;
  if (!user) return;
  const initials = eResto.getInitials(user.name || 'U');
  const color    = eResto.getAvatarColor(user.name || 'U');

  ['topbar-avatar', 'sidebar-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = initials; el.style.background = color; }
  });
  ['topbar-user-name', 'sidebar-user-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = user.name;
  });
  const emailEl = document.getElementById('sidebar-user-email');
  if (emailEl) emailEl.textContent = user.email;
}

// =====================================================
// LABEL HELPERS
// =====================================================
function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function deptLabel(dept) {
  return DEPT_LABELS[dept] || dept;
}

function scheduleLabel(schedule) {
  return SCHEDULE_LABELS[schedule] || schedule;
}

function renderStars(rating) {
  const stars = Math.round(rating || 0);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="material-symbols-outlined ${i < stars ? '' : 'empty'}">star</span>`
  ).join('');
}

// =====================================================
// METRICS
// =====================================================
function renderStaffMetrics() {
  const grid = document.getElementById('staff-metric-grid');
  if (!grid) return;

  const staff      = eResto.state.staff;
  const total      = staff.length;
  const onDuty     = staff.filter(s => s.status === 'on_duty').length;
  const offDuty    = total - onDuty;
  const departments = new Set(staff.map(s => s.dept)).size;

  const metrics = [
    { label: 'Total Personnel', value: total,       icon: 'group',                color: 'gray' },
    { label: 'En Service',      value: onDuty,      icon: 'radio_button_checked', color: 'green', pulse: true },
    { label: 'Hors Service',    value: offDuty,     icon: 'radio_button_unchecked', color: 'gray' },
    { label: 'Départements',    value: departments, icon: 'domain',               color: 'orange' },
  ];

  grid.innerHTML = metrics.map((m, i) => `
    <div class="metric-card animate-fade-in" style="animation-delay:${i * 60}ms">
      <div class="metric-header">
        <span class="metric-label">${m.label}</span>
        <div class="metric-icon ${m.color}" style="position:relative">
          <span class="material-symbols-outlined filled" style="font-size:20px">${m.icon}</span>
          ${m.pulse ? '<span style="position:absolute;top:0;right:0;width:8px;height:8px;border-radius:50%;background:var(--brand-green);animation:pulse 2s infinite"></span>' : ''}
        </div>
      </div>
      <div class="metric-value" style="${m.color === 'green' ? 'color:var(--brand-green)' : m.color === 'orange' ? 'color:var(--primary)' : ''}">${m.value}</div>
    </div>
  `).join('');
}

// =====================================================
// DEPARTMENT FILTERS
// =====================================================
function renderDeptFilters() {
  const container = document.getElementById('dept-filters');
  if (!container) return;

  const depts = [...new Set(eResto.state.staff.map(s => s.dept))].sort();

  container.innerHTML = `
    <button class="filter-pill active" data-dept="all" onclick="filterByDept('all')">Tous les départements</button>
    ${depts.map(dept => `
      <button class="filter-pill" data-dept="${dept}" onclick="filterByDept('${dept}')">${deptLabel(dept)}</button>
    `).join('')}
  `;
}

function filterByDept(dept) {
  currentDeptFilter = dept;
  document.querySelectorAll('#dept-filters .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dept === dept);
  });
  renderStaff();
}

// =====================================================
// FILTER & SEARCH
// =====================================================
function getFilteredStaff() {
  let staff = [...eResto.state.staff];

  if (currentStaffFilter !== 'all') {
    staff = staff.filter(s => s.status === currentStaffFilter);
  }

  if (currentDeptFilter !== 'all') {
    staff = staff.filter(s => s.dept === currentDeptFilter);
  }

  const query = document.getElementById('staff-search')?.value.trim().toLowerCase();
  if (query) {
    staff = staff.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.role.toLowerCase().includes(query) ||
      roleLabel(s.role).toLowerCase().includes(query) ||
      s.dept.toLowerCase().includes(query) ||
      deptLabel(s.dept).toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query)
    );
  }

  return staff.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

function filterStaff(filter) {
  currentStaffFilter = filter;
  document.querySelectorAll('#staff-filters .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderStaff();
}

function initStaffSearch() {
  const input = document.getElementById('staff-search');
  if (!input) return;
  const debounced = eResto.debounce(() => renderStaff(), 250);
  input.addEventListener('input', debounced);
}

function updateStaffCountLabel(count) {
  const label = document.getElementById('staff-count-label');
  if (!label) return;
  label.textContent = count === 0
    ? 'Aucun membre correspondant aux filtres.'
    : `${count} membre${count !== 1 ? 's' : ''} affiché${count !== 1 ? 's' : ''}`;
}

// =====================================================
// VIEW TOGGLE
// =====================================================
function setStaffView(view) {
  currentStaffView = view;
  document.getElementById('staff-cards-view').style.display = view === 'cards' ? 'block' : 'none';
  document.getElementById('staff-table-view').style.display = view === 'table' ? 'block' : 'none';
  document.getElementById('view-cards-btn').classList.toggle('active', view === 'cards');
  document.getElementById('view-table-btn').classList.toggle('active', view === 'table');
  renderStaff();
}

function renderStaff() {
  if (currentStaffView === 'table') renderStaffTable();
  else renderStaffCards();
  updateStaffCountLabel(getFilteredStaff().length);
}

// =====================================================
// CARDS VIEW
// =====================================================
function renderStaffCards() {
  const container = document.getElementById('staff-grid');
  if (!container) return;

  const staff = getFilteredStaff();

  if (staff.length === 0) {
    container.innerHTML = `
      <div class="staff-empty">
        <span class="material-symbols-outlined">group_off</span>
        Aucun membre trouvé
      </div>
    `;
    return;
  }

  container.innerHTML = staff.map(member => `
    <article class="staff-card animate-fade-in" id="staff-card-${member.id}">
      <div class="staff-card-identity">
        <div class="staff-avatar" style="background:${member.color}">${member.initials}</div>
        <div class="staff-info">
          <p class="staff-name">${member.name}</p>
          <p class="staff-role">${roleLabel(member.role)}</p>
        </div>
      </div>

      <div class="staff-contact">
        <div class="staff-contact-item">
          <span class="material-symbols-outlined">mail</span>
          <span>${member.email}</span>
        </div>
        <div class="staff-contact-item">
          <span class="material-symbols-outlined">phone</span>
          <span>${member.phone}</span>
        </div>
      </div>

      <div class="staff-card-right">
        <span class="badge ${member.status === 'on_duty' ? 'badge-green' : 'badge-gray'}">
          ${member.status === 'on_duty' ? 'En service' : 'Hors service'}
        </span>
        <div class="staff-card-divider" aria-hidden="true"></div>
        <div class="staff-actions">
          <button
            class="staff-role-btn"
            onclick="openStaffModal(${member.id})"
            aria-label="Modifier le rôle de ${member.name}"
          >
            <span class="material-symbols-outlined">edit</span>
            Rôle
          </button>
          <button
            class="staff-delete-btn"
            onclick="deleteStaff(${member.id})"
            aria-label="Supprimer ${member.name}"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// =====================================================
// TABLE VIEW
// =====================================================
function renderStaffTable() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;

  const staff = getFilteredStaff();

  if (staff.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:56px;color:var(--on-surface-variant);opacity:0.5">
          <span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:10px">group_off</span>
          Aucun membre trouvé
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = staff.map(member => `
    <tr id="staff-row-${member.id}">
      <td>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="staff-avatar staff-avatar-sm" style="background:${member.color}">${member.initials}</div>
          <div>
            <div style="font-weight:700;font-size:13px">${member.name}</div>
            <div class="star-rating" style="margin-top:2px">${renderStars(member.rating)}</div>
          </div>
        </div>
      </td>
      <td><span style="font-size:13px;font-weight:600;color:var(--primary)">${roleLabel(member.role)}</span></td>
      <td><span style="font-size:12px;color:var(--on-surface-variant)">${deptLabel(member.dept)}</span></td>
      <td><span style="font-size:12px;color:var(--on-surface-variant)">${scheduleLabel(member.schedule)}</span></td>
      <td>
        <div style="font-size:12px;color:var(--on-surface-variant);line-height:1.5">
          <div>${member.email}</div>
          <div>${member.phone}</div>
        </div>
      </td>
      <td>
        <span class="badge ${member.status === 'on_duty' ? 'badge-green' : 'badge-gray'}">
          ${member.status === 'on_duty' ? 'En service' : 'Hors service'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-secondary btn-sm" style="padding:6px 10px;font-size:11px" onclick="openStaffModal(${member.id})">
            <span class="material-symbols-outlined" style="font-size:14px">edit</span>
            Rôle
          </button>
          <button class="btn-icon" style="padding:6px;color:var(--error);opacity:0.7" onclick="deleteStaff(${member.id})" aria-label="Supprimer ${member.name}">
            <span class="material-symbols-outlined" style="font-size:16px">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// =====================================================
// QUICK TOGGLE DUTY
// =====================================================
async function toggleDuty(memberId, toggleEl) {
  const member = eResto.state.staff.find(s => s.id === memberId);
  if (!member) return;

  const isOnDuty = toggleEl.classList.toggle('on');
  toggleEl.setAttribute('aria-checked', isOnDuty);
  member.status = isOnDuty ? 'on_duty' : 'off_duty';
  eResto.saveUserData('staff');

  eResto.showToast(
    `${member.name} est maintenant ${isOnDuty ? 'en service' : 'hors service'}.`,
    'info'
  );

  renderStaffMetrics();
  renderStaff();
}

// =====================================================
// STAFF CRUD MODAL
// =====================================================
function openStaffModal(memberId = null) {
  const modal = document.getElementById('staff-modal');
  const title = document.getElementById('staff-modal-title');

  document.getElementById('staff-form')?.reset();
  document.getElementById('staff-id').value = '';
  const dutyToggle = document.getElementById('staff-duty-toggle');
  dutyToggle.classList.add('on');
  dutyToggle.setAttribute('aria-checked', 'true');
  document.querySelectorAll('#staff-form .form-error').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('#staff-form .form-input').forEach(el => el.classList.remove('error'));

  if (memberId) {
    const member = eResto.state.staff.find(s => s.id === memberId);
    if (!member) return;

    title.textContent = 'Modifier le membre';
    document.getElementById('staff-id').value       = member.id;
    document.getElementById('staff-name').value     = member.name;
    document.getElementById('staff-role').value     = member.role;
    document.getElementById('staff-dept').value     = member.dept;
    document.getElementById('staff-email').value    = member.email;
    document.getElementById('staff-phone').value    = member.phone;
    document.getElementById('staff-schedule').value = member.schedule;

    const toggle = document.getElementById('staff-duty-toggle');
    toggle.classList.toggle('on', member.status === 'on_duty');
    toggle.setAttribute('aria-checked', member.status === 'on_duty');
  } else {
    title.textContent = 'Ajouter un membre';
  }

  modal.classList.add('active');
  document.getElementById('staff-name').focus();
}

function closeStaffModal() {
  document.getElementById('staff-modal')?.classList.remove('active');
}

async function saveStaff() {
  const name     = document.getElementById('staff-name').value.trim();
  const role     = document.getElementById('staff-role').value;
  const dept     = document.getElementById('staff-dept').value;
  const email    = document.getElementById('staff-email').value.trim();
  const phone    = document.getElementById('staff-phone').value.trim();
  const schedule = document.getElementById('staff-schedule').value;
  const isOnDuty = document.getElementById('staff-duty-toggle').classList.contains('on');
  const memberId = document.getElementById('staff-id').value;

  let valid = true;
  document.querySelectorAll('#staff-form .form-error').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('#staff-form .form-input').forEach(el => el.classList.remove('error'));

  if (!name) {
    document.getElementById('staff-name-error').classList.remove('hidden');
    document.getElementById('staff-name').classList.add('error');
    valid = false;
  }
  if (!role) {
    document.getElementById('staff-role-error').classList.remove('hidden');
    document.getElementById('staff-role').classList.add('error');
    valid = false;
  }
  if (!valid) return;

  const submitText = document.getElementById('staff-submit-text');
  const spinner    = document.getElementById('staff-spinner');
  submitText.style.opacity = '0';
  spinner.classList.remove('hidden');
  spinner.classList.add('spinner-dark');

  await eResto.simulateRequest(700);

  if (memberId) {
    const member = eResto.state.staff.find(s => s.id === parseInt(memberId));
    if (member) {
      member.name     = name;
      member.role     = role;
      member.dept     = dept;
      member.email    = email || member.email;
      member.phone    = phone || member.phone;
      member.schedule = schedule;
      member.status   = isOnDuty ? 'on_duty' : 'off_duty';
      member.initials = eResto.getInitials(name);
      member.color    = eResto.getAvatarColor(name);
      eResto.showToast(`${name} mis à jour avec succès !`, 'success');
    }
  } else {
    const newMember = {
      id:       Date.now(),
      name,
      role,
      dept,
      schedule,
      email:    email || `${name.split(' ')[0].toLowerCase()}@eresto.com`,
      phone:    phone || 'N/A',
      status:   isOnDuty ? 'on_duty' : 'off_duty',
      rating:   4,
      initials: eResto.getInitials(name),
      color:    eResto.getAvatarColor(name),
    };
    eResto.state.staff.push(newMember);
    eResto.showToast(`${name} ajouté à l'équipe !`, 'success');
  }

  submitText.style.opacity = '1';
  spinner.classList.add('hidden');

  eResto.saveUserData('staff');

  closeStaffModal();
  renderDeptFilters();
  renderStaffMetrics();
  renderStaff();
}

async function deleteStaff(memberId) {
  const member = eResto.state.staff.find(s => s.id === memberId);
  if (!member) return;

  const confirmed = await eResto.confirm(`Supprimer ${member.name} de l'équipe ?`, 'Supprimer le membre');
  if (!confirmed) return;

  eResto.state.staff = eResto.state.staff.filter(s => s.id !== memberId);
  eResto.saveUserData('staff');

  const card = document.getElementById(`staff-card-${memberId}`);
  const row  = document.getElementById(`staff-row-${memberId}`);
  const el   = card || row;
  if (el) {
    el.style.transition = 'all 0.3s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(-20px)';
    await eResto.simulateRequest(300);
  }

  eResto.showToast(`${member.name} retiré de l'équipe.`, 'info');
  renderDeptFilters();
  renderStaffMetrics();
  renderStaff();
}

// =====================================================
// EXPORT
// =====================================================
function exportStaff() {
  const data = eResto.state.staff.map(s => ({
    Nom: s.name,
    Rôle: roleLabel(s.role),
    Département: deptLabel(s.dept),
    Contrat: scheduleLabel(s.schedule),
    Email: s.email,
    Téléphone: s.phone,
    Statut: s.status === 'on_duty' ? 'En service' : 'Hors service',
  }));

  if (!data.length) {
    eResto.showToast('Aucun membre à exporter.', 'warning');
    return;
  }

  const csv = [
    Object.keys(data[0]).join(';'),
    ...data.map(row => Object.values(row).join(';'))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `eresto_equipe_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  eResto.showToast('Liste du personnel exportée !', 'success');
}

// =====================================================
// MODAL & STATUS MENU EVENTS
// =====================================================
function initModalEvents() {
  const modal = document.getElementById('staff-modal');
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal) closeStaffModal(); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeStaffModal(); });
}

function initStatusMenu() {
  document.addEventListener('click', e => {
    const statusMenu = document.getElementById('status-menu');
    if (statusMenu && !e.target.closest('#restaurant-status')) {
      statusMenu.classList.remove('visible');
    }
  });
}
