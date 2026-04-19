import './styles.css';

import { appConfig } from './config.js';
import { addToCart, loadCart, persistCart, removeFromCart, updateCartItemQuantity } from './cart.js';
import { createOrder, fetchArticles } from './supabaseClient.js';
import {
  bindBottomNavigation,
  bindCartActions,
  bindMenuActions,
  bindOrdersActions,
  mountBaseLayout,
  renderCart,
  renderErrorState,
  renderInactiveState,
  renderLoader,
  renderMenu,
  renderOrderConfirmation,
  renderOrders,
  showToast,
  updateBottomNavigation,
  updateCartBadge
} from './ui.js';

function sortArticles(articles) {
  return [...articles].sort((left, right) => {
    const categoryCompare = (left.category || '').localeCompare(right.category || '', 'fr');

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return (left.name || '').localeCompare(right.name || '', 'fr');
  });
}

function loadOrders() {
  try {
    const rawOrders = window.localStorage.getItem(appConfig.ordersStorageKey);
    const parsedOrders = JSON.parse(rawOrders || '[]');

    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
}

function persistOrders(orders) {
  try {
    window.localStorage.setItem(appConfig.ordersStorageKey, JSON.stringify(orders.slice(0, 10)));
  } catch {
    // Ignore storage failures to keep the orders view usable.
  }
}

async function bootstrap() {
  const rootElement = document.querySelector('#app');
  const { appRoot, screenRoot, toastRoot } = mountBaseLayout(rootElement);
  const stopLoading = renderLoader(screenRoot);
  const state = {
    currentView: 'menu',
    articles: [],
    cart: loadCart(),
    orders: loadOrders(),
    checkout: {
      isSubmitting: false,
      errorMessage: '',
      lastOrder: null
    }
  };

  function syncCartUi() {
    updateCartBadge(appRoot, state.cart);
    updateBottomNavigation(appRoot, state.currentView);
  }

  function renderCurrentView() {
    syncCartUi();

    if (state.currentView === 'cart') {
      renderCart(screenRoot, state.cart, {
        isSubmitting: state.checkout.isSubmitting,
        errorMessage: state.checkout.errorMessage
      });
      bindCartActions(screenRoot, {
        onUpdateQuantity: (articleId, action) => {
          if (state.checkout.isSubmitting) {
            return;
          }

          const currentItem = state.cart.find((item) => item.id === String(articleId));
          if (!currentItem) {
            return;
          }

          const delta = action === 'increase' ? 1 : -1;
          state.cart = updateCartItemQuantity(state.cart, articleId, currentItem.quantity + delta);
          state.checkout.errorMessage = '';
          persistCart(state.cart);
          renderCurrentView();
        },
        onRemoveItem: (articleId) => {
          if (state.checkout.isSubmitting) {
            return;
          }

          state.cart = removeFromCart(state.cart, articleId);
          state.checkout.errorMessage = '';
          persistCart(state.cart);
          renderCurrentView();
          showToast(toastRoot, 'Article supprimé du panier.', 'info');
        },
        onBackToMenu: () => {
          if (state.checkout.isSubmitting) {
            return;
          }

          state.checkout.errorMessage = '';
          state.currentView = 'menu';
          renderCurrentView();
        },
        onClearCart: () => {
          if (state.checkout.isSubmitting) {
            return;
          }

          if (state.cart.length === 0) {
            return;
          }

          state.cart = [];
          state.checkout.errorMessage = '';
          persistCart(state.cart);
          renderCurrentView();
          showToast(toastRoot, 'Panier vidé.', 'info');
        },
        onCheckout: async () => {
          if (state.checkout.isSubmitting) {
            return;
          }

          if (state.cart.length === 0) {
            state.checkout.errorMessage = 'Votre panier est vide. Ajoutez au moins un article avant de valider.';
            renderCurrentView();
            showToast(toastRoot, state.checkout.errorMessage, 'error');
            return;
          }

          state.checkout.isSubmitting = true;
          state.checkout.errorMessage = '';
          renderCurrentView();

          try {
            const order = await createOrder(state.cart);
            state.cart = [];
            state.orders = [order, ...state.orders.filter((entry) => entry.id !== order.id)].slice(0, 10);
            state.checkout.isSubmitting = false;
            state.checkout.lastOrder = order;
            state.currentView = 'confirmation';
            persistCart(state.cart);
            persistOrders(state.orders);
            renderCurrentView();
            showToast(toastRoot, 'Commande envoyée avec succès.', 'success');
          } catch (error) {
            state.checkout.isSubmitting = false;
            state.checkout.errorMessage = error.message || 'Impossible de valider la commande.';
            renderCurrentView();
            showToast(toastRoot, 'La commande n’a pas pu être envoyée.', 'error');
          }
        },
        onNewOrder: () => {
          state.checkout.errorMessage = '';
          state.checkout.lastOrder = null;
          state.currentView = 'menu';
          persistCart(state.cart);
          renderCurrentView();
        }
      });
      return;
    }

    if (state.currentView === 'confirmation') {
      renderOrderConfirmation(screenRoot, state.checkout.lastOrder);
      bindCartActions(screenRoot, {
        onRemoveItem: () => {},
        onBackToMenu: () => {
          state.currentView = 'menu';
          state.checkout.errorMessage = '';
          state.checkout.lastOrder = null;
          renderCurrentView();
        },
        onClearCart: () => {},
        onUpdateQuantity: () => {},
        onCheckout: () => {},
        onNewOrder: () => {
          state.checkout.errorMessage = '';
          state.checkout.lastOrder = null;
          state.currentView = 'menu';
          renderCurrentView();
        }
      });
      return;
    }

    if (state.currentView === 'orders') {
      renderOrders(screenRoot, state.orders);
      bindOrdersActions(screenRoot, {
        onBackToMenu: () => {
          state.currentView = 'menu';
          renderCurrentView();
        }
      });
      return;
    }

    renderMenu(screenRoot, state.articles);
    bindMenuActions(screenRoot, (article) => {
      state.cart = addToCart(state.cart, article);
      state.checkout.errorMessage = '';
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

    if (!appConfig.isAppActive) {
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