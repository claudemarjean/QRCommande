import { animateAdminAccess, animateLoader, animateMenuEntrance, animateOrderConfirmation, animateToast, stopLoader } from './animations.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCartCount(cartItems) {
  return cartItems.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function formatArticleCount(count, suffix = '') {
  return `${count} article${count > 1 ? 's' : ''}${suffix}`;
}

function formatOrderTime(value) {
  const date = value ? new Date(value) : new Date();

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getOrderStatusLabel(order) {
  if (order?.statusLabel) {
    return String(order.statusLabel);
  }

  const labels = {
    pending: 'En attente',
    preparing: 'En preparation',
    served: 'Servie'
  };

  const statusCode = String(order?.statusCode || order?.status || '').toLowerCase();
  return labels[statusCode] || 'En attente';
}

function getOrderStatusVariant(order) {
  const statusCode = String(order?.statusCode || order?.status || '').toLowerCase();

  if (/(served|delivered|completed|terminee|termine)/.test(statusCode)) {
    return 'served';
  }

  if (/(preparing|preparation|processing|in_progress|encours)/.test(statusCode)) {
    return 'preparing';
  }

  if (/(cancelled|canceled|rejected|refused|annulee|annule)/.test(statusCode)) {
    return 'cancelled';
  }

  return 'pending';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getCategoryIcon(category) {
  const normalizedCategory = normalizeText(category);

  if (/(vin|wine|champagne|cocktail|boisson|drink)/.test(normalizedCategory)) {
    return 'fa-wine-glass';
  }

  if (/(burger|sandwich|snack|tapas|planche|finger)/.test(normalizedCategory)) {
    return 'fa-burger';
  }

  if (/(dessert|gateau|glace|sucre|patisserie)/.test(normalizedCategory)) {
    return 'fa-ice-cream';
  }

  if (/(cafe|the|tea|chaud)/.test(normalizedCategory)) {
    return 'fa-mug-hot';
  }

  if (/(plat|repas|menu|cuisine|assiette)/.test(normalizedCategory)) {
    return 'fa-utensils';
  }

  return 'fa-grid-2';
}

function updateVisibleCount(screenRoot, visibleCount) {
  const counter = screenRoot.querySelector('[data-visible-count]');

  if (!counter) {
    return;
  }

  counter.textContent = `${visibleCount} article${visibleCount > 1 ? 's' : ''} affiché${visibleCount > 1 ? 's' : ''}`;
}

function setActiveCategoryTab(screenRoot, activeCategory) {
  screenRoot.querySelectorAll('[data-category-tab]').forEach((tab) => {
    const isActive = tab.dataset.categoryTab === activeCategory;
    tab.classList.toggle('active', isActive);
    tab.classList.toggle('text-white/75', !isActive);
  });
}

function resetMenuVisibility(screenRoot, totalItems) {
  screenRoot.querySelectorAll('[data-category-block]').forEach((section) => {
    section.hidden = false;
  });

  screenRoot.querySelectorAll('[data-article-card]').forEach((card) => {
    card.hidden = false;
  });

  const emptyState = screenRoot.querySelector('[data-empty-state]');
  if (emptyState) {
    emptyState.hidden = true;
  }

  setActiveCategoryTab(screenRoot, 'all');
  updateVisibleCount(screenRoot, totalItems);
}

function applyMenuFilters(screenRoot, query, activeCategory) {
  const normalizedQuery = normalizeText(query);
  const showAll = normalizedQuery === '' && activeCategory === 'all';
  let visibleCount = 0;

  screenRoot.querySelectorAll('[data-category-block]').forEach((section) => {
    const sectionCategory = section.dataset.categorySlug;
    let sectionVisibleCount = 0;

    section.querySelectorAll('[data-article-card]').forEach((card) => {
      const cardText = `${card.dataset.articleName || ''} ${card.dataset.articleCategory || ''}`;
      const matchesQuery = normalizedQuery === '' || cardText.includes(normalizedQuery);
      const matchesCategory = activeCategory === 'all' || sectionCategory === activeCategory;
      const isVisible = showAll || (matchesQuery && matchesCategory);

      card.hidden = !isVisible;

      if (isVisible) {
        sectionVisibleCount += 1;
        visibleCount += 1;
      }
    });

    section.hidden = !showAll && sectionVisibleCount === 0;
  });

  setActiveCategoryTab(screenRoot, activeCategory);
  updateVisibleCount(screenRoot, visibleCount);

  const emptyState = screenRoot.querySelector('[data-empty-state]');
  if (emptyState) {
    emptyState.hidden = visibleCount !== 0;
  }
}

function renderBottomNavIcon(iconName) {
  const icons = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.75A2.75 2.75 0 0 1 6.75 5h10.5A2.75 2.75 0 0 1 20 7.75v8.5A2.75 2.75 0 0 1 17.25 19H6.75A2.75 2.75 0 0 1 4 16.25zm3.25-1.25a.75.75 0 0 0-.75.75v1h11v-1a.75.75 0 0 0-.75-.75zm10.25 3.25h-11v6.5c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75z"></path></svg>',
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.25A.75.75 0 0 1 4.25 4.5h1.14c.76 0 1.42.52 1.6 1.26l.12.49h11.48a1.75 1.75 0 0 1 1.7 2.16l-1.03 4.37a2.75 2.75 0 0 1-2.67 2.12H9.57a2.75 2.75 0 0 1-2.67-2.12L5.56 7.5h-.17l-.57-2.27a.25.25 0 0 0-.24-.19h-.33a.75.75 0 0 1-.75-.75m4.86 2.5 1 4.24c.08.35.39.6.75.6h7.02c.35 0 .66-.24.74-.58l1.03-4.26zM10 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m8 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"></path></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.5h8.19c.46 0 .9.18 1.22.5l2.84 2.84c.32.32.5.76.5 1.22v9.19A2.75 2.75 0 0 1 16.75 20h-10.5A2.75 2.75 0 0 1 3.5 17.25V6.25A2.75 2.75 0 0 1 6.25 3.5zm0 1.5a1.25 1.25 0 0 0-1.25 1.25v11c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V8.56L14.94 5zm1.5 5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H9A.75.75 0 0 1 8.25 10m0 3.5A.75.75 0 0 1 9 12.75h6a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75"></path></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5M9.75 8.25a2.25 2.25 0 1 0 4.5 0 2.25 2.25 0 0 0-4.5 0M6 18a4.5 4.5 0 1 1 9 0 .75.75 0 0 0 1.5 0 6 6 0 0 0-12 0 .75.75 0 0 0 1.5 0"></path></svg>'
  };

  return icons[iconName] || '';
}

function renderCartEmptyIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 5.25A.75.75 0 0 1 4.25 4.5h1.14c.76 0 1.42.52 1.6 1.26l.12.49h11.48a1.75 1.75 0 0 1 1.7 2.16l-1.03 4.37a2.75 2.75 0 0 1-2.67 2.12H9.57a2.75 2.75 0 0 1-2.67-2.12L5.56 7.5h-.17l-.57-2.27a.25.25 0 0 0-.24-.19h-.33a.75.75 0 0 1-.75-.75m4.86 2.5 1 4.24c.08.35.39.6.75.6h7.02c.35 0 .66-.24.74-.58l1.03-4.26zM10 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m8 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"></path>
    </svg>
  `;
}

function renderCartEmptyBadgeIcon() {
  return `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4A.75.75 0 0 1 8 3.25"></path>
    </svg>
  `;
}

function renderAccountBadgeIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.75l7 2.5v5.3c0 4.62-2.86 8.86-7 10.45-4.14-1.59-7-5.83-7-10.45v-5.3zm0 2.12L6.5 6.8v3.75c0 3.62 2.08 6.96 5.5 8.42 3.42-1.46 5.5-4.8 5.5-8.42V6.8z"></path>
      <path d="M12 8.15a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2m-3.15 7.25a.75.75 0 0 1-.75-.75 3.9 3.9 0 0 1 7.8 0 .75.75 0 0 1-1.5 0 2.4 2.4 0 0 0-4.8 0 .75.75 0 0 1-.75.75"></path>
    </svg>
  `;
}

function createAppContainer() {
  const container = document.createElement('div');
  container.className = 'app-shell';
  container.innerHTML = `
    <div id="toast-root" class="toast-stack fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"></div>
    <main id="screen-root" class="relative flex h-full min-h-0 w-full flex-col overflow-hidden"></main>
    <nav class="bottom-nav">
      <div class="bottom-nav-shell flex items-center justify-around py-2">
        <button data-nav-target="menu" class="bottom-nav-item active flex flex-col items-center gap-1 px-4 py-2">
          <span class="bottom-nav-icon-shell">
            ${renderBottomNavIcon('menu')}
          </span>
          <span class="bottom-nav-label text-xs font-semibold">Menu</span>
        </button>
        <button data-nav-target="cart" class="bottom-nav-item relative flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
          <span data-cart-badge hidden class="cart-badge">0</span>
          <span class="bottom-nav-icon-shell">
            ${renderBottomNavIcon('cart')}
          </span>
          <span class="bottom-nav-label text-xs font-semibold">Panier</span>
        </button>
        <button data-nav-target="orders" class="bottom-nav-item flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
          <span class="bottom-nav-icon-shell">
            ${renderBottomNavIcon('orders')}
          </span>
          <span class="bottom-nav-label text-xs font-semibold">Commandes</span>
        </button>
        <button data-nav-target="account" class="bottom-nav-item flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
          <span class="bottom-nav-icon-shell">
            ${renderBottomNavIcon('account')}
          </span>
          <span class="bottom-nav-label text-xs font-semibold">Compte</span>
        </button>
      </div>
    </nav>
  `;

  return container;
}

function createTopBarMarkup(categories, totalItems) {
  const filterCategories = ['all', ...categories];
  const tabs = filterCategories.map((category, index) => {
    const isAll = category === 'all';
    const label = escapeHtml(isAll ? 'Toutes' : category);
    const icon = isAll ? 'fa-table-cells-large' : getCategoryIcon(category);

    return `
      <button
        data-category-tab="${isAll ? 'all' : slugify(category)}"
        class="category-tab px-3 py-1.5 text-xs font-semibold transition ${index === 0 ? 'active' : 'text-white/75'}"
      >
        <i class="fa-solid ${icon} text-[0.8rem]"></i>
        <span>${label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="top-app-bar">
      <div class="page-orb page-orb-left"></div>
      <div class="page-orb page-orb-right"></div>
      <div class="top-bar-inner px-4 pb-2 pt-3 sm:px-5">
        <div data-hero class="event-hero">
          <div class="space-y-2 min-w-0">
            <div class="flex items-center gap-2.5" data-reveal>
              <div class="app-logo-frame">
                <img src="/assets/logo-app.png" alt="Logo QRCommande" class="app-logo-image" />
              </div>
              <div class="min-w-0 brand-lockup">
                <p class="event-kicker">QRCommande</p>
                <p class="brand-subline">Liste des articles</p>
              </div>
            </div>
          </div>
        </div>
        <div class="search-row" data-reveal>
          <div class="search-bar flex items-center gap-2.5 px-3 py-2.5">
            <i class="fa-solid fa-magnifying-glass text-xs text-white/70"></i>
            <input
              type="text"
              placeholder="Rechercher une boisson, un snack, un dessert..."
              class="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-[0.82rem]"
              id="search-input"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              enterkeyhint="search"
            />
          </div>
          <div class="event-corner-stat event-corner-stat-inline">
            <strong class="event-corner-value" data-visible-count>${totalItems} articles affichés</strong>
          </div>
        </div>
      </div>
      <div class="category-tabs px-4 pb-3 sm:px-5" data-reveal>
        ${tabs}
      </div>
    </div>
  `;
}

function createCartHeaderMarkup(cartItems) {
  const cartCount = getCartCount(cartItems);

  return `
    <div class="top-app-bar top-app-bar-cart">
      <div class="page-orb page-orb-left"></div>
      <div class="page-orb page-orb-right"></div>
      <div class="px-4 pb-4 pt-4 sm:px-5">
        <div data-hero class="event-hero compact">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-2 min-w-0">
              <div class="flex items-center gap-3" data-reveal>
                <div class="app-logo-frame">
                  <img src="/assets/logo-app.png" alt="Logo QRCommande" class="app-logo-image" />
                </div>
                <div class="min-w-0">
                  <p class="event-kicker">Panier</p>
                  <p class="brand-subline" data-cart-header-count>${formatArticleCount(cartCount)}</p>
                </div>
              </div>
            </div>
            <button type="button" data-cart-clear class="hero-action ${cartCount === 0 ? 'pointer-events-none opacity-50' : ''}" data-reveal ${cartCount === 0 ? 'disabled' : ''}>
              Vider
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderArticleCard(article) {
  const isAvailable = Boolean(article.is_active);
  const category = article.category || 'Autres';
  const normalizedName = normalizeText(article.name);
  const normalizedCategory = normalizeText(category);
  const safeName = escapeHtml(article.name);
  const safeCategory = escapeHtml(category);

  return `
    <article
      data-article-card
      data-article-name="${escapeHtml(normalizedName)}"
      data-article-category="${escapeHtml(normalizedCategory)}"
      class="article-card ${isAvailable ? 'available' : 'unavailable'}"
      data-reveal
    >
      <div class="article-card-glow"></div>
      <div class="article-card-content article-card-inner">
        <div class="article-card-row">
          <div class="min-w-0 flex-1 article-main-block">
            <div class="article-meta-compact">
              <span class="category-label compact-article">
                ${safeCategory}
              </span>
            </div>
            <div class="article-title-row mt-1.5">
              <h3 class="article-title">${safeName}</h3>
              <button
                type="button"
                class="add-btn ${isAvailable ? 'is-active' : 'is-disabled'}"
                ${isAvailable ? '' : 'disabled'}
                data-add-button
                data-article-id="${article.id}"
                data-article-name="${safeName}"
                data-article-category="${safeCategory}"
              >
                <i class="fa-solid ${isAvailable ? 'fa-plus' : 'fa-ban'}"></i>
                <span>${isAvailable ? 'Ajouter' : 'Stock'}</span>
              </button>
            </div>
          </div>
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

function renderCartItem(item) {
  const safeCategory = escapeHtml(item.category);
  const safeName = escapeHtml(item.name);
  const categoryIcon = getCategoryIcon(item.category);
  const quantity = Number(item.quantity) || 1;

  return `
    <article class="cart-item" data-reveal data-cart-item data-article-id="${item.id}">
      <div class="cart-item-body">
        <div class="min-w-0 flex-1">
          <div class="cart-item-meta-row">
            <span class="category-label compact">
              <i class="fa-solid ${categoryIcon} text-xs"></i>
              ${safeCategory}
            </span>
            <div class="cart-quantity-controls" aria-label="Quantité de ${safeName}">
              <button
                type="button"
                data-quantity-action="decrease"
                data-article-id="${item.id}"
                class="cart-quantity-btn"
                aria-label="Réduire la quantité de ${safeName}"
              >
                <span class="cart-quantity-symbol" aria-hidden="true">-</span>
              </button>
              <span class="cart-quantity" data-cart-item-quantity>x${quantity}</span>
              <button
                type="button"
                data-quantity-action="increase"
                data-article-id="${item.id}"
                class="cart-quantity-btn"
                aria-label="Augmenter la quantité de ${safeName}"
              >
                <span class="cart-quantity-symbol" aria-hidden="true">+</span>
              </button>
            </div>
          </div>
          <div class="cart-item-title-row">
            <h3 class="cart-item-title">${safeName}</h3>
            <button
              type="button"
              data-remove-button
              data-article-id="${item.id}"
              class="cart-remove-btn"
              aria-label="Supprimer ${safeName} du panier"
            >
              <i class="fa-solid fa-trash-can text-sm"></i>
              <span>Retirer</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderOrderItemsSummary(order) {
  const items = Array.isArray(order?.items) ? order.items : [];

  if (!items.length) {
    return '';
  }

  return `
    <div class="order-card-items">
      ${items.map((item) => `
        <div class="order-card-item-row">
          <span class="order-card-item-name">${escapeHtml(item.name || '')}</span>
          <span class="order-card-item-qty">x${Math.max(1, Number(item.quantity) || 1)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function mountBaseLayout(rootElement) {
  const app = createAppContainer();
  rootElement.replaceChildren(app);
  return {
    appRoot: app,
    screenRoot: app.querySelector('#screen-root'),
    toastRoot: app.querySelector('#toast-root')
  };
}

export function bindBottomNavigation(appRoot, onNavigate) {
  appRoot.querySelectorAll('[data-nav-target]').forEach((button) => {
    button.addEventListener('click', () => {
      onNavigate(button.dataset.navTarget);
    });
  });
}

export function updateBottomNavigation(appRoot, activeView) {
  appRoot.querySelectorAll('[data-nav-target]').forEach((button) => {
    const isActive = button.dataset.navTarget === activeView;
    button.classList.toggle('active', isActive);
    button.classList.toggle('text-slate-500', !isActive);
  });
}

export function updateCartBadge(appRoot, cartItems) {
  const badge = appRoot.querySelector('[data-cart-badge]');
  if (!badge) {
    return;
  }

  const count = getCartCount(cartItems);
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

export function updateCartScreen(screenRoot, cartItems, options = {}) {
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
  const cartCount = getCartCount(safeCartItems);
  const targetArticleId = options.articleId ? String(options.articleId) : '';

  const headerCount = screenRoot.querySelector('[data-cart-header-count]');
  if (headerCount) {
    headerCount.textContent = formatArticleCount(cartCount);
  }

  const summaryCount = screenRoot.querySelector('.cart-summary-count');
  if (summaryCount) {
    summaryCount.textContent = String(cartCount);
  }

  const summaryTitle = screenRoot.querySelector('.cart-summary-title');
  if (summaryTitle) {
    summaryTitle.textContent = `${formatArticleCount(cartCount, ' dans le panier')}`;
  }

  const clearButton = screenRoot.querySelector('[data-cart-clear]');
  if (clearButton) {
    const isEmpty = cartCount === 0;
    clearButton.disabled = isEmpty;
    clearButton.classList.toggle('pointer-events-none', isEmpty);
    clearButton.classList.toggle('opacity-50', isEmpty);
  }

  if (!targetArticleId) {
    return;
  }

  const itemElement = screenRoot.querySelector(`[data-cart-item][data-article-id="${targetArticleId}"]`);
  const nextItem = safeCartItems.find((item) => item.id === targetArticleId);

  if (!nextItem) {
    if (itemElement) {
      itemElement.remove();
    }
    return;
  }

  if (!itemElement) {
    return;
  }

  const quantityLabel = itemElement.querySelector('[data-cart-item-quantity]');
  if (quantityLabel) {
    quantityLabel.textContent = `x${Number(nextItem.quantity) || 1}`;
  }
}

export function renderLoader(screenRoot) {
  screenRoot.innerHTML = `
    <div class="state-screen state-screen-loader">
      <div class="state-card" data-reveal>
        <div class="loader-ring"></div>
        <span class="state-chip state-chip-loader">Chargement live</span>
        <div class="state-copy-block text-center">
          <h2 class="state-title state-title-loader">Le menu de l’événement se prépare</h2>
          <p class="state-copy state-copy-loader">Nous mettons en scène la carte pour une navigation fluide et rapide sur mobile.</p>
        </div>
      </div>
    </div>
  `;

  const loader = screenRoot.querySelector('.loader-ring');
  animateLoader(loader);
  animateMenuEntrance(screenRoot);
  return () => stopLoader(loader);
}

export function renderInactiveState(screenRoot) {
  screenRoot.innerHTML = `
    <div class="state-screen">
      <div class="state-card" data-reveal>
        <div class="state-icon warm">
          <i class="fa-regular fa-clock"></i>
        </div>
        <span class="state-chip">Événement en attente</span>
        <div class="space-y-2 text-center">
          <h1 class="state-title">La carte n’est pas encore ouverte</h1>
          <p class="state-copy">L’événement n’a pas encore démarré. Revenez dans un instant pour découvrir le menu.</p>
        </div>
      </div>
    </div>
  `;

  animateMenuEntrance(screenRoot);
}

export function renderErrorState(screenRoot, message) {
  screenRoot.innerHTML = `
    <div class="state-screen state-screen-error">
      <div class="state-card" data-reveal>
        <div class="state-icon danger">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <span class="state-chip">Incident temporaire</span>
        <div class="space-y-2 text-center">
          <h1 class="state-title">Le menu n’a pas pu être affiché</h1>
          <p class="state-copy">${escapeHtml(message)}</p>
        </div>
        <button class="hero-action mt-2" type="button">
          Réessayer
        </button>
      </div>
    </div>
  `;

  animateMenuEntrance(screenRoot);
}

export function renderMenu(screenRoot, articles) {
  const categoriesMap = groupArticlesByCategory(articles);
  const categories = Object.keys(categoriesMap).sort((left, right) => left.localeCompare(right, 'fr'));
  const totalItems = articles.length;

  screenRoot.innerHTML = `
    ${createTopBarMarkup(categories, totalItems)}
    <div class="main-content page-surface">
      <div class="px-4 pb-8 pt-4 space-y-6 sm:px-5">
        ${categories.map((category) => `
          <section
            id="category-${slugify(category)}"
            data-category-block
            data-category-slug="${slugify(category)}"
            class="menu-section space-y-4"
            data-reveal
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="flex items-center gap-3 text-lg font-bold text-slate-950">
                <span class="section-icon">
                  <i class="fa-solid ${getCategoryIcon(category)}"></i>
                </span>
                <span>${escapeHtml(category)}</span>
              </h2>
              <span class="section-counter">${categoriesMap[category].length} article${categoriesMap[category].length > 1 ? 's' : ''}</span>
            </div>
            <div class="grid gap-3 grid-cols-1 sm:grid-cols-2">
              ${categoriesMap[category].map((article) => renderArticleCard(article)).join('')}
            </div>
          </section>
        `).join('')}
        <section data-empty-state hidden class="empty-results-panel">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/75 text-slate-500">
            <i class="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 class="mt-4 text-base font-bold text-slate-950">Aucun article trouvé</h3>
          <p class="mt-2 text-sm text-slate-600">Essayez une autre recherche ou revenez sur le filtre Toutes.</p>
        </section>
      </div>
    </div>
  `;

  const categoryTabs = screenRoot.querySelectorAll('[data-category-tab]');
  const searchInput = screenRoot.querySelector('#search-input');
  let activeCategory = 'all';

  if (searchInput) {
    searchInput.value = '';
  }

  categoryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.categoryTab;
      applyMenuFilters(screenRoot, searchInput ? searchInput.value : '', activeCategory);

      const mainContent = screenRoot.querySelector('.main-content');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      applyMenuFilters(screenRoot, event.target.value, activeCategory);
    });
  }

  resetMenuVisibility(screenRoot, totalItems);
  animateMenuEntrance(screenRoot);
}

export function renderCart(screenRoot, cartItems) {
  const cartCount = getCartCount(cartItems);
  const options = arguments[2] || {};
  const errorMessage = options.errorMessage ? escapeHtml(options.errorMessage) : '';
  const isSubmitting = Boolean(options.isSubmitting);
  const tableLabel = escapeHtml(options.tableLabel || '');
  const hasTableLabel = Boolean(String(options.tableLabel || '').trim());

  screenRoot.innerHTML = `
    ${createCartHeaderMarkup(cartItems)}
    <div class="main-content page-surface">
      <div class="px-4 pb-8 pt-5 sm:px-5">
        ${errorMessage
          ? `
            <section class="cart-feedback cart-feedback-error" data-reveal>
              <div class="cart-feedback-icon">
                <i class="fa-solid fa-circle-exclamation"></i>
              </div>
              <div class="min-w-0">
                <h3 class="cart-feedback-title">Validation impossible</h3>
                <p class="cart-feedback-copy">${errorMessage}</p>
              </div>
            </section>
          `
          : ''}
        ${cartItems.length
          ? `
            <section class="space-y-4">
              <div class="cart-summary" data-reveal>
                <div class="cart-summary-copy">
                  <p class="cart-summary-kicker">Résumé</p>
                  <div class="cart-summary-title-row mt-1">
                    <span class="cart-summary-count">${cartCount}</span>
                    <h2 class="cart-summary-title">${formatArticleCount(cartCount, ' dans le panier')}</h2>
                  </div>
                </div>
                <div class="cart-summary-panel">
                  <label class="cart-service-field">
                    <span class="cart-service-label">Repère de service</span>
                    <div class="cart-service-input-shell ${hasTableLabel ? 'is-complete' : ''}">
                      <i class="fa-solid fa-location-dot cart-service-input-icon" aria-hidden="true"></i>
                      <input
                        type="text"
                        value="${tableLabel}"
                        data-table-label-input
                        class="cart-service-input"
                        placeholder="Ex. Table 12, ..."
                        maxlength="120"
                        ${isSubmitting ? 'disabled' : ''}
                      />
                    </div>
                  </label>
                  <div class="cart-summary-actions">
                    <p class="cart-service-status ${hasTableLabel ? 'is-ready' : ''}" data-checkout-status>
                      ${hasTableLabel ? 'Repère prêt pour l’envoi.' : 'Renseignez un repère pour activer la validation.'}
                    </p>
                    <div class="cart-summary-buttons">
                      <button type="button" data-checkout class="cart-primary-btn ${isSubmitting ? 'is-loading' : ''}" ${isSubmitting || !hasTableLabel ? 'disabled' : ''} ${isSubmitting ? 'aria-busy="true"' : ''}>
                        <span class="cart-primary-btn-content ${isSubmitting ? 'opacity-0' : ''}">
                          <i class="fa-solid fa-bag-shopping"></i>
                          Valider la commande
                        </span>
                        ${isSubmitting
                          ? `
                            <span class="cart-btn-loader" aria-hidden="true"></span>
                            <span class="cart-btn-loading-copy">Envoi...</span>
                          `
                          : ''}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="space-y-3">
                ${cartItems.map((item) => renderCartItem(item)).join('')}
              </div>
            </section>
          `
          : `
            <section class="cart-empty-state" data-reveal>
              <div class="cart-empty-icon">
                ${renderCartEmptyIcon()}
                <span class="cart-empty-icon-badge">
                  ${renderCartEmptyBadgeIcon()}
                </span>
              </div>
              <h2 class="mt-5 text-xl font-bold text-slate-950">Votre panier est vide</h2>
              <p class="mt-2 text-sm leading-6 text-slate-600">Ajoutez quelques articles depuis le menu pour les retrouver ici.</p>
              <button type="button" data-back-to-menu class="hero-action mt-6 inline-flex items-center gap-2">
                <i class="fa-solid fa-utensils"></i>
                Voir le menu
              </button>
            </section>
          `}
      </div>
    </div>
  `;

  animateMenuEntrance(screenRoot);
}

export function renderOrderConfirmation(screenRoot, order) {
  const orderNumber = escapeHtml(order?.orderNumber || '');
  const tableLabel = escapeHtml(order?.tableLabel || '');
  const orderTime = escapeHtml(formatOrderTime(order?.createdAt));

  screenRoot.innerHTML = `
    <div class="main-content page-surface confirmation-screen">
      <div class="px-4 pb-8 pt-6 sm:px-5">
        <section class="confirmation-card" data-confirmation-card>
          <div class="confirmation-aura"></div>
          <div class="confirmation-check" data-confirmation-check>
            <span class="confirmation-check-ring" aria-hidden="true"></span>
            <span class="confirmation-check-core" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="confirmation-check-svg" aria-hidden="true" focusable="false">
                <path d="M6 12.5L10.1 16.6L18.2 8.4"></path>
              </svg>
            </span>
          </div>
          <span class="confirmation-chip" data-confirmation-reveal>Commande confirmée</span>
          <div class="confirmation-copy-block" data-confirmation-reveal>
            <h1 class="confirmation-title">Votre commande est bien enregistrée</h1>
            <p class="confirmation-copy">Elle a été transmise à l’équipe avec le statut en attente de préparation.</p>
          </div>
          <div class="confirmation-details" data-confirmation-reveal>
            <div class="confirmation-detail-card">
              <span class="confirmation-detail-label">Numéro de commande</span>
              <strong class="confirmation-detail-value">${orderNumber}</strong>
            </div>
            <div class="confirmation-detail-card">
              <span class="confirmation-detail-label">Repere</span>
              <strong class="confirmation-detail-value">${tableLabel}</strong>
            </div>
            <div class="confirmation-detail-card">
              <span class="confirmation-detail-label">Heure</span>
              <strong class="confirmation-detail-value">${orderTime}</strong>
            </div>
          </div>
          <div class="confirmation-actions" data-confirmation-reveal>
            <button type="button" data-track-order class="confirmation-secondary-action">
              <i class="fa-solid fa-receipt"></i>
              Suivre ma commande
            </button>
            <button type="button" data-new-order class="confirmation-action">
              <i class="fa-solid fa-rotate-right"></i>
              Nouvelle commande
            </button>
          </div>
        </section>
      </div>
    </div>
  `;

  animateOrderConfirmation(screenRoot);
}

export function renderAdminLogin(screenRoot, accountState = {}) {
  const email = escapeHtml(accountState?.email || '');
  const password = escapeHtml(accountState?.password || '');
  const errorMessage = escapeHtml(accountState?.errorMessage || '');
  const isSubmitting = Boolean(accountState?.isSubmitting);
  const showPassword = Boolean(accountState?.showPassword);

  screenRoot.innerHTML = `
    <div class="main-content page-surface admin-screen">
      <div class="px-4 pb-8 pt-5 sm:px-5">
        <section class="admin-panel" data-admin-panel>
          <div class="admin-panel-orb admin-panel-orb-left"></div>
          <div class="admin-panel-orb admin-panel-orb-right"></div>
          <div class="admin-panel-head">
            <div class="admin-signal" data-admin-signal>
              ${renderAccountBadgeIcon()}
            </div>
            <div class="admin-copy-block" data-admin-reveal>
              <span class="admin-kicker">Espace admin</span>
              <h1 class="admin-title">Accès admin uniquement</h1>
              <p class="admin-copy">Pour commander, aucun compte n’est nécessaire.</p>
            </div>
            <div class="admin-note" data-admin-reveal>
              <strong>Public</strong>
              <p>Le menu client reste libre d’accès.</p>
            </div>
          </div>

          <div class="admin-grid">
            <form class="admin-login-card" data-admin-login-form data-admin-reveal>
              <div class="admin-login-topline">
                <span class="admin-login-chip">Connexion sécurisée</span>
                <p class="admin-login-caption">Identifiants staff uniquement.</p>
              </div>

              <label class="admin-field">
                <span class="admin-field-label">Email admin</span>
                <span class="admin-input-shell">
                  <i class="fa-solid fa-envelope admin-input-icon"></i>
                  <input
                    type="email"
                    name="email"
                    value="${email}"
                    placeholder="admin@evenement.fr"
                    class="admin-input"
                    autocomplete="username"
                    inputmode="email"
                    ${isSubmitting ? 'disabled' : ''}
                  />
                </span>
              </label>

              <label class="admin-field">
                <span class="admin-field-label">Mot de passe</span>
                <span class="admin-input-shell admin-input-shell-password">
                  <i class="fa-solid fa-lock admin-input-icon"></i>
                  <input
                    type="${showPassword ? 'text' : 'password'}"
                    name="password"
                    value="${password}"
                    placeholder="Votre accès administrateur"
                    class="admin-input"
                    autocomplete="current-password"
                    ${isSubmitting ? 'disabled' : ''}
                  />
                  <button type="button" class="admin-toggle-password" data-toggle-admin-password ${isSubmitting ? 'disabled' : ''}>
                    <i class="fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
                  </button>
                </span>
              </label>

              ${errorMessage
                ? `<p class="admin-error" data-admin-error>${errorMessage}</p>`
                : '<p class="admin-hint" data-admin-error>Réservé aux administrateurs de l’événement.</p>'}

              <button type="submit" class="admin-login-button ${isSubmitting ? 'is-loading' : ''}" ${isSubmitting ? 'disabled' : ''}>
                <span>${isSubmitting ? 'Connexion...' : 'Connexion admin'}</span>
                <i class="fa-solid fa-arrow-right-long"></i>
              </button>
            </form>

            <article class="admin-info-card" data-admin-reveal>
              <span class="admin-info-pill">Réservé au staff</span>
              <h2 class="admin-info-title">Gestion interne</h2>
              <p class="admin-info-copy">Cet accès sert au suivi et à l’exploitation.</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  `;

  animateAdminAccess(screenRoot);
}

export function renderAdminTestScreen(screenRoot, adminProfile = {}) {
  const displayName = escapeHtml(adminProfile?.displayName || 'Administrateur');
  const email = escapeHtml(adminProfile?.email || '');
  const role = escapeHtml(adminProfile?.role || 'admin');

  screenRoot.innerHTML = `
    <div class="main-content page-surface admin-screen">
      <div class="px-4 pb-8 pt-5 sm:px-5">
        <section class="admin-panel" data-admin-panel>
          <div class="admin-panel-orb admin-panel-orb-left"></div>
          <div class="admin-panel-orb admin-panel-orb-right"></div>
          <div class="admin-panel-head">
            <div class="admin-signal" data-admin-signal>
              ${renderAccountBadgeIcon()}
            </div>
            <div class="admin-copy-block" data-admin-reveal>
              <span class="admin-kicker">Session active</span>
              <h1 class="admin-title">Page de test admin</h1>
              <p class="admin-copy">Connexion validée. La suite pourra être développée ici.</p>
            </div>
            <div class="admin-note" data-admin-reveal>
              <strong>${displayName}</strong>
              <p>${email}</p>
            </div>
          </div>

          <div class="admin-grid admin-grid-dashboard">
            <article class="admin-info-card" data-admin-reveal>
              <span class="admin-info-pill">Test</span>
              <h2 class="admin-info-title">Zone protégée opérationnelle</h2>
              <p class="admin-info-copy">L’authentification admin fonctionne. Vous pouvez maintenant développer le dashboard métier.</p>
            </article>

            <article class="admin-login-card admin-console-card" data-admin-reveal>
              <div class="admin-console-row">
                <span class="admin-console-label">Rôle</span>
                <strong class="admin-console-value">${role}</strong>
              </div>
              <div class="admin-console-row">
                <span class="admin-console-label">Compte</span>
                <strong class="admin-console-value">${email}</strong>
              </div>
              <button type="button" class="admin-login-button" data-admin-signout>
                <span>Se déconnecter</span>
                <i class="fa-solid fa-right-from-bracket"></i>
              </button>
            </article>
          </div>
        </section>
      </div>
    </div>
  `;

  animateAdminAccess(screenRoot);
}

function renderOrdersListMarkup(orders) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  return safeOrders.length
    ? `
      <section class="space-y-3">
        ${safeOrders.map((order) => `
          <article class="order-card" data-reveal>
            <div class="order-card-row">
              <div>
                <p class="order-card-kicker">Commande</p>
                <h3 class="order-card-title">#${escapeHtml(order.orderNumber || '')}</h3>
              </div>
              <span class="order-status-chip status-${escapeHtml(getOrderStatusVariant(order))}">${escapeHtml(getOrderStatusLabel(order))}</span>
            </div>
            <p class="order-card-reference">${escapeHtml(order.tableLabel || '')}</p>
            ${renderOrderItemsSummary(order)}
            <div class="order-card-meta">
              <span>${escapeHtml(formatOrderTime(order.createdAt))}</span>
              <span>${escapeHtml(new Date(order.createdAt || Date.now()).toLocaleDateString('fr-FR'))}</span>
            </div>
          </article>
        `).join('')}
      </section>
    `
    : `
      <section class="cart-empty-state" data-reveal>
        <div class="cart-empty-icon">
          ${renderBottomNavIcon('orders')}
        </div>
        <h2 class="mt-5 text-xl font-bold text-slate-950">Aucune commande pour le moment</h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">Vos commandes validees s'afficheront ici.</p>
        <button type="button" data-orders-menu class="hero-action mt-6 inline-flex items-center gap-2">
          <i class="fa-solid fa-utensils"></i>
          Voir le menu
        </button>
      </section>
    `;
}

export function renderOrders(screenRoot, orders) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  screenRoot.innerHTML = `
    <div class="top-app-bar top-app-bar-cart">
      <div class="page-orb page-orb-left"></div>
      <div class="page-orb page-orb-right"></div>
      <div class="px-4 pb-4 pt-4 sm:px-5">
        <div data-hero class="event-hero compact">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-2 min-w-0">
              <div class="flex items-center gap-3" data-reveal>
                <div class="app-logo-frame">
                  <img src="/assets/logo-app.png" alt="Logo QRCommande" class="app-logo-image" />
                </div>
                <div class="min-w-0">
                  <p class="event-kicker">Commandes</p>
                  <p class="brand-subline" data-orders-count>${safeOrders.length} commande${safeOrders.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <button type="button" data-orders-menu class="hero-action" data-reveal>
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="main-content page-surface">
      <div class="px-4 pb-8 pt-5 sm:px-5" data-orders-list-root>
        ${renderOrdersListMarkup(safeOrders)}
      </div>
    </div>
  `;

  animateMenuEntrance(screenRoot);
}

export function updateOrdersList(screenRoot, orders) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const countElement = screenRoot.querySelector('[data-orders-count]');
  const listRoot = screenRoot.querySelector('[data-orders-list-root]');

  if (!countElement || !listRoot) {
    renderOrders(screenRoot, safeOrders);
    return;
  }

  countElement.textContent = `${safeOrders.length} commande${safeOrders.length > 1 ? 's' : ''}`;
  listRoot.innerHTML = renderOrdersListMarkup(safeOrders);
}

export function bindMenuActions(screenRoot, onAddToCart) {
  screenRoot.querySelectorAll('[data-add-button]').forEach((button) => {
    button.addEventListener('click', () => {
      onAddToCart({
        id: button.dataset.articleId,
        name: button.dataset.articleName,
        category: button.dataset.articleCategory
      });
    });
  });
}

export function bindCartActions(screenRoot, { onRemoveItem, onBackToMenu, onClearCart, onUpdateQuantity, onCheckout, onNewOrder, onTrackOrder, onTableLabelChange }) {
  if (screenRoot.__cartClickHandler) {
    screenRoot.removeEventListener('click', screenRoot.__cartClickHandler);
  }

  const cartClickHandler = (event) => {
    const quantityButton = event.target.closest('[data-quantity-action]');
    if (quantityButton) {
      onUpdateQuantity(
        quantityButton.dataset.articleId,
        quantityButton.dataset.quantityAction
      );
      return;
    }

    const removeButton = event.target.closest('[data-remove-button]');
    if (removeButton) {
      onRemoveItem(removeButton.dataset.articleId);
      return;
    }

    const backButton = event.target.closest('[data-back-to-menu]');
    if (backButton) {
      onBackToMenu();
      return;
    }

    const clearButton = event.target.closest('[data-cart-clear]');
    if (clearButton) {
      onClearCart();
      return;
    }

    const checkoutButton = event.target.closest('[data-checkout]');
    if (checkoutButton) {
      onCheckout();
      return;
    }

    const newOrderButton = event.target.closest('[data-new-order]');
    if (newOrderButton) {
      onNewOrder();
      return;
    }

    const trackOrderButton = event.target.closest('[data-track-order]');
    if (trackOrderButton) {
      onTrackOrder();
      return;
    }
  };

  screenRoot.__cartClickHandler = cartClickHandler;
  screenRoot.addEventListener('click', cartClickHandler);

  const tableLabelInput = screenRoot.querySelector('[data-table-label-input]');
  const checkoutButton = screenRoot.querySelector('[data-checkout]');
  const checkoutStatus = screenRoot.querySelector('[data-checkout-status]');
  const inputShell = screenRoot.querySelector('.cart-service-input-shell');

  const syncCheckoutAvailability = (value) => {
    const hasValue = Boolean(String(value || '').trim());

    if (checkoutButton && !checkoutButton.classList.contains('is-loading')) {
      checkoutButton.disabled = !hasValue;
    }

    if (checkoutStatus) {
      checkoutStatus.textContent = hasValue
        ? 'Repère prêt pour l’envoi.'
        : 'Renseignez un repère pour activer la validation.';
      checkoutStatus.classList.toggle('is-ready', hasValue);
    }

    if (inputShell) {
      inputShell.classList.toggle('is-complete', hasValue);
    }
  };

  if (tableLabelInput && typeof onTableLabelChange === 'function') {
    syncCheckoutAvailability(tableLabelInput.value);
    tableLabelInput.addEventListener('input', (event) => {
      const nextValue = event.target.value;
      syncCheckoutAvailability(nextValue);
      onTableLabelChange(nextValue);
    });
  }
}

export function bindOrdersActions(screenRoot, { onBackToMenu }) {
  if (screenRoot.__ordersClickHandler) {
    screenRoot.removeEventListener('click', screenRoot.__ordersClickHandler);
  }

  const ordersClickHandler = (event) => {
    const menuButton = event.target.closest('[data-orders-menu]');
    if (menuButton) {
      onBackToMenu();
    }
  };

  screenRoot.__ordersClickHandler = ordersClickHandler;
  screenRoot.addEventListener('click', ordersClickHandler);
}

export function bindAdminLoginActions(screenRoot, { onEmailChange, onPasswordChange, onTogglePassword, onSubmit }) {
  const form = screenRoot.querySelector('[data-admin-login-form]');
  const emailInput = screenRoot.querySelector('input[name="email"]');
  const passwordInput = screenRoot.querySelector('input[name="password"]');
  const toggleButton = screenRoot.querySelector('[data-toggle-admin-password]');

  if (emailInput && typeof onEmailChange === 'function') {
    emailInput.addEventListener('input', (event) => {
      onEmailChange(event.target.value);
    });
  }

  if (passwordInput && typeof onPasswordChange === 'function') {
    passwordInput.addEventListener('input', (event) => {
      onPasswordChange(event.target.value);
    });
  }

  if (toggleButton && typeof onTogglePassword === 'function') {
    toggleButton.addEventListener('click', () => {
      onTogglePassword();
    });
  }

  if (form && typeof onSubmit === 'function') {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      onSubmit();
    });
  }
}

export function bindAdminTestActions(screenRoot, { onSignOut }) {
  const signOutButton = screenRoot.querySelector('[data-admin-signout]');

  if (signOutButton && typeof onSignOut === 'function') {
    signOutButton.addEventListener('click', () => {
      onSignOut();
    });
  }
}

export function showToast(toastRoot, message, variant = 'info') {
  const styles = {
    success: 'toast-success',
    info: 'toast-info',
    error: 'toast-error'
  };

  const icons = {
    success: 'fa-circle-check',
    info: 'fa-bell',
    error: 'fa-circle-xmark'
  };

  const toast = document.createElement('div');
  toast.className = `toast animate__animated animate__fadeInRight rounded-[1.35rem] px-4 py-3 ${styles[variant] || styles.info}`;

  const content = document.createElement('div');
  content.className = 'flex items-center gap-3';

  const icon = document.createElement('i');
  icon.className = `fa-solid ${icons[variant] || icons.info} text-xl`;

  const text = document.createElement('p');
  text.className = 'text-sm font-semibold';
  text.textContent = String(message || '');

  content.append(icon, text);
  toast.appendChild(content);

  toastRoot.appendChild(toast);
  animateToast(toast);

  window.setTimeout(() => {
    toast.classList.remove('animate__fadeInRight');
    toast.classList.add('animate__fadeOutRight');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2500);
}
