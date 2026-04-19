import { animateLoader, animateMenuEntrance, animateToast, stopLoader } from './animations.js';

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

function createAppContainer() {
  const container = document.createElement('div');
  container.className = 'app-shell';
  container.innerHTML = `
    <div id="toast-root" class="toast-stack fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"></div>
    <main id="screen-root" class="relative flex h-full min-h-0 w-full flex-col overflow-hidden"></main>
    <nav class="bottom-nav">
      <div class="flex items-center justify-around py-2">
        <button data-nav-target="menu" class="bottom-nav-item active flex flex-col items-center gap-1 px-4 py-2">
          <i class="fa-solid fa-house text-xl"></i>
          <span class="text-xs font-semibold">Menu</span>
        </button>
        <button data-nav-target="cart" class="bottom-nav-item relative flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
          <span data-cart-badge hidden class="cart-badge">0</span>
          <i class="fa-solid fa-basket-shopping text-xl"></i>
          <span class="text-xs font-semibold">Panier</span>
        </button>
        <button class="bottom-nav-item flex flex-col items-center gap-1 px-4 py-2 text-slate-500" disabled>
          <i class="fa-solid fa-receipt text-xl"></i>
          <span class="text-xs font-semibold">Commandes</span>
        </button>
        <button class="bottom-nav-item flex flex-col items-center gap-1 px-4 py-2 text-slate-500" disabled>
          <i class="fa-solid fa-user-large text-xl"></i>
          <span class="text-xs font-semibold">Compte</span>
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
        class="category-tab px-4 py-2 text-sm font-semibold transition ${index === 0 ? 'active' : 'text-white/75'}"
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
      <div class="px-4 pb-3 pt-4 sm:px-5">
        <div data-hero class="event-hero">
          <div class="space-y-2 min-w-0">
            <div class="flex items-center gap-3" data-reveal>
              <div class="app-logo-frame">
                <img src="/assets/logo-app.png" alt="Logo QRCommande" class="app-logo-image" />
              </div>
              <div class="min-w-0">
                <p class="event-kicker">QRCommande</p>
              </div>
            </div>
          </div>
        </div>
        <div class="search-row" data-reveal>
          <div class="search-bar flex items-center gap-3 px-4 py-3">
            <i class="fa-solid fa-magnifying-glass text-white/70"></i>
            <input
              type="text"
              placeholder="Rechercher une boisson, un snack, un dessert..."
              class="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-sm"
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
      <div class="category-tabs px-4 pb-4 sm:px-5" data-reveal>
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
                </div>
              </div>
            </div>
            <button type="button" data-cart-clear class="hero-action ${cartCount === 0 ? 'pointer-events-none opacity-50' : ''}" data-reveal>
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
  const categoryIcon = getCategoryIcon(category);
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
        <div class="flex items-start gap-3">
          <span class="article-icon-shell">
            <i class="fa-solid ${categoryIcon}"></i>
          </span>
          <div class="min-w-0 flex-1">
            <span class="category-label">
              <i class="fa-solid ${categoryIcon} text-xs"></i>
              ${safeCategory}
            </span>
            <div class="article-title-row mt-2">
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

  return `
    <article class="cart-item" data-reveal>
      <div class="cart-item-body">
        <span class="cart-item-icon">
          <i class="fa-solid ${categoryIcon}"></i>
        </span>
        <div class="min-w-0 flex-1">
          <div class="cart-item-meta-row">
            <span class="category-label compact">
              <i class="fa-solid ${categoryIcon} text-xs"></i>
              ${safeCategory}
            </span>
            <span class="cart-quantity">x${item.quantity}</span>
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

export function renderLoader(screenRoot) {
  screenRoot.innerHTML = `
    <div class="state-screen state-screen-loader">
      <div class="state-card" data-reveal>
        <div class="loader-ring"></div>
        <span class="state-chip">Chargement live</span>
        <div class="space-y-2 text-center">
          <h2 class="state-title">Le menu de l’événement se prépare</h2>
          <p class="state-copy">Nous mettons en scène la carte pour une navigation fluide et rapide sur mobile.</p>
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

  screenRoot.innerHTML = `
    ${createCartHeaderMarkup(cartItems)}
    <div class="main-content page-surface">
      <div class="px-4 pb-8 pt-5 sm:px-5">
        ${cartItems.length
          ? `
            <section class="space-y-4">
              <div class="cart-summary" data-reveal>
                <div>
                  <p class="cart-summary-kicker">Résumé</p>
                  <h2 class="mt-1 text-base font-bold text-slate-950">${cartCount} article${cartCount > 1 ? 's' : ''} dans le panier</h2>
                </div>
                <button type="button" data-back-to-menu class="cart-secondary-btn">
                  Ajouter encore
                </button>
              </div>
              <div class="space-y-3">
                ${cartItems.map((item) => renderCartItem(item)).join('')}
              </div>
            </section>
          `
          : `
            <section class="cart-empty-state" data-reveal>
              <div class="cart-empty-icon">
                <i class="fa-solid fa-basket-shopping"></i>
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

export function bindCartActions(screenRoot, { onRemoveItem, onBackToMenu, onClearCart }) {
  if (screenRoot.__cartClickHandler) {
    screenRoot.removeEventListener('click', screenRoot.__cartClickHandler);
  }

  const cartClickHandler = (event) => {
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
    }
  };

  screenRoot.__cartClickHandler = cartClickHandler;
  screenRoot.addEventListener('click', cartClickHandler);
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
