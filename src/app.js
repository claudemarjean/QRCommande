import './styles.css';

import { appConfig } from './config.js';
import { addToCart, loadCart, persistCart, removeFromCart, updateCartItemQuantity } from './cart.js';
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

function sortArticles(articles) {
  return [...articles].sort((left, right) => {
    const categoryCompare = (left.category || '').localeCompare(right.category || '', 'fr');

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return (left.name || '').localeCompare(right.name || '', 'fr');
  });
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
        onUpdateQuantity: (articleId, action) => {
          const currentItem = state.cart.find((item) => item.id === String(articleId));
          if (!currentItem) {
            return;
          }

          const delta = action === 'increase' ? 1 : -1;
          state.cart = updateCartItemQuantity(state.cart, articleId, currentItem.quantity + delta);
          persistCart(state.cart);
          renderCurrentView();
        },
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
        },
        onCheckout: () => {
          showToast(toastRoot, 'La prise de commande arrive bientôt.', 'info');
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