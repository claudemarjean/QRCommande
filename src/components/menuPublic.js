const publicNavigationItems = Object.freeze([
  { id: 'menu', label: 'Menu', icon: 'menu' },
  { id: 'cart', label: 'Panier', icon: 'cart', badge: 'cart' },
  { id: 'orders', label: 'Commandes', icon: 'orders' },
  { id: 'account', label: 'Admin', icon: 'account' }
]);

function renderPublicNavIcon(iconName) {
  const icons = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.75A2.75 2.75 0 0 1 6.75 5h10.5A2.75 2.75 0 0 1 20 7.75v8.5A2.75 2.75 0 0 1 17.25 19H6.75A2.75 2.75 0 0 1 4 16.25zm3.25-1.25a.75.75 0 0 0-.75.75v1h11v-1a.75.75 0 0 0-.75-.75zm10.25 3.25h-11v6.5c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75z"></path></svg>',
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.25A.75.75 0 0 1 4.25 4.5h1.14c.76 0 1.42.52 1.6 1.26l.12.49h11.48a1.75 1.75 0 0 1 1.7 2.16l-1.03 4.37a2.75 2.75 0 0 1-2.67 2.12H9.57a2.75 2.75 0 0 1-2.67-2.12L5.56 7.5h-.17l-.57-2.27a.25.25 0 0 0-.24-.19h-.33a.75.75 0 0 1-.75-.75m4.86 2.5 1 4.24c.08.35.39.6.75.6h7.02c.35 0 .66-.24.74-.58l1.03-4.26zM10 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m8 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"></path></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.5h8.19c.46 0 .9.18 1.22.5l2.84 2.84c.32.32.5.76.5 1.22v9.19A2.75 2.75 0 0 1 16.75 20h-10.5A2.75 2.75 0 0 1 3.5 17.25V6.25A2.75 2.75 0 0 1 6.25 3.5zm0 1.5a1.25 1.25 0 0 0-1.25 1.25v11c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V8.56L14.94 5zm1.5 5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H9A.75.75 0 0 1 8.25 10m0 3.5A.75.75 0 0 1 9 12.75h6a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75"></path></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5M9.75 8.25a2.25 2.25 0 1 0 4.5 0 2.25 2.25 0 0 0-4.5 0M6 18a4.5 4.5 0 1 1 9 0 .75.75 0 0 0 1.5 0 6 6 0 0 0-12 0 .75.75 0 0 0 1.5 0"></path></svg>'
  };

  return icons[iconName] || '';
}

function renderBadge(item, counts) {
  if (item.badge !== 'cart') {
    return '';
  }

  const count = Math.max(0, Number(counts?.cartCount) || 0);

  return `<span data-cart-badge ${count === 0 ? 'hidden' : ''} class="cart-badge">${count}</span>`;
}

export function MenuPublic({ activeView = 'menu', counts = {} } = {}) {
  return `
    <nav class="bottom-nav bottom-nav-public" aria-label="Navigation publique">
      <div class="bottom-nav-shell flex items-center justify-around py-2">
        ${publicNavigationItems.map((item) => `
          <button
            type="button"
            data-nav-target="${item.id}"
            class="bottom-nav-item ${item.id === activeView ? 'active' : 'text-slate-500'} flex flex-col items-center gap-1 px-4 py-2"
            aria-current="${item.id === activeView ? 'page' : 'false'}"
          >
            ${renderBadge(item, counts)}
            <span class="bottom-nav-icon-shell">
              ${renderPublicNavIcon(item.icon)}
            </span>
            <span class="bottom-nav-label text-xs font-semibold">${item.label}</span>
          </button>
        `).join('')}
      </div>
    </nav>
  `;
}

export { publicNavigationItems };