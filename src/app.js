import './styles.css';

import { fetchArticles } from './supabaseClient.js';
import {
  bindBottomNavigation,
  bindCartActions,
  bindMenuActions,
  mountBaseLayout,
  renderCart,
  renderErrorState,
  renderInactiveState,
  renderLoader,
  renderMenu,
  showToast,
  updateBottomNavigation,
  updateCartBadge
} from './ui.js';

const CART_STORAGE_KEY = 'qrcommande-cart';

async function checkAppStatus() {
  return String(import.meta.env.VITE_APP_ACTIVE ?? 'true').toLowerCase() === 'true';
}

function sortArticles(articles) {
  return [...articles].sort((left, right) => {
    const categoryCompare = (left.category || '').localeCompare(right.category || '', 'fr');

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return (left.name || '').localeCompare(right.name || '', 'fr');
  });
}

function loadCart() {
  try {
    const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!rawCart) {
      return [];
    }

    const parsedCart = JSON.parse(rawCart);
    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .filter((item) => item && typeof item === 'object' && item.id !== undefined && item.id !== null)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name || ''),
        category: String(item.category || 'Autres'),
        quantity: Math.max(1, Number(item.quantity) || 1)
      }));
  } catch {
    return [];
  }
}

function persistCart(cartItems) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
}

function addToCart(cartItems, article) {
  const articleId = String(article.id);
  const existingItem = cartItems.find((item) => item.id === articleId);

  if (existingItem) {
    return cartItems.map((item) => item.id === articleId
      ? { ...item, quantity: item.quantity + 1 }
      : item);
  }

  return [
    ...cartItems,
    {
      id: articleId,
      name: article.name,
      category: article.category || 'Autres',
      quantity: 1
    }
  ];
}

function removeFromCart(cartItems, articleId) {
  const normalizedArticleId = String(articleId);
  return cartItems.filter((item) => item.id !== normalizedArticleId);
}

async function bootstrap() {
  const rootElement = document.querySelector('#app');
  const { appRoot, screenRoot, toastRoot } = mountBaseLayout(rootElement);
  const stopLoading = renderLoader(screenRoot);
  const state = {
    currentView: 'menu',
    articles: [],
    cart: loadCart()
  };

  function syncCartUi() {
    updateCartBadge(appRoot, state.cart);
    updateBottomNavigation(appRoot, state.currentView);
  }

  function renderCurrentView() {
    syncCartUi();

    if (state.currentView === 'cart') {
      renderCart(screenRoot, state.cart);
      bindCartActions(screenRoot, {
        onRemoveItem: (articleId) => {
          state.cart = removeFromCart(state.cart, articleId);
          persistCart(state.cart);
          renderCurrentView();
          showToast(toastRoot, 'Article supprimé du panier.', 'info');
        },
        onBackToMenu: () => {
          state.currentView = 'menu';
          renderCurrentView();
        },
        onClearCart: () => {
          if (state.cart.length === 0) {
            return;
          }

          state.cart = [];
          persistCart(state.cart);
          renderCurrentView();
          showToast(toastRoot, 'Panier vidé.', 'info');
        }
      });
      return;
    }

    renderMenu(screenRoot, state.articles);
    bindMenuActions(screenRoot, (article) => {
      state.cart = addToCart(state.cart, article);
      persistCart(state.cart);
      syncCartUi();
      showToast(toastRoot, `${article.name} ajouté au panier.`, 'success');
    });
  }

  bindBottomNavigation(appRoot, (targetView) => {
    state.currentView = targetView;
    renderCurrentView();
  });

  try {
    await new Promise((resolve) => window.setTimeout(resolve, 550));

    if (!(await checkAppStatus())) {
      stopLoading();
      renderInactiveState(screenRoot);
      return;
    }

    const articles = await fetchArticles();
    state.articles = sortArticles(articles);

    stopLoading();
    renderCurrentView();
    showToast(toastRoot, 'Le menu est prêt. Bonne dégustation.', 'info');
  } catch (error) {
    stopLoading();
    renderErrorState(screenRoot, error.message || 'Une erreur est survenue.');
    showToast(toastRoot, 'Le menu n’a pas pu être chargé.', 'error');
  }
}

bootstrap();