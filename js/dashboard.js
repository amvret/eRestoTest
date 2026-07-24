/**
 * eResto - Dashboard Page JavaScript
 * Handles metric cards, orders table, real-time updates, charts
 */

'use strict';

let currentOrderFilter = 'all';
let activeOrderId = null;
let tickerInterval = null;

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  renderMetricCards();
  renderOrdersTable();
  renderTopSellers();
  startLiveTicker();
  initSearch();
  initClickOutside();
  initServiceToggles();

  // Animate page
  document.querySelectorAll('.metric-card, .data-table-wrapper').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.animation = `fadeIn 0.4s ease ${i * 60}ms forwards`;
  });
});

function initServiceToggles() {
  const user = eResto.state.currentUser;
  const services = eResto.getRestaurantServices(user ? user.id : 'demo');

  const ordersCheck = document.getElementById('toggle-service-orders');
  const resCheck = document.getElementById('toggle-service-reservations');

  if (ordersCheck) ordersCheck.checked = services.allowOrders !== false;
  if (resCheck) resCheck.checked = services.allowReservations !== false;
}

function handleServiceToggle(serviceKey, isChecked) {
  const user = eResto.state.currentUser;
  eResto.setRestaurantService(user ? user.id : 'demo', serviceKey, isChecked);
}

// =====================================================
// USER UI
// =====================================================
function updateUserUI() {
  const user = eResto.state.currentUser;
  if (!user) return;

  const initials = eResto.getInitials(user.name || 'U');
  const color    = eResto.getAvatarColor(user.name || 'U');

  const topbarAvatar = document.getElementById('topbar-avatar');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const topbarName = document.getElementById('topbar-user-name');
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarEmail = document.getElementById('sidebar-user-email');

  if (topbarAvatar)  { topbarAvatar.textContent = initials; topbarAvatar.style.background = color; }
  if (sidebarAvatar) { sidebarAvatar.textContent = initials; sidebarAvatar.style.background = color; }
  if (topbarName)    topbarName.textContent = user.name;
  if (sidebarName)   sidebarName.textContent = user.name;
  if (sidebarEmail)  sidebarEmail.textContent = user.email;

  // Update greeting
  const subtitle = document.getElementById('dashboard-subtitle');
  if (subtitle) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonne matinée' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    subtitle.textContent = `${greeting}, ${user.name.split(' ')[0]} ! Voici votre tableau de bord pour aujourd'hui.`;
  }
}

// =====================================================
// METRIC CARDS
// =====================================================
function renderMetricCards() {
  const grid = document.getElementById('metric-grid');
  if (!grid) return;

  const orders    = eResto.state.orders || [];
  const delivered = orders.filter(o => o.status === 'delivered');
  const active    = orders.filter(o => ['received','in_progress','ready'].includes(o.status));
  const revenue   = delivered.reduce((sum, o) => sum + (o.total || 0), 0);
  const pending   = orders.filter(o => o.status === 'received').length;

  const metrics = [
    {
      id: 'revenue', label: "Chiffre d'affaires",
      value: revenue > 0 ? eResto.formatCurrency(revenue) : '0 FCFA',
      icon: 'payments', color: 'orange',
      trend: delivered.length > 0 ? `${delivered.length} livr\u00e9e${delivered.length > 1 ? 's' : ''}` : 'Aucune livraison',
      trendDir: delivered.length > 0 ? 'up' : 'neutral',
    },
    {
      id: 'pending', label: 'Commandes actives',
      value: String(active.length),
      icon: 'pending_actions', color: 'gray',
      trend: pending > 0 ? `${pending} en attente` : 'Aucune en attente',
      trendDir: 'neutral',
    },
    {
      id: 'menu', label: 'Plats au menu',
      value: String((eResto.state.menuItems || []).length),
      icon: 'restaurant_menu', color: 'blue',
      trend: (eResto.state.menuItems || []).filter(m => m.available).length + ' disponibles',
      trendDir: 'neutral',
    },
    {
      id: 'staff', label: 'Personnel',
      value: String((eResto.state.staff || []).length),
      icon: 'group', color: 'green',
      trend: (eResto.state.staff || []).filter(s => s.status === 'on_duty').length + ' en service',
      trendDir: (eResto.state.staff || []).filter(s => s.status === 'on_duty').length > 0 ? 'up' : 'neutral',
    },
  ];

  grid.innerHTML = metrics.map(m => `
    <div class="metric-card animate-fade-in" id="metric-${m.id}" aria-label="${m.label}: ${m.value}">
      <div class="metric-header">
        <span class="metric-label">${m.label}</span>
        <div class="metric-icon ${m.color}">
          <span class="material-symbols-outlined filled" style="font-size:20px">${m.icon}</span>
        </div>
      </div>
      <div>
        <div class="metric-value">${m.value}</div>
        <div class="metric-trend ${m.trendDir}" style="margin-top:6px">
          ${m.trendDir === 'up' ? '<span class="material-symbols-outlined" style="font-size:14px">trending_up</span>' : ''}
          ${m.trend}
        </div>
      </div>
    </div>
  `).join('');
}

// =====================================================
// ORDERS TABLE
// =====================================================
const statusConfig = {
  received:    { label: 'Reçue',      badgeClass: 'badge-gray',   icon: 'inbox' },
  in_progress: { label: 'En cours',   badgeClass: 'badge-orange', icon: 'hourglass_top' },
  ready:       { label: 'Prête',      badgeClass: 'badge-green',  icon: 'check_circle' },
  delivered:   { label: 'Livrée',     badgeClass: 'badge-green',  icon: 'delivery_dining' },
  cancelled:   { label: 'Annulée',    badgeClass: 'badge-red',    icon: 'cancel' },
};

function renderOrdersTable(filter = 'all') {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  const orders = filter === 'all'
    ? eResto.state.orders
    : eResto.state.orders.filter(o => o.status === filter);

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:48px;color:var(--on-surface-variant);opacity:0.5">
          <span class="material-symbols-outlined" style="font-size:36px;display:block;margin-bottom:8px">receipt_long</span>
          Aucune commande trouvée
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const status = statusConfig[order.status] || statusConfig.received;
    return `
      <tr id="order-row-${order.id}" style="position:relative">
        <td><strong style="font-size:13px">${order.id}</strong></td>
        <td>
          <div style="font-weight:600;font-size:14px">${order.customer}</div>
        </td>
        <td>
          <span style="font-size:12px;color:var(--on-surface-variant)">${(order.items || []).slice(0,2).join(', ')}${order.items && order.items.length > 2 ? '…' : ''}</span>
          ${eResto.getUnavailableItems(order.items).length > 0 ? `<div style="color:var(--error);font-size:11px;font-weight:700;margin-top:2px"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">warning</span> Plat indisponible</div>` : ''}
        </td>
        <td>
          <span class="badge ${status.badgeClass}">
            ${status.label}
          </span>
        </td>
        <td style="font-weight:700;font-size:14px">${eResto.formatCurrency(order.total)}</td>
        <td style="font-size:12px;color:var(--on-surface-variant)">${order.time}</td>
        <td style="text-align:right;position:relative">
          <button
            class="btn-icon"
            onclick="openOrderMenu('${order.id}', event)"
            aria-label="Actions pour commande ${order.id}"
            style="padding:6px;border-radius:var(--radius-md)"
          >
            <span class="material-symbols-outlined" style="font-size:18px">more_vert</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterOrders(filter) {
  currentOrderFilter = filter;
  renderOrdersTable(filter);

  // Update active pill
  document.querySelectorAll('#order-filter-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
}

// =====================================================
// ORDER CONTEXT MENU
// =====================================================
function openOrderMenu(orderId, event) {
  event.stopPropagation();
  activeOrderId = orderId;
  const menu = document.getElementById('order-context-menu');
  if (!menu) return;

  const btn  = event.currentTarget;
  const rect = btn.getBoundingClientRect();

  menu.style.position = 'fixed';
  menu.style.top      = `${rect.bottom + 4}px`;
  menu.style.left     = `${rect.left - menu.offsetWidth + btn.offsetWidth}px`;
  menu.classList.toggle('open');
}

function updateOrderStatus(newStatus) {
  if (!activeOrderId) return;
  const order = eResto.state.orders.find(o => o.id === activeOrderId);
  if (!order) return;

  if (newStatus !== 'cancelled') {
    const unavailable = eResto.getUnavailableItems(order.items);
    if (unavailable.length > 0) {
      eResto.showToast(`⚠️ Validation impossible : le plat "${unavailable[0]}" est indisponible !`, 'error');
      document.getElementById('order-context-menu')?.classList.remove('open');
      activeOrderId = null;
      return;
    }
  }

  order.status = newStatus;
  eResto.saveUserData('orders');
  const status = statusConfig[newStatus];
  eResto.showToast(`Commande ${activeOrderId} : ${status?.label || newStatus}`, 'success');

  document.getElementById('order-context-menu')?.classList.remove('open');
  renderOrdersTable(currentOrderFilter);
  renderMetricCards();
  activeOrderId = null;
}

function cancelOrder() {
  if (!activeOrderId) return;
  eResto.confirm(`Annuler la commande ${activeOrderId} ?`, 'Confirmation').then(confirmed => {
    if (confirmed) {
      updateOrderStatus('cancelled');
      eResto.showToast(`Commande ${activeOrderId} annulée.`, 'error');
    }
  });
  document.getElementById('order-context-menu')?.classList.remove('open');
}

// =====================================================
// TOP SELLERS
// =====================================================
function renderTopSellers() {
  const container = document.getElementById('top-sellers-list');
  if (!container) return;

  const menuItems = eResto.state.menuItems || [];
  const orders    = eResto.state.orders    || [];

  if (menuItems.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px 0;color:var(--on-surface-variant);opacity:0.45">
        <span class="material-symbols-outlined" style="font-size:36px;display:block;margin-bottom:8px">restaurant_menu</span>
        Ajoutez des plats pour voir vos top ventes
      </div>`;
    return;
  }
  // Consider only non-cancelled orders for top-sellers
  const validOrders = orders.filter(o => o.status !== 'cancelled');

  // Normalization helper to match variant names (strip diacritics, punctuation, lowercase)
  const normalize = s => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s]/gi, '').toLowerCase().trim();

  const index = (menuItems || []).map(m => ({ ...m, _norm: normalize(m.name) }));

  const counts = {};
  const revenueMap = {};

  validOrders.forEach(o => {
    (o.items || []).forEach(rawItem => {
      const n = normalize(rawItem);
      // Try exact match first, then partial contains
      let match = index.find(m => m._norm === n) || index.find(m => n.includes(m._norm)) || index.find(m => m._norm.includes(n));
      if (!match) return; // ignore unknown items
      counts[match.name] = (counts[match.name] || 0) + 1;
      revenueMap[match.name] = (revenueMap[match.name] || 0) + (match.price || 0);
    });
  });

  const ranked = index
    .map(m => ({ name: m.name, orders: counts[m.name] || 0, revenue: revenueMap[m.name] || 0 }))
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
    .slice(0, 5);

  if (ranked.every(r => r.orders === 0)) {
    container.innerHTML = ranked.map((item, i) => `
      <div class="top-seller-item" style="border-bottom:${i < ranked.length - 1 ? '1px solid var(--outline-variant)' : 'none'}">
        <span class="top-seller-rank">#${i + 1}</span>
        <div class="top-seller-info">
          <p class="top-seller-name">${item.name}</p>
          <p class="top-seller-orders">0 commande</p>
        </div>
        <span class="top-seller-revenue" style="color:var(--on-surface-variant);opacity:0.4">0 FCFA</span>
      </div>
    `).join('');
    return;
  }

  container.innerHTML = ranked.map((item, i) => `
    <div class="top-seller-item" style="border-bottom:${i < ranked.length - 1 ? '1px solid var(--outline-variant)' : 'none'}">
      <span class="top-seller-rank">#${i + 1}</span>
      <div class="top-seller-info">
        <p class="top-seller-name">${item.name}</p>
        <p class="top-seller-orders">${item.orders} commande${item.orders !== 1 ? 's' : ''}</p>
      </div>
      <span class="top-seller-revenue">${eResto.formatCurrency(item.revenue)}</span>
    </div>
  `).join('');
}

// =====================================================
// LIVE TICKER (simulated real-time)
// =====================================================
// Live ticker — only ticks for non-empty states (no fake data injection)
function startLiveTicker() {
  tickerInterval = setInterval(() => {
    // Refresh metrics in case state changed elsewhere
    renderMetricCards();
    renderOrdersTable(currentOrderFilter);
  }, 30000); // refresh every 30s
}

// =====================================================
// SEARCH
// =====================================================
function initSearch() {
  const searchInput = document.getElementById('global-search');
  if (!searchInput) return;

  const debouncedSearch = eResto.debounce((query) => {
    if (!query.trim()) {
      renderOrdersTable(currentOrderFilter);
      return;
    }
    const q = query.toLowerCase();
    const filtered = eResto.state.orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q)
    );
    renderFilteredOrders(filtered);
  }, 300);

  searchInput.addEventListener('input', e => debouncedSearch(e.target.value));
}

function renderFilteredOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--on-surface-variant);opacity:0.5">Aucun résultat</td></tr>`;
    return;
  }
  const orig = eResto.state.orders;
  eResto.state.orders = orders;
  renderOrdersTable('all');
  eResto.state.orders = orig;
}

// =====================================================
// UTILITY ACTIONS
// =====================================================
function viewAllOrders() {
  window.location.href = '/pages/admin/commandes.html';
}

function openNewOrderModal() {
  window.location.href = '/pages/admin/commandes.html';
  // The commandes page will auto-open the new order modal via hash
  sessionStorage.setItem('eresto_open_modal', 'new_order');
}

function exportData() {
  const data = {
    date: new Date().toLocaleDateString('fr-FR'),
    revenue: '4280.50',
    orders: eResto.state.orders.length,
    rating: '4.8',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `eresto_dashboard_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  eResto.showToast('Données exportées avec succès !', 'success');
}

function updateHours() {
  window.location.href = '/pages/admin/horaires.html';
}

// =====================================================
// CLICK OUTSIDE HANDLERS
// =====================================================
function initClickOutside() {
  document.addEventListener('click', (e) => {
    // Close order menu
    const orderMenu = document.getElementById('order-context-menu');
    if (orderMenu && !e.target.closest('.btn-icon')) {
      orderMenu.classList.remove('open');
    }

    // Close status menu
    const statusMenu = document.getElementById('status-menu');
    if (statusMenu && !e.target.closest('#restaurant-status')) {
      statusMenu.classList.remove('visible');
    }
  });

  // Keyboard accessibility for status pill
  document.getElementById('restaurant-status')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('status-menu')?.classList.toggle('visible');
    }
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(tickerInterval);
});
