/**
 * eResto - Landing Page Dynamic Restaurants & Interactivity
 */

'use strict';

// Default initial restaurants demo list (Façades réelles de restaurants)
const DEFAULT_RESTAURANTS = [
  {
    id: 'demo-1',
    name: 'Chitir Chicken (CTR)',
    category: 'Fast-food • Poulet Frit',
    rating: 4.8,
    status: 'open',
    image: `${ERESTO_BASE}assets/images/chitir-resto.jpg`,
  },
  {
    id: 'demo-2',
    name: 'Le Verdoyant',
    category: 'Grillades • Poulet Bicyclette',
    rating: 4.9,
    status: 'open',
    image: `${ERESTO_BASE}assets/images/le-verdoyant.jpg`,
  },
  {
    id: 'demo-3',
    name: 'L\'Eau Vive',
    category: 'Gastronomie & Spécialités Burkinabè',
    rating: 4.9,
    status: 'open',
    image: `${ERESTO_BASE}assets/images/leau-vive.jpg`,
  },

  {
    id: 'demo-4',
    name: 'Belchicken Burkina',
    category: 'Fast-food • Poulet Frit & Burgers',
    rating: 4.1,
    status: 'open',
    image: `${ERESTO_BASE}assets/images/belchicken-burkina.jpg`,
  },
];

// Fallback images for user created restaurants
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80',
];

let showAll = false;
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  renderRestaurants();
  initSearch();

  // Keep "Ouvert / Fermé" badges live: a restaurant closing at a set hour
  // should flip to "Fermé" on its own, without the client reloading.
  setInterval(renderRestaurants, 30000);
});

// Load registered user restaurants + demo
function getAllRestaurants() {
  // Read live status for each default restaurant from localStorage
  const defaultList = DEFAULT_RESTAURANTS.map(r => {
    const liveStatus = window.eResto && eResto.getLiveRestaurantStatus
      ? eResto.getLiveRestaurantStatus(r.id)
      : (localStorage.getItem(`eresto_resto_status_${r.id}`) || r.status);
    return { ...r, status: liveStatus };
  });

  const list = [...defaultList];

  // Retrieve registered user owners from localStorage
  const users = JSON.parse(localStorage.getItem('eresto_users') || '[]');
  const ownerUsers = users.filter(u => u.type === 'owner' || u.restaurantName);

  ownerUsers.forEach((user, idx) => {
    const name = user.restaurantName || user.name || 'Restaurant eResto';
    // avoid duplicates if already present
    if (!list.some(r => r.name.toLowerCase() === name.toLowerCase())) {
      const img = user.restaurantImage || SAMPLE_IMAGES[idx % SAMPLE_IMAGES.length];
      const restId = `user-rest-${user.id}`;
      const rStatus = window.eResto && eResto.getLiveRestaurantStatus
        ? eResto.getLiveRestaurantStatus(restId)
        : 'open';
      list.push({
        id: restId,
        name: name,
        category: user.cuisineType || 'Restaurant & Grill',
        rating: 5.0,
        status: rStatus,
        image: img,
        isUserCreated: true,
      });
    }
  });

  return list;
}

// Render SVG Star icon (refined & soft SVG)
function renderStarSvg() {
  return `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" style="display:inline-block;vertical-align:middle;margin-right:3px">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  `;
}

function renderRestaurants() {
  const container = document.getElementById('restaurants-grid-container');
  if (!container) return;

  const all = getAllRestaurants();
  let filtered = all;

  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase();
    filtered = all.filter(r => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }

  // Display top 4 by default, or all if showAll is true
  const forceShowAll = container.getAttribute('data-show-all') === 'true';
  const displayed = (showAll || forceShowAll) ? filtered : filtered.slice(0, 4);

  if (displayed.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 24px;background:#fff;border-radius:20px;box-shadow:0 4px 18px rgba(0,0,0,0.03)">
        <span class="material-symbols-outlined" style="font-size:40px;color:var(--on-surface-variant);opacity:0.4;display:block;margin-bottom:8px">search_off</span>
        <p style="font-size:16px;font-weight:700">Aucun restaurant trouvé</p>
        <p style="font-size:13px;color:var(--on-surface-variant);opacity:0.7">Essayez une autre recherche.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayed.map(r => `
    <a href="${ERESTO_BASE}pages/public/restaurant-detail.html?id=${r.id}" class="restaurant-card">
      <div class="restaurant-img-wrapper">
        <img src="${r.image}" alt="${r.name}" class="restaurant-img" loading="lazy">
      </div>
      <div class="restaurant-info">
        <h3 class="restaurant-name">${r.name}</h3>
        <p class="restaurant-meta">${r.category}</p>
        <div class="restaurant-footer">
          <div class="rating-badge">
            ${renderStarSvg()}
            <span>${r.rating}</span>
          </div>
          <span class="status-badge-chip ${r.status}">
            ${r.status === 'open' ? 'Ouvert' : r.status === 'closed' ? 'Fermé' : 'Très occupé'}
          </span>
        </div>
      </div>
    </a>
  `).join('');

  // Update button text and icon
  const toggleBtn = document.getElementById('view-all-restaurants-btn');
  if (toggleBtn) {
    if (showAll) {
      toggleBtn.innerHTML = `
        Voir moins
        <span class="material-symbols-outlined" style="font-size:18px">expand_less</span>
      `;
    } else {
      toggleBtn.innerHTML = `
        Voir tout (${all.length})
        <span class="material-symbols-outlined" style="font-size:18px">arrow_forward</span>
      `;
    }
  }
}

function toggleShowAllRestaurants() {
  showAll = !showAll;
  renderRestaurants();
}

function initSearch() {
  const input = document.getElementById('hero-search-input');
  if (!input) return;

  input.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    showAll = true; // Auto-expand when user types in search
    renderRestaurants();
  });
}
