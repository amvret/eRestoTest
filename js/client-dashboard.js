'use strict';

let currentRating = 5;
let currentQuickRating = 5;

document.addEventListener('DOMContentLoaded', () => {
  const user = window.eResto && window.eResto.state ? window.eResto.state.currentUser : null;

  // Enforce login as client
  if (!user) {
    window.location.href = `${ERESTO_BASE}pages/auth/connexion.html`;
    return;
  }

  // Populate Header & Avatar
  const welcomeName = document.getElementById('client-welcome-name');
  const welcomeEmail = document.getElementById('client-welcome-email');
  const avatar = document.getElementById('client-avatar');

  if (welcomeName) welcomeName.textContent = `Bonjour, ${user.name} !`;
  if (welcomeEmail) welcomeEmail.textContent = user.email || 'Compte Client eResto';
  if (avatar) avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'C';

  // Load User Data
  loadClientOrders();
  loadClientReservations();
  loadClientReviews();

  // Keep the dashboard in sync: if the admin validates an order/reservation
  // in another tab, or the person switches back to this tab, refresh the data.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadClientOrders();
      loadClientReservations();
      loadClientReviews();
    }
  });

  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key.startsWith('eresto_client_orders_')) loadClientOrders();
    if (e.key.startsWith('eresto_client_reservations_')) loadClientReservations();
    if (e.key === 'eresto_reviews') loadClientReviews();
  });
});

function switchClientTab(tabName) {
  ['orders', 'reservations', 'reviews'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const content = document.getElementById(`tab-content-${t}`);
    if (btn) btn.classList.remove('active');
    if (content) content.classList.remove('active');
  });

  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  const activeContent = document.getElementById(`tab-content-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.classList.add('active');
}

/* =====================================================
   ORDERS HISTORY
   ===================================================== */
// Pulls the authoritative status straight from each restaurant's own
// order/reservation records and patches the client's local copy if it
// drifted (e.g. validated before this fix, or updated from another
// tab/device where the push-sync didn't fire). Returns true if anything
// was corrected, so the caller knows to persist the repaired list.
function reconcileWithRestaurant(records, prefix) {
  let changed = false;
  records.forEach(rec => {
    if (!rec.restaurantId) return;
    try {
      const adminKey = eResto.getAdminStorageKey(prefix, rec.restaurantId);
      let adminRecords = JSON.parse(localStorage.getItem(adminKey) || '[]');
      let match = adminRecords.find(a => a.id === rec.id);

      // Fallback: showcase restaurants other than Chitir (demo-1) used to
      // share the single 'eresto_<prefix>_demo' bucket before restaurants
      // got their own bucket each. Anything validated back then still lives
      // there, so check it too rather than leaving old orders stuck.
      if (!match && rec.restaurantId !== 'demo-1' && rec.restaurantId !== 'demo' && !rec.restaurantId.startsWith('user-rest-')) {
        const legacyKey = `eresto_${prefix}_demo`;
        const legacyRecords = JSON.parse(localStorage.getItem(legacyKey) || '[]');
        match = legacyRecords.find(a => a.id === rec.id);
      }

      if (match && match.status && match.status !== rec.status) {
        rec.status = match.status;
        changed = true;
      }
    } catch (e) {
      // ignore malformed data
    }
  });
  return changed;
}

function loadClientOrders() {
  const user = window.eResto.state.currentUser;
  if (!user) return;

  const key = `eresto_client_orders_${user.id}`;
  let orders = JSON.parse(localStorage.getItem(key) || '[]');

  // Self-heal: always trust the restaurant's own record as the source of
  // truth, so even orders validated before this fix show up correctly.
  if (reconcileWithRestaurant(orders, 'orders')) {
    localStorage.setItem(key, JSON.stringify(orders));
  }

  const countEl = document.getElementById('count-orders');
  if (countEl) countEl.textContent = orders.length;

  const container = document.getElementById('client-orders-list');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-history-state">
        <span class="material-symbols-outlined" style="font-size:48px;color:#d1d5db;margin-bottom:12px;display:block">receipt_long</span>
        <h3 style="font-family:var(--font-display);font-size:18px;font-weight:800;color:#1c1b1b;margin-bottom:6px">Aucune commande enregistrée</h3>
        <p style="font-size:14px;color:#6b554f;margin-bottom:20px;">Vous n'avez pas encore passé de commande sur eResto.</p>
        <a href="${ERESTO_BASE}pages/client/restaurants.html" class="rd-btn rd-btn-primary" style="display:inline-flex;width:auto;padding:12px 24px;">Découvrir les restaurants</a>
      </div>
    `;
    return;
  }

  const formatCurrency = (val) => `${Number(val).toLocaleString('fr-FR')} FCFA`;

  const statusMap = {
    received: { text: 'Reçue', class: 'received' },
    in_progress: { text: 'En préparation', class: 'in_progress' },
    ready: { text: 'Prête / En livraison', class: 'ready' },
    delivered: { text: 'Livrée / Validée', class: 'delivered' },
    cancelled: { text: 'Annulée', class: 'cancelled' }
  };

  container.innerHTML = orders.map(ord => {
    const st = statusMap[ord.status] || { text: 'En cours', class: 'in_progress' };

    return `
      <div class="order-history-card">
        <div class="order-card-header">
          <div>
            <span class="order-card-rest-name">${ord.restaurantName || 'Restaurant'}</span>
            <span style="font-size:13px;color:#9ca3af;margin-left:12px;">Commande ${ord.id} • ${ord.date || ''} à ${ord.time || ''}</span>
          </div>
          <span class="order-status-badge ${st.class}">${st.text}</span>
        </div>

        <div class="order-card-items">
          ${(ord.items || []).map(it => `<span class="order-item-chip">${it}</span>`).join('')}
        </div>

        <div class="order-card-footer">
          <div>
            <span style="font-size:13px;color:#6b554f;">Mode : <strong>${ord.type === 'delivery' ? 'Livraison' : 'À emporter'}</strong></span>
            <span style="margin:0 8px;color:#d1d5db">•</span>
            <span style="font-size:16px;font-weight:800;color:var(--primary);">${formatCurrency(ord.total)}</span>
          </div>

          <button class="rd-btn rd-btn-outline" style="width:auto;padding:8px 16px;font-size:13px;" onclick="openQuickReviewModal('${ord.restaurantId}', '${(ord.restaurantName || '').replace(/'/g, "\\'")}')">
            <span class="material-symbols-outlined" style="font-size:16px">star</span>
            Donner mon avis
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* =====================================================
   RESERVATIONS HISTORY
   ===================================================== */
function loadClientReservations() {
  const user = window.eResto.state.currentUser;
  if (!user) return;

  const key = `eresto_client_reservations_${user.id}`;
  let reservations = JSON.parse(localStorage.getItem(key) || '[]');

  // Self-heal: same reasoning as orders above.
  if (reconcileWithRestaurant(reservations, 'reservations')) {
    localStorage.setItem(key, JSON.stringify(reservations));
  }

  const countEl = document.getElementById('count-reservations');
  if (countEl) countEl.textContent = reservations.length;

  const container = document.getElementById('client-reservations-list');
  if (!container) return;

  if (reservations.length === 0) {
    container.innerHTML = `
      <div class="empty-history-state">
        <span class="material-symbols-outlined" style="font-size:48px;color:#d1d5db;margin-bottom:12px;display:block">event_seat</span>
        <h3 style="font-family:var(--font-display);font-size:18px;font-weight:800;color:#1c1b1b;margin-bottom:6px">Aucune réservation de table</h3>
        <p style="font-size:14px;color:#6b554f;margin-bottom:20px;">Vous n'avez pas encore réservé de table.</p>
        <a href="${ERESTO_BASE}pages/client/restaurants.html" class="rd-btn rd-btn-primary" style="display:inline-flex;width:auto;padding:12px 24px;">Réserver une table</a>
      </div>
    `;
    return;
  }

  const resStatusMap = {
    reserved:  { text: 'Réservée',        class: 'received' },
    arrived:   { text: 'Client arrivé',   class: 'ready' },
    confirmed: { text: 'Confirmée',       class: 'ready' },
    cancelled: { text: 'Annulée',         class: 'cancelled' }
  };

  container.innerHTML = reservations.map(res => {
    const st = resStatusMap[res.status] || resStatusMap.reserved;
    const isActive = res.status === 'reserved' || res.status === 'confirmed';

    const cancelAction = !isActive ? '' : res.cancelRequested
      ? `<span style="font-size:12px;font-weight:700;color:#c2410c;background:#fff7ed;padding:6px 12px;border-radius:99px;">Annulation demandée</span>`
      : `<button class="rd-btn rd-btn-outline" style="width:auto;padding:8px 16px;font-size:13px;" onclick="requestCancelReservation('${res.id}')">
          <span class="material-symbols-outlined" style="font-size:16px">event_busy</span>
          Demander l'annulation
        </button>`;

    return `
    <div class="order-history-card">
      <div class="order-card-header">
        <div>
          <span class="order-card-rest-name">${res.restaurantName || 'Restaurant'}</span>
          <span style="font-size:13px;color:#9ca3af;margin-left:12px;">Réservation ${res.id}</span>
        </div>
        <span class="order-status-badge ${st.class}">${st.text}</span>
      </div>

      <div style="display:flex;gap:24px;font-size:14px;color:#374151;">
        <div>📅 <strong>Date :</strong> ${res.date} à ${res.time}</div>
        <div>👥 <strong>Convives :</strong> ${res.guests} personne(s)</div>
        <div>📍 <strong>Emplacement :</strong> ${res.location || 'Salle'}</div>
      </div>

      ${cancelAction ? `<div class="order-card-footer" style="justify-content:flex-end;margin-top:12px;">${cancelAction}</div>` : ''}
    </div>
  `;
  }).join('');
}

// Sends a cancellation request for one of the client's own reservations.
// The reservation itself isn't cancelled yet — the restaurant reviews the
// request and confirms it from their own Réservations page.
async function requestCancelReservation(reservationId) {
  const user = window.eResto.state.currentUser;
  if (!user) return;

  const confirmed = await eResto.confirm(
    'Le restaurant devra confirmer l\'annulation. Voulez-vous envoyer la demande ?',
    'Demander l\'annulation'
  );
  if (!confirmed) return;

  const key = `eresto_client_reservations_${user.id}`;
  const reservations = JSON.parse(localStorage.getItem(key) || '[]');
  const res = reservations.find(r => r.id === reservationId);
  if (!res) return;

  const ok = eResto.requestReservationCancellation(res);
  if (!ok) {
    eResto.showToast('Impossible d\'envoyer la demande pour le moment.', 'error');
    return;
  }

  res.cancelRequested = true;
  localStorage.setItem(key, JSON.stringify(reservations));

  eResto.showToast('Votre demande d\'annulation a été envoyée au restaurant.', 'success');
  loadClientReservations();
}

/* =====================================================
   REVIEWS HISTORY
   ===================================================== */
function loadClientReviews() {
  const user = window.eResto.state.currentUser;
  if (!user) return;

  const allReviews = JSON.parse(localStorage.getItem('eresto_reviews') || '[]');
  // Filter only reviews posted by this user
  const userReviews = allReviews.filter(r => r.name === user.name || r.userId === user.id);

  const countEl = document.getElementById('count-reviews');
  if (countEl) countEl.textContent = userReviews.length;

  const container = document.getElementById('client-reviews-list');
  if (!container) return;

  if (userReviews.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <span class="material-symbols-outlined" style="font-size:56px;color:#e2c4b8;display:block;margin-bottom:16px;">rate_review</span>
        <h3 style="font-family:var(--font-display);font-size:18px;font-weight:800;color:#1c1b1b;margin-bottom:6px;">Aucun avis publié</h3>
        <p style="font-size:14px;color:#6b554f;margin-bottom:20px;">Vous n'avez pas encore laissé d'avis sur un restaurant.</p>
        <a href="${ERESTO_BASE}pages/client/restaurants.html" class="rd-btn rd-btn-primary" style="display:inline-flex;width:auto;padding:12px 24px;">Découvrir les restaurants</a>
      </div>
    `;
    return;
  }

  const allRestaurants = typeof getAllRestaurants === 'function' ? getAllRestaurants() : [];

  container.innerHTML = userReviews.map(review => {
    const rest = allRestaurants.find(r => r.id === review.restaurantId);
    const restName = rest ? rest.name : (review.restaurantName || 'Restaurant');
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    return `
      <div class="order-history-card">
        <div class="order-card-header">
          <div>
            <span class="order-card-rest-name">${restName}</span>
            <span style="font-size:13px;color:#9ca3af;margin-left:12px;">${review.date || 'Récemment'}</span>
          </div>
          <span style="color:#f59e0b;font-size:20px;letter-spacing:2px;">${stars}</span>
        </div>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:8px;font-style:italic;">
          "${review.comment}"
        </p>
      </div>
    `;
  }).join('');
}

function openQuickReviewModal(restId, restName) {
  document.getElementById('qr-rest-id').value = restId;
  document.getElementById('qr-rest-name').textContent = restName;
  document.getElementById('quick-review-modal').classList.add('active');
}

function setQuickRating(val) {
  currentQuickRating = val;
  const label = document.getElementById('qr-rating-text');
  if (label) label.textContent = `${val} / 5`;

  const stars = document.querySelectorAll('.star-btn-q');
  stars.forEach(s => {
    const v = parseInt(s.getAttribute('data-val'));
    if (v <= val) s.classList.add('active');
    else s.classList.remove('active');
  });
}

function handleQuickReviewSubmit(e) {
  e.preventDefault();
  const user = window.eResto.state.currentUser;
  const restId = document.getElementById('qr-rest-id').value;
  const comment = document.getElementById('qr-comment').value.trim();

  saveReview(restId, user.name, currentQuickRating, comment);

  document.getElementById('quick-review-modal').classList.remove('active');
  if (window.eResto && window.eResto.showToast) {
    window.eResto.showToast('Merci pour votre avis !', 'success');
  }
}

function saveReview(restId, userName, rating, comment) {
  const reviews = JSON.parse(localStorage.getItem('eresto_reviews') || '[]');
  reviews.unshift({
    id: Date.now(),
    restaurantId: restId,
    name: userName,
    rating: rating,
    comment: comment,
    date: 'Aujourd\'hui'
  });
  localStorage.setItem('eresto_reviews', JSON.stringify(reviews));
}
