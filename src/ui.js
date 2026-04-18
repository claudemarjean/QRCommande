import { animateLoader, animateMenuEntrance, animateToast, stopLoader } from './animations.js';

function createAppContainer() {
  const container = document.createElement('div');
  container.className = 'app-shell';
  container.innerHTML = `
    <div id="toast-root" class="toast-stack fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"></div>
    <main id="screen-root" class="relative w-full h-full"></main>
    <nav class="bottom-nav">
      <div class="flex items-center justify-around py-2">
        <button class="bottom-nav-item active flex flex-col items-center gap-1 px-4 py-2">
          <i class="fa-solid fa-utensils text-xl"></i>
          <span class="text-xs font-semibold">Menu</span>
        </button>
        <button class="bottom-nav-item flex flex-col items-center gap-1 px-4 py-2 text-gray-400">
          <i class="fa-solid fa-shopping-bag text-xl"></i>
          <span class="text-xs font-semibold">Panier</span>
        </button>
        <button class="bottom-nav-item flex flex-col items-center gap-1 px-4 py-2 text-gray-400">
          <i class="fa-solid fa-clock-rotate-left text-xl"></i>
          <span class="text-xs font-semibold">Commandes</span>
        </button>
        <button class="bottom-nav-item flex flex-col items-center gap-1 px-4 py-2 text-gray-400">
          <i class="fa-solid fa-user text-xl"></i>
          <span class="text-xs font-semibold">Compte</span>
        </button>
      </div>
    </nav>
  `;

  return container;
}

function createTopBarMarkup(categories, totalItems) {
  const tabs = categories.map((category, index) => `
    <button
      data-category-tab="${slugify(category)}"
      class="category-tab px-4 py-2 text-sm font-semibold transition ${index === 0 ? 'active' : 'text-white/80'}"
    >
      ${category}
    </button>
  `).join('');

  return `
    <div class="top-app-bar">
      <div class="px-4 py-3">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <i class="fa-solid fa-qrcode text-white text-lg"></i>
            </div>
            <div>
              <h1 class="text-white font-bold text-lg">QRCommande</h1>
              <p class="text-white/80 text-xs">${totalItems} articles disponibles</p>
            </div>
          </div>
          <button class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
            <i class="fa-solid fa-bell"></i>
          </button>
        </div>
        <div class="search-bar flex items-center gap-3 px-4 py-2.5">
          <i class="fa-solid fa-search text-white/70"></i>
          <input
            type="text"
            placeholder="Rechercher un article..."
            class="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-sm"
            id="search-input"
          />
        </div>
      </div>
      <div class="category-tabs px-4 pb-3">
        ${tabs}
      </div>
    </div>
  `;
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function renderArticleCard(article) {
  const isAvailable = Boolean(article.is_active);

  return `
    <article
      data-article-card
      class="article-card ${isAvailable ? 'available' : 'unavailable'}"
    >
      <div class="p-4">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-gray-900 text-base mb-1.5 leading-tight truncate">${article.name}</h3>
            <span class="category-label">
              <i class="fa-solid fa-tag text-xs"></i>
              ${article.category}
            </span>
          </div>
          <span class="status-badge ${isAvailable ? 'available' : 'unavailable'} flex-shrink-0">
            ${isAvailable ? 'Dispo' : 'Épuisé'}
          </span>
        </div>
        
        <div class="flex items-center justify-between gap-3 mt-4">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-clock text-gray-400 text-xs"></i>
            <span class="text-xs text-gray-500">Rapide</span>
          </div>
          <button
            type="button"
            class="add-btn flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
              isAvailable
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }"
            ${isAvailable ? '' : 'disabled'}
            data-add-button
            data-article-name="${article.name}"
          >
            <i class="fa-solid fa-plus"></i>
            <span>Ajouter</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function groupArticlesByCategory(articles) {
  return articles.reduce((groups, article) => {
    const category = article.category || 'Autres';

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(article);
    return groups;
  }, {});
}

export function mountBaseLayout(rootElement) {
  const app = createAppContainer();
  rootElement.replaceChildren(app);
  return {
    screenRoot: app.querySelector('#screen-root'),
    toastRoot: app.querySelector('#toast-root')
  };
}

export function renderLoader(screenRoot) {
  screenRoot.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-50 to-purple-100">
      <div class="text-center">
        <div class="mx-auto loader-ring animate-spin"></div>
        <div class="mt-6 space-y-2">
          <h2 class="text-xl font-bold text-gray-800">Chargement du menu</h2>
          <p class="text-sm text-gray-600">Préparation en cours...</p>
        </div>
      </div>
    </div>
  `;

  const loader = screenRoot.querySelector('.loader-ring');
  animateLoader(loader);
  return () => stopLoader(loader);
}

export function renderInactiveState(screenRoot) {
  screenRoot.innerHTML = `
    <div class="flex items-center justify-center h-full bg-gradient-to-br from-purple-50 to-purple-100 p-6">
      <div class="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md">
        <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
          <i class="fa-regular fa-clock text-3xl text-white"></i>
        </div>
        <h1 class="mt-6 text-2xl font-bold text-gray-800">Événement non actif</h1>
        <p class="mt-3 text-gray-600 text-sm leading-relaxed">
          L'événement n'a pas encore commencé. Revenez dans quelques instants.
        </p>
      </div>
    </div>
  `;
}

export function renderErrorState(screenRoot, message) {
  screenRoot.innerHTML = `
    <div class="flex items-center justify-center h-full bg-gradient-to-br from-red-50 to-red-100 p-6">
      <div class="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md">
        <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center shadow-lg">
          <i class="fa-solid fa-triangle-exclamation text-3xl text-white"></i>
        </div>
        <h1 class="mt-6 text-2xl font-bold text-gray-800">Erreur de chargement</h1>
        <p class="mt-3 text-gray-600 text-sm leading-relaxed">${message}</p>
        <button class="mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg">
          Réessayer
        </button>
      </div>
    </div>
  `;
}

export function renderMenu(screenRoot, articles) {
  const categoriesMap = groupArticlesByCategory(articles);
  const categories = Object.keys(categoriesMap).sort((left, right) => left.localeCompare(right, 'fr'));
  const totalItems = articles.length;

  screenRoot.innerHTML = `
    ${createTopBarMarkup(categories, totalItems)}
    <div class="main-content bg-gray-50">
      <div class="px-4 pt-4 pb-6 space-y-6">
        ${categories.map((category) => `
          <section
            id="category-${slugify(category)}"
            data-category-block
            class="space-y-3"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-800">${category}</h2>
              <span class="text-xs text-gray-500 font-medium">${categoriesMap[category].length} article${categoriesMap[category].length > 1 ? 's' : ''}</span>
            </div>
            <div class="grid gap-3 grid-cols-1 sm:grid-cols-2">
              ${categoriesMap[category].map((article) => renderArticleCard(article)).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    </div>
  `;

  // Add category tab navigation
  const categoryTabs = screenRoot.querySelectorAll('[data-category-tab]');
  const categoryBlocks = screenRoot.querySelectorAll('[data-category-block]');
  
  categoryTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      // Update active tab
      categoryTabs.forEach(t => t.classList.remove('active', 'text-white'));
      categoryTabs.forEach(t => t.classList.add('text-white/80'));
      tab.classList.add('active');
      tab.classList.remove('text-white/80');
      
      // Scroll to category
      if (categoryBlocks[index]) {
        const mainContent = screenRoot.querySelector('.main-content');
        const topBar = screenRoot.querySelector('.top-app-bar');
        const offset = topBar ? topBar.offsetHeight + 16 : 16;
        
        mainContent.scrollTo({
          top: categoryBlocks[index].offsetTop - offset,
          behavior: 'smooth'
        });
      }
    });
  });

  // Search functionality
  const searchInput = screenRoot.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const allCards = screenRoot.querySelectorAll('[data-article-card]');
      
      allCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        if (name.includes(query)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  animateMenuEntrance(screenRoot);
}

export function bindAddToasts(screenRoot, toastRoot) {
  screenRoot.querySelectorAll('[data-add-button]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast(toastRoot, `${button.dataset.articleName} ajouté !`, 'success');
    });
  });
}

export function showToast(toastRoot, message, variant = 'info') {
  const styles = {
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30',
    info: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30',
    error: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
  };

  const icons = {
    success: 'fa-circle-check',
    info: 'fa-bell',
    error: 'fa-circle-xmark'
  };

  const toast = document.createElement('div');
  toast.className = `toast animate__animated animate__fadeInRight rounded-2xl px-4 py-3 ${styles[variant] || styles.info}`;
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fa-solid ${icons[variant] || icons.info} text-xl"></i>
      <p class="text-sm font-semibold">${message}</p>
    </div>
  `;

  toastRoot.appendChild(toast);
  animateToast(toast);

  window.setTimeout(() => {
    toast.classList.remove('animate__fadeInRight');
    toast.classList.add('animate__fadeOutRight');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2500);
}
