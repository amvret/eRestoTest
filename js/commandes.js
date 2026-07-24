/**
 * eResto — Commandes Page JavaScript
 * Full order management: table, kanban, detail modal, new order, live updates
 */
'use strict';

let currentStatusFilter = 'all';
let currentOrderView    = 'table';
let activeDetailId      = null;
let liveInterval        = null;
let orderIdCounter      = 4926;

const STATUS_CFG = {
  received:    { label: 'Reçue',      badge: 'badge-gray',   color: '#8d716a',        icon: 'inbox',            kanbanLabel: 'Reçues' },
  in_progress: { label: 'En cours',   badge: 'badge-orange', color: '#f0603d',        icon: 'hourglass_top',    kanbanLabel: 'En cours' },
  ready:       { label: 'Prête',      badge: 'badge-green',  color: '#2E9E5B',        icon: 'check_circle',     kanbanLabel: 'Prêtes' },
  delivered:   { label: 'Livrée',     badge: 'badge-green',  color: '#006d38',        icon: 'delivery_dining',  kanbanLabel: 'Livrées' },
  cancelled:   { label: 'Annulée',    badge: 'badge-red',    color: '#ba1a1a',        icon: 'cancel',           kanbanLabel: 'Annulées' },
};

const FLOW = ['received', 'in_progress', 'ready', 'delivered'];

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  initUserUI();
  enrichOrders();
  renderKPI();
  renderOrders();
  initSearch();
  initClickOutside();
  startLiveTicker();
  initOrderItemRows();

  // Auto-open new order modal if redirected from dashboard
  const pendingModal = sessionStorage.getItem('eresto_open_modal');
  if (pendingModal === 'new_order') {
    sessionStorage.removeItem('eresto_open_modal');
    setTimeout(() => openNewOrderModal(), 400);
  }
});


function matchMenuItem(menuItems, itemName) {
  if (!itemName || !Array.isArray(menuItems)) return null;
  let rawName = typeof itemName === 'string' ? itemName.replace(/^\d+x\s*/i, '').trim().toLowerCase() : '';
  let cleanOrderName = rawName.replace(/\bpcs\b/g, 'pièces');

  return menuItems.find(m => {
    if (!m || !m.name) return false;
    let cleanMenuName = m.name.trim().toLowerCase().replace(/\bpcs\b/g, 'pièces');
    return cleanMenuName === cleanOrderName || cleanMenuName.includes(cleanOrderName) || cleanOrderName.includes(cleanMenuName);
  }) || null;
}

// =====================================================
// ENRICH ORDERS (add items/time if missing)
// =====================================================
function enrichOrders() {
  const now = new Date();
  eResto.state.orders.forEach((o, i) => {
    const validItems = Array.isArray(o.items)
      ? o.items.map(name => matchMenuItem(eResto.state.menuItems, name)).filter(Boolean)
      : [];

    if (validItems.length > 0) {
      o.total = o.total || validItems.reduce((sum, item) => sum + item.price, 0);
    }

    if (!o.time) {
      const t = new Date(now - (i + 1) * 7 * 60000);
      o.time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    }
    if (!o.note) o.note = '';
  });
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
    const el = document.getElementById(id); if (el) el.textContent = user.name;
  });
  const em = document.getElementById('sidebar-user-email');
  if (em) em.textContent = user.email;
}

// =====================================================
// KPI
// =====================================================
function renderKPI() {
  const grid = document.getElementById('orders-kpi');
  if (!grid) return;
  const orders   = eResto.state.orders;
  const active   = orders.filter(o => ['received','in_progress','ready'].includes(o.status));
  const revenue  = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);

  const data = [
    { label: 'Commandes actives', value: active.length, icon: 'pending_actions', color: 'orange' },
    { label: 'Livrées aujourd\'hui', value: orders.filter(o=>o.status==='delivered').length, icon: 'delivery_dining', color: 'green' },
    { label: 'CA livré', value: eResto.formatCurrency(revenue), icon: 'payments', color: 'orange' },
  ];

  grid.innerHTML = data.map((m,i) => `
    <div class="metric-card animate-fade-in" style="animation-delay:${i*60}ms">
      <div class="metric-header">
        <span class="metric-label">${m.label}</span>
        <div class="metric-icon ${m.color}">
          <span class="material-symbols-outlined filled" style="font-size:20px">${m.icon}</span>
        </div>
      </div>
      <div class="metric-value">${m.value}</div>
    </div>
  `).join('');
}

// =====================================================
// FILTER
// =====================================================
function filterByStatus(status) {
  currentStatusFilter = status;
  document.querySelectorAll('#status-filters .filter-pill').forEach(b =>
    b.classList.toggle('active', b.dataset.status === status)
  );
  renderOrders();
}

function getFilteredOrders() {
  let orders = [...eResto.state.orders];
  if (currentStatusFilter !== 'all') orders = orders.filter(o => o.status === currentStatusFilter);
  const q = document.getElementById('orders-search')?.value.trim().toLowerCase();
  if (q) orders = orders.filter(o => o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q));
  return orders.sort((a, b) => b.id.localeCompare(a.id));
}

// =====================================================
// VIEW TOGGLE
// =====================================================
function setOrderView(view) {
  currentOrderView = view;
  document.getElementById('orders-table-view').style.display  = view === 'table'  ? 'block' : 'none';
  document.getElementById('orders-kanban-view').style.display = view === 'kanban' ? 'block' : 'none';
  document.getElementById('view-table-btn').classList.toggle('active',  view === 'table');
  document.getElementById('view-kanban-btn').classList.toggle('active', view === 'kanban');
  renderOrders();
}

// =====================================================
// RENDER DISPATCHER
// =====================================================
function renderOrders() {
  if (currentOrderView === 'kanban') renderKanban();
  else renderTable();
  renderKPI();
  renderLiveLabel();
}

function renderLiveLabel() {
  const el = document.getElementById('orders-live-label');
  if (el) {
    const now = new Date();
    el.innerHTML = `<span class="live-indicator"><span class="live-dot"></span>En direct</span> — dernière mise à jour ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  }
}

// =====================================================
// TABLE RENDER
// =====================================================
function renderTable() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  const orders = getFilteredOrders();
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:56px;color:var(--on-surface-variant);opacity:.5"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:10px">receipt_long</span>Aucune commande</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => {
    const s = STATUS_CFG[o.status] || STATUS_CFG.received;
    const unavailable = eResto.getUnavailableItems(o.items);
    return `
      <tr style="cursor:pointer; ${unavailable.length > 0 ? 'background:rgba(239,68,68,0.05)' : ''}" onclick="openOrderDetail('${o.id}')">
        <td><strong style="font-size:13px;font-family:var(--font-display)">${o.id}</strong></td>
        <td><span style="font-weight:600">${o.customer}</span></td>
        <td>
          <span style="font-size:12px;color:var(--on-surface-variant)">${(o.items||[]).slice(0,2).join(', ')}${o.items&&o.items.length>2?' +'+( o.items.length-2):''}</span>
          ${unavailable.length > 0 ? `<div style="color:var(--error);font-size:11px;font-weight:700;margin-top:2px"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">warning</span> Plat indisponible</div>` : ''}
        </td>
        <td><span class="badge ${s.badge}">${s.label}</span></td>
        <td style="font-weight:700">${eResto.formatCurrency(o.total)}</td>
        <td>
          ${o.reservation ? `
            <div style="display:flex;flex-direction:column;gap:4px">
              <span class="badge badge-gray">Réservé</span>
              <span style="font-size:12px;color:var(--on-surface-variant)">${o.reservation.guests ? o.reservation.guests + ' pers' : ''}${o.reservation.time ? ' • ' + o.reservation.time : ''}</span>
              <button class="btn btn-ghost btn-sm" style="padding:4px 6px;margin-top:4px" onclick="event.stopPropagation();openOrderDetail('${o.id}')">Gérer</button>
            </div>
          ` : `<span style="font-size:12px;color:var(--on-surface-variant)">—</span>`}
        </td>
        <td style="font-size:12px;color:var(--on-surface-variant)">${o.time}</td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:6px">
            ${o.status !== 'delivered' && o.status !== 'cancelled' ? `
              <button class="btn btn-secondary btn-sm" style="padding:6px 10px;font-size:11px" onclick="advanceOrder('${o.id}')">
                <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
                Avancer
              </button>
            ` : ''}
            <button class="btn-icon" style="padding:6px" onclick="openOrderDetail('${o.id}')">
              <span class="material-symbols-outlined" style="font-size:16px">open_in_new</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// =====================================================
// KANBAN RENDER
// =====================================================
function renderKanban() {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  const cols = ['received','in_progress','ready','delivered'];
  const allOrders = getFilteredOrders();

  board.innerHTML = cols.map(status => {
    const cfg     = STATUS_CFG[status];
    const colOrds = eResto.state.orders.filter(o => o.status === status);
    return `
      <div class="kanban-col">
        <div class="kanban-col-header">
          <div class="kanban-col-title" style="color:${cfg.color}">
            <span class="material-symbols-outlined" style="font-size:16px">${cfg.icon}</span>
            ${cfg.kanbanLabel}
          </div>
          <div class="kanban-count" style="background:${cfg.color}">${colOrds.length}</div>
        </div>
        ${colOrds.length === 0
          ? `<div class="kanban-empty">Aucune commande</div>`
          : colOrds.map(o => `
            <div class="kanban-card" onclick="openOrderDetail('${o.id}')">
              <div class="kanban-card-id">${o.id}</div>
              <div class="kanban-card-customer">${o.customer}</div>
              <div class="kanban-card-items" style="${eResto.getUnavailableItems(o.items).length > 0 ? 'color:var(--error);' : ''}">
                ${(o.items||[]).join(' · ')}
                ${eResto.getUnavailableItems(o.items).length > 0 ? `<div style="color:var(--error);font-size:11px;font-weight:700;margin-top:4px"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">warning</span> Plat indisponible</div>` : ''}
              </div>
              <div class="kanban-card-footer">
                <div class="kanban-card-time">
                  <span class="material-symbols-outlined" style="font-size:13px">schedule</span>
                  ${o.time}
                </div>
                <div class="kanban-card-price">${eResto.formatCurrency(o.total)}</div>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  }).join('');
}

// =====================================================
// ADVANCE ORDER STATUS
// =====================================================
// =====================================================
// ADVANCE ORDER STATUS
// =====================================================
function advanceOrder(orderId) {
  const order = eResto.state.orders.find(o => o.id === orderId);
  if (!order) return;

  // Block validation/advancement if order contains unavailable items
  const unavailable = eResto.getUnavailableItems(order.items);
  if (unavailable.length > 0) {
    eResto.showToast(`⚠️ Validation impossible : le plat "${unavailable[0]}" n'est plus disponible au menu !`, 'error');
    return;
  }

  const idx  = FLOW.indexOf(order.status);
  if (idx === -1 || idx >= FLOW.length - 1) return;
  const next = FLOW[idx + 1];
  order.status = next;
  eResto.saveUserData('orders'); // persist
  eResto.syncOrderToClient(order); // reflect the new status in the client's own account
  const label = STATUS_CFG[next]?.label || next;
  eResto.showToast(`Commande ${orderId} → ${label}`, 'success');
  renderOrders();
}

// =====================================================
// ORDER DETAIL MODAL
// =====================================================
function openOrderDetail(orderId) {
  const order = eResto.state.orders.find(o => o.id === orderId);
  if (!order) return;
  activeDetailId = orderId;
  const s = STATUS_CFG[order.status] || STATUS_CFG.received;
  const idx = FLOW.indexOf(order.status);
  const unavailable = eResto.getUnavailableItems(order.items);

  document.getElementById('order-detail-title').textContent = `Commande ${order.id}`;

  document.getElementById('order-detail-body').innerHTML = `
    ${unavailable.length > 0 ? `
      <div style="background:#fee2e2;color:#991b1b;border:1px solid #f87171;padding:12px 16px;border-radius:12px;margin-bottom:16px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600">
        <span class="material-symbols-outlined" style="font-size:20px">warning</span>
        <div>
          <strong>Plat(s) indisponible(s) :</strong> ${unavailable.join(', ')}.<br>
          Cette commande ne peut pas être validée tant que ces plats sont indisponibles.
        </div>
      </div>
    ` : ''}

    <div class="order-detail-header">
      <div>
        <div class="order-detail-id">${order.id}</div>
        <span class="badge ${s.badge}" style="margin-top:6px">${s.label}</span>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--on-surface-variant);opacity:.6;text-transform:uppercase;letter-spacing:.06em">Passée à</div>
        <div style="font-size:18px;font-weight:700">${order.time}</div>
      </div>
    </div>

    <div class="order-detail-meta">
      <div class="order-meta-item">
        <span class="order-meta-label">Client</span>
        <span class="order-meta-value">${order.customer}</span>
      </div>
      <div class="order-meta-item">
        <span class="order-meta-label">Total</span>
        <span class="order-meta-value" style="color:var(--primary);font-family:var(--font-display);font-size:20px;font-weight:800">${eResto.formatCurrency(order.total)}</span>
      </div>
      ${order.reservation ? `
        <div class="order-meta-item" style="grid-column:1/-1">
          <span class="order-meta-label">Réservation</span>
          <span class="order-meta-value" style="display:flex;flex-direction:column">
            <span style="font-weight:700">${order.reservation.name || order.customer}${order.reservation.phone ? ' — ' + order.reservation.phone : ''}</span>
            <span style="font-size:13px;color:var(--on-surface-variant)">${order.reservation.guests ? order.reservation.guests + ' pers' : ''}${order.reservation.time ? ' • ' + order.reservation.time : ''}</span>
          </span>
        </div>
      ` : ''}
      ${order.note ? `
        <div class="order-meta-item" style="grid-column:1/-1">
          <span class="order-meta-label">Note</span>
          <span class="order-meta-value" style="font-size:14px">${order.note}</span>
        </div>
      ` : ''}
    </div>

    <div class="order-items-list">
      ${(order.items||['Plat principal']).map(item => {
        const menuItem = matchMenuItem(eResto.state.menuItems, item);
        const isNotAvail = menuItem ? menuItem.available === false : false;
        const price = menuItem ? menuItem.price : (order.total / (order.items||[1]).length);
        return `
          <div class="order-item-row" style="${isNotAvail ? 'background:rgba(239,68,68,0.08);border-left:3px solid var(--error);padding-left:8px' : ''}">
            <span class="order-item-name">
              ${item}
              ${isNotAvail ? '<span style="color:var(--error);font-size:11px;font-weight:700;margin-left:6px">[INDISPONIBLE]</span>' : ''}
            </span>
            <span class="order-item-price">${eResto.formatCurrency(price)}</span>
          </div>
        `;
      }).join('')}
    </div>

    <div class="order-total-row">
      <span class="order-total-label">Total commande</span>
      <span class="order-total-value">${eResto.formatCurrency(order.total)}</span>
    </div>

    <h4 style="font-size:13px;font-weight:700;margin:18px 0 10px;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:.05em">Suivi</h4>
    <div class="status-timeline">
      ${FLOW.map((step, i) => {
        const stepCfg = STATUS_CFG[step];
        const done    = i < idx;
        const current = i === idx;
        const pending = i > idx;
        return `
          <div class="timeline-step ${done?'done':current?'current':'pending'}">
            <div class="timeline-dot ${done?'done':current?'current':'pending'}">
              <span class="material-symbols-outlined" style="font-size:14px">${done?'check':stepCfg.icon}</span>
            </div>
            <div class="timeline-info">
              <div class="timeline-title" style="${current?'color:var(--primary);font-weight:800':done?'':'opacity:.4'}">${stepCfg.label}</div>
              <div class="timeline-time">${done || current ? order.time : '—'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const footer = document.getElementById('order-detail-footer');
  const canAdvance = idx >= 0 && idx < FLOW.length - 1;
  const nextStatus = canAdvance ? FLOW[idx+1] : null;
  footer.innerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="closeOrderModal()">Fermer</button>
    ${order.status === 'cancelled' ? '' : `
      ${order.status !== 'delivered' ? `
        <button class="btn btn-danger btn-sm" onclick="cancelFromModal('${order.id}')">
          <span class="material-symbols-outlined" style="font-size:14px">cancel</span>Annuler
        </button>
      ` : ''}
      ${canAdvance ? `
        <button class="btn btn-primary btn-sm" ${unavailable.length > 0 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''} onclick="advanceFromModal('${order.id}')">
          <span class="material-symbols-outlined" style="font-size:14px">${STATUS_CFG[nextStatus].icon}</span>
          → ${STATUS_CFG[nextStatus].label}
        </button>
      ` : ''}
    `}
  `;

  // If reservation exists, add reservation actions
  if (order.reservation) {
    const resActions = document.createElement('div');
    resActions.style.display = 'flex';
    resActions.style.gap = '8px';
    resActions.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();cancelReservationFromModal('${order.id}')">Annuler réservation</button>
      <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();markReservationArrived('${order.id}')">Marquer arrivée</button>
    `;
    footer.appendChild(resActions);
  }

  document.getElementById('order-detail-modal').classList.add('active');
}

function closeOrderModal() {
  document.getElementById('order-detail-modal')?.classList.remove('active');
  activeDetailId = null;
}

function advanceFromModal(orderId) {
  advanceOrder(orderId);
  closeOrderModal();
  openOrderDetail(orderId);
}

async function cancelFromModal(orderId) {
  const ok = await eResto.confirm(`Annuler la commande ${orderId} ?`, 'Confirmer l\'annulation');
  if (!ok) return;
  const order = eResto.state.orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'cancelled';
    eResto.saveUserData('orders'); // persist
    eResto.syncOrderToClient(order); // reflect the cancellation in the client's own account
  }
  eResto.showToast(`Commande ${orderId} annulée.`, 'error');
  closeOrderModal();
  renderOrders();
}

function cancelReservationFromModal(orderId) {
  const order = eResto.state.orders.find(o => o.id === orderId);
  if (!order || !order.reservation) return;
  order.reservation.status = 'cancelled';
  eResto.saveUserData('orders');
  eResto.showToast(`Réservation pour ${order.id} annulée.`, 'error');
  closeOrderModal();
  renderOrders();
}

function markReservationArrived(orderId) {
  const order = eResto.state.orders.find(o => o.id === orderId);
  if (!order || !order.reservation) return;
  order.reservation.status = 'arrived';
  eResto.saveUserData('orders');
  eResto.showToast(`Client arrivé pour ${order.id}.`, 'success');
  closeOrderModal();
  renderOrders();
}

// =====================================================
// NEW ORDER MODAL
// =====================================================
let orderItemRowCount = 0;

function initOrderItemRows() {
  addOrderItemRow();
}

function addOrderItemRow() {
  const list = document.getElementById('order-items-list');
  if (!list) return;
  orderItemRowCount++;
  const menuItems = eResto.state.menuItems || [];
  const rowId = `item-row-${orderItemRowCount}`;

  const row = document.createElement('div');
  row.className = 'order-item-row-form';
  row.id = rowId;
  row.innerHTML = `
    <select class="form-input" onchange="updateNewOrderTotal()">
      <option value="">— Choisir un plat —</option>
      ${menuItems.map(m => `
        <option value="${m.price}" data-id="${m.id}" data-name="${m.name.replace(/"/g, '&quot;')}" ${!m.available ? 'disabled' : ''}>
          ${m.name} ${!m.available ? '[INDISPONIBLE]' : ''} (${eResto.formatCurrency(m.price)})
        </option>
      `).join('')}
    </select>
    <input class="form-input" type="number" value="1" min="1" max="20" style="width:64px;text-align:center" onchange="updateNewOrderTotal()">
    <button type="button" class="btn-icon" onclick="removeOrderItemRow('${rowId}')" style="padding:8px;flex-shrink:0">
      <span class="material-symbols-outlined" style="font-size:18px;color:var(--error)">remove_circle</span>
    </button>
  `;
  list.appendChild(row);
  updateNewOrderTotal();
}

function removeOrderItemRow(rowId) {
  document.getElementById(rowId)?.remove();
  updateNewOrderTotal();
}

function updateNewOrderTotal() {
  let total = 0;
  document.querySelectorAll('#order-items-list .order-item-row-form').forEach(row => {
    const sel   = row.querySelector('select');
    const price = parseFloat(sel.value) || 0;
    const qty   = parseInt(row.querySelector('input').value) || 1;
    total += price * qty;
  });
  const el = document.getElementById('no-total');
  if (el) el.textContent = eResto.formatCurrency(total);
}

function openNewOrderModal() {
  // Reset
  const list = document.getElementById('order-items-list');
  if (list) list.innerHTML = '';
  orderItemRowCount = 0;
  document.getElementById('no-customer').value = '';
  document.getElementById('no-note').value = '';
  addOrderItemRow();
  document.getElementById('new-order-modal').classList.add('active');
  document.getElementById('no-customer').focus();
}

function closeNewOrderModal() {
  document.getElementById('new-order-modal')?.classList.remove('active');
}

async function submitNewOrder() {
  const customer = document.getElementById('no-customer').value.trim();
  if (!customer) {
    document.getElementById('no-customer').classList.add('error');
    document.getElementById('no-customer').focus();
    eResto.showToast('Le nom du client est requis.', 'error');
    return;
  }

  const items = [];
  let total = 0;
  let hasInvalidSelection = false;

  document.querySelectorAll('#order-items-list .order-item-row-form').forEach(row => {
    const sel   = row.querySelector('select');
    const opt   = sel.options[sel.selectedIndex];
    const qty   = parseInt(row.querySelector('input').value) || 1;
    const price = parseFloat(sel.value) || 0;
    const name  = opt ? (opt.getAttribute('data-name') || opt.text.split(' (')[0].replace(' [INDISPONIBLE]', '').trim()) : '';

    if (sel.value && opt && opt.disabled) {
      hasInvalidSelection = true;
      row.style.border = '1px solid var(--error)';
    } else {
      row.style.border = 'none';
    }

    if (name && price > 0) {
      for (let i = 0; i < qty; i++) items.push(name);
      total += price * qty;
    }
  });

  if (hasInvalidSelection) {
    eResto.showToast('⚠️ Impossible de valider : un ou plusieurs plats sélectionnés sont indisponibles !', 'error');
    return;
  }

  if (items.length === 0) {
    eResto.showToast('Veuillez ajouter au moins un article disponible.', 'error');
    return;
  }

  // Double check item availability
  const unavailable = eResto.getUnavailableItems(items);
  if (unavailable.length > 0) {
    eResto.showToast(`⚠️ Impossible de valider la commande : le plat "${unavailable[0]}" est indisponible !`, 'error');
    return;
  }

  const note = document.getElementById('no-note').value.trim();
  const now  = new Date();
  const newId = `#${orderIdCounter++}`;
  const newOrder = {
    id:       newId,
    customer,
    status:   'received',
    total,
    items,
    note,
    time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
  };

  await eResto.simulateRequest(600);
  eResto.state.orders.unshift(newOrder);
  eResto.saveUserData('orders'); // persist
  eResto.showToast(`Commande ${newId} créée pour ${customer} !`, 'success');
  closeNewOrderModal();
  renderOrders();
}

// =====================================================
// EXPORT
// =====================================================
function exportOrders() {
  const orders = getFilteredOrders();
  const csv = [
    ['ID','Client','Articles','Statut','Total','Heure'].join(';'),
    ...orders.map(o => [
      o.id, o.customer, (o.items||[]).join(' | '), STATUS_CFG[o.status]?.label||o.status, eResto.formatCurrency(o.total), o.time
    ].join(';'))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `eresto_commandes_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
  eResto.showToast('Commandes exportées !', 'success');
}

// =====================================================
// SEARCH
// =====================================================
function initSearch() {
  const input = document.getElementById('orders-search');
  if (!input) return;
  input.addEventListener('input', eResto.debounce(() => renderOrders(), 250));
}

// =====================================================
// LIVE TICKER
// =====================================================
function startLiveTicker() {
  liveInterval = setInterval(() => {
    renderLiveLabel();
    // Le ticker met à jour l'affichage en direct, sans ajouter de commandes automatiques.
  }, 5000);
}

const DEMO_NAMES  = ['Aminata Ouedraogo','Issouf Barro','Kadiatou Traoré','Ousmane Kouanda','Mamadou Sanou','Salimata Zango'];
const DEMO_ITEMS  = ['Riz gras','Brochette d’agneau','Bissap glacé','Tô','Poulet bicyclette','Banane plantain'];
function simulateIncomingOrder() {
  const menuItems = eResto.state.menuItems.filter(m => m.available);
  if (menuItems.length < 1) return;
  const customer = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
  const items = [];
  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    const item = menuItems[Math.floor(Math.random() * menuItems.length)];
    items.push(item.name);
  }
  const total = items.reduce((sum, name) => {
    const menuItem = menuItems.find(m => m.name === name);
    return sum + (menuItem ? menuItem.price : 0);
  }, 0);
  const now = new Date();
  const newOrder = {
    id:       `#${orderIdCounter++}`,
    customer,
    items,
    total,
    status: 'received',
    time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
  };
  eResto.state.orders.unshift(newOrder);
  eResto.showToast(`🍽 Nouvelle commande de ${customer} !`, 'info');
  renderOrders();
}

// =====================================================
// CLICK OUTSIDE
// =====================================================
function initClickOutside() {
  document.addEventListener('click', e => {
    const sm = document.getElementById('status-menu');
    if (sm && !e.target.closest('#restaurant-status')) sm.classList.remove('visible');

    if (e.target === document.getElementById('order-detail-modal')) closeOrderModal();
    if (e.target === document.getElementById('new-order-modal'))    closeNewOrderModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeOrderModal(); closeNewOrderModal(); }
  });
}

window.addEventListener('beforeunload', () => clearInterval(liveInterval));
