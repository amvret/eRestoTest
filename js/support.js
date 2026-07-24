/**
 * eResto — Support Page JavaScript
 * FAQ accordion, tickets, live chat widget, search
 */
'use strict';

// =====================================================
// DATA
// =====================================================
const FAQ_ITEMS = [
  { cat: 'menu', q: 'Comment ajouter un nouveau plat au menu ?', a: 'Allez dans <strong>Menu → Ajouter un plat</strong>. Remplissez le nom, la catégorie, le prix et une description. Vous pouvez aussi activer/désactiver la disponibilité de chaque plat en un clic depuis la grille.' },
  { cat: 'menu', q: 'Comment modifier le prix d\'un plat existant ?', a: 'Dans la page Menu, cliquez sur <strong>Modifier</strong> sur la carte du plat. La fenêtre d\'édition s\'ouvrira avec tous les champs modifiables. Enregistrez pour appliquer les changements immédiatement.' },
  { cat: 'menu', q: 'Puis-je importer mon menu depuis un fichier CSV ou PDF ?', a: 'L\'import de menu est disponible dans les paramètres avancés (section <strong>Paramètres → Mon restaurant</strong>). Formats supportés : CSV avec les colonnes Nom, Catégorie, Prix, Description. La fonctionnalité PDF est en développement.' },
  { cat: 'commandes', q: 'Comment changer le statut d\'une commande ?', a: 'Dans la page <strong>Commandes</strong>, cliquez sur le bouton <strong>Avancer →</strong> à côté de la commande, ou ouvrez le détail de la commande et utilisez les boutons de statut. Le flux est : Reçue → En cours → Prête → Livrée.' },
  { cat: 'commandes', q: 'Comment annuler une commande ?', a: 'Ouvrez le détail de la commande (cliquez sur la ligne) puis cliquez sur <strong>Annuler</strong>. Une confirmation vous sera demandée. Les commandes déjà livrées ne peuvent pas être annulées.' },
  { cat: 'commandes', q: 'Puis-je exporter l\'historique des commandes ?', a: 'Oui ! Dans la page Commandes, cliquez sur <strong>Exporter</strong> en haut à droite. Vous obtiendrez un fichier CSV avec toutes les commandes filtrées par le statut actuel.' },
  { cat: 'equipe', q: 'Comment ajouter un membre à mon équipe ?', a: 'Dans <strong>Équipe → Ajouter un membre</strong>, renseignez le nom, le rôle et le département. Le membre recevra un email d\'invitation (en production). Vous pouvez aussi marquer s\'il est actuellement en service.' },
  { cat: 'equipe', q: 'Comment changer le rôle d\'un employé ?', a: 'Cliquez sur <strong>Gérer</strong> sur la fiche de l\'employé (vue tableau) ou sur <strong>Rôle</strong> en vue cartes. La fenêtre d\'édition vous permettra de modifier son rôle, département et contrat.' },
  { cat: 'facturation', q: 'Comment mettre à jour ma méthode de paiement ?', a: 'Dans <strong>Paramètres → Facturation</strong>, cliquez sur <strong>Modifier</strong> à côté de votre carte. Vous serez redirigé vers notre portail de paiement sécurisé (Stripe) pour mettre à jour vos informations.' },
  { cat: 'facturation', q: 'Comment télécharger une facture ?', a: 'Dans <strong>Paramètres → Facturation → Historique des factures</strong>, cliquez sur l\'icône de téléchargement à côté de la facture souhaitée. Les factures sont disponibles en format PDF.' },
  { cat: 'facturation', q: 'Puis-je changer de plan ?', a: 'Oui, cliquez sur <strong>Changer de plan</strong> dans la section Facturation. Les changements prennent effet à la prochaine période de facturation. Si vous passez à un plan inférieur, les fonctionnalités Pro restent actives jusqu\'à la fin du cycle.' },
];

const MOCK_TICKETS = [
  { id: '#TKT-0042', subject: 'Problème d\'affichage sur mobile', cat: 'bug', priority: 'high', status: 'open', date: 'Il y a 2 jours' },
  { id: '#TKT-0038', subject: 'Demande d\'intégration Deliveroo', cat: 'feature', priority: 'medium', status: 'pending', date: 'Il y a 1 semaine' },
  { id: '#TKT-0031', subject: 'Facture de mars incorrecte', cat: 'billing', priority: 'high', status: 'resolved', date: 'Il y a 3 semaines' },
];

const CHAT_REPLIES = [
  "Bonjour ! Je regarde ça tout de suite pour vous. 🍽",
  "Je comprends votre problème. Voici ce que je vous conseille de faire :",
  "Vous pouvez trouver cette option dans <strong>Paramètres → Mon restaurant</strong>.",
  "Si le problème persiste, n'hésitez pas à ouvrir un ticket et notre équipe technique interviendra sous 24h.",
  "Est-ce que cela a résolu votre problème ?",
  "Parfait ! N'hésitez pas si vous avez d'autres questions. Bonne journée ! 😊",
];
let chatReplyIndex = 0;

let currentFaqCat = 'all';
let ticketIdCounter = 43;

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  initUserUI();
  renderFAQ();
  renderTickets();
  initSearch();
  initMobileSidebar();
  initModalClickOutside();
});

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
    const el = document.getElementById(id);
    if (el) el.textContent = user.name;
  });
  const em = document.getElementById('sidebar-user-email');
  if (em) em.textContent = user.email;
}

// =====================================================
// FAQ
// =====================================================
function filterFAQ(cat) {
  currentFaqCat = cat;
  document.querySelectorAll('#faq-filters .filter-pill').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === cat)
  );
  renderFAQ();
}

function renderFAQ(searchQuery = '') {
  const list = document.getElementById('faq-list');
  if (!list) return;

  let items = FAQ_ITEMS;
  if (currentFaqCat !== 'all') items = items.filter(i => i.cat === currentFaqCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q));
  }

  if (!items.length) {
    list.innerHTML = `<div style="text-align:center;padding:48px;color:var(--on-surface-variant);opacity:.5">
      <span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:10px">search_off</span>
      Aucune question trouvée
    </div>`;
    return;
  }

  const catLabels = { menu:'Menu', commandes:'Commandes', equipe:'Équipe', facturation:'Facturation' };

  list.innerHTML = items.map((item, i) => `
    <div class="faq-item" id="faq-${i}" role="listitem">
      <button class="faq-question" onclick="toggleFAQ(${i})" aria-expanded="false" aria-controls="faq-answer-${i}">
        <div>
          <div class="faq-tag">${catLabels[item.cat] || item.cat}</div>
          <div class="faq-q-text">${item.q}</div>
        </div>
        <span class="material-symbols-outlined faq-chevron">expand_more</span>
      </button>
      <div class="faq-answer" id="faq-answer-${i}" role="region">
        <div class="faq-answer-inner">${item.a}</div>
      </div>
    </div>
  `).join('');
}

function toggleFAQ(index) {
  const item = document.getElementById(`faq-${index}`);
  if (!item) return;
  const isOpen = item.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-item.open').forEach(el => {
    el.classList.remove('open');
    el.querySelector('button')?.setAttribute('aria-expanded','false');
  });

  if (!isOpen) {
    item.classList.add('open');
    item.querySelector('button')?.setAttribute('aria-expanded','true');
  }
}

// =====================================================
// SEARCH
// =====================================================
function initSearch() {
  const input = document.getElementById('support-search');
  if (!input) return;
  input.addEventListener('input', eResto.debounce(e => {
    const q = e.target.value.trim();
    renderFAQ(q);
    if (q) {
      document.querySelectorAll('#faq-filters .filter-pill').forEach(b => b.classList.remove('active'));
      document.querySelector('#faq-filters [data-cat="all"]')?.classList.add('active');
      currentFaqCat = 'all';
    }
  }, 300));
}

// =====================================================
// TICKETS
// =====================================================
function renderTickets() {
  const list = document.getElementById('tickets-list');
  if (!list) return;
  const statusCfg = {
    open:     { label: 'Ouvert',     badge: 'badge-orange' },
    pending:  { label: 'En attente', badge: 'badge-gray'   },
    resolved: { label: 'Résolu',     badge: 'badge-green'  },
    closed:   { label: 'Fermé',      badge: 'badge-gray'   },
  };
  list.innerHTML = MOCK_TICKETS.map(t => {
    const s = statusCfg[t.status] || statusCfg.open;
    return `
      <div class="ticket-row" onclick="viewTicket('${t.id}')">
        <span class="ticket-id">${t.id}</span>
        <div class="ticket-info">
          <p class="ticket-subject">${t.subject}</p>
          <p class="ticket-meta">${t.date}</p>
        </div>
        <span class="badge ${s.badge}" style="flex-shrink:0">${s.label}</span>
      </div>
    `;
  }).join('');
}

function viewTicket(id) {
  eResto.showToast(`Ticket ${id} — détails disponibles bientôt.`, 'info');
}

// =====================================================
// TICKET MODAL
// =====================================================
function openTicketModal() {
  document.getElementById('ticket-modal')?.classList.add('active');
  document.getElementById('t-subject')?.focus();
}

function closeTicketModal() {
  document.getElementById('ticket-modal')?.classList.remove('active');
}

async function submitTicket() {
  const subject = document.getElementById('t-subject')?.value.trim();
  const desc    = document.getElementById('t-desc')?.value.trim();

  if (!subject) { eResto.showToast('Le sujet est requis.', 'error'); document.getElementById('t-subject')?.focus(); return; }
  if (!desc)    { eResto.showToast('La description est requise.', 'error'); document.getElementById('t-desc')?.focus(); return; }

  await eResto.simulateRequest(900);

  const newTicket = {
    id: `#TKT-00${ticketIdCounter++}`,
    subject,
    cat: document.getElementById('t-category')?.value || 'other',
    priority: document.getElementById('t-priority')?.value || 'medium',
    status: 'open',
    date: 'À l\'instant',
  };
  MOCK_TICKETS.unshift(newTicket);
  renderTickets();
  closeTicketModal();
  document.getElementById('ticket-form')?.reset();
  eResto.showToast(`Ticket ${newTicket.id} créé ! Notre équipe vous répondra sous 24h.`, 'success');
}

// =====================================================
// LIVE CHAT
// =====================================================
function startLiveChat() {
  const widget = document.getElementById('chat-widget');
  if (widget) {
    widget.style.display = 'block';
    document.getElementById('chat-input')?.focus();
  }
}

function closeLiveChat() {
  const widget = document.getElementById('chat-widget');
  if (widget) widget.style.display = 'none';
}

function handleChatKey(event) {
  if (event.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  if (!input || !messages) return;

  const text = input.value.trim();
  if (!text) return;

  // Add user message
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  messages.innerHTML += `
    <div class="chat-msg user">
      <div class="chat-bubble">${escapeHTML(text)}</div>
      <div class="chat-time">${time}</div>
    </div>
  `;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Show typing indicator
  const typingId = `typing-${Date.now()}`;
  messages.innerHTML += `
    <div class="chat-msg agent" id="${typingId}">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messages.scrollTop = messages.scrollHeight;

  // Show agent reply after delay
  const delay = 1200 + Math.random() * 800;
  setTimeout(() => {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    const reply = CHAT_REPLIES[chatReplyIndex % CHAT_REPLIES.length];
    chatReplyIndex++;

    messages.innerHTML += `
      <div class="chat-msg agent">
        <div class="chat-bubble">${reply}</div>
        <div class="chat-time">${time}</div>
      </div>
    `;
    messages.scrollTop = messages.scrollHeight;
  }, delay);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =====================================================
// CONTACT ACTIONS
// =====================================================
function callSupport() {
  eResto.showToast('📞 +226 70 12 34 56 — Disponible du lundi au vendredi 9h-18h.', 'info', 5000);
}

function openDocs() {
  eResto.showToast('Documentation complète disponible bientôt.', 'info');
}

// =====================================================
// MOBILE SIDEBAR + MODAL EVENTS
// =====================================================
function initMobileSidebar() {
  const toggle  = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });
  }
}

function initModalClickOutside() {
  document.addEventListener('click', e => {
    if (e.target === document.getElementById('ticket-modal')) closeTicketModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeTicketModal();
  });
}
