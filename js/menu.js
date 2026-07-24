/**
 * eResto - Menu Management Page JavaScript
 * CRUD for dishes with filtering, sorting, pagination
 */

'use strict';

let currentCategory = 'all';
let currentSort     = 'newest';
let currentPage     = 1;
const itemsPerPage  = 8;

const categoryColors = {
  Starters: '#2E9E5B',
  Mains:    '#f0603d',
  Desserts: '#805200',
  Drinks:   '#6366f1',
};

const categoryLabels = {
  Starters: 'Entrées',
  Mains:    'Plats',
  Desserts: 'Desserts',
  Drinks:   'Boissons',
};

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  renderCategoryFilters();
  renderMenuGrid();
  initMenuSearch();
  initModalClickOutside();
  initStatusMenu();
  initDishImageInput();
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
  const nameEls = ['topbar-user-name', 'sidebar-user-name'];
  nameEls.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = user.name; });
  const emailEl = document.getElementById('sidebar-user-email');
  if (emailEl) emailEl.textContent = user.email;
}

// =====================================================
// CATEGORY FILTERS
// =====================================================
function renderCategoryFilters() {
  const container = document.getElementById('category-filters');
  if (!container) return;

  const categories = [...new Set(eResto.state.menuItems.map(i => i.category))];

  container.innerHTML = `
    <button class="filter-pill active" data-cat="all" onclick="filterByCategory('all')">
      Tous les plats
    </button>
    ${categories.map(cat => `
      <button class="filter-pill" data-cat="${cat}" onclick="filterByCategory('${cat}')">
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${categoryColors[cat] || 'var(--primary)'};display:inline-block"></span>
          ${categoryLabels[cat] || cat}
        </span>
      </button>
    `).join('')}
  `;
}

function filterByCategory(cat) {
  currentCategory = cat;
  currentPage = 1;
  renderMenuGrid();

  document.querySelectorAll('#category-filters .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
}

// =====================================================
// MENU GRID RENDER
// =====================================================
function getFilteredItems() {
  let items = [...eResto.state.menuItems];

  // Category filter
  if (currentCategory !== 'all') {
    items = items.filter(i => i.category === currentCategory);
  }

  // Search filter
  const query = document.getElementById('menu-search')?.value.trim().toLowerCase();
  if (query) {
    items = items.filter(i => i.name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query));
  }

  // Sort
  switch (currentSort) {
    case 'price_asc':  items.sort((a, b) => a.price - b.price); break;
    case 'price_desc': items.sort((a, b) => b.price - a.price); break;
    case 'name':       items.sort((a, b) => a.name.localeCompare(b.name)); break;
    default:           items.sort((a, b) => b.id - a.id);
  }

  return items;
}

function renderMenuGrid() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  const allItems = getFilteredItems();
  const total    = allItems.length;
  const start    = (currentPage - 1) * itemsPerPage;
  const items    = allItems.slice(start, start + itemsPerPage);

  // Update count label
  const countLabel = document.getElementById('menu-count-label');
  if (countLabel) countLabel.textContent = `${total} plat${total !== 1 ? 's' : ''} au menu`;

  const itemsCountLabel = document.getElementById('items-count-label');
  if (itemsCountLabel) {
    itemsCountLabel.textContent = total > itemsPerPage
      ? `Affichage de ${start + 1}–${Math.min(start + itemsPerPage, total)} sur ${total} plats`
      : `${total} plat${total !== 1 ? 's' : ''} au total`;
  }

  grid.innerHTML = items.map(item => renderDishCard(item)).join('') + renderAddCard();

  renderPagination(total);
}

function renderDishCard(item) {
  const color = categoryColors[item.category] || 'var(--primary)';
  const label = categoryLabels[item.category] || item.category;

  return `
    <article class="dish-card animate-fade-in" id="dish-card-${item.id}" aria-label="${item.code || item.name}">
      <div class="dish-card-image">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''
        }
        <div class="dish-card-image-placeholder" ${item.image ? 'style="display:none"' : ''}>
          <span class="material-symbols-outlined" style="font-size:40px">restaurant</span>
        </div>

        <!-- Availability toggle -->
        <div class="dish-availability-toggle">
          <button
            class="toggle-switch ${item.available ? 'on' : ''}"
            title="${item.available ? 'Disponible - cliquer pour désactiver' : 'Indisponible - cliquer pour activer'}"
            onclick="toggleAvailability(${item.id}, this)"
            role="switch"
            aria-checked="${item.available}"
            aria-label="Disponibilité de ${item.name}"
          ></button>
        </div>
      </div>

      <div class="dish-card-body">
        <p class="dish-card-code">N° ${item.code || `BF-${String(item.id).padStart(3,'0')}`}</p>
        <h3 class="dish-card-name" title="${item.name}">${item.name}</h3>
        <p class="dish-card-category">
          <span class="dot" style="background:${color}"></span>
          <span style="color:${color}">${label}</span>
        </p>
        <p class="dish-card-price">${eResto.formatCurrency(item.price)}</p>
      </div>

      <div class="dish-card-actions">
        <button class="dish-action-edit" onclick="openDishModal(${item.id})" aria-label="Modifier ${item.name}">
          <span class="material-symbols-outlined" style="font-size:14px">edit</span>
          Modifier
        </button>
        <button class="dish-action-delete" onclick="deleteDish(${item.id})" aria-label="Supprimer ${item.name}">
          <span class="material-symbols-outlined" style="font-size:18px">delete</span>
        </button>
      </div>
    </article>
  `;
}

function renderAddCard() {
  return `
    <button class="dish-card-add" onclick="openDishModal()" aria-label="Ajouter un nouveau plat">
      <div class="add-icon">
        <span class="material-symbols-outlined" style="font-size:28px">add</span>
      </div>
      <div>
        <p style="font-size:16px;font-weight:700">Ajouter un plat</p>
        <p style="font-size:12px;opacity:0.7">Enrichissez votre carte</p>
      </div>
    </button>
  `;
}

// =====================================================
// PAGINATION
// =====================================================
function renderPagination(total) {
  const container = document.getElementById('pagination');
  if (!container) return;

  const pages = Math.ceil(total / itemsPerPage);
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `
    <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Page précédente">
      <span class="material-symbols-outlined" style="font-size:18px">chevron_left</span>
    </button>
  `;

  for (let i = 1; i <= pages; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})" aria-label="Page ${i}" aria-current="${i === currentPage ? 'page' : 'false'}">${i}</button>`;
  }

  html += `
    <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === pages ? 'disabled' : ''} aria-label="Page suivante">
      <span class="material-symbols-outlined" style="font-size:18px">chevron_right</span>
    </button>
  `;

  container.innerHTML = html;
}

function goToPage(page) {
  const total = getFilteredItems().length;
  const pages = Math.ceil(total / itemsPerPage);
  if (page < 1 || page > pages) return;
  currentPage = page;
  renderMenuGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================================
// SORT
// =====================================================
function sortMenu(value) {
  currentSort = value;
  currentPage = 1;
  renderMenuGrid();
}

// =====================================================
// SEARCH
// =====================================================
function initMenuSearch() {
  const input = document.getElementById('menu-search');
  if (!input) return;
  const debouncedSearch = eResto.debounce(() => {
    currentPage = 1;
    renderMenuGrid();
  }, 250);
  input.addEventListener('input', debouncedSearch);
}

// =====================================================
// TOGGLE AVAILABILITY
// =====================================================
function toggleAvailability(itemId, btn) {
  const item = eResto.state.menuItems.find(i => i.id === itemId);
  if (!item) return;
  item.available = !item.available;
  btn.classList.toggle('on', item.available);
  btn.setAttribute('aria-checked', item.available);
  btn.title = item.available ? 'Disponible - cliquer pour désactiver' : 'Indisponible - cliquer pour activer';
  eResto.saveUserData('menuItems'); // persist
  eResto.showToast(`${item.name}: ${item.available ? 'Disponible ✓' : 'Indisponible'}`, item.available ? 'success' : 'info');
}

function toggleAvailabilityModal(btn) {
  const isOn = btn.classList.toggle('on');
  btn.setAttribute('aria-checked', isOn);
}

// =====================================================
// CRUD MODAL
// =====================================================
function openDishModal(itemId = null) {
  const modal   = document.getElementById('dish-modal');
  const title   = document.getElementById('dish-modal-title');
  const submitText = document.getElementById('dish-submit-text');

  // Reset form
  document.getElementById('dish-form')?.reset();
  document.getElementById('dish-id').value = '';
  document.getElementById('dish-available-toggle').classList.add('on');
  document.getElementById('dish-available-toggle').setAttribute('aria-checked', 'true');
  document.querySelectorAll('#dish-form .form-error').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('#dish-form .form-input.error').forEach(el => el.classList.remove('error'));

  if (itemId) {
    // Edit mode
    const item = eResto.state.menuItems.find(i => i.id === itemId);
    if (!item) return;

    title.textContent = 'Modifier le plat';
    submitText.textContent = 'Enregistrer les modifications';

    document.getElementById('dish-id').value    = item.id;
    document.getElementById('dish-name').value   = item.name;
    document.getElementById('dish-category').value = item.category;
    document.getElementById('dish-code').value   = item.code || `BF-${String(item.id).padStart(3,'0')}`;
    document.getElementById('dish-price').value  = item.price;
    document.getElementById('dish-image').value  = item.image || '';
    // clear file input and set preview if image exists
    const fileInput = document.getElementById('dish-image-file');
    const preview = document.getElementById('dish-image-preview');
    const previewImg = document.getElementById('dish-image-preview-img');
    if (fileInput) fileInput.value = '';
    if (item.image) {
      previewImg.src = item.image;
      preview.style.display = 'block';
    } else {
      previewImg.src = '';
      preview.style.display = 'none';
    }

    const toggle = document.getElementById('dish-available-toggle');
    toggle.classList.toggle('on', item.available);
    toggle.setAttribute('aria-checked', item.available);
  } else {
    title.textContent    = 'Ajouter un plat';
    submitText.textContent = 'Enregistrer le plat';
  }

  modal.classList.add('active');
  document.getElementById('dish-name').focus();
}

function closeDishModal() {
  document.getElementById('dish-modal')?.classList.remove('active');
}

async function saveDish() {
  // Validate
  const name     = document.getElementById('dish-name').value.trim();
  const category = document.getElementById('dish-category').value;
  const code     = document.getElementById('dish-code').value.trim();
  const price    = parseFloat(document.getElementById('dish-price').value);
  let image    = document.getElementById('dish-image').value.trim();
  const fileEl  = document.getElementById('dish-image-file');
  if (fileEl && fileEl.files && fileEl.files[0]) {
    // read file as data URL
    try {
      image = await readFileAsDataURL(fileEl.files[0]);
    } catch (err) {
      console.error('Erreur lecture image:', err);
    }
  }
  const available = document.getElementById('dish-available-toggle').classList.contains('on');
  const itemId   = document.getElementById('dish-id').value;

  let valid = true;

  if (!name) {
    document.getElementById('dish-name-error').classList.remove('hidden');
    document.getElementById('dish-name').classList.add('error');
    valid = false;
  }
  if (!category) {
    document.getElementById('dish-cat-error').classList.remove('hidden');
    document.getElementById('dish-category').classList.add('error');
    valid = false;
  }
  if (!code) {
    document.getElementById('dish-code-error').classList.remove('hidden');
    document.getElementById('dish-code').classList.add('error');
    valid = false;
  }
  if (isNaN(price) || price < 0) {
    document.getElementById('dish-price-error').classList.remove('hidden');
    document.getElementById('dish-price').classList.add('error');
    valid = false;
  }

  if (!valid) return;

  // Show loading
  const btn = document.getElementById('dish-submit-btn');
  const txt = document.getElementById('dish-submit-text');
  const spin = document.getElementById('dish-spinner');
  btn.disabled = true;
  txt.style.opacity = '0';
  spin.classList.remove('hidden');
  spin.classList.add('spinner-dark');

  await eResto.simulateRequest(700);

  if (itemId) {
    // Update existing
    const item = eResto.state.menuItems.find(i => i.id === parseInt(itemId));
    if (item) {
      item.name      = name;
      item.category  = category;
      item.code      = code;
      item.price     = price;
      item.image     = image || null;
      item.available = available;
      eResto.showToast(`"${name}" mis à jour avec succès !`, 'success');
    }
  } else {
    // Create new
    const newItem = {
      id:       Date.now(),
      code,
      name,
      category,
      price,
      image:    image || null,
      available,
    };
    eResto.state.menuItems.unshift(newItem);
    eResto.showToast(`"${name}" ajouté au menu !`, 'success');
  }

  btn.disabled = false;
  txt.style.opacity = '1';
  spin.classList.add('hidden');

  eResto.saveUserData('menuItems'); // persist after create/update

  closeDishModal();
  renderCategoryFilters();
  renderMenuGrid();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initDishImageInput() {
  const fileEl = document.getElementById('dish-image-file');
  const urlEl = document.getElementById('dish-image');
  const preview = document.getElementById('dish-image-preview');
  const previewImg = document.getElementById('dish-image-preview-img');
  if (!fileEl) return;

  fileEl.addEventListener('change', () => {
    const file = fileEl.files[0];
    if (!file) {
      preview.style.display = 'none';
      previewImg.src = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      previewImg.src = reader.result;
      preview.style.display = 'block';
      // set hidden URL input to data URL so saving uses it
      if (urlEl) urlEl.value = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // If user types a URL, show preview
  if (urlEl) {
    urlEl.addEventListener('input', () => {
      const val = urlEl.value.trim();
      if (!val) { preview.style.display = 'none'; previewImg.src = ''; return; }
      // attempt to show URL preview
      previewImg.src = val;
      preview.style.display = 'block';
    });
  }
}

async function deleteDish(itemId) {
  const item = eResto.state.menuItems.find(i => i.id === itemId);
  if (!item) return;

  const confirmed = await eResto.confirm(`Supprimer "${item.name}" du menu ?`, 'Supprimer le plat');
  if (!confirmed) return;

  eResto.state.menuItems = eResto.state.menuItems.filter(i => i.id !== itemId);
  eResto.saveUserData('menuItems'); // persist after delete

  // Animate removal
  const card = document.getElementById(`dish-card-${itemId}`);
  if (card) {
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';
    await eResto.simulateRequest(300);
  }

  eResto.showToast(`"${item.name}" supprimé du menu.`, 'info');
  renderCategoryFilters();
  renderMenuGrid();
}

// =====================================================
// STATUS MENU
// =====================================================
function initStatusMenu() {
  document.addEventListener('click', (e) => {
    const statusMenu = document.getElementById('status-menu');
    if (statusMenu && !e.target.closest('#restaurant-status')) {
      statusMenu.classList.remove('visible');
    }
    if (!e.target.closest('#dish-modal')) {
      // Don't close modal on random clicks
    }
  });
}

function initModalClickOutside() {
  const modal = document.getElementById('dish-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDishModal();
    });
  }

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDishModal();
  });
}
