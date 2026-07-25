'use strict';

let currentRestaurantId = null;
let currentRestaurantName = '';
let rawMenuData = [];
let selectedCategory = 'all';
let currentSort = 'popularity';

// Cart State
let cart = []; // [{ id, name, price, qty }]
let orderType = 'delivery'; // 'delivery' | 'takeout'

// Each restaurant sets its own delivery fee from the admin Horaires page;
// this reads that value live (falls back to 1000 FCFA if never set).
function getDeliveryFee() {
  return window.eResto && window.eResto.getDeliveryFee
    ? window.eResto.getDeliveryFee(currentRestaurantId)
    : 1000;
}

// Reservation date-picker state (month currently shown in the calendar)
let calendarViewYear = null;
let calendarViewMonth = null; // 0-indexed

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get('id');

  if (!restId) {
    window.location.href = `${ERESTO_BASE}pages/client/restaurants.html`;
    return;
  }

  currentRestaurantId = restId;

  // Get restaurant data using landing.js helper
  const allRestaurants = typeof getAllRestaurants === 'function' ? getAllRestaurants() : [];
  const restaurant = allRestaurants.find(r => r.id === restId);

  if (!restaurant) {
    window.location.href = `${ERESTO_BASE}pages/client/restaurants.html`;
    return;
  }

  currentRestaurantName = restaurant.name;

  // Restaurant (owner) accounts can browse restaurants & menus but must
  // never be able to order or reserve a table — hide that UI for them.
  const viewerUser = window.eResto && window.eResto.state ? window.eResto.state.currentUser : null;
  if (viewerUser && viewerUser.type === 'owner') {
    document.body.classList.add('is-owner-view');
  }

  // Populate Hero Banner
  document.getElementById('rd-image').src = restaurant.image;
  document.getElementById('rd-name').textContent = restaurant.name;
  document.getElementById('rd-category').textContent = restaurant.category;
  document.getElementById('rd-rating').textContent = restaurant.rating;
  
  // Real-time status: manual toggle + actual opening hours, refreshed
  // periodically so a restaurant closing at, say, 18h flips to "Fermé"
  // on its own without the visitor reloading the page.
  updateLiveStatusBadge(restId, restaurant);
  setInterval(() => updateLiveStatusBadge(restId, restaurant), 30000);

  // Load Menu Items
  loadRestaurantMenu(restId);

  // Restore pending cart if returning from login
  restorePendingCart();

  // Render Reviews
  renderReviews();

  // Reservation date/time: default to the next date the restaurant is
  // actually open, and keep the calendar + time slots in sync with the
  // restaurant's own opening hours (set by the owner in Horaires).
  initReservationDatePicker();
  const timeSelect = document.getElementById('res-time');
  if (timeSelect) {
    timeSelect.addEventListener('change', refreshTablePicker);
  }

  // Pre-fill user details if logged in
  const currentUser = window.eResto && window.eResto.state ? window.eResto.state.currentUser : null;
  if (currentUser) {
    const custName = document.getElementById('cust-name');
    const resName = document.getElementById('res-name');
    if (custName && currentUser.name) custName.value = currentUser.name;
    if (resName && currentUser.name) resName.value = currentUser.name;
  }

  // Check restaurant service toggles
  checkRestaurantServices();

  updateCartUI();
});

function updateLiveStatusBadge(restId, restaurant) {
  const statusBadge = document.getElementById('rd-status');
  if (!statusBadge) return;
  const liveStatus = window.eResto && window.eResto.getLiveRestaurantStatus
    ? window.eResto.getLiveRestaurantStatus(restId)
    : (restaurant.status || 'open');
  statusBadge.className = `status-badge-chip ${liveStatus}`;
  statusBadge.textContent = liveStatus === 'open' ? 'Ouvert' : liveStatus === 'closed' ? 'Fermé' : 'Très occupé';
}

function checkRestaurantServices() {
  if (!window.eResto || !window.eResto.getRestaurantServices) return;
  const services = window.eResto.getRestaurantServices(currentRestaurantId);

  // Check Orders
  if (services.allowOrders === false) {
    const orderBtn = document.querySelector('button[onclick="openOrderModal()"]');
    if (orderBtn) {
      orderBtn.disabled = true;
      orderBtn.style.opacity = '0.5';
      orderBtn.style.cursor = 'not-allowed';
      orderBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px">block</span> Commandes désactivées`;
    }
  }

  // Check Reservations
  if (services.allowReservations === false) {
    const resBtn = document.querySelector('button[onclick="openReserveModal()"]');
    if (resBtn) {
      resBtn.disabled = true;
      resBtn.style.opacity = '0.5';
      resBtn.style.cursor = 'not-allowed';
      resBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px">block</span> Réservations désactivées`;
    }
  }
}

// Demo menus map with rich items, images & badges
const DEMO_MENUS = {
  'demo-1': [ // Chitir Chicken (CTR)
    { 
      id: 101, 
      name: 'Menu Box Poulet Ail', 
      category: 'Poulet Frit', 
      price: 3500, 
      description: '3 pièces de poulet frit mariné à l\'ail, grande portion de frites croustillantes et boisson 33cl.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/chitir-chicken.jpg`,
      badge: 'BEST-SELLER',
      badgeClass: 'dish-badge-bestseller',
      popularity: 98
    },
    { 
      id: 102, 
      name: 'Seau Familial Crispy (8 pièces)', 
      category: 'Poulet Frit', 
      price: 6500, 
      description: '8 pièces de poulet extra croustillant épicé ou doux, 2 grandes frites et 2 boissons.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/chitir-chicken.jpg`,
      badge: 'POPULAIRE',
      badgeClass: 'dish-badge-popular',
      popularity: 92
    },
    { 
      id: 103, 
      name: 'Burger Chitir Spécial', 
      category: 'Burgers & Wraps', 
      price: 2500, 
      description: 'Filet de poulet pané croquant, fromage cheddar fondu, salade fraîche et sauce secrète CTR.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      badge: 'BEST-SELLER',
      badgeClass: 'dish-badge-bestseller',
      popularity: 95
    },
    { 
      id: 104, 
      name: 'Wrap Poulet Pané', 
      category: 'Burgers & Wraps', 
      price: 2000, 
      description: 'Tortilla chaude garnie de tenders de poulet, tomates, salade et mayonnaise épicée.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
      badge: '🌶️ ÉPICÉ',
      badgeClass: 'dish-badge-spicy',
      popularity: 88
    },
    { 
      id: 105, 
      name: 'Tenders de Poulet (5 pièces)', 
      category: 'Accompagnements', 
      price: 2500, 
      description: 'Bâtonnets de filet de poulet 100% filet panés à la perfection.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
      popularity: 85
    },
    { 
      id: 106, 
      name: 'Frites Portions XL', 
      category: 'Accompagnements', 
      price: 1000, 
      description: 'Grandes frites dorées et assaisonnées au sel de paprika.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
      popularity: 80
    },
    { 
      id: 107, 
      name: 'Coca-Cola / Fanta 33cl', 
      category: 'Boissons', 
      price: 600, 
      description: 'Canette fraîche au choix.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
      popularity: 90
    }
  ],
  'demo-2': [ // Le Verdoyant
    { 
      id: 201, 
      name: 'Poulet Bicyclette Braisé', 
      category: 'Grillades', 
      price: 4500, 
      description: 'Véritable poulet bicyclette local braisé aux condiments maison, oignons et piment doux.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/poulet-bicyclette.png`,
      badge: 'BEST-SELLER',
      badgeClass: 'dish-badge-bestseller',
      popularity: 99
    },
    { 
      id: 202, 
      name: 'Capitaine Braisé Burkinabè', 
      category: 'Grillades', 
      price: 5000, 
      description: 'Poisson capitaine frais braisé au feu de bois avec marinades aux épices de saison.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/capitaine-braise.png`,
      badge: 'POPULAIRE',
      badgeClass: 'dish-badge-popular',
      popularity: 94
    },
    { 
      id: 203, 
      name: 'Riz Gras au Poulet Braisé', 
      category: 'Spécialités Locales', 
      price: 2500, 
      description: 'Riz gras parfumé à la tomate, poivrons, oignons et sa cuisse de poulet braisée.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/riz-gras-poulet.png`,
      badge: 'BEST-SELLER',
      badgeClass: 'dish-badge-bestseller',
      popularity: 96
    },
    { 
      id: 204, 
      name: 'Tô de Sorgho & Sauce Gombo', 
      category: 'Spécialités Locales', 
      price: 1500, 
      description: 'Plat traditionnel authentique accompagné d\'une sauce gombo fraîche à la viande.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/to-sauce-gombo.png`,
      popularity: 82
    },
    { 
      id: 205, 
      name: 'Portion d\'Alloco', 
      category: 'Accompagnements', 
      price: 1000, 
      description: 'Bananes plantains frites bien dorées et moelleuses.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/alloco.png`,
      popularity: 89
    },
    { 
      id: 206, 
      name: 'Dolo Frais / Sucrerie Locale', 
      category: 'Boissons', 
      price: 500, 
      description: 'Boisson rafraîchissante traditionnelle ou soda local.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/dolo-sawataux.png`,
      popularity: 80
    }
  ],
  'demo-3': [ // L'Eau Vive
    { 
      id: 301, 
      name: 'Poulet Grillé Yatenga', 
      category: 'Spécialités Burkinabè', 
      price: 5500, 
      description: 'Poulet local rôtie aux condiments Yatenga, servi avec alloco croustillant et sauce maison.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/poulet-grille.png`,
      badge: 'BEST-SELLER',
      badgeClass: 'dish-badge-bestseller',
      popularity: 98
    },
    { 
      id: 302, 
      name: 'Pintade au Soumbala & Rabilé', 
      category: 'Spécialités Burkinabè', 
      price: 6000, 
      description: 'Morceaux de pintade mijotés aux épices royales traditionnelles, soumbala et rabilé.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/pintade-soumbala.png`,
      badge: 'POPULAIRE',
      badgeClass: 'dish-badge-popular',
      popularity: 94
    },
    { 
      id: 303, 
      name: 'Carpe Grillée au Beurre de Soumbala', 
      category: 'Poissons & Grillades', 
      price: 5500, 
      description: 'Carpe fraîche entière braisée au beurre provençal parfumé au soumbala.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
      popularity: 92
    },
    { 
      id: 304, 
      name: 'Filet de Capitaine au Poivre Vert', 
      category: 'Poissons & Grillades', 
      price: 6500, 
      description: 'Pavé de capitaine poêlé et nappé de sa réduction onctueuse au poivre vert.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/filet-capitaine-poivre-vert.png`,
      popularity: 90
    },
    { 
      id: 305, 
      name: 'Coupe Gourmande Choco-Noisette', 
      category: 'Desserts', 
      price: 2500, 
      description: 'Glace chocolat et vanille, chantilly maison, noisettes concassées et copeaux de chocolat.', 
      available: true,
      image: `${ERESTO_BASE}assets/images/coupe-glacee-choco-noisette.png`,
      popularity: 88
    }
  ],
  'demo-4': [ // Belchicken Burkina
    { 
      id: 401, 
      name: 'Menu Belchicken Crispy Bucket (6 pièces)', 
      category: 'Poulet Frit', 
      price: 5500, 
      description: '6 pièces de poulet frit belge extra croustillant, grande portion de frites et boisson 33cl.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
      badge: 'BEST-SELLER',
      badgeClass: 'dish-badge-bestseller',
      popularity: 97
    },
    { 
      id: 402, 
      name: 'Belburger Gourmet Double Cheese', 
      category: 'Burgers & Wraps', 
      price: 3000, 
      description: 'Double filet de poulet croustillant, double tranche de cheddar fondu, pickles et sauce Belchicken.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      badge: 'POPULAIRE',
      badgeClass: 'dish-badge-popular',
      popularity: 94
    },
    { 
      id: 403, 
      name: 'Belwrap Spicy Chicken', 
      category: 'Burgers & Wraps', 
      price: 2500, 
      description: 'Tortilla chaude garnie de tenders de poulet épicés, salade fraîche et sauce piquante.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
      badge: '🌶️ ÉPICÉ',
      badgeClass: 'dish-badge-spicy',
      popularity: 90
    },
    { 
      id: 404, 
      name: 'BelTenders (5 pièces)', 
      category: 'Accompagnements', 
      price: 2500, 
      description: 'Aiguillettes de poulet 100% filet pané croustillant servies avec sauce barbecue ou mayonnaise.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
      popularity: 88
    },
    { 
      id: 405, 
      name: 'Portion BelFrites XL', 
      category: 'Accompagnements', 
      price: 1000, 
      description: 'Grandes frites belges dorées à souhait et assaisonnées.', 
      available: true,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
      popularity: 85
    }
  ]
};

function loadRestaurantMenu(restId) {
  let menu = [];

  // Check demo saved menu first
  if (restId === 'demo-1' || restId === 'demo') {
    const savedDemo = localStorage.getItem('eresto_menu_demo') || localStorage.getItem('eresto_menu_demo-1');
    if (savedDemo) {
      try { menu = JSON.parse(savedDemo); } catch(e) {}
    }
  } else if (restId.startsWith('user-rest-')) {
    const userId = restId.replace('user-rest-', '');
    const saved = localStorage.getItem(`eresto_menu_${userId}`);
    if (saved) {
      try { menu = JSON.parse(saved); } catch(e) {}
    }
  }

  // Fallback to DEMO_MENUS
  if ((!menu || menu.length === 0) && DEMO_MENUS[restId]) {
    menu = DEMO_MENUS[restId];
  }

  // Generic fallback if empty
  if (menu.length === 0) {
    menu = [
      { 
        id: 1, 
        name: 'Poulet Bicyclette Braisé', 
        category: 'Grillades', 
        price: 4000, 
        description: 'Poulet local braisé aux épices et oignons.', 
        available: true,
        image: `${ERESTO_BASE}assets/images/poulet-bicyclette.png`,
        badge: 'BEST-SELLER',
        badgeClass: 'dish-badge-bestseller',
        popularity: 95
      },
      { 
        id: 2, 
        name: 'Riz Gras au Poulet', 
        category: 'Plats Principaux', 
        price: 2500, 
        description: 'Riz gras parfumé servi avec cuisse de poulet.', 
        available: true,
        image: `${ERESTO_BASE}assets/images/riz-gras-poulet.png`,
        popularity: 90
      },
      { 
        id: 3, 
        name: 'Portion Alloco', 
        category: 'Accompagnements', 
        price: 1000, 
        description: 'Bananes plantains frites dorées.', 
        available: true,
        image: `${ERESTO_BASE}assets/images/alloco.png`,
        popularity: 88
      },
      { 
        id: 4, 
        name: 'Jus de Bissap (50cl)', 
        category: 'Boissons', 
        price: 500, 
        description: 'Jus d\'hibiscus frais fait maison.', 
        available: true,
        image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
        popularity: 92
      }
    ];
  }

  rawMenuData = menu.map((item, idx) => ({
    ...item,
    image: item.image || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80`,
    popularity: item.popularity || (100 - idx * 5)
  }));

  renderCategorySidebar();
  renderDishesGrid();
}

function renderCategorySidebar() {
  const container = document.getElementById('rd-categories-list');
  if (!container) return;

  const counts = { all: rawMenuData.length };
  rawMenuData.forEach(item => {
    const cat = item.category || 'Autres';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const categories = Object.keys(counts);

  const iconsMap = {
    'all': 'restaurant_menu',
    'Poulet Frit': 'fastfood',
    'Burgers & Wraps': 'lunch_dining',
    'Grillades': 'local_fire_department',
    'Spécialités Locales': 'ramen_dining',
    'Spécialités Burkinabè': 'dinner_dining',
    'Poissons & Grillades': 'set_meal',
    'Plats Africains': 'dinner_dining',
    'Accompagnements': 'tapas',
    'Boissons': 'local_bar',
    'Desserts': 'icecream'
  };

  let html = `
    <li class="rd-category-item ${selectedCategory === 'all' ? 'active' : ''}" onclick="selectCategory('all')">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="material-symbols-outlined" style="font-size:20px">${iconsMap['all']}</span>
        <span>Tous les plats</span>
      </div>
      <span class="rd-category-count">${counts['all']}</span>
    </li>
  `;

  for (const cat of categories) {
    if (cat === 'all') continue;
    const icon = iconsMap[cat] || 'flatware';
    const isActive = selectedCategory === cat;

    html += `
      <li class="rd-category-item ${isActive ? 'active' : ''}" onclick="selectCategory('${cat.replace(/'/g, "\\'")}')">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="material-symbols-outlined" style="font-size:20px">${icon}</span>
          <span>${cat}</span>
        </div>
        <span class="rd-category-count">${counts[cat]}</span>
      </li>
    `;
  }

  container.innerHTML = html;
}

function selectCategory(category) {
  selectedCategory = category;
  const titleEl = document.getElementById('rd-active-category-title');
  if (titleEl) {
    titleEl.textContent = category === 'all' ? 'Tous les plats' : category;
  }
  renderCategorySidebar();
  renderDishesGrid();
}

function handleSortChange(sortValue) {
  currentSort = sortValue;
  renderDishesGrid();
}

function renderDishesGrid() {
  const container = document.getElementById('rd-dishes-grid');
  if (!container) return;

  let filtered = selectedCategory === 'all' 
    ? [...rawMenuData] 
    : rawMenuData.filter(item => item.category === selectedCategory);

  if (currentSort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:64px 24px;background:#fff;border-radius:24px;box-shadow:0 4px 20px rgba(0,0,0,0.03)">
        <span class="material-symbols-outlined" style="font-size:48px;color:#d1d5db;margin-bottom:12px;display:block">restaurant_off</span>
        <p style="font-size:18px;font-weight:800;color:#1c1b1b;margin-bottom:4px">Aucun plat dans cette catégorie</p>
        <p style="font-size:14px;color:#6b554f">Sélectionnez une autre catégorie pour explorer le menu.</p>
      </div>
    `;
    return;
  }

  const formatCurrency = (val) => {
    if (window.eResto && window.eResto.formatCurrency) {
      return window.eResto.formatCurrency(val);
    }
    return `${Number(val).toLocaleString('fr-FR')} FCFA`;
  };

  container.innerHTML = filtered.map(item => {
    const price = formatCurrency(item.price);
    const isAvailable = item.available !== false;
    const inCartItem = cart.find(c => c.id === item.id);
    const cartQty = inCartItem ? inCartItem.qty : 0;

    return `
      <article class="dish-card ${!isAvailable ? 'is-disabled' : ''}">
        <div class="dish-img-wrapper">
          <img src="${item.image}" alt="${item.name}" class="dish-img" loading="lazy">
          ${item.badge ? `<span class="dish-badge ${item.badgeClass || 'dish-badge-bestseller'}">${item.badge}</span>` : ''}
        </div>
        <div class="dish-body">
          <div class="dish-header">
            <h3 class="dish-title">${item.name}</h3>
            <span class="dish-price">${price}</span>
          </div>
          <p class="dish-desc">${item.description || ''}</p>
          <button class="dish-add-btn" ${!isAvailable ? 'disabled' : ''} onclick="addToCart(${item.id})">
            <span class="material-symbols-outlined" style="font-size:18px">${cartQty > 0 ? 'shopping_bag' : 'add_shopping_cart'}</span>
            ${!isAvailable ? 'Indisponible' : cartQty > 0 ? `Ajouté (${cartQty})` : 'Ajouter au panier'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/* =====================================================
   CART & ORDER LOGIC
   ===================================================== */

function addToCart(dishId) {
  const currentUser = window.eResto && window.eResto.state ? window.eResto.state.currentUser : null;
  if (currentUser && currentUser.type === 'owner') {
    if (window.eResto.showToast) {
      window.eResto.showToast('Les comptes restaurant ne peuvent pas commander ni réserver de table.', 'warning');
    }
    return;
  }

  const item = rawMenuData.find(d => d.id === dishId);
  if (!item || item.available === false) return;

  const existing = cart.find(c => c.id === dishId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: 1
    });
  }

  updateCartUI();
  renderDishesGrid();

  // Toast notification
  if (window.eResto && window.eResto.showToast) {
    window.eResto.showToast(`Ajouté au panier : ${item.name}`, 'success', 2000);
  }
}

function updateCartQty(dishId, delta) {
  const item = cart.find(c => c.id === dishId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(c => c.id !== dishId);
  }

  updateCartUI();
  renderCartModalItems();
  renderDishesGrid();
}

function removeFromCart(dishId) {
  cart = cart.filter(c => c.id !== dishId);
  updateCartUI();
  renderCartModalItems();
  renderDishesGrid();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  const formatCurrency = (val) => {
    if (window.eResto && window.eResto.formatCurrency) {
      return window.eResto.formatCurrency(val);
    }
    return `${Number(val).toLocaleString('fr-FR')} FCFA`;
  };

  const badgeCount = document.getElementById('cart-badge-count');
  const badgeTotal = document.getElementById('cart-badge-total');
  const floatingBtn = document.getElementById('floating-cart-btn');

  if (badgeCount) badgeCount.textContent = totalCount;
  if (badgeTotal) badgeTotal.textContent = formatCurrency(subtotal);

  if (floatingBtn) {
    if (totalCount > 0) {
      floatingBtn.style.display = 'flex';
    } else {
      floatingBtn.style.display = 'none';
    }
  }

  const subtitle = document.getElementById('cart-modal-subtitle');
  if (subtitle) {
    subtitle.textContent = `${totalCount} article(s) sélectionné(s)`;
  }
}

function toggleOrderType(type) {
  orderType = type;
  const deliveryGroup = document.getElementById('delivery-address-group');
  const deliveryRow = document.getElementById('summary-delivery-row');
  const custAddressInput = document.getElementById('cust-address');

  const delLabel = document.getElementById('option-delivery-label');
  const takeLabel = document.getElementById('option-takeout-label');

  if (type === 'delivery') {
    if (deliveryGroup) deliveryGroup.style.display = 'flex';
    if (deliveryRow) deliveryRow.style.display = 'flex';
    if (custAddressInput) custAddressInput.required = true;

    delLabel?.classList.add('active');
    takeLabel?.classList.remove('active');
  } else {
    if (deliveryGroup) deliveryGroup.style.display = 'none';
    if (deliveryRow) deliveryRow.style.display = 'none';
    if (custAddressInput) custAddressInput.required = false;

    delLabel?.classList.remove('active');
    takeLabel?.classList.add('active');
  }

  renderCartSummary();
}

function renderCartSummary() {
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const deliveryFee = getDeliveryFee();
  const fee = orderType === 'delivery' ? deliveryFee : 0;
  const total = subtotal + fee;

  const formatCurrency = (val) => {
    if (window.eResto && window.eResto.formatCurrency) {
      return window.eResto.formatCurrency(val);
    }
    return `${Number(val).toLocaleString('fr-FR')} FCFA`;
  };

  const subtotalEl = document.getElementById('summary-subtotal');
  const totalEl = document.getElementById('summary-total');
  const feeEl = document.getElementById('summary-delivery-fee');

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (feeEl) feeEl.textContent = formatCurrency(deliveryFee);
}

function openCartModal() {
  if (window.eResto && window.eResto.getRestaurantServices) {
    const services = window.eResto.getRestaurantServices(currentRestaurantId);
    if (services.allowOrders === false) {
      if (window.eResto.showToast) {
        window.eResto.showToast('Ce restaurant n\'accepte pas les commandes en ligne pour le moment.', 'warning');
      }
      return;
    }
  }

  // Block orders if restaurant is currently closed (manual toggle OR
  // simply because it's outside the hours the restaurant configured)
  const liveStatus = window.eResto && window.eResto.getLiveRestaurantStatus
    ? window.eResto.getLiveRestaurantStatus(currentRestaurantId)
    : 'open';
  if (liveStatus === 'closed') {
    if (window.eResto && window.eResto.showToast) {
      window.eResto.showToast('Ce restaurant est fermé et n\'accepte pas de commandes pour le moment.', 'warning');
    }
    return;
  }

  if (cart.length === 0) {
    if (window.eResto && window.eResto.showToast) {
      window.eResto.showToast('Votre panier est vide. Ajoutez d\'abord des plats !', 'info');
    }
    return;
  }

  // Enforce login check immediately when opening cart
  if (!checkAuthBeforeAction('cart')) return;

  renderCartModalItems();
  renderCartSummary();
  document.getElementById('cart-modal').classList.add('active');
}

function closeCartModal() {
  document.getElementById('cart-modal').classList.remove('active');
}

function renderCartModalItems() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:#6b554f;">
        Votre panier est vide.
      </div>
    `;
    return;
  }

  const formatCurrency = (val) => {
    if (window.eResto && window.eResto.formatCurrency) {
      return window.eResto.formatCurrency(val);
    }
    return `${Number(val).toLocaleString('fr-FR')} FCFA`;
  };

  container.innerHTML = cart.map(item => `
    <div class="rd-cart-item">
      <div class="rd-cart-item-info">
        <span class="rd-cart-item-title">${item.name}</span>
        <span class="rd-cart-item-price">${formatCurrency(item.price * item.qty)} (${formatCurrency(item.price)}/u)</span>
      </div>
      <div style="display:flex;align-items:center;">
        <div class="rd-qty-controls">
          <button class="rd-qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
          <span style="font-weight:700;font-size:14px;">${item.qty}</span>
          <button class="rd-qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
        </div>
        <button class="rd-cart-del-btn" onclick="removeFromCart(${item.id})" title="Supprimer">
          <span class="material-symbols-outlined" style="font-size:18px">delete</span>
        </button>
      </div>
    </div>
  `).join('');
}

function checkAuthBeforeAction(actionType) {
  const currentUser = window.eResto && window.eResto.state ? window.eResto.state.currentUser : null;
  if (!currentUser) {
    // Save pending cart & return URL
    localStorage.setItem('eresto_pending_cart', JSON.stringify({
      restaurantId: currentRestaurantId,
      cart: cart
    }));
    localStorage.setItem('eresto_return_url', window.location.href);

    // Show Auth Required Modal
    closeCartModal();
    closeReserveModal();
    const modal = document.getElementById('auth-required-modal');
    if (modal) modal.classList.add('active');
    return false;
  }

  // Restaurant (owner) accounts can browse but never order or reserve —
  // that's reserved for client accounts.
  if (currentUser.type === 'owner' && (actionType === 'cart' || actionType === 'order' || actionType === 'reserve')) {
    closeCartModal();
    closeReserveModal();
    if (window.eResto && window.eResto.showToast) {
      window.eResto.showToast('Les comptes restaurant ne peuvent pas commander ni réserver de table.', 'warning');
    }
    return false;
  }

  return true;
}

function restorePendingCart() {
  const saved = localStorage.getItem('eresto_pending_cart');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data && data.restaurantId === currentRestaurantId && Array.isArray(data.cart)) {
        cart = data.cart;
        localStorage.removeItem('eresto_pending_cart');
        // Auto-open cart modal after login restoration
        setTimeout(() => {
          if (cart.length > 0) openCartModal();
        }, 300);
      }
    } catch(e) {}
  }
}

function redirectToLogin() {
  localStorage.setItem('eresto_pending_cart', JSON.stringify({
    restaurantId: currentRestaurantId,
    cart: cart
  }));
  localStorage.setItem('eresto_return_url', window.location.href);
  window.location.href = `${ERESTO_BASE}pages/auth/connexion.html`;
}

function redirectToRegister() {
  localStorage.setItem('eresto_pending_cart', JSON.stringify({
    restaurantId: currentRestaurantId,
    cart: cart
  }));
  localStorage.setItem('eresto_return_url', window.location.href);
  window.location.href = `${ERESTO_BASE}pages/auth/inscription.html`;
}

function handleOrderSubmit(e) {
  e.preventDefault();

  if (cart.length === 0) return;

  // Enforce Login Check
  if (!checkAuthBeforeAction('order')) return;

  const currentUser = window.eResto.state.currentUser;

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const note = document.getElementById('cust-note').value.trim();

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const fee = orderType === 'delivery' ? getDeliveryFee() : 0;
  const total = subtotal + fee;

  const orderNum = `#C-${Math.floor(1000 + Math.random() * 9000)}`;

  const orderData = {
    id: orderNum,
    restaurantId: currentRestaurantId,
    restaurantName: currentRestaurantName,
    customer: name,
    clientId: currentUser ? currentUser.id : null,
    phone: phone,
    address: orderType === 'delivery' ? address : 'Retrait sur place (À emporter)',
    type: orderType,
    items: cart.map(i => `${i.qty}x ${i.name}`),
    total: total,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('fr-FR'),
    status: 'received',
    note: note
  };

  // Sync to Admin orders in localStorage
  saveOrderToAdmin(orderData);

  // Sync to Client Order History
  saveOrderToClientHistory(currentUser.id, orderData);

  // Close Cart Modal
  closeCartModal();

  // Reset Cart
  cart = [];
  updateCartUI();
  renderDishesGrid();

  // Show Success Modal
  const formatCurrency = (val) => `${Number(val).toLocaleString('fr-FR')} FCFA`;

  document.getElementById('success-modal-title').textContent = 'Commande Confirmée !';
  document.getElementById('success-modal-msg').textContent = `Merci ${name}, votre commande ${orderNum} a bien été reçue par ${currentRestaurantName}.`;

  document.getElementById('success-modal-details').innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>N° de Commande :</strong> <span>${orderNum}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>Articles :</strong> <span>${orderData.items.join(', ')}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>Mode :</strong> <span>${orderType === 'delivery' ? 'Livraison à domicile' : 'À emporter'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>Total Réglé :</strong> <span style="color:var(--primary);font-weight:800">${formatCurrency(total)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px">
      <span>Délai estimé :</span> <span>30 - 45 min</span>
    </div>
  `;

  document.getElementById('success-modal').classList.add('active');
}

// Resolves the admin-side localStorage key that "owns" a given restaurant ID.
// Delegates to the shared eResto.getAdminStorageKey (app.js) so every page
// agrees on the same bucket per restaurant.
function getAdminStorageKey(prefix, restaurantId) {
  return eResto.getAdminStorageKey(prefix, restaurantId);
}

function saveOrderToAdmin(orderData) {
  if (!currentRestaurantId) return;

  const storageKey = getAdminStorageKey('orders', currentRestaurantId);

  const existingOrders = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existingOrders.unshift(orderData);
  localStorage.setItem(storageKey, JSON.stringify(existingOrders));
}

function saveOrderToClientHistory(clientId, orderData) {
  if (!clientId) return;
  const key = `eresto_client_orders_${clientId}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.unshift(orderData);
  localStorage.setItem(key, JSON.stringify(existing));
}

/* =====================================================
   RESERVATION LOGIC
   ===================================================== */

/* =====================================================
   RESERVATION ELIGIBILITY CHECK
   ===================================================== */

// French day-key map
const FR_DAY_KEYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/* =====================================================
   RESERVATION DATE PICKER (custom calendar)
   Only lets the client pick a day the restaurant is open,
   based on the schedule set by the owner in Horaires.
   ===================================================== */

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// True if the restaurant is open on this date's weekday. If no schedule has
// been configured yet, every day is treated as available (same fallback as
// checkReservationEligibility below).
function isDayOpen(dateStr) {
  const horaires = getRestaurantHoraires();
  if (!horaires) return true;
  const jsDay = new Date(dateStr + 'T12:00:00').getDay();
  const frKey = FR_DAY_KEYS[jsDay];
  const daySchedule = horaires.find(d => d.key === frKey);
  if (!daySchedule) return true;
  return !!daySchedule.isOpen;
}

// Walks forward from a given date to find the first day the restaurant is
// actually open, so we never default-select or pre-fill a closed day.
function getNextAvailableDate(fromDate) {
  const d = new Date(fromDate);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const ds = toDateStr(d);
    if (isDayOpen(ds)) return ds;
    d.setDate(d.getDate() + 1);
  }
  return toDateStr(fromDate); // fallback: shouldn't happen in practice
}

function initReservationDatePicker() {
  const dateInput = document.getElementById('res-date');
  if (!dateInput) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialDate = getNextAvailableDate(today);
  const initialDateObj = new Date(initialDate + 'T12:00:00');
  calendarViewYear = initialDateObj.getFullYear();
  calendarViewMonth = initialDateObj.getMonth();

  applyCalendarSelection(initialDate);

  // Close the calendar when clicking anywhere outside it
  document.addEventListener('click', (e) => {
    const cal = document.getElementById('res-date-calendar');
    const trigger = document.getElementById('res-date-trigger');
    if (!cal || !cal.classList.contains('active')) return;
    if (cal.contains(e.target) || (trigger && trigger.contains(e.target))) return;
    cal.classList.remove('active');
  });
}

function toggleDateCalendar(e) {
  if (e) e.stopPropagation();
  const cal = document.getElementById('res-date-calendar');
  if (!cal) return;
  const willOpen = !cal.classList.contains('active');
  cal.classList.toggle('active', willOpen);
  if (willOpen) renderCalendarGrid();
}

function calendarChangeMonth(delta) {
  calendarViewMonth += delta;
  if (calendarViewMonth < 0) { calendarViewMonth = 11; calendarViewYear--; }
  if (calendarViewMonth > 11) { calendarViewMonth = 0; calendarViewYear++; }
  renderCalendarGrid();
}

function renderCalendarGrid() {
  const grid = document.getElementById('rd-cal-grid');
  const label = document.getElementById('rd-cal-month-label');
  const prevBtn = document.querySelector('.rd-cal-nav[onclick="calendarChangeMonth(-1)"]');
  if (!grid || !label) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(calendarViewYear, calendarViewMonth, 1);
  const monthLabel = firstOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  label.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Can't navigate to months before the current one
  if (prevBtn) {
    prevBtn.disabled = (calendarViewYear === today.getFullYear() && calendarViewMonth === today.getMonth());
  }

  // getDay(): 0=Sun...6=Sat → convert to Monday-first column offset
  let startOffset = firstOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const selectedValue = document.getElementById('res-date').value;

  let html = '';
  for (let i = 0; i < startOffset; i++) {
    html += `<button type="button" class="rd-cal-day rd-cal-empty" tabindex="-1"></button>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(calendarViewYear, calendarViewMonth, day);
    const dateStr = toDateStr(dateObj);
    const isPast = dateObj < today;
    const closed = !isPast && !isDayOpen(dateStr);
    const disabled = isPast || closed;
    const isToday = dateStr === toDateStr(today);
    const isSelected = dateStr === selectedValue;

    const classes = ['rd-cal-day'];
    if (isToday) classes.push('rd-cal-today');
    if (isSelected) classes.push('selected');

    html += `<button type="button" class="${classes.join(' ')}" ${disabled ? `disabled title="${closed ? 'Fermé ce jour' : 'Date passée'}"` : ''} onclick="selectCalendarDate('${dateStr}')">${day}</button>`;
  }

  grid.innerHTML = html;
}

function selectCalendarDate(dateStr) {
  applyCalendarSelection(dateStr);
  document.getElementById('res-date-calendar').classList.remove('active');
}

// Sets the hidden field + visible label for a chosen date, then refreshes
// the time slots and table picker to match that date's own hours.
function applyCalendarSelection(dateStr) {
  document.getElementById('res-date').value = dateStr;

  const displayText = document.getElementById('res-date-display-text');
  if (displayText) {
    const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    displayText.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  }

  renderCalendarGrid();
  populateTimeOptions(dateStr);
  refreshTablePicker();
}

// Rebuilds the time <select> to only offer slots within the restaurant's
// opening hours for the given date. Keeps the client's previous choice if
// it's still valid; otherwise snaps to the closest available slot — this is
// also what runs if they pick a time before picking a date.
function populateTimeOptions(dateStr) {
  const timeSelect = document.getElementById('res-time');
  if (!timeSelect) return;

  const previousValue = timeSelect.value;
  const horaires = getRestaurantHoraires();
  let slots = [];

  if (dateStr && horaires) {
    const jsDay = new Date(dateStr + 'T12:00:00').getDay();
    const frKey = FR_DAY_KEYS[jsDay];
    const daySchedule = horaires.find(d => d.key === frKey);

    if (daySchedule && daySchedule.isOpen && daySchedule.open && daySchedule.close) {
      const toMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const toHHMM = mins => {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      const openMin = toMinutes(daySchedule.open);
      let closeMin = toMinutes(daySchedule.close);
      if (closeMin === 0) closeMin = 24 * 60; // midnight close = end of day
      const step = 30; // minutes between slots

      for (let m = openMin; m < closeMin; m += step) {
        slots.push(toHHMM(m));
      }
    }
  }

  // No schedule configured yet for this restaurant/day: fall back to a
  // generic default range so the form still works.
  if (slots.length === 0) {
    slots = ['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
  }

  timeSelect.innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');

  if (slots.includes(previousValue)) {
    timeSelect.value = previousValue;
  } else if (previousValue) {
    const toMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const prevMin = toMinutes(previousValue);
    let closest = slots[0];
    let closestDiff = Infinity;
    slots.forEach(s => {
      const diff = Math.abs(toMinutes(s) - prevMin);
      if (diff < closestDiff) { closestDiff = diff; closest = s; }
    });
    timeSelect.value = closest;
  }
}

function getRestaurantHoraires() {
  // Try restaurant-scoped key first (published when owner saves settings)
  const saved = localStorage.getItem(`eresto_horaires_${currentRestaurantId}`);
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  // Fallback: admin's own eresto_settings (only works if same browser session)
  const settings = localStorage.getItem('eresto_settings');
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      if (parsed.hours) return parsed.hours;
    } catch(e) {}
  }
  return null; // no schedule configured yet
}

function getTotalTables() {
  const saved = localStorage.getItem(`eresto_tables_${currentRestaurantId}`);
  if (saved) return parseInt(saved) || 10;
  return 10; // default
}

function getReservationsForDate(dateStr) {
  // Determine which storage key holds admin reservations for this restaurant
  const storageKey = getAdminStorageKey('reservations', currentRestaurantId);
  const all = JSON.parse(localStorage.getItem(storageKey) || '[]');
  return all.filter(r => r.date === dateStr && r.status !== 'cancelled');
}

/**
 * Returns null if eligible, or an error string if not.
 */
function checkReservationEligibility(dateStr, timeStr) {
  // NOTE: A closed restaurant can still accept future reservations.
  // Only orders are blocked when status === 'closed'.

  // 1. Check opening hours for the selected day
  const horaires = getRestaurantHoraires();
  if (horaires) {
    const jsDay = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun...6=Sat
    const frKey = FR_DAY_KEYS[jsDay];
    const daySchedule = horaires.find(d => d.key === frKey);

    if (daySchedule) {
      if (!daySchedule.isOpen) {
        const label = daySchedule.label || frKey;
        return `Ce restaurant est fermé le ${label}. Veuillez choisir un autre jour.`;
      }

      // Check time is within opening hours (only if both open/close are set)
      if (timeStr && daySchedule.open && daySchedule.close) {
        const toMinutes = t => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        const reqMin = toMinutes(timeStr);
        const openMin = toMinutes(daySchedule.open);
        // Handle midnight close (00:00 = next day = 24*60)
        let closeMin = toMinutes(daySchedule.close);
        if (closeMin === 0) closeMin = 24 * 60;

        if (reqMin < openMin || reqMin >= closeMin) {
          return `Ce restaurant est ouvert de ${daySchedule.open} à ${daySchedule.close === '00:00' ? 'minuit' : daySchedule.close}. Veuillez choisir un horaire dans cette plage.`;
        }
      }
    }
  }

  // 2. Check table availability for the selected date
  const totalTables = getTotalTables();
  const reservedCount = getReservationsForDate(dateStr).length;
  if (reservedCount >= totalTables) {
    return `Toutes les tables sont déjà réservées pour le ${new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR')}. Veuillez choisir une autre date.`;
  }

  return null; // all good
}

// Returns the list of table numbers still free for a given date, based on
// the restaurant's own table count (set by the owner, can change any time)
// and the tables already taken by other active (non-cancelled) reservations
// that same day.
function getAvailableTablesForDate(dateStr) {
  const total = getTotalTables();
  const dayReservations = getReservationsForDate(dateStr); // already excludes cancelled

  const usedNumbers = new Set(
    dayReservations.map(r => parseInt(r.table, 10)).filter(t => !isNaN(t) && t > 0)
  );
  // Older reservations made before table selection existed have no table
  // number — still count them against capacity so we never oversell.
  const untabledCount = dayReservations.length - usedNumbers.size;

  const available = [];
  for (let t = 1; t <= total; t++) {
    if (!usedNumbers.has(t)) available.push(t);
  }
  if (untabledCount > 0) {
    available.splice(Math.max(0, available.length - untabledCount));
  }
  return available;
}

// Re-renders the table picker whenever the date or time changes: first
// re-checks that the restaurant is even open that day/hour, then lists
// only the tables genuinely free for that date.
function refreshTablePicker() {
  const dateEl = document.getElementById('res-date');
  const timeEl = document.getElementById('res-time');
  const statusEl = document.getElementById('res-table-status');
  const pickerEl = document.getElementById('res-table-picker');
  const hiddenEl = document.getElementById('res-table');
  if (!dateEl || !statusEl || !pickerEl || !hiddenEl) return;

  const dateStr = dateEl.value;
  const timeStr = timeEl ? timeEl.value : '';
  pickerEl.innerHTML = '';
  hiddenEl.value = '';

  if (!dateStr) {
    statusEl.textContent = 'Choisissez d\'abord une date.';
    statusEl.style.color = 'var(--on-surface-variant, #6b554f)';
    return;
  }

  const eligibilityError = checkReservationEligibility(dateStr, timeStr);
  if (eligibilityError) {
    statusEl.textContent = eligibilityError;
    statusEl.style.color = '#c0392b';
    return;
  }

  const available = getAvailableTablesForDate(dateStr);
  if (available.length === 0) {
    statusEl.textContent = 'Aucune table disponible à cette date. Essayez une autre date.';
    statusEl.style.color = '#c0392b';
    return;
  }

  statusEl.textContent = `${available.length} table(s) disponible(s) — choisissez-en une :`;
  statusEl.style.color = 'var(--on-surface-variant, #6b554f)';

  available.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rd-table-btn';
    btn.textContent = 'Table ' + t;
    btn.dataset.table = String(t);
    btn.onclick = () => {
      hiddenEl.value = String(t);
      pickerEl.querySelectorAll('.rd-table-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    pickerEl.appendChild(btn);
  });
}

function openOrderModal() {
  openCartModal();
}

function openReserveModal() {
  if (window.eResto && window.eResto.getRestaurantServices) {
    const services = window.eResto.getRestaurantServices(currentRestaurantId);
    if (services.allowReservations === false) {
      if (window.eResto.showToast) {
        window.eResto.showToast('Ce restaurant n\'accepte pas les réservations de table pour le moment.', 'warning');
      }
      return;
    }
  }

  if (!checkAuthBeforeAction('reserve')) return;
  refreshTablePicker();
  document.getElementById('reserve-modal').classList.add('active');
}

function closeReserveModal() {
  document.getElementById('reserve-modal').classList.remove('active');
}

function handleReservationSubmit(e) {
  e.preventDefault();

  // Enforce Login Check
  if (!checkAuthBeforeAction('reserve')) return;

  const currentUser = window.eResto.state.currentUser;

  const name = document.getElementById('res-name').value.trim();
  const phone = document.getElementById('res-phone').value.trim();
  const date = document.getElementById('res-date').value;
  const time = document.getElementById('res-time').value;
  const table = document.getElementById('res-table').value;
  const guests = document.getElementById('res-guests').value;
  const location = document.getElementById('res-location').value;
  const note = document.getElementById('res-note').value.trim();

  // Check reservation eligibility (schedule + table availability)
  const eligibilityError = checkReservationEligibility(date, time);
  if (eligibilityError) {
    if (window.eResto && window.eResto.showToast) {
      window.eResto.showToast(eligibilityError, 'warning');
    }
    return;
  }

  if (!table) {
    if (window.eResto && window.eResto.showToast) {
      window.eResto.showToast('Veuillez choisir une table disponible.', 'warning');
    }
    return;
  }

  // Guard against a race where the table got taken between render and submit
  const stillAvailable = getAvailableTablesForDate(date).includes(parseInt(table, 10));
  if (!stillAvailable) {
    if (window.eResto && window.eResto.showToast) {
      window.eResto.showToast('Cette table vient d\'être prise, merci d\'en choisir une autre.', 'warning');
    }
    refreshTablePicker();
    return;
  }

  const resNum = `#RES-${Math.floor(1000 + Math.random() * 9000)}`;

  const reservationData = {
    id: resNum,
    restaurantId: currentRestaurantId,
    restaurantName: currentRestaurantName,
    clientId: currentUser ? currentUser.id : null,
    name: name,
    phone: phone,
    date: date,
    table: table,
    time: time,
    guests: guests,
    location: location,
    note: note,
    status: 'reserved',
    created: new Date().toISOString()
  };

  // Sync to Admin Reservations
  saveReservationToAdmin(reservationData);

  // Sync to Client Reservations
  saveReservationToClientHistory(currentUser.id, reservationData);

  // Close Reserve Modal
  closeReserveModal();

  // Reset form (also clears the hidden #res-date field, so resync the
  // custom calendar/time-slot picker to a valid default date afterwards)
  document.getElementById('reservation-form').reset();
  initReservationDatePicker();

  // Show Success Modal
  document.getElementById('success-modal-title').textContent = 'Table Réservée !';
  document.getElementById('success-modal-msg').textContent = `Félicitations ${name}, votre table a été réservée chez ${currentRestaurantName}.`;

  document.getElementById('success-modal-details').innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>N° de Réservation :</strong> <span>${resNum}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>Date & Heure :</strong> <span>${date} à ${time}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>Personnes :</strong> <span>${guests} convive(s)</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <strong>Emplacement :</strong> <span>${location}</span>
    </div>
  `;

  document.getElementById('success-modal').classList.add('active');
}

function saveReservationToAdmin(resData) {
  if (!currentRestaurantId) return;

  const storageKey = getAdminStorageKey('reservations', currentRestaurantId);

  const existingRes = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existingRes.unshift(resData);
  localStorage.setItem(storageKey, JSON.stringify(existingRes));
}

function saveReservationToClientHistory(clientId, resData) {
  if (!clientId) return;
  const key = `eresto_client_reservations_${clientId}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.unshift(resData);
  localStorage.setItem(key, JSON.stringify(existing));
}

/* =====================================================
   REVIEWS & RATINGS LOGIC
   ===================================================== */
let reviewModalRating = 5;

function openAddReviewModal() {
  if (!checkAuthBeforeAction('review')) return;
  document.getElementById('add-review-modal').classList.add('active');
}

function setReviewModalRating(val) {
  reviewModalRating = val;
  const label = document.getElementById('review-modal-rating-text');
  if (label) label.textContent = `${val} / 5`;

  const stars = document.querySelectorAll('.star-rating-picker .star-item');
  stars.forEach(s => {
    const v = parseInt(s.getAttribute('data-val'));
    if (v <= val) s.style.color = '#f59e0b';
    else s.style.color = '#d1d5db';
  });
}

function handleAddReviewSubmit(e) {
  e.preventDefault();
  const currentUser = window.eResto && window.eResto.state ? window.eResto.state.currentUser : null;
  if (!currentUser) return;

  const comment = document.getElementById('review-modal-comment').value.trim();
  if (!comment) return;

  const reviews = JSON.parse(localStorage.getItem('eresto_reviews') || '[]');
  reviews.unshift({
    id: Date.now(),
    restaurantId: currentRestaurantId,
    name: currentUser.name || 'Client eResto',
    rating: reviewModalRating,
    comment: comment,
    date: 'Aujourd\'hui'
  });
  localStorage.setItem('eresto_reviews', JSON.stringify(reviews));

  document.getElementById('add-review-modal').classList.remove('active');
  document.getElementById('review-modal-comment').value = '';
  setReviewModalRating(5);

  renderReviews();

  if (window.eResto && window.eResto.showToast) {
    window.eResto.showToast('Votre avis a été publié avec succès !', 'success');
  }
}

function renderReviews() {
  const container = document.getElementById('rd-reviews-list');
  if (!container) return;

  const allReviews = JSON.parse(localStorage.getItem('eresto_reviews') || '[]');
  const restReviews = allReviews.filter(r => r.restaurantId === currentRestaurantId);

  // Default demo reviews if none written yet
  const defaultReviews = [
    { name: 'Issouf Barro', rating: 5, date: 'Hier', comment: 'Superbe expérience ! Les plats sont servis très rapidement et bien chauds.' },
    { name: 'Mariam Sawadogo', rating: 4, date: 'Il y a 3 jours', comment: 'Très bon assaisonnement, la livraison était ponctuelle. Je recommande vivement.' }
  ];

  const displayList = restReviews.length > 0 ? restReviews : defaultReviews;

  // Calculate average rating
  const avg = (displayList.reduce((sum, r) => sum + Number(r.rating || 5), 0) / displayList.length).toFixed(1);
  const avgEl = document.getElementById('rd-reviews-avg');
  if (avgEl) avgEl.textContent = `${avg} / 5 (${displayList.length})`;

  container.innerHTML = displayList.map(r => `
    <div style="padding:16px;background:#f9fafb;border-radius:16px;border:1px solid rgba(0,0,0,0.03)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">
            ${r.name ? r.name.charAt(0) : 'C'}
          </div>
          <div>
            <strong style="font-size:15px;color:#1c1b1b;">${r.name}</strong>
            <span style="font-size:12px;color:#9ca3af;display:block;">${r.date || 'Récemment'}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:2px;">
          ${Array.from({length: 5}, (_, i) => `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${i < r.rating ? '#f59e0b' : '#e5e7eb'}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          `).join('')}
        </div>
      </div>
      <p style="font-size:14px;color:#59413b;margin:0;line-height:1.5;">${r.comment}</p>
    </div>
  `).join('');
}
