'use strict';

let activeResId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderReservations();
  initReservationsKPI();
  document.getElementById('reservations-search')?.addEventListener('input', e => renderReservations(e.target.value));
  const tInput = document.getElementById('total-tables-input');
  if (tInput) {
    tInput.value = eResto.getPublishedTableCount();
    tInput.addEventListener('change', updateTotalTables);
  }
  const newBtn = document.getElementById('btn-new-reservation');
  if (newBtn) newBtn.addEventListener('click', openNewReservationModal);
  // When time changes in modal, refresh available table list
  const resTime = document.getElementById('res-time');
  if (resTime) {
    resTime.addEventListener('input', () => populateTableSelect(resTime.value, activeResId));
    resTime.addEventListener('change', () => populateTableSelect(resTime.value, activeResId));
  }
  // Reflect a client's cancellation request (or any cross-tab change) live
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith('eresto_reservations_')) return;
    eResto.loadUserData();
    renderReservations(document.getElementById('reservations-search')?.value || '');
    initReservationsKPI();
  });
});
// Ensure sidebar overlay is closed when visiting the reservations page
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('sidebar-overlay');
  const sidebar = document.getElementById('sidebar');
  if (overlay) overlay.classList.remove('active');
  if (sidebar) sidebar.classList.remove('open');
});

function renderReservations(query = '') {
  const tbody = document.getElementById('reservations-table-body');
  if (!tbody) return;
  const list = (eResto.state.reservations || []).filter(r => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (r.name || '').toLowerCase().includes(q) || (r.phone||'').toLowerCase().includes(q);
  }).sort((a,b) => (a.time||'').localeCompare(b.time||''));

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--on-surface-variant)">Aucune réservation</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(r => {
    const statusBadge = r.status === 'arrived'
      ? '<span class="badge badge-green">Arrivé</span>'
      : r.status === 'cancelled'
        ? '<span class="badge badge-red">Annulé</span>'
        : '<span class="badge badge-gray">Réservé</span>';

    const cancelRequestTag = (r.cancelRequested && r.status === 'reserved')
      ? '<div style="margin-top:4px"><span class="badge badge-orange" style="font-size:11px">Annulation demandée</span></div>'
      : '';

    const isActive = r.status === 'reserved';

    return `
    <tr>
      <td><strong>${r.name}</strong></td>
      <td>${r.phone || '—'}</td>
      <td>${r.guests || 1}</td>
      <td>${r.time || '—'}</td>
      <td>${r.table ? 'T.' + r.table : '—'}</td>
      <td>${statusBadge}${cancelRequestTag}</td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="editReservation('${r.id}')">Éditer</button>
          ${isActive ? `<button class="btn ${r.cancelRequested ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="cancelReservation('${r.id}')">Annuler</button>` : ''}
          ${isActive ? `<button class="btn btn-primary btn-sm" onclick="convertReservationToOrder('${r.id}')">Arrivée</button>` : ''}
          <button class="btn-icon" style="padding:6px" title="Supprimer définitivement" onclick="deleteReservation('${r.id}')">
            <span class="material-symbols-outlined" style="font-size:18px">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function timeToMins(t) {
  if (!t || typeof t !== 'string') return -9999;
  const parts = t.split(':');
  if (parts.length < 2) return -9999;
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function getAvailableTables(time, excludeId) {
  const total = parseInt(eResto.state.totalTables, 10) || 10;
  
  const existing = (eResto.state.reservations || []).filter(r => {
    if (r.status === 'cancelled') return false;
    if (r.id === excludeId) return false;
    if (!r.table) return false;
    
    // On bloque purement et simplement la table dès qu'elle a une réservation non-annulée
    return true;
  });
  
  const used = existing.map(r => parseInt(r.table, 10)).filter(t => !isNaN(t));
  const available = [];
  for (let t = 1; t <= total; t++) {
    if (!used.includes(t)) {
      available.push(t);
    }
  }
  return available;
}

function populateTableSelect(time, excludeId) {
  const sel = document.getElementById('res-table');
  if (!sel) return;
  const avail = getAvailableTables(time, excludeId);
  const total = eResto.state.totalTables || 10;
  // clear
  sel.innerHTML = '<option value="">— Table automatique —</option>';
  avail.forEach(t => {
    const opt = document.createElement('option'); opt.value = String(t); opt.textContent = 'Table ' + t; sel.appendChild(opt);
  });
  // if no available, show disabled placeholder
  if (avail.length === 0) {
    const opt = document.createElement('option'); opt.value = ''; opt.textContent = 'Aucune table disponible'; opt.disabled = true; sel.appendChild(opt);
  }
}

function initReservationsKPI() {
  const grid = document.getElementById('reservations-kpi');
  if (!grid) return;
  const all = eResto.state.reservations || [];
  const upcoming = all.filter(r => r.status !== 'cancelled' && r.status !== 'arrived').length;
  const arrived = all.filter(r => r.status === 'arrived').length;
  const cancelled = all.filter(r => r.status === 'cancelled').length;

  const data = [
    { id: 'upcoming', label: 'À venir', value: upcoming, icon: 'event', color: 'orange' },
    { id: 'arrived', label: 'Arrivés', value: arrived, icon: 'check_circle', color: 'green' },
    { id: 'cancelled', label: 'Annulées', value: cancelled, icon: 'cancel', color: 'red' },
  ];

  grid.innerHTML = data.map((m,i) => `
    <div class="metric-card animate-fade-in" id="metric-${m.id}" aria-label="${m.label}: ${m.value}">
      <div class="metric-header">
        <span class="metric-label">${m.label}</span>
        <div class="metric-icon ${m.color}"><span class="material-symbols-outlined filled" style="font-size:20px">${m.icon}</span></div>
      </div>
      <div class="metric-value">${m.value}</div>
    </div>
  `).join('');
}

function openNewReservationModal() {
  activeResId = null;
  document.getElementById('reservation-modal-title').textContent = 'Nouvelle réservation';
  document.getElementById('res-name').value = '';
  document.getElementById('res-phone').value = '';
  document.getElementById('res-guests').value = 2;
  // set default time to next quarter hour
  const now = new Date();
  const mins = now.getMinutes();
  const nextQuarter = Math.ceil((mins + 1) / 15) * 15;
  now.setMinutes(nextQuarter);
  now.setSeconds(0);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes() % 60).padStart(2, '0');
  document.getElementById('res-time').value = `${hh}:${mm}`;
  document.getElementById('res-note').value = '';
  populateTableSelect(document.getElementById('res-time').value, null);
  // ensure overlay closed and modal visible
  document.getElementById('sidebar-overlay')?.classList.remove('active');
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('reservation-modal').classList.add('active');
  // focus name field
  setTimeout(() => document.getElementById('res-name')?.focus(), 60);
}

function closeReservationModal() {
  document.getElementById('reservation-modal')?.classList.remove('active');
  activeResId = null;
}

function saveReservation() {
  const name = document.getElementById('res-name').value.trim();
  const phone = document.getElementById('res-phone').value.trim();
  const guests = parseInt(document.getElementById('res-guests').value, 10) || 1;
  const time = document.getElementById('res-time').value;
  const tableSel = document.getElementById('res-table')?.value || '';
  const note = document.getElementById('res-note').value.trim();
  if (!name) { eResto.showToast('Le nom est requis', 'error'); return; }
  if (!time) { eResto.showToast('L\'heure est requise', 'error'); return; }

  if (!activeResId) {
    // determine table: use selected if provided and available, else auto assign
    let table = null;
    if (tableSel) {
      table = parseInt(tableSel, 10);
      const avail = getAvailableTables(time, null);
      if (!avail.includes(table)) { eResto.showToast('Table non disponible à cette heure.', 'error'); return; }
    } else {
      const avail = getAvailableTables(time, null);
      if (avail.length === 0) { eResto.showToast('Aucune table disponible à cette heure.', 'error'); return; }
      table = avail[0];
    }
    const id = 'R' + Date.now();
    const res = { id, name, phone, guests, time, note, status: 'reserved', table };
    eResto.state.reservations = eResto.state.reservations || [];
    eResto.state.reservations.push(res);
    eResto.saveUserData('reservations');
    eResto.showToast('Réservation créée (Table ' + table + ')', 'success');
  } else {
    const res = (eResto.state.reservations || []).find(r => r.id === activeResId);
    if (!res) return;
    // If time changed or user selected a table, validate selection
    const tableSelEdit = document.getElementById('res-table')?.value || '';
    let table = res.table || null;
    if (tableSelEdit) {
      const tnum = parseInt(tableSelEdit, 10);
      const avail = getAvailableTables(time, activeResId);
      if (!avail.includes(tnum)) { eResto.showToast('Table non disponible à cette heure.', 'error'); return; }
      table = tnum;
    } else {
      // ensure current table still available at new time; otherwise reassign
      const avail = getAvailableTables(time, activeResId);
      if (!table || !avail.includes(table)) {
        if (avail.length === 0) { eResto.showToast('Aucune table disponible à cette heure.', 'error'); return; }
        table = avail[0];
      }
    }
    res.name = name; res.phone = phone; res.guests = guests; res.time = time; res.note = note; res.table = table;
    eResto.saveUserData('reservations');
    eResto.showToast('Réservation mise à jour', 'success');
  }

  closeReservationModal();
  renderReservations();
  initReservationsKPI();
}

function editReservation(id) {
  const res = (eResto.state.reservations || []).find(r => r.id === id);
  if (!res) return;
  activeResId = id;
  document.getElementById('reservation-modal-title').textContent = 'Modifier réservation';
  document.getElementById('res-name').value = res.name || '';
  document.getElementById('res-phone').value = res.phone || '';
  document.getElementById('res-guests').value = res.guests || 2;
  document.getElementById('res-time').value = res.time || '';
  // populate table options for this time and select current
  populateTableSelect(res.time || '', id);
  if (res.table) document.getElementById('res-table').value = String(res.table);
  document.getElementById('res-note').value = res.note || '';
  document.getElementById('reservation-modal').classList.add('active');
}

// Marks a reservation as cancelled by the restaurant: the record stays in
// the list (so it's still visible/traceable and counted in the KPIs) and
// the client is notified via their own reservation history.
async function cancelReservation(id) {
  const res = (eResto.state.reservations || []).find(r => r.id === id);
  if (!res) return;
  const confirmed = await eResto.confirm(`Annuler la réservation de ${res.name} ? Le client sera notifié.`, 'Annuler la réservation');
  if (!confirmed) return;

  res.status = 'cancelled';
  res.cancelRequested = false;
  eResto.saveUserData('reservations');
  eResto.syncReservationToClient(res); // let the client know their reservation was cancelled
  eResto.showToast('Réservation annulée. Le client a été notifié.', 'info');
  renderReservations();
  initReservationsKPI();
}

// Permanently removes a reservation record (e.g. a duplicate or a mistake).
// This does NOT notify the client as "cancelled" — use cancelReservation()
// for that. Kept separate so cancelling never silently erases the record.
async function deleteReservation(id) {
  const list = eResto.state.reservations || [];
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return;
  const confirmed = await eResto.confirm('Supprimer définitivement cette réservation ? Cette action est irréversible.', 'Supprimer la réservation');
  if (!confirmed) return;

  list.splice(idx, 1);
  eResto.saveUserData('reservations');
  eResto.showToast('Réservation supprimée', 'info');
  renderReservations();
  initReservationsKPI();
}

function convertReservationToOrder(id) {
  const res = (eResto.state.reservations || []).find(r => r.id === id);
  if (!res) return;
  // create a new order for the reservation arrival
  const newId = '#B' + Date.now();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const order = {
    id: newId,
    customer: res.name,
    status: 'received',
    total: 0,
    time: timeStr,
    items: [],
    note: res.note || '',
    reservation: { ...res, status: 'arrived' }
  };
  eResto.state.orders = eResto.state.orders || [];
  eResto.state.orders.unshift(order);
  // mark reservation as arrived
  res.status = 'arrived';
  // ensure reservation persists with table/status
  eResto.saveUserData('reservations');

  eResto.saveUserData('orders');
  eResto.saveUserData('reservations');
  eResto.syncReservationToClient(res); // reflect "arrivée" status in the client's own account
  eResto.showToast('Client arrivé — commande créée', 'success');
  renderReservations();
  initReservationsKPI();
}

function updateTotalTables() {
  const el = document.getElementById('total-tables-input');
  if (!el) return;
  const val = eResto.publishTableCount(el.value);
  el.value = val;
  initReservationsKPI();
  renderReservations();
  eResto.showToast('Nombre total de tables mis à jour', 'success');
}