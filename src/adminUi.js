import { animateAdminAccess, animateMenuEntrance } from './animations.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatOrderTime(value) {
  const date = value ? new Date(value) : new Date();

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function getOrderStatusLabel(order) {
  if (order?.statusLabel) {
    return String(order.statusLabel);
  }

  const labels = {
    pending: 'En attente',
    preparing: 'En préparation',
    served: 'Servie'
  };

  return labels[String(order?.statusCode || order?.status || '').toLowerCase()] || 'En attente';
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

function buildCategorySummary(articles) {
  return Object.entries(
    (Array.isArray(articles) ? articles : []).reduce((groups, article) => {
      const key = String(article?.category || 'Autres').trim() || 'Autres';

      if (!groups[key]) {
        groups[key] = {
          name: key,
          total: 0,
          active: 0,
          inactive: 0
        };
      }

      groups[key].total += 1;
      if (article?.is_active) {
        groups[key].active += 1;
      } else {
        groups[key].inactive += 1;
      }

      return groups;
    }, {})
  )
    .map(([, category]) => category)
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

function getDashboardMetrics(orders, articles) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeArticles = Array.isArray(articles) ? articles : [];
  const categories = buildCategorySummary(safeArticles);

  return {
    totalOrders: safeOrders.length,
    pendingOrders: safeOrders.filter((order) => getOrderStatusVariant(order) === 'pending').length,
    preparingOrders: safeOrders.filter((order) => getOrderStatusVariant(order) === 'preparing').length,
    activeArticles: safeArticles.filter((article) => article?.is_active).length,
    totalArticles: safeArticles.length,
    totalCategories: categories.length
  };
}

function getOrderStatusSummary(orders) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const total = safeOrders.length;
  const counts = safeOrders.reduce((summary, order) => {
    const key = getOrderStatusVariant(order);

    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, {
    pending: 0,
    preparing: 0,
    served: 0,
    cancelled: 0
  });

  const items = [
    { key: 'pending', label: 'En attente', count: counts.pending, color: '#d7a84f' },
    { key: 'preparing', label: 'En préparation', count: counts.preparing, color: '#b95f74' },
    { key: 'served', label: 'Servies', count: counts.served, color: '#169b62' },
    { key: 'cancelled', label: 'Annulées', count: counts.cancelled, color: '#7b7280' }
  ].map((item) => ({
    ...item,
    percent: total ? Math.round((item.count / total) * 100) : 0
  }));

  return {
    total,
    items
  };
}

function renderDashboardStatusChart(orders) {
  const summary = getOrderStatusSummary(orders);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = summary.total
    ? summary.items
      .filter((item) => item.count > 0)
      .map((item) => {
        const length = (item.count / summary.total) * circumference;
        const segment = `
          <circle
            class="admin-donut-segment"
            cx="60"
            cy="60"
            r="${radius}"
            fill="none"
            stroke="${item.color}"
            stroke-width="12"
            stroke-linecap="round"
            stroke-dasharray="${length} ${Math.max(circumference - length, 0)}"
            stroke-dashoffset="-${offset}"
          ></circle>
        `;

        offset += length;
        return segment;
      }).join('')
    : '';

  return `
    <div class="admin-chart-layout" data-admin-status-chart>
      <div class="admin-donut-shell" aria-hidden="true">
        <svg viewBox="0 0 120 120" class="admin-donut-chart">
          <circle class="admin-donut-track" cx="60" cy="60" r="${radius}" fill="none"></circle>
          <g transform="rotate(-90 60 60)">
            ${segments}
          </g>
        </svg>
        <div class="admin-donut-center">
          <strong>${summary.total}</strong>
          <span>commande${summary.total > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div class="admin-status-legend" role="list" aria-label="Répartition des statuts de commande">
        ${summary.items.map((item) => `
          <div class="admin-status-legend-item" role="listitem">
            <span class="admin-status-dot" style="background:${item.color}"></span>
            <div class="admin-status-copy">
              <strong>${item.label}</strong>
              <span>${item.count} commande${item.count > 1 ? 's' : ''} · ${item.percent}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAdminHeader(user, pageTitle, pageCopy) {
  const displayName = escapeHtml(user?.displayName || 'Administration');
  const email = escapeHtml(user?.email || '');
  const role = escapeHtml(String(user?.role || 'admin').toUpperCase());
  const avatarLabel = escapeHtml(String(user?.displayName || 'A').slice(0, 1));

  return `
    <section class="top-app-bar top-app-bar-admin" data-admin-panel>
      <div class="page-orb page-orb-left"></div>
      <div class="page-orb page-orb-right"></div>
      <div class="top-bar-inner admin-top-bar-inner px-4 py-1.5 sm:px-5">
        <div data-hero class="event-hero admin-hero-shell">
          <div class="admin-hero-main">
            <div class="admin-brand-block" data-admin-reveal>
              <div class="app-logo-frame admin-logo-frame">
                <img src="/assets/logo-app.png" alt="Logo QRCommande" class="app-logo-image" />
              </div>
              <div class="min-w-0 brand-lockup">
                <p class="event-kicker">QRCommande Admin</p>
                <p class="brand-subline">${role} connecté</p>
              </div>
            </div>
            <div class="admin-account-chip" data-admin-reveal>
              <span class="admin-account-avatar">${avatarLabel}</span>
              <div class="admin-account-copy">
                <strong>${displayName}</strong>
                <span>${email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderOrdersFeedContent(orders, options = {}) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  if (!safeOrders.length) {
    return `
      <div class="admin-empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>${escapeHtml(options.emptyMessage || 'Aucune donnée disponible.')}</p>
      </div>
    `;
  }

  return `
    <div class="admin-orders-feed">
      ${safeOrders.map((order) => `
        <article class="admin-order-card">
          <div class="admin-order-row">
            <div>
              <span class="admin-order-kicker">Commande #${escapeHtml(order?.orderNumber || '')}</span>
              <h3 class="admin-order-title">${escapeHtml(order?.tableLabel || 'Repère non renseigné')}</h3>
            </div>
            <span class="order-status-chip status-${escapeHtml(getOrderStatusVariant(order))}">${escapeHtml(getOrderStatusLabel(order))}</span>
          </div>
          <div class="admin-order-meta">
            <span>${escapeHtml(formatOrderTime(order?.createdAt))}</span>
            <span>${escapeHtml(formatDate(order?.createdAt))}</span>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderDashboardPage(data) {
  const metrics = getDashboardMetrics(data.orders, data.articles);
  const recentOrders = (Array.isArray(data.orders) ? data.orders : []).slice(0, 5);

  return `
    <section class="admin-grid-panel admin-grid-panel-dashboard">
      <article class="admin-surface-card admin-chart-card" data-admin-reveal>
        <div class="admin-surface-head">
          <div>
            <span class="admin-surface-kicker">Vue d'ensemble</span>
            <h2 class="admin-surface-title">Répartition des statuts</h2>
          </div>
        </div>
        ${renderDashboardStatusChart(data.orders)}
      </article>

      <div class="admin-stat-grid" data-admin-reveal>
        <article class="admin-stat-card accent-primary">
          <span class="admin-stat-label">Commandes</span>
          <strong class="admin-stat-value" data-admin-metric="total-orders">${metrics.totalOrders}</strong>
          <p class="admin-stat-copy">Flux total remonté depuis Supabase.</p>
        </article>
        <article class="admin-stat-card accent-amber">
          <span class="admin-stat-label">En attente</span>
          <strong class="admin-stat-value" data-admin-metric="pending-orders">${metrics.pendingOrders}</strong>
          <p class="admin-stat-copy">Demandes à prendre en charge.</p>
        </article>
        <article class="admin-stat-card accent-rose">
          <span class="admin-stat-label">En préparation</span>
          <strong class="admin-stat-value" data-admin-metric="preparing-orders">${metrics.preparingOrders}</strong>
          <p class="admin-stat-copy">Commandes en traitement côté équipe.</p>
        </article>
        <article class="admin-stat-card accent-ink">
          <span class="admin-stat-label">Catalogue</span>
          <strong class="admin-stat-value">${metrics.activeArticles}/${metrics.totalArticles}</strong>
          <p class="admin-stat-copy">Articles actifs sur ${metrics.totalCategories} catégories.</p>
        </article>
      </div>

      <div class="admin-grid-columns">
        <article class="admin-surface-card" data-admin-reveal>
          <div class="admin-surface-head">
            <div>
              <span class="admin-surface-kicker">Activité récente</span>
              <h2 class="admin-surface-title">Dernières commandes</h2>
            </div>
            <button type="button" class="cart-secondary-btn" data-admin-shortcut="admin-orders">
              <i class="fa-solid fa-receipt"></i>
              Voir tout
            </button>
          </div>
          <div data-admin-orders-region="dashboard">
            ${renderOrdersFeedContent(recentOrders, { emptyMessage: 'Aucune commande disponible pour le moment.' })}
          </div>
        </article>

        <article class="admin-surface-card" data-admin-reveal>
          <div class="admin-surface-head">
            <div>
              <span class="admin-surface-kicker">Pilotage rapide</span>
              <h2 class="admin-surface-title">Raccourcis</h2>
            </div>
          </div>
          <div class="admin-shortcuts-grid">
            <button type="button" class="admin-shortcut-card" data-admin-shortcut="admin-orders">
              <i class="fa-solid fa-receipt"></i>
              <strong>Commandes</strong>
              <span>Suivi temps réel du service</span>
            </button>
            <button type="button" class="admin-shortcut-card" data-admin-shortcut="admin-articles">
              <i class="fa-solid fa-utensils"></i>
              <strong>Articles</strong>
              <span>Catalogue disponible à la commande</span>
            </button>
            <button type="button" class="admin-shortcut-card" data-admin-shortcut="admin-categories">
              <i class="fa-solid fa-tags"></i>
              <strong>Catégories</strong>
              <span>Organisation du menu événementiel</span>
            </button>
            <button type="button" class="admin-shortcut-card" data-admin-shortcut="admin-settings">
              <i class="fa-solid fa-gear"></i>
              <strong>Paramètres</strong>
              <span>Compte connecté et réglages globaux</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderOrdersPage(data) {
  const safeOrders = Array.isArray(data.orders) ? data.orders : [];

  return `
    <section class="admin-grid-panel">
      <article class="admin-surface-card" data-admin-reveal>
        <div class="admin-surface-head">
          <div>
            <span class="admin-surface-kicker">Commandes</span>
            <h2 class="admin-surface-title">Suivi temps réel</h2>
          </div>
          <span class="section-counter" data-admin-orders-count>${safeOrders.length} commande${safeOrders.length > 1 ? 's' : ''}</span>
        </div>
        <div data-admin-orders-region="orders-page">
          ${renderOrdersFeedContent(safeOrders, { emptyMessage: 'Ajoutez une policy SELECT sur public.orders pour alimenter cette vue en production.' })}
        </div>
      </article>
    </section>
  `;
}

function renderArticlesPage(data) {
  const safeArticles = Array.isArray(data.articles) ? data.articles : [];

  return `
    <section class="admin-grid-panel">
      <article class="admin-surface-card" data-admin-reveal>
        <div class="admin-surface-head">
          <div>
            <span class="admin-surface-kicker">Catalogue</span>
            <h2 class="admin-surface-title">Articles du menu</h2>
          </div>
          <span class="section-counter">${safeArticles.length} article${safeArticles.length > 1 ? 's' : ''}</span>
        </div>
        <div class="admin-list-grid">
          ${safeArticles.map((article) => `
            <article class="admin-list-card">
              <div>
                <span class="category-label compact">${escapeHtml(article?.category || 'Autres')}</span>
                <h3 class="admin-list-title">${escapeHtml(article?.name || 'Article')}</h3>
              </div>
              <span class="admin-availability-chip ${article?.is_active ? 'is-active' : 'is-inactive'}">
                <i class="fa-solid ${article?.is_active ? 'fa-check' : 'fa-ban'}"></i>
                ${article?.is_active ? 'Disponible' : 'Indisponible'}
              </span>
            </article>
          `).join('')}
        </div>
      </article>
    </section>
  `;
}

function renderCategoriesPage(data) {
  const categories = buildCategorySummary(data.articles);

  return `
    <section class="admin-grid-panel">
      <article class="admin-surface-card" data-admin-reveal>
        <div class="admin-surface-head">
          <div>
            <span class="admin-surface-kicker">Organisation</span>
            <h2 class="admin-surface-title">Catégories d’articles</h2>
          </div>
          <span class="section-counter">${categories.length} catégorie${categories.length > 1 ? 's' : ''}</span>
        </div>
        <div class="admin-list-grid admin-list-grid-categories">
          ${categories.map((category) => `
            <article class="admin-list-card category-card">
              <div>
                <h3 class="admin-list-title">${escapeHtml(category.name)}</h3>
                <p class="admin-list-copy">${category.total} article${category.total > 1 ? 's' : ''} au total</p>
              </div>
              <div class="admin-category-metrics">
                <span class="admin-availability-chip is-active">${category.active} actifs</span>
                <span class="admin-availability-chip is-inactive">${category.inactive} inactifs</span>
              </div>
            </article>
          `).join('')}
        </div>
      </article>
    </section>
  `;
}

function renderSettingsPage(data) {
  const categories = buildCategorySummary(data.articles);

  return `
    <section class="admin-grid-panel admin-grid-columns">
      <article class="admin-surface-card" data-admin-reveal>
        <div class="admin-surface-head">
          <div>
            <span class="admin-surface-kicker">Compte connecté</span>
            <h2 class="admin-surface-title">Paramètres admin</h2>
          </div>
        </div>
        <div class="admin-settings-list">
          <div class="admin-setting-row">
            <span>Nom affiché</span>
            <strong>${escapeHtml(data.user?.displayName || 'Administration')}</strong>
          </div>
          <div class="admin-setting-row">
            <span>Email</span>
            <strong>${escapeHtml(data.user?.email || '')}</strong>
          </div>
          <div class="admin-setting-row">
            <span>Rôle</span>
            <strong>${escapeHtml(String(data.user?.role || 'admin').toUpperCase())}</strong>
          </div>
          <div class="admin-setting-row">
            <span>Dernière synchro</span>
            <strong>${escapeHtml(data.adminState?.lastSyncedAt ? `${formatOrderTime(data.adminState.lastSyncedAt)} · ${formatDate(data.adminState.lastSyncedAt)}` : 'Non synchronisé')}</strong>
          </div>
        </div>
        <button type="button" class="admin-login-button" data-admin-signout>
          <span>Se déconnecter</span>
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </article>

      <article class="admin-surface-card" data-admin-reveal>
        <div class="admin-surface-head">
          <div>
            <span class="admin-surface-kicker">Résumé événement</span>
            <h2 class="admin-surface-title">Configuration visible</h2>
          </div>
        </div>
        <div class="admin-settings-list">
          <div class="admin-setting-row">
            <span>Catégories</span>
            <strong>${categories.length}</strong>
          </div>
          <div class="admin-setting-row">
            <span>Articles publiés</span>
            <strong>${(Array.isArray(data.articles) ? data.articles : []).filter((article) => article?.is_active).length}</strong>
          </div>
          <div class="admin-setting-row">
            <span>Commandes remontées</span>
            <strong>${Array.isArray(data.orders) ? data.orders.length : 0}</strong>
          </div>
          <div class="admin-setting-row">
            <span>Mode application</span>
            <strong>SPA Vanilla JS</strong>
          </div>
        </div>
      </article>
    </section>
  `;
}

function getAdminPageDefinition(activeView) {
  const pages = {
    dashboard: {
      title: 'Dashboard',
      copy: 'Vue d’ensemble du service, des commandes récentes et du catalogue.',
      render: renderDashboardPage
    },
    'admin-orders': {
      title: 'Commandes',
      copy: 'Suivi opérationnel des commandes avec actualisation manuelle ou automatique.',
      render: renderOrdersPage
    },
    'admin-articles': {
      title: 'Articles',
      copy: 'Catalogue actuellement exposé côté public.',
      render: renderArticlesPage
    },
    'admin-categories': {
      title: 'Catégories',
      copy: 'Synthèse des regroupements d’articles utilisés dans le menu.',
      render: renderCategoriesPage
    },
    'admin-settings': {
      title: 'Paramètres',
      copy: 'Informations de session et points de contrôle globaux.',
      render: renderSettingsPage
    }
  };

  return pages[activeView] || pages.dashboard;
}

export function renderAdminPage(screenRoot, data) {
  const page = getAdminPageDefinition(data?.activeView);

  screenRoot.innerHTML = `
    <div class="main-content page-surface admin-screen admin-workspace">
      ${renderAdminHeader(data?.user, page.title, page.copy)}
      <div class="admin-content-shell px-4 pb-8 pt-2 sm:px-5">
        ${page.render(data || {})}
      </div>
    </div>
  `;

  animateAdminAccess(screenRoot);
  animateMenuEntrance(screenRoot);
}

export function bindAdminPageActions(screenRoot, { onNavigate, onRefresh, onSignOut }) {
  if (screenRoot.__adminPageClickHandler) {
    screenRoot.removeEventListener('click', screenRoot.__adminPageClickHandler);
  }

  const adminPageClickHandler = (event) => {
    const shortcutButton = event.target.closest('[data-admin-shortcut]');
    if (shortcutButton && typeof onNavigate === 'function') {
      onNavigate(shortcutButton.dataset.adminShortcut);
      return;
    }

    const signOutButton = event.target.closest('[data-admin-signout]');
    if (signOutButton && typeof onSignOut === 'function') {
      onSignOut();
    }
  };

  screenRoot.__adminPageClickHandler = adminPageClickHandler;
  screenRoot.addEventListener('click', screenRoot.__adminPageClickHandler);
}

export function updateAdminOrdersView(screenRoot, { activeView, orders, adminState }) {
  if (!screenRoot) {
    return false;
  }

  const region = screenRoot.querySelector(
    activeView === 'dashboard'
      ? '[data-admin-orders-region="dashboard"]'
      : activeView === 'admin-orders'
        ? '[data-admin-orders-region="orders-page"]'
        : ''
  );

  if (!region) {
    return false;
  }

  if (activeView === 'dashboard') {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const metrics = getDashboardMetrics(safeOrders, []);

    region.innerHTML = renderOrdersFeedContent(safeOrders.slice(0, 5), {
      emptyMessage: 'Aucune commande disponible pour le moment.'
    });

    const totalOrdersMetric = screenRoot.querySelector('[data-admin-metric="total-orders"]');
    const pendingOrdersMetric = screenRoot.querySelector('[data-admin-metric="pending-orders"]');
    const preparingOrdersMetric = screenRoot.querySelector('[data-admin-metric="preparing-orders"]');
    const statusChart = screenRoot.querySelector('[data-admin-status-chart]');

    if (totalOrdersMetric) {
      totalOrdersMetric.textContent = String(metrics.totalOrders);
    }

    if (pendingOrdersMetric) {
      pendingOrdersMetric.textContent = String(metrics.pendingOrders);
    }

    if (preparingOrdersMetric) {
      preparingOrdersMetric.textContent = String(metrics.preparingOrders);
    }

    if (statusChart) {
      statusChart.outerHTML = renderDashboardStatusChart(safeOrders);
    }
  }

  if (activeView === 'admin-orders') {
    const safeOrders = Array.isArray(orders) ? orders : [];
    region.innerHTML = renderOrdersFeedContent(safeOrders, {
      emptyMessage: 'Ajoutez une policy SELECT sur public.orders pour alimenter cette vue en production.'
    });

    const countElement = screenRoot.querySelector('[data-admin-orders-count]');
    if (countElement) {
      countElement.textContent = `${safeOrders.length} commande${safeOrders.length > 1 ? 's' : ''}`;
    }
  }

  return true;
}