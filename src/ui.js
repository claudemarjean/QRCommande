import { animateLoader, animateMenuEntrance, animateToast, stopLoader } from './animations.js';

function createAppContainer() {
  const container = document.createElement('div');
  container.className = 'app-shell relative isolate';
  container.innerHTML = `
    <div class="pointer-events-none absolute inset-0 bg-hero-glow"></div>
    <div id="toast-root" class="toast-stack fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"></div>
    <main id="screen-root" class="relative mx-auto min-h-screen max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8"></main>
  `;

  return container;
}

function createHeaderMarkup(categories) {
  const chips = categories.map((category) => `
    <a
      href="#category-${slugify(category)}"
      class="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/75 transition hover:border-gold hover:text-ink"
    >${category}</a>
  `).join('');

  return `
    <section data-hero class="grid gap-6 pb-8 pt-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10 lg:pb-12">
      <div class="space-y-5">
        <p class="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-wine shadow-soft">
          <i class="fa-solid fa-wine-glass"></i>
          Experience QRCommande
        </p>
        <div class="space-y-4">
          <h1 class="font-display text-5xl font-semibold leading-none text-ink sm:text-6xl lg:text-7xl">
            Un menu digital pensé pour les événements haut de gamme.
          </h1>
          <p class="max-w-2xl text-sm leading-7 text-ink/70 sm:text-base">
            Découvrez la sélection du moment, catégorie par catégorie, puis ajoutez vos envies en quelques secondes depuis votre téléphone.
          </p>
        </div>
      </div>
      <div class="glass-panel rounded-[2rem] border border-white/60 p-6 shadow-soft sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-wine/80">Événement en direct</p>
            <p class="mt-3 font-display text-3xl font-semibold text-ink">Service fluide, interface instantanée</p>
          </div>
          <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pine text-lg text-white">
            <i class="fa-solid fa-qrcode"></i>
          </span>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          ${chips}
        </div>
      </div>
    </section>
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
      class="article-card rounded-[1.75rem] border px-5 py-5 shadow-soft transition duration-300 ${
        isAvailable
          ? 'border-white/70 bg-white/80 hover:-translate-y-1 hover:border-gold/50'
          : 'article-card--disabled border-black/5 bg-black/5 opacity-70'
      }"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-2">
          <p class="font-display text-3xl font-semibold text-ink">${article.name}</p>
          <p class="inline-flex items-center gap-2 text-sm font-medium text-ink/60">
            <i class="fa-solid fa-tag text-gold"></i>
            ${article.category}
          </p>
        </div>
        <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
          isAvailable
            ? 'bg-pine/10 text-pine'
            : 'bg-black/10 text-ink/55'
        }">
          ${isAvailable ? 'Disponible' : 'Indisponible'}
        </span>
      </div>
      <div class="mt-6 flex items-center justify-between gap-4">
        <p class="text-sm leading-6 text-ink/60">
          ${isAvailable
            ? 'Ajoutez cet article à votre sélection en un geste.'
            : 'Cet article n’est pas proposé pour le moment.'}
        </p>
        <button
          type="button"
          class="rounded-full px-4 py-2 text-sm font-semibold transition ${
            isAvailable
              ? 'bg-ink text-white hover:bg-wine'
              : 'cursor-not-allowed bg-black/10 text-ink/40'
          }"
          ${isAvailable ? '' : 'disabled'}
          data-add-button
          data-article-name="${article.name}"
        >
          <i class="fa-solid fa-plus mr-2"></i>
          Ajouter
        </button>
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
    <section class="flex min-h-screen flex-col items-center justify-center gap-8 text-center">
      <div class="glass-panel rounded-[2rem] border border-white/70 px-10 py-12 shadow-soft">
        <div class="mx-auto loader-ring"></div>
        <div class="mt-6 space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.4em] text-wine/75">Chargement du menu</p>
          <h2 class="font-display text-4xl font-semibold text-ink">Préparation de l’expérience</h2>
          <p class="max-w-md text-sm leading-7 text-ink/65">
            Nous synchronisons la carte des articles et l’état de l’événement.
          </p>
        </div>
      </div>
    </section>
  `;

  const loader = screenRoot.querySelector('.loader-ring');
  animateLoader(loader);
  return () => stopLoader(loader);
}

export function renderInactiveState(screenRoot) {
  screenRoot.innerHTML = `
    <section class="flex min-h-screen items-center justify-center">
      <div class="glass-panel w-full max-w-2xl rounded-[2rem] border border-white/80 px-8 py-14 text-center shadow-soft sm:px-12">
        <span class="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-wine text-2xl text-white shadow-soft">
          <i class="fa-regular fa-clock"></i>
        </span>
        <p class="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-wine/75">QRCommande</p>
        <h1 class="mt-4 font-display text-5xl font-semibold text-ink sm:text-6xl">L’événement n’est pas encore actif</h1>
        <p class="mx-auto mt-5 max-w-lg text-sm leading-7 text-ink/65 sm:text-base">
          Revenez dans quelques instants. Le service sera disponible dès l’ouverture officielle de l’événement.
        </p>
      </div>
    </section>
  `;
}

export function renderErrorState(screenRoot, message) {
  screenRoot.innerHTML = `
    <section class="flex min-h-screen items-center justify-center">
      <div class="glass-panel w-full max-w-2xl rounded-[2rem] border border-white/80 px-8 py-14 text-center shadow-soft sm:px-12">
        <span class="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-ink text-2xl text-white shadow-soft">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </span>
        <h1 class="mt-8 font-display text-5xl font-semibold text-ink sm:text-6xl">Chargement indisponible</h1>
        <p class="mx-auto mt-5 max-w-lg text-sm leading-7 text-ink/65 sm:text-base">${message}</p>
      </div>
    </section>
  `;
}

export function renderMenu(screenRoot, articles) {
  const categoriesMap = groupArticlesByCategory(articles);
  const categories = Object.keys(categoriesMap).sort((left, right) => left.localeCompare(right, 'fr'));

  screenRoot.innerHTML = `
    ${createHeaderMarkup(categories)}
    <section class="space-y-8 pb-10">
      ${categories.map((category) => `
        <section
          id="category-${slugify(category)}"
          data-category-block
          class="category-anchor space-y-5"
        >
          <div class="flex items-end justify-between gap-4 border-b border-ink/10 pb-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-wine/70">Catégorie</p>
              <h2 class="mt-2 font-display text-4xl font-semibold text-ink">${category}</h2>
            </div>
            <p class="text-sm text-ink/55">${categoriesMap[category].length} article${categoriesMap[category].length > 1 ? 's' : ''}</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            ${categoriesMap[category].map((article) => renderArticleCard(article)).join('')}
          </div>
        </section>
      `).join('')}
    </section>
  `;

  animateMenuEntrance(screenRoot);
}

export function bindAddToasts(screenRoot, toastRoot) {
  screenRoot.querySelectorAll('[data-add-button]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast(toastRoot, `${button.dataset.articleName} ajouté à votre sélection.`, 'success');
    });
  });
}

export function showToast(toastRoot, message, variant = 'info') {
  const styles = {
    success: 'border-pine/20 bg-pine text-white',
    info: 'border-wine/20 bg-ink text-white',
    error: 'border-wine/20 bg-wine text-white'
  };

  const toast = document.createElement('div');
  toast.className = `toast animate__animated animate__fadeInRight rounded-2xl border px-4 py-4 shadow-soft ${styles[variant] || styles.info}`;
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm">
        <i class="fa-solid ${variant === 'success' ? 'fa-check' : variant === 'error' ? 'fa-xmark' : 'fa-bell'}"></i>
      </span>
      <div>
        <p class="text-sm font-semibold">QRCommande</p>
        <p class="mt-1 text-sm text-white/85">${message}</p>
      </div>
    </div>
  `;

  toastRoot.appendChild(toast);
  animateToast(toast);

  window.setTimeout(() => {
    toast.classList.remove('animate__fadeInRight');
    toast.classList.add('animate__fadeOutRight');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2800);
}