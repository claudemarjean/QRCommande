const adminNavigationItems = Object.freeze([
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'admin-orders', label: 'Commandes', icon: 'orders' },
  { id: 'admin-articles', label: 'Articles', icon: 'articles' },
  { id: 'admin-categories', label: 'Catégories', icon: 'categories' },
  { id: 'admin-settings', label: 'Paramètres', icon: 'settings' },
  { id: 'logout', label: 'Déconnexion', icon: 'logout', action: 'logout' }
]);

function renderAdminNavIcon(iconName) {
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.75 12A8.25 8.25 0 1 1 12 20.25 8.259 8.259 0 0 1 3.75 12m8.25-6.75a6.75 6.75 0 1 0 6.75 6.75A6.758 6.758 0 0 0 12 5.25m-.75 2.5a.75.75 0 0 1 1.5 0v4.01l2.73 1.57a.75.75 0 1 1-.75 1.3l-3.1-1.79a.75.75 0 0 1-.38-.65z"></path></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.5h8.19c.46 0 .9.18 1.22.5l2.84 2.84c.32.32.5.76.5 1.22v9.19A2.75 2.75 0 0 1 16.75 20h-10.5A2.75 2.75 0 0 1 3.5 17.25V6.25A2.75 2.75 0 0 1 6.25 3.5zm0 1.5a1.25 1.25 0 0 0-1.25 1.25v11c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V8.56L14.94 5zm1.5 5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H9A.75.75 0 0 1 8.25 10m0 3.5A.75.75 0 0 1 9 12.75h6a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75"></path></svg>',
    articles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.75 4.5h12.5A1.75 1.75 0 0 1 20 6.25v3.34a3.5 3.5 0 0 0-2.25-.84h-11.5A1.75 1.75 0 0 1 4.5 7V6.25A1.75 1.75 0 0 1 6.25 4.5m.5 5.75h11.5A2.25 2.25 0 0 1 20 12.5v3.25A3.25 3.25 0 0 1 16.75 19h-9.5A2.75 2.75 0 0 1 4.5 16.25V12a1.75 1.75 0 0 1 1.75-1.75m2 2a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5zm0 3a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5z"></path></svg>',
    categories: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.25A1.75 1.75 0 0 1 6.25 4.5h3.19c.46 0 .9.18 1.22.5l1.09 1.09c.14.14.33.22.53.22h5.47A1.75 1.75 0 0 1 19.5 8.06v8.69a2.75 2.75 0 0 1-2.75 2.75H7.25A2.75 2.75 0 0 1 4.5 16.75zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .69.56 1.25 1.25 1.25h9.5c.69 0 1.25-.56 1.25-1.25V8.06a.25.25 0 0 0-.25-.25h-5.47c-.6 0-1.17-.24-1.59-.66L9.6 6.06A.25.25 0 0 0 9.44 6z"></path></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.66 2.824a1.75 1.75 0 0 1 2.68 0l.528.648a1.75 1.75 0 0 0 1.875.557l.801-.273a1.75 1.75 0 0 1 2.192 1.544l.064.833a1.75 1.75 0 0 0 1.319 1.442l.813.192a1.75 1.75 0 0 1 .828 2.548l-.435.713a1.75 1.75 0 0 0 0 1.822l.435.713a1.75 1.75 0 0 1-.828 2.548l-.813.192a1.75 1.75 0 0 0-1.319 1.442l-.064.833a1.75 1.75 0 0 1-2.192 1.544l-.8-.273a1.75 1.75 0 0 0-1.876.557l-.528.648a1.75 1.75 0 0 1-2.68 0l-.528-.648a1.75 1.75 0 0 0-1.875-.557l-.801.273a1.75 1.75 0 0 1-2.192-1.544l-.064-.833a1.75 1.75 0 0 0-1.319-1.442l-.813-.192a1.75 1.75 0 0 1-.828-2.548l.435-.713a1.75 1.75 0 0 0 0-1.822l-.435-.713a1.75 1.75 0 0 1 .828-2.548l.813-.192a1.75 1.75 0 0 0 1.319-1.442l.064-.833a1.75 1.75 0 0 1 2.192-1.544l.8.273a1.75 1.75 0 0 0 1.876-.557zm1.52 1.596a.25.25 0 0 0-.383 0l-.528.648a3.25 3.25 0 0 1-3.483 1.035l-.801-.273a.25.25 0 0 0-.313.22l-.064.833a3.25 3.25 0 0 1-2.45 2.68l-.813.192a.25.25 0 0 0-.118.364l.435.713a3.25 3.25 0 0 1 0 3.384l-.435.713a.25.25 0 0 0 .118.364l.813.192a3.25 3.25 0 0 1 2.45 2.68l.064.833a.25.25 0 0 0 .313.22l.8-.273a3.25 3.25 0 0 1 3.484 1.035l.528.648a.25.25 0 0 0 .383 0l.528-.648a3.25 3.25 0 0 1 3.483-1.035l.801.273a.25.25 0 0 0 .313-.22l.064-.833a3.25 3.25 0 0 1 2.45-2.68l.813-.192a.25.25 0 0 0 .118-.364l-.435-.713a3.25 3.25 0 0 1 0-3.384l.435-.713a.25.25 0 0 0-.118-.364l-.813-.192a3.25 3.25 0 0 1-2.45-2.68l-.064-.833a.25.25 0 0 0-.313-.22l-.8.273a3.25 3.25 0 0 1-3.484-1.035z"></path><path d="M12 8.25A3.75 3.75 0 1 0 15.75 12 3.754 3.754 0 0 0 12 8.25m0 1.5A2.25 2.25 0 1 1 9.75 12 2.253 2.253 0 0 1 12 9.75"></path></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.75 3.5A2.75 2.75 0 0 1 18.5 6.25v11.5a2.75 2.75 0 0 1-2.75 2.75h-6.5a2.75 2.75 0 0 1-2.75-2.75v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V6.25c0-.69-.56-1.25-1.25-1.25h-6.5C8.56 5 8 5.56 8 6.25v2.5a.75.75 0 0 1-1.5 0v-2.5A2.75 2.75 0 0 1 9.25 3.5z"></path><path d="M13.47 8.47a.75.75 0 0 1 1.06 0l2.75 2.75a.75.75 0 0 1 0 1.06l-2.75 2.75a.75.75 0 0 1-1.06-1.06l1.47-1.47H4.75a.75.75 0 0 1 0-1.5h10.19l-1.47-1.47a.75.75 0 0 1 0-1.06"></path></svg>'
  };

  return icons[iconName] || '';
}

export function MenuAdmin({ activeView = 'dashboard' } = {}) {
  return `
    <nav class="bottom-nav bottom-nav-admin" aria-label="Navigation admin">
      <div class="bottom-nav-shell bottom-nav-shell-admin" role="list">
        ${adminNavigationItems.map((item) => {
          const isAction = item.action === 'logout';
          const isActive = item.id === activeView;

          return `
            <button
              type="button"
              data-${isAction ? 'nav-action' : 'nav-target'}="${item.id}"
              class="admin-tab ${isActive ? 'active' : ''} ${isAction ? 'admin-tab-logout' : ''}"
              ${isAction ? 'aria-label="Se déconnecter"' : `aria-current="${isActive ? 'page' : 'false'}"`}
            >
              <span class="admin-tab-icon-shell">
                ${renderAdminNavIcon(item.icon)}
              </span>
              <span class="admin-tab-label">${item.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;
}

export { adminNavigationItems };