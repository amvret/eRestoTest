'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initAudienceTabs();
  initFaqAccordion();
});

// Switches between the "Client" and "Restaurateur" how-it-works panels
function initAudienceTabs() {
  const tabButtons = document.querySelectorAll('.ap-tab-btn');
  const panels = document.querySelectorAll('.ap-tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.dataset.tabPanel === target));
    });
  });
}

// Expand/collapse FAQ answers; only one open at a time for a cleaner read
function initFaqAccordion() {
  const items = document.querySelectorAll('.ap-faq-item');

  items.forEach(item => {
    const question = item.querySelector('.ap-faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}
