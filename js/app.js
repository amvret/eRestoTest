/**
 * eResto - Global Shared JavaScript
 * Utilities, notifications, navigation, auth state
 */

'use strict';

/* =====================================================
   BASE PATH — makes the site portable to any hosting
   subfolder (e.g. GitHub Pages project sites served at
   https://user.github.io/repo-name/ instead of the domain
   root). Every "absolute" internal link/image path in the
   app is built from this instead of a hardcoded leading "/".
   ===================================================== */
const ERESTO_BASE = (function () {
  const path = window.location.pathname;
  const marker = '/pages/';
  const idx = path.indexOf(marker);
  if (idx !== -1) {
    // Currently inside /pages/xxx/file.html -> site root is
    // everything before "/pages/".
    return path.substring(0, idx + 1);
  }
  // At the site root (index.html or similar).
  return path.substring(0, path.lastIndexOf('/') + 1);
})();
window.ERESTO_BASE = ERESTO_BASE;

/* =====================================================
   DEMO DATA — only loaded for the demo account
   ===================================================== */
const ERESTO_DEMO_DATA = {
  restaurantName: 'Chitir Chicken (CTR)',
  restaurantImage: `${ERESTO_BASE}assets/images/chitir-resto.jpg`,
  cuisineType: 'Fast-food • Poulet Frit',
  orders: [
    { id: '#C-1042', customer: 'Aminata Ouedraogo', status: 'ready',       total: 6_500, time: '12:34', items: ['1x Seau Familial Crispy (8 pièces)'] },
    { id: '#C-1043', customer: 'Issouf Barro',      status: 'in_progress', total: 3_500, time: '12:41', items: ['1x Menu Box Poulet Ail'] },
    { id: '#C-1044', customer: 'Fatou Sanon',       status: 'received',    total: 2_500, time: '12:55', items: ['1x Burger Chitir Spécial'] },
    { id: '#C-1045', customer: 'Ousmane Zoungrana', status: 'in_progress', total: 2_000, time: '13:02', items: ['1x Wrap Poulet Pané'] },
  ],
  menuItems: [
    { id: 101, code: 'CTR-001', name: 'Menu Box Poulet Ail',             category: 'Poulet Frit',     price: 3_500, image: `${ERESTO_BASE}assets/images/chitir-chicken.jpg`, available: true },
    { id: 102, code: 'CTR-002', name: 'Seau Familial Crispy (8 pièces)', category: 'Poulet Frit',     price: 6_500, image: `${ERESTO_BASE}assets/images/chitir-chicken.jpg`, available: true },
    { id: 103, code: 'CTR-003', name: 'Burger Chitir Spécial',          category: 'Burgers & Wraps', price: 2_500, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', available: true },
    { id: 104, code: 'CTR-004', name: 'Wrap Poulet Pané',               category: 'Burgers & Wraps', price: 2_000, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80', available: true },
    { id: 105, code: 'CTR-005', name: 'Tenders de Poulet (5 pièces)',   category: 'Accompagnements', price: 2_500, image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80', available: true },
    { id: 106, code: 'CTR-006', name: 'Frites Portions XL',              category: 'Accompagnements', price: 1_000, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', available: true },
    { id: 107, code: 'CTR-007', name: 'Coca-Cola / Fanta 33cl',         category: 'Boissons',        price: 600,   image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80', available: true },
  ],
  staff: [
    { id: 1, name: 'Awa Kaboré',      role: 'Chef Friture',        dept: 'Cuisine', schedule: 'Full-Time', email: 'awa.k@chitir.bf',   phone: '+226 70 12 34 56', status: 'on_duty',  rating: 5, initials: 'AK', color: '#f0603d' },
    { id: 2, name: 'Blaise Ouedraogo', role: 'Responsable Caisses', dept: 'Caisse',  schedule: 'Full-Time', email: 'blaise.o@chitir.bf', phone: '+226 75 43 21 09', status: 'off_duty', rating: 4, initials: 'BO', color: '#2E9E5B' },
    { id: 3, name: 'Mariama Sidibé',   role: 'Manager Comptoir',    dept: 'Service', schedule: 'Full-Time', email: 'mariama.s@chitir.bf', phone: '+226 78 90 12 34', status: 'on_duty',  rating: 5, initials: 'MS', color: '#805200' },
  ],
  reservations: [
    { id: 'R1001', name: 'Abdoulaye Traoré', phone: '+226 70 12 34 56', guests: 4, time: '19:00', note: 'Salle climatisée', status: 'reserved', table: 1 },
    { id: 'R1002', name: 'Emilie Kaboré',    phone: '+226 75 23 45 67', guests: 2, time: '19:30', note: 'Table anniversaire', status: 'reserved', table: 2 },
  ],
  totalTables: 10,
};

/* =====================================================
   APP STATE
   ===================================================== */
const eResto = {
  version: '1.0.0',

  state: {
    currentUser: null,
    restaurantStatus: 'open',
    users: JSON.parse(localStorage.getItem('eresto_users') || '[]'),
    // orders / menuItems / staff / horaires are loaded per-user via loadUserData()
    orders:    [],
    menuItems: [],
    staff:     [],
    horaires:  {},
    reservations: [],
    totalTables: 10,
  },

  // Initialize app
  init() {
    this.loadAuthState();
    this.checkPageAccess();
    this.initToastContainer();
    this.initNavigation();
    this.initStatusPill();
    this.initMobileMenu();
    this.initLandingNavMobile();
    this.initThemeToggle();
    this.initRestaurantEditButton();
    this.updateUserUI();
    console.log(`%ceResto v${this.version} initialized`, 'color: #f0603d; font-weight: bold;');
    
    // Reveal the app smoothly after specific page scripts have completed their initial render
    setTimeout(() => {
      document.body.classList.add('app-ready');
    }, 50);
  },

  checkPageAccess() {
    // Use the full path (not just the filename) so that e.g.
    // /pages/admin/dashboard.html and /pages/client/dashboard.html
    // (same filename, different folders) are never confused.
    const path = window.location.pathname.toLowerCase();
    const user = this.state.currentUser;

    const isAccessingAdmin = path.includes(`${ERESTO_BASE}pages/admin/`);
    const isAccessingClientDash = path.includes(`${ERESTO_BASE}pages/client/dashboard.html`);

    if (isAccessingAdmin) {
      if (!user) {
        window.location.href = `${ERESTO_BASE}pages/auth/connexion.html`;
        return;
      }
      if (user.type === 'client') {
        window.location.href = `${ERESTO_BASE}index.html`;
        return;
      }
    }

    if (isAccessingClientDash) {
      if (!user) {
        window.location.href = `${ERESTO_BASE}pages/auth/connexion.html`;
        return;
      }
      if (user.type === 'owner') {
        window.location.href = `${ERESTO_BASE}pages/admin/dashboard.html`;
        return;
      }
    }
  },

  /* =====================================================
     AUTH
     ===================================================== */
  /* --------------------------------------------------
     Per-user data persistence
     -------------------------------------------------- */

  // Keys used for localStorage per user
  _key(userId, type) {
    return `eresto_${type}_${userId}`;
  },

  // Load orders / menuItems / staff for the current user.
  // Demo account always gets a fresh deep-copy of ERESTO_DEMO_DATA.
  // Every other account reads from localStorage (empty arrays if first login).
  loadUserData() {
    const user = this.state.currentUser;
    if (!user) return;

    if (user.id === 'demo') {
      const savedOrders = localStorage.getItem('eresto_orders_demo');
      const savedMenu   = localStorage.getItem('eresto_menu_demo');
      const savedStaff  = localStorage.getItem('eresto_staff_demo');
      const savedRes    = localStorage.getItem('eresto_reservations_demo');

      this.state.orders       = savedOrders ? JSON.parse(savedOrders) : JSON.parse(JSON.stringify(ERESTO_DEMO_DATA.orders));
      this.state.menuItems    = savedMenu   ? JSON.parse(savedMenu)   : JSON.parse(JSON.stringify(ERESTO_DEMO_DATA.menuItems));
      this.state.staff        = savedStaff  ? JSON.parse(savedStaff)  : JSON.parse(JSON.stringify(ERESTO_DEMO_DATA.staff));
      this.state.horaires     = JSON.parse(JSON.stringify(ERESTO_DEMO_DATA.horaires || {}));
      this.state.reservations = savedRes    ? JSON.parse(savedRes)    : JSON.parse(JSON.stringify(ERESTO_DEMO_DATA.reservations || []));
      this.state.totalTables  = ERESTO_DEMO_DATA.totalTables || 10;
    } else {
      this.state.orders    = JSON.parse(localStorage.getItem(this._key(user.id, 'orders'))    || '[]');
      this.state.menuItems = JSON.parse(localStorage.getItem(this._key(user.id, 'menu'))      || '[]');
      this.state.staff     = JSON.parse(localStorage.getItem(this._key(user.id, 'staff'))     || '[]');
      this.state.horaires  = JSON.parse(localStorage.getItem(this._key(user.id, 'horaires'))  || '{}');
      this.state.reservations = JSON.parse(localStorage.getItem(this._key(user.id, 'reservations')) || '[]');
      // load settings (totalTables)
      try {
        const settings = JSON.parse(localStorage.getItem(this._key(user.id, 'settings')) || '{}');
        if (settings && settings.totalTables) this.state.totalTables = settings.totalTables;
      } catch(e) {
        // ignore
      }
    }

    // Also restore restaurant status preference (restaurant-scoped key takes priority)
    const restId = user.id === 'demo' ? 'demo-1' : `user-rest-${user.id}`;
    const restoStatus = localStorage.getItem(`eresto_resto_status_${restId}`)
      || localStorage.getItem(this._key(user.id, 'status'));
    if (restoStatus) this.state.restaurantStatus = restoStatus;
  },

  // Persist a specific data key for the current user.
  saveUserData(type) {
    const user = this.state.currentUser;
    if (!user) return;
    const userId = user.id;

    if (type === 'settings') {
      const settings = { totalTables: this.state.totalTables };
      localStorage.setItem(this._key(userId, 'settings'), JSON.stringify(settings));
      return;
    }
    const map = { orders: 'orders', menuItems: 'menu', staff: 'staff', horaires: 'horaires', reservations: 'reservations' };
    const storageKey = map[type];
    if (!storageKey) return;
    localStorage.setItem(this._key(userId, storageKey), JSON.stringify(this.state[type]));

    if (userId === 'demo' && storageKey === 'menu') {
      localStorage.setItem('eresto_menu_demo-1', JSON.stringify(this.state.menuItems));
    }
  },

  // Push a status change made in the admin panel back to the client's
  // own order history, so the client sees the up-to-date status too.
  syncOrderToClient(order) {
    if (!order || !order.clientId) return; // order not linked to a client account (e.g. manual/demo order)
    const key = `eresto_client_orders_${order.clientId}`;
    try {
      const clientOrders = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = clientOrders.findIndex(o => o.id === order.id);
      if (idx !== -1) {
        clientOrders[idx] = { ...clientOrders[idx], status: order.status };
        localStorage.setItem(key, JSON.stringify(clientOrders));
      }
    } catch (e) {
      // ignore malformed data
    }
  },

  // Same idea, but for table reservations.
  syncReservationToClient(reservation) {
    if (!reservation || !reservation.clientId) return;
    const key = `eresto_client_reservations_${reservation.clientId}`;
    try {
      const clientRes = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = clientRes.findIndex(r => r.id === reservation.id);
      if (idx !== -1) {
        clientRes[idx] = { ...clientRes[idx], status: reservation.status };
        localStorage.setItem(key, JSON.stringify(clientRes));
      }
    } catch (e) {
      // ignore malformed data
    }
  },

  // The reverse direction: a client asks to cancel their own reservation.
  // This only flags the restaurant's own record (cancelRequested) so the
  // owner sees and reviews it — the reservation stays active until the
  // restaurant actually confirms the cancellation.
  requestReservationCancellation(reservation) {
    if (!reservation || !reservation.restaurantId) return false;
    try {
      const key = this.getAdminStorageKey('reservations', reservation.restaurantId);
      const adminRes = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = adminRes.findIndex(r => r.id === reservation.id);
      if (idx === -1) return false;
      adminRes[idx] = { ...adminRes[idx], cancelRequested: true };
      localStorage.setItem(key, JSON.stringify(adminRes));
      return true;
    } catch (e) {
      return false;
    }
  },

  loadAuthState() {
    const saved = localStorage.getItem('eresto_current_user');
    if (saved) {
      try {
        this.state.currentUser = JSON.parse(saved);
        this.loadUserData(); // ← restore user-specific data on every page load
      } catch(e) {
        this.state.currentUser = null;
      }
    }
  },

  login(email, password) {
    const users = JSON.parse(localStorage.getItem('eresto_users') || '[]');
    const user  = users.find(u => u.email === email);

    if (user && user.password === password) {
      this.state.currentUser = { id: user.id, name: user.name, email: user.email, type: user.type };
      localStorage.setItem('eresto_current_user', JSON.stringify(this.state.currentUser));
      this.loadUserData();
      return { success: true, user: this.state.currentUser };
    }

    // Demo account
    if (email === 'demo@eresto.com' && password === 'demo1234') {
      this.state.currentUser = { 
        id: 'demo', 
        name: 'Chitir Chicken (CTR)', 
        email, 
        type: 'owner',
        restaurantName: 'Chitir Chicken (CTR)',
        restaurantImage: `${ERESTO_BASE}assets/images/chitir-resto.jpg`
      };
      localStorage.setItem('eresto_current_user', JSON.stringify(this.state.currentUser));
      this.loadUserData();
      return { success: true, user: this.state.currentUser };
    }

    return { success: false, error: 'Email ou mot de passe incorrect.' };
  },

  register(data) {
    const users = JSON.parse(localStorage.getItem('eresto_users') || '[]');
    if (users.find(u => u.email === data.email)) {
      return { success: false, error: 'Cet email est déjà utilisé.' };
    }
    const newUser = { id: Date.now(), ...data };
    users.push(newUser);
    localStorage.setItem('eresto_users', JSON.stringify(users));
    this.state.currentUser = { id: newUser.id, name: newUser.name, email: newUser.email, type: newUser.type };
    localStorage.setItem('eresto_current_user', JSON.stringify(this.state.currentUser));
    // Initialize empty data for new owner accounts
    if (data.type === 'owner') {
      this.state.orders    = [];
      this.state.menuItems = [];
      this.state.staff     = [];
      // Save empty arrays so they're ready in localStorage
      localStorage.setItem(this._key(newUser.id, 'orders'), '[]');
      localStorage.setItem(this._key(newUser.id, 'menu'),   '[]');
      localStorage.setItem(this._key(newUser.id, 'staff'),  '[]');
    }
    return { success: true, user: this.state.currentUser };
  },

  // Resolves the admin-side localStorage key that "owns" a given restaurant ID
  // (registered owner OR showcase restaurant), so every page agrees on where
  // a restaurant's orders/reservations live.
  getAdminStorageKey(prefix, restaurantId) {
    if (!restaurantId) return `eresto_${prefix}_demo`;
    if (restaurantId.startsWith('user-rest-')) {
      const userId = restaurantId.replace('user-rest-', '');
      return `eresto_${prefix}_${userId}`;
    }
    if (restaurantId === 'demo-1' || restaurantId === 'demo') {
      return `eresto_${prefix}_demo`;
    }
    return `eresto_${prefix}_${restaurantId}`;
  },

  // Single source of truth for a restaurant's table count: the owner can
  // change it any time from the Réservations page, and it's immediately
  // published under the restaurant-scoped key that client pages read.
  publishTableCount(count) {
    const n = Math.max(1, parseInt(count, 10) || 1);
    this.state.totalTables = n;
    this.saveUserData('settings');
    const restId = this.getMyRestaurantId();
    if (restId) localStorage.setItem(`eresto_tables_${restId}`, String(n));
    return n;
  },

  getPublishedTableCount() {
    const restId = this.getMyRestaurantId();
    if (restId) {
      const saved = localStorage.getItem(`eresto_tables_${restId}`);
      if (saved) return parseInt(saved, 10) || 10;
    }
    return this.state.totalTables || 10;
  },

  /* =====================================================
     LIVE (REAL-TIME) RESTAURANT STATUS
     Combines the owner's manual toggle (Ouvert / Occupé / Fermé) with the
     actual opening hours set on the Horaires page, so a restaurant that
     says it closes at 18h really flips to "Fermé" the instant 18h hits —
     everywhere it's shown (topbar pill, restaurant cards, detail page) —
     without anyone needing to reload the page or touch the toggle.
     ===================================================== */

  // Reads the public weekly schedule published by horaires.js for a given
  // restaurant. Returns null if that restaurant never configured hours,
  // so we know not to let "missing data" masquerade as "closed".
  getPublishedHoraires(restId) {
    if (!restId) return null;
    const saved = localStorage.getItem(`eresto_horaires_${restId}`);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch (e) { return null; }
  },

  // true/false if the configured hours say the restaurant should be open
  // right now, or null if it never set up hours (so hours can't override).
  isOpenByScheduleNow(restId) {
    const schedule = this.getPublishedHoraires(restId);
    if (!schedule) return null;

    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7; // 0 = lundi, matches horaires.js
    const today = schedule[dayIdx];
    if (!today || !today.isOpen) return false;

    const toMin = (t) => {
      if (!t) return null;
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const openMin  = toMin(today.open);
    const closeMin = toMin(today.close);
    if (openMin === null || closeMin === null) return true; // incomplete data, don't force closed

    const inPause = !!today.pauseActive
      && toMin(today.pauseDebut) !== null && toMin(today.pauseFin) !== null
      && nowMin >= toMin(today.pauseDebut) && nowMin < toMin(today.pauseFin);

    return nowMin >= openMin && nowMin < closeMin && !inPause;
  },

  // Single source of truth for a restaurant's displayed status everywhere
  // in the app. The owner's manual "Occupé"/"Fermé" choice is always
  // respected (lets them close early or flag a rush), but manual "Ouvert"
  // can never force the restaurant open outside its configured hours —
  // once closing time hits, this automatically returns "closed".
  getLiveRestaurantStatus(restId) {
    const manual = restId ? localStorage.getItem(`eresto_resto_status_${restId}`) : null;
    if (manual === 'closed' || manual === 'busy') return manual;

    const scheduleOpen = this.isOpenByScheduleNow(restId);
    if (scheduleOpen === false) return 'closed';
    return 'open';
  },

  // Re-evaluates the live status for the current admin's own restaurant
  // and refreshes the topbar pill immediately — called whenever hours are
  // edited, and on a timer so the pill updates itself in real time even
  // if nobody touches anything.
  refreshLiveStatusUI() {
    const restId = this.getMyRestaurantId();
    const status = this.getLiveRestaurantStatus(restId);
    this.state.restaurantStatus = status;
    this.updateStatusUI(status);
  },

  /* =====================================================
     DELIVERY FEE — set by each restaurant on the Horaires page
     ===================================================== */
  getDeliveryFee(restId) {
    const saved = restId ? localStorage.getItem(`eresto_delivery_fee_${restId}`) : null;
    const fee = saved !== null ? parseInt(saved, 10) : NaN;
    return Number.isFinite(fee) && fee >= 0 ? fee : 1000;
  },

  setDeliveryFee(restId, fee) {
    if (!restId) return this.getDeliveryFee(restId);
    const n = Math.max(0, parseInt(fee, 10) || 0);
    localStorage.setItem(`eresto_delivery_fee_${restId}`, String(n));
    return n;
  },

  getRestaurantServices(restId) {
    const targetId = restId || (this.state.currentUser ? this.state.currentUser.id : 'demo');
    const key = `eresto_services_${targetId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return { allowOrders: true, allowReservations: true };
  },

  setRestaurantService(restId, serviceKey, isEnabled) {
    const targetId = restId || (this.state.currentUser ? this.state.currentUser.id : 'demo');
    const services = this.getRestaurantServices(targetId);
    services[serviceKey] = isEnabled;
    const key = `eresto_services_${targetId}`;
    localStorage.setItem(key, JSON.stringify(services));

    // Also update demo-1 if demo account
    if (targetId === 'demo' || targetId === 'demo-1') {
      localStorage.setItem('eresto_services_demo-1', JSON.stringify(services));
      localStorage.setItem('eresto_services_demo', JSON.stringify(services));
    }

    const label = serviceKey === 'allowOrders' ? 'Commandes en ligne' : 'Réservations de table';
    this.showToast(`Service "${label}" ${isEnabled ? 'activé' : 'désactivé'}.`, 'info');
  },

  // Global UI updater: updates restaurant name, user info & avatar across admin pages
  updateUserUI() {
    const user = this.state.currentUser;
    if (!user) return;

    // Get fresh user details from localStorage
    const users = JSON.parse(localStorage.getItem('eresto_users') || '[]');
    const registeredUser = users.find(u => u.id === user.id || u.email === user.email) || user;

    const restName = registeredUser.restaurantName || registeredUser.name || 'eResto';
    const initials = this.getInitials(restName || registeredUser.name || 'R');
    const color    = this.getAvatarColor(restName || registeredUser.name || 'R');

    // Update Sidebar Logo with Restaurant Name
    const logoEl = document.querySelector('.sidebar-logo');
    if (logoEl) {
      logoEl.innerHTML = `
        <span class="material-symbols-outlined filled" style="font-size:24px;color:var(--primary);flex-shrink:0">restaurant</span>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px" title="${restName}">${restName}</span>
      `;
    }

    // Update Sidebar User info
    const sn = document.getElementById('sidebar-user-name');
    if (sn) sn.textContent = restName;
    const se = document.getElementById('sidebar-user-email');
    if (se) se.textContent = registeredUser.email || user.email;

    // Update public landing navbar actions (if present)
    const landingActions = document.querySelector('.landing-nav-actions');
    if (landingActions) {
      if (user) {
        const dashboardUrl = user.type === 'client' ? `${ERESTO_BASE}pages/client/dashboard.html` : `${ERESTO_BASE}pages/admin/dashboard.html`;
        const dashboardText = user.type === 'client' ? 'Mon Espace' : 'Espace Pro';
        landingActions.innerHTML = `
          <a href="${dashboardUrl}" class="btn-landing-solid" style="display:inline-flex;align-items:center;gap:6px;">
            <span class="material-symbols-outlined" style="font-size:18px">account_circle</span>
            ${user.name}
          </a>
          <button onclick="eResto.logout()" class="btn-landing-outline" style="border:none;cursor:pointer;margin-left:8px;">
            Déconnexion
          </button>
        `;
      } else {
        landingActions.innerHTML = `
          <a href="${ERESTO_BASE}pages/auth/connexion.html" class="btn-landing-outline">Connexion</a>
          <a href="${ERESTO_BASE}pages/auth/inscription.html" class="btn-landing-solid">Inscription</a>
        `;
      }
    }
  },

  logout() {
    this.state.currentUser = null;
    localStorage.removeItem('eresto_current_user');
    window.location.href = `${ERESTO_BASE}pages/auth/connexion.html`;
  },

  /* =====================================================
     TOAST NOTIFICATIONS
     ===================================================== */
  initToastContainer() {
    if (!document.getElementById('toast-container')) {
      const el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
    }
  },

  showToast(message, type = 'info', duration = 4000) {
    const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined toast-icon filled" style="font-size:20px">${icons[type]}</span>
      <span style="flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;opacity:.6;padding:0;display:flex;align-items:center;">
        <span class="material-symbols-outlined" style="font-size:16px">close</span>
      </button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
      }, duration);
    }
  },

  /* =====================================================
     NAVIGATION
     ===================================================== */
  initNavigation() {
    // Highlight active nav item based on current page
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(item => {
      const page = item.getAttribute('data-page');
      if (currentPage.includes(page) || (currentPage === '' && page === 'dashboard')) {
        item.classList.add('active');
      }
    });

    // Ensure overlay/sidebar are closed on navigation load (avoid stuck overlay)
    document.getElementById('sidebar-overlay')?.classList.remove('active');
    document.getElementById('sidebar')?.classList.remove('open');

    // Close mobile sidebar when clicking a navigation link (prevents menu overlay persisting)
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    navItems.forEach(item => item.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }));

    // Ensure essential links exist (in case some pages missed them)
    const required = [
      { page: 'horaires', href: `${ERESTO_BASE}pages/admin/horaires.html`, icon: 'schedule', label: 'Horaires' },
      { page: 'reservations', href: `${ERESTO_BASE}pages/admin/reservations.html`, icon: 'event', label: 'Réservations' }
    ];
    const nav = document.querySelector('.sidebar-nav');
    if (nav) {
      required.forEach(r => {
        if (!nav.querySelector(`.nav-item[data-page="${r.page}"]`)) {
          const a = document.createElement('a');
          a.className = 'nav-item';
          a.setAttribute('href', r.href);
          a.setAttribute('data-page', r.page);
          a.innerHTML = `<span class="material-symbols-outlined">${r.icon}</span><span>${r.label}</span>`;
          nav.appendChild(a);
          a.addEventListener('click', () => { if (sidebar) sidebar.classList.remove('open'); if (overlay) overlay.classList.remove('active'); });
        }
      });
    }

    // Update user info in sidebar
    const userNameEl = document.getElementById('sidebar-user-name');
    const userEmailEl = document.getElementById('sidebar-user-email');
    if (this.state.currentUser) {
      if (userNameEl) userNameEl.textContent = this.state.currentUser.name;
      if (userEmailEl) userEmailEl.textContent = this.state.currentUser.email;
      
      const initials = this.getInitials(this.state.currentUser.name || 'U');
      const color = this.getAvatarColor(this.state.currentUser.name || 'U');
      ['topbar-avatar', 'sidebar-avatar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = initials;
          el.style.background = color;
        }
      });
    }
  },

  /* =====================================================
     RESTAURANT STATUS
     ===================================================== */

  // Returns the restaurant ID associated with the current owner account
  getMyRestaurantId() {
    const user = this.state.currentUser;
    if (!user) return null;
    if (user.id === 'demo') return 'demo-1';
    return `user-rest-${user.id}`;
  },

  initStatusPill() {
    const statusPill = document.getElementById('restaurant-status');
    if (!statusPill) return;

    // Compute the live status (manual toggle + real opening hours) rather
    // than just reading the raw manual value, so the pill is correct the
    // moment the page loads.
    this.refreshLiveStatusUI();

    statusPill.addEventListener('click', () => {
      const menu = document.getElementById('status-menu');
      if (menu) menu.classList.toggle('visible');
    });

    // Keep the pill honest in real time: re-check every 30s so a
    // restaurant that closes at 18h actually flips to "Fermé" at 18h,
    // with no reload needed.
    if (this._statusInterval) clearInterval(this._statusInterval);
    this._statusInterval = setInterval(() => this.refreshLiveStatusUI(), 30000);
  },

  setRestaurantStatus(status) {
    this.state.restaurantStatus = status;
    const user = this.state.currentUser;

    // Save under the restaurant-scoped key so clients can read it
    const restId = this.getMyRestaurantId();
    if (restId) {
      localStorage.setItem(`eresto_resto_status_${restId}`, status);
    }

    // Legacy / fallback keys
    if (user && user.id !== 'demo') {
      localStorage.setItem(this._key(user.id, 'status'), status);
    }
    localStorage.setItem('eresto_status', status);

    // Re-derive the effective status (manual choice + real opening hours)
    // instead of blindly showing what was clicked — e.g. clicking "Ouvert"
    // after closing time still shows "Fermé" until the hours say otherwise.
    this.refreshLiveStatusUI();
    const labels = { open: 'Ouvert', closed: 'Fermé', busy: 'Très occupé' };
    this.showToast(`Statut du restaurant: ${labels[status] || status}`, 'success');
    const menu = document.getElementById('status-menu');
    if (menu) menu.classList.remove('visible');
  },

  updateStatusUI(status) {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    const pill = document.getElementById('restaurant-status');
    if (!dot || !text) return;

    dot.className = 'status-dot';
    text.className = 'status-text';
    pill.className = 'status-pill';

    const configs = {
      open:   { dotClass: 'open',   textClass: 'open',   pillClass: 'open',   label: 'Ouvert' },
      closed: { dotClass: 'closed', textClass: 'closed', pillClass: 'closed', label: 'Fermé' },
      busy:   { dotClass: 'busy',   textClass: 'busy',   pillClass: 'busy',   label: 'Très occupé' },
    };
    const cfg = configs[status] || configs.open;
    dot.classList.add(cfg.dotClass);
    text.classList.add(cfg.textClass);
    pill.classList.add(cfg.pillClass);
    text.textContent = cfg.label;
  },

  /* =====================================================
     MOBILE MENU
     ===================================================== */
  initMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  },

  // Injects a hamburger toggle into the public header (.landing-nav) on
  // every page that has one, so the nav links + auth buttons collapse
  // into a dropdown menu on small screens instead of overflowing.
  initLandingNavMobile() {
    const nav = document.querySelector('.landing-nav');
    if (!nav || nav.querySelector('.landing-nav-toggle')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'landing-nav-toggle';
    toggleBtn.setAttribute('aria-label', 'Ouvrir le menu');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = '<span class="material-symbols-outlined">menu</span>';
    nav.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      toggleBtn.innerHTML = isOpen
        ? '<span class="material-symbols-outlined">close</span>'
        : '<span class="material-symbols-outlined">menu</span>';
    });

    // Close the menu after tapping a link, and whenever the viewport is
    // widened back past the mobile breakpoint.
    nav.querySelectorAll('.landing-nav-link, .landing-nav-actions a, .landing-nav-actions button').forEach(el => {
      el.addEventListener('click', () => {
        nav.classList.remove('nav-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = '<span class="material-symbols-outlined">menu</span>';
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) {
        nav.classList.remove('nav-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = '<span class="material-symbols-outlined">menu</span>';
      }
    });
  },

  // =====================================================
  // DARK MODE
  // A tiny inline script in each page's <head> already applies the saved
  // (or system) preference before first paint, to avoid a flash of the
  // wrong theme. This just wires up the toggle button + keeps it in sync.
  // =====================================================
  getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('eresto-theme', theme);
    } catch (e) { /* localStorage unavailable — theme just won't persist */ }
    document.querySelectorAll('.theme-toggle-btn, .theme-toggle-row').forEach(btn => {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  },

  toggleTheme() {
    this.setTheme(this.getTheme() === 'dark' ? 'light' : 'dark');
  },

  // Builds the small sun/moon toggle button markup shared by every
  // insertion point (public header, admin/client topbar, sidebar footer).
  buildThemeToggleButton(variant) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Basculer le mode sombre');
    btn.setAttribute('aria-pressed', String(this.getTheme() === 'dark'));

    if (variant === 'row') {
      btn.className = 'theme-toggle-row';
      btn.innerHTML = `
        <span class="theme-toggle-row-label">
          <span class="material-symbols-outlined icon-light">light_mode</span>
          <span class="material-symbols-outlined icon-dark">dark_mode</span>
          Mode sombre
        </span>
        <span class="material-symbols-outlined" style="font-size:18px">swap_horiz</span>
      `;
    } else {
      btn.className = 'theme-toggle-btn';
      btn.innerHTML = `
        <span class="material-symbols-outlined icon-light">dark_mode</span>
        <span class="material-symbols-outlined icon-dark">light_mode</span>
      `;
    }

    btn.addEventListener('click', () => this.toggleTheme());
    return btn;
  },

  // Injects a theme toggle into whichever nav shell is present on the
  // current page: the public landing header, the admin/client topbar, or
  // (as a fallback) the sidebar footer.
  initThemeToggle() {
    if (document.querySelector('.theme-toggle-btn, .theme-toggle-row')) return;

    // Public pages (landing, à propos, restaurant detail, auth, restaurants list)
    const landingActions = document.querySelector('.landing-nav-actions');
    if (landingActions) {
      landingActions.insertBefore(this.buildThemeToggleButton('icon'), landingActions.firstChild);
    }

    // Admin / client dashboards
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight) {
      topbarRight.insertBefore(this.buildThemeToggleButton('icon'), topbarRight.firstChild);
    }

    // Fallback: sidebar footer (keeps the option reachable even on pages
    // without a topbar-right or landing nav, e.g. narrow custom layouts)
    if (!landingActions && !topbarRight) {
      const sidebarFooter = document.querySelector('.sidebar-footer');
      if (sidebarFooter) {
        sidebarFooter.insertBefore(this.buildThemeToggleButton('row'), sidebarFooter.firstChild);
      }
    }
  },

  /* =====================================================
     UTILITIES
     ===================================================== */
  formatCurrency(amount) {
    const formatted = amount.toFixed(2).replace('.', ',');
    return formatted.endsWith(',00')
      ? `${formatted.slice(0, -3)} FCFA`
      : `${formatted} FCFA`;
  },

  formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(date));
  },

  debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  },

  // Simulate async API call
  async simulateRequest(duration = 800) {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  // Check availability of list of item names
  // Returns array of unavailable item names
  getUnavailableItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) return [];
    const menuItems = this.state.menuItems || [];
    const unavailable = [];

    items.forEach(itemName => {
      if (!itemName) return;
      let rawName = typeof itemName === 'string' ? itemName.replace(/^\d+x\s*/i, '').trim().toLowerCase() : '';
      let cleanOrderName = rawName.replace(/\bpcs\b/g, 'pièces');

      const found = menuItems.find(m => {
        if (!m || !m.name) return false;
        let cleanMenuName = m.name.trim().toLowerCase().replace(/\bpcs\b/g, 'pièces');
        return cleanMenuName === cleanOrderName || cleanMenuName.includes(cleanOrderName) || cleanOrderName.includes(cleanMenuName);
      });

      if (found && found.available === false) {
        if (!unavailable.includes(itemName)) {
          unavailable.push(itemName);
        }
      }
    });

    return unavailable;
  },

  // Password strength
  checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return { score, max: 5, label: ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort', 'Excellent'][score] };
  },

  // Generate avatar color from name
  getAvatarColor(name) {
    const colors = ['#f0603d', '#2E9E5B', '#805200', '#006d38', '#ab2f0f'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  // Get initials from name
  getInitials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  // Edit Restaurant Profile Modal (Photo, Name, Cuisine)
  openEditRestaurantModal() {
    const user = this.state.currentUser;
    if (!user) return;

    // Find registered user details from localStorage
    const users = JSON.parse(localStorage.getItem('eresto_users') || '[]');
    const registeredUser = users.find(u => u.id === user.id) || user;

    const currentImg = registeredUser.restaurantImage || '';
    const currentName = registeredUser.restaurantName || registeredUser.name || 'Mon Restaurant';
    const currentCuisine = registeredUser.cuisineType || '';

    let overlay = document.getElementById('edit-restaurant-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'edit-restaurant-modal';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal" style="max-width:500px">
        <div class="modal-header">
          <h3 class="modal-title" style="display:flex;align-items:center;gap:8px">
            <span class="material-symbols-outlined" style="color:var(--primary)">storefront</span>
            Profil du Restaurant
          </h3>
          <button class="modal-close" onclick="document.getElementById('edit-restaurant-modal').classList.remove('active')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="edit-rest-form" class="dish-form" novalidate onsubmit="event.preventDefault();eResto.saveRestaurantProfile()">
            <div class="form-group">
              <label class="form-label" for="edit-rest-name">Nom du Restaurant *</label>
              <div class="input-wrapper has-icon-left">
                <span class="material-symbols-outlined input-icon-left">restaurant</span>
                <input class="form-input" type="text" id="edit-rest-name" value="${currentName.replace(/"/g, '&quot;')}" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="edit-rest-cuisine">Type de Cuisine</label>
              <div class="input-wrapper has-icon-left">
                <span class="material-symbols-outlined input-icon-left">local_dining</span>
                <input class="form-input" type="text" id="edit-rest-cuisine" placeholder="Ex: Pizza • Italien, Fast-food..." value="${currentCuisine.replace(/"/g, '&quot;')}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Photo du Restaurant (Couverture)</label>
              <div style="display:flex;flex-direction:column;gap:10px">
                <input class="form-input" type="file" id="edit-rest-img-file" accept="image/*" style="padding:8px;cursor:pointer" onchange="eResto._previewEditRestImg(this)">
                <div class="input-wrapper has-icon-left">
                  <span class="material-symbols-outlined input-icon-left">link</span>
                  <input class="form-input" type="url" id="edit-rest-img-url" placeholder="Ou coller l'URL d'une image" value="${currentImg.startsWith('data:') ? '' : currentImg.replace(/"/g, '&quot;')}">
                </div>
                <div id="edit-rest-img-preview-box" style="width:100%;height:150px;border-radius:12px;overflow:hidden;border:1px solid var(--outline-variant);margin-top:4px">
                  <img id="edit-rest-img-preview" src="${currentImg || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'}" alt="Photo restaurant" style="width:100%;height:100%;object-fit:cover">
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('edit-restaurant-modal').classList.remove('active')">Annuler</button>
          <button class="btn btn-primary btn-sm" onclick="eResto.saveRestaurantProfile()">
            <span class="material-symbols-outlined" style="font-size:16px">check</span>
            Enregistrer
          </button>
        </div>
      </div>
    `;

    overlay.classList.add('active');
  },

  _previewEditRestImg(input) {
    if (!input || !input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById('edit-rest-img-preview');
      if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  },

  async saveRestaurantProfile() {
    const user = this.state.currentUser;
    if (!user) return;

    const name = document.getElementById('edit-rest-name')?.value.trim();
    const cuisine = document.getElementById('edit-rest-cuisine')?.value.trim();
    let imgUrl = document.getElementById('edit-rest-img-url')?.value.trim();

    const fileInput = document.getElementById('edit-rest-img-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        imgUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(fileInput.files[0]);
        });
      } catch(e) {}
    }

    if (!name) {
      this.showToast('Le nom du restaurant est requis.', 'error');
      return;
    }

    // Update in eresto_users
    const users = JSON.parse(localStorage.getItem('eresto_users') || '[]');
    const userIdx = users.findIndex(u => u.id === user.id || u.email === user.email);

    if (userIdx !== -1) {
      users[userIdx].restaurantName = name;
      users[userIdx].cuisineType = cuisine;
      if (imgUrl) users[userIdx].restaurantImage = imgUrl;
      localStorage.setItem('eresto_users', JSON.stringify(users));
    }

    // Update currentUser
    user.restaurantName = name;
    user.cuisineType = cuisine;
    if (imgUrl) user.restaurantImage = imgUrl;
    localStorage.setItem('eresto_current_user', JSON.stringify(user));

    document.getElementById('edit-restaurant-modal')?.classList.remove('active');
    this.showToast('Profil du restaurant mis à jour avec succès !', 'success');

    // Update UI elements across page
    this.updateUserUI();
  },

  initRestaurantEditButton() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('btn-edit-restaurant')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-edit-restaurant';
    btn.className = 'btn btn-secondary btn-sm';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '6px';
    btn.style.marginRight = '8px';
    btn.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:16px;color:var(--primary)">storefront</span>
      Mon Restaurant
    `;
    btn.onclick = () => this.openEditRestaurantModal();
    topbarRight.insertBefore(btn, topbarRight.firstChild);
  },

  // Confirm dialog
  confirm(message, title = 'Confirmation') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal" style="max-width:400px">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
          </div>
          <div class="modal-body">
            <p style="color:var(--on-surface-variant)">${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" id="confirm-no">Annuler</button>
            <button class="btn btn-danger btn-sm" id="confirm-yes">Confirmer</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('#confirm-yes').addEventListener('click', () => { overlay.remove(); resolve(true); });
      overlay.querySelector('#confirm-no').addEventListener('click', () => { overlay.remove(); resolve(false); });
      overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  },


};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => eResto.init());

// Make globally available
window.eResto = eResto;

