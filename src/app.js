import './styles.css';

import { appConfig } from './config.js';
import { addToCart, loadCart, persistCart, removeFromCart, updateCartItemQuantity } from './cart.js';
import { createOrder, fetchArticles, reconcileStoredOrders } from './supabaseClient.js';
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
  updateOrdersList,
  updateCartScreen,
  updateBottomNavigation,
  updateCartBadge
} from './ui.js';

function createOrdersSnapshot(orders) {
  return JSON.stringify(
    (Array.isArray(orders) ? orders : []).map((order) => ({
      id: String(order?.id || ''),
      orderNumber: String(order?.orderNumber || ''),
      tableLabel: String(order?.tableLabel || ''),
      status: String(order?.status || ''),
      statusId: String(order?.statusId || ''),
      statusCode: String(order?.statusCode || ''),
      statusLabel: String(order?.statusLabel || ''),
      createdAt: String(order?.createdAt || ''),
      items: Array.isArray(order?.items)
        ? order.items.map((item) => ({
            name: String(item?.name || ''),
            quantity: Math.max(1, Number(item?.quantity) || 1)
          }))
        : []
    }))
  );
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

function loadOrders() {
  try {
    const rawOrders = window.localStorage.getItem(appConfig.ordersStorageKey);
    const parsedOrders = JSON.parse(rawOrders || '[]');

    return Array.isArray(parsedOrders)
      ? parsedOrders.map((order) => ({
          ...order,
          statusId: order?.statusId
            ? String(order.statusId)
            : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(order?.status || ''))
              ? String(order.status)
              : '',
          statusCode: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(order?.status || ''))
            ? String(order?.statusCode || 'pending').trim() || 'pending'
            : String(order?.statusCode || order?.status || 'pending').trim() || 'pending',
          statusLabel: String(order?.statusLabel || '').trim() || 'En attente',
          status: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(order?.status || ''))
            ? String(order?.statusCode || 'pending').trim() || 'pending'
            : String(order?.statusCode || order?.status || 'pending').trim() || 'pending',
          items: Array.isArray(order?.items)
            ? order.items
                .map((item) => ({
                  name: String(item?.name || '').trim().slice(0, appConfig.maxTextLength),
                  quantity: Math.max(1, Number(item?.quantity) || 1)
                }))
                .filter((item) => item.name)
            : []
        }))
      : [];
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

function createOrderItemsSnapshot(cartItems) {
  return cartItems.map((item) => ({
    name: String(item?.name || '').trim().slice(0, appConfig.maxTextLength),
    quantity: Math.max(1, Number(item?.quantity) || 1)
  })).filter((item) => item.name);
}

async function bootstrap() {
  const ordersPollingIntervalMs = 10000;
  const rootElement = document.querySelector('#app');
  const { appRoot, screenRoot, toastRoot } = mountBaseLayout(rootElement);
  const stopLoading = renderLoader(screenRoot);
  const state = {
    currentView: 'menu',
    articles: [],
    cart: loadCart(),
    orders: loadOrders(),
    ordersSyncPromise: null,
    ordersSyncInProgress: false,
    ordersPollingTimer: null,
    checkout: {
      isSubmitting: false,
      errorMessage: '',
      tableLabel: '',
      lastOrder: null
    }
  };

  async function syncOrdersFromStorageWithDatabase() {
    if (state.ordersSyncPromise) {
      return state.ordersSyncPromise;
    }

    state.orders = loadOrders();
    const previousOrdersSnapshot = createOrdersSnapshot(state.orders);
    state.ordersSyncInProgress = true;

    state.ordersSyncPromise = (async () => {
      const syncedOrders = await reconcileStoredOrders(state.orders);
      const nextOrdersSnapshot = createOrdersSnapshot(syncedOrders);
      const hasChanged = previousOrdersSnapshot !== nextOrdersSnapshot;

      if (hasChanged) {
        state.orders = syncedOrders;
        persistOrders(state.orders);
      }

      return {
        hasChanged,
        orders: hasChanged ? syncedOrders : state.orders
      };
    })();

    try {
      return await state.ordersSyncPromise;
    } finally {
      state.ordersSyncInProgress = false;
      state.ordersSyncPromise = null;
    }
  }

  function stopOrdersPolling() {
    if (state.ordersPollingTimer !== null) {
      window.clearInterval(state.ordersPollingTimer);
      state.ordersPollingTimer = null;
    }
  }

  function startOrdersPolling() {
    if (state.ordersPollingTimer !== null) {
      return;
    }

    state.ordersPollingTimer = window.setInterval(async () => {
      if (state.currentView !== 'orders') {
        stopOrdersPolling();
        return;
      }

      try {
        const syncResult = await syncOrdersFromStorageWithDatabase();

        if (state.currentView === 'orders' && syncResult?.hasChanged) {
          updateOrdersList(screenRoot, state.orders);
        }
      } catch {
        // Keep background polling silent for the user.
      }
    }, ordersPollingIntervalMs);
  }

  function updateOrdersPolling() {
    if (state.currentView === 'orders') {
      startOrdersPolling();
      return;
    }

    stopOrdersPolling();
  }

  async function openOrdersView() {
    state.currentView = 'orders';
    renderCurrentView();

    try {
      const syncResult = await syncOrdersFromStorageWithDatabase();
      if (state.currentView === 'orders' && syncResult?.hasChanged) {
        updateOrdersList(screenRoot, state.orders);
      }
    } catch (error) {
      showToast(toastRoot, error.message || 'La synchronisation des commandes a echoue.', 'error');
    }
  }

  function syncCartUi() {
    updateCartBadge(appRoot, state.cart);
    updateBottomNavigation(appRoot, state.currentView);
  }

  function renderCurrentView() {
    syncCartUi();
    updateOrdersPolling();

    if (state.currentView === 'cart') {
      renderCart(screenRoot, state.cart, {
        isSubmitting: state.checkout.isSubmitting,
        errorMessage: state.checkout.errorMessage,
        tableLabel: state.checkout.tableLabel
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
          updateCartBadge(appRoot, state.cart);

          if (state.cart.length === 0) {
            renderCurrentView();
            return;
          }

          updateCartScreen(screenRoot, state.cart, { articleId });
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
        onTableLabelChange: (value) => {
          state.checkout.tableLabel = value;

          if (state.checkout.errorMessage) {
            state.checkout.errorMessage = '';
            renderCurrentView();
          }
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

          if (!String(state.checkout.tableLabel || '').trim()) {
            state.checkout.errorMessage = 'Renseignez votre numero de table ou un repere dans l\'evenement pour que le service vous retrouve.';
            renderCurrentView();
            showToast(toastRoot, state.checkout.errorMessage, 'error');
            return;
          }

          state.checkout.isSubmitting = true;
          state.checkout.errorMessage = '';
          renderCurrentView();

          try {
            const orderItemsSnapshot = createOrderItemsSnapshot(state.cart);
            const order = await createOrder(state.cart, state.checkout.tableLabel);
            const orderWithItems = {
              ...order,
              status: order.statusCode || order.status,
              items: orderItemsSnapshot
            };
            state.cart = [];
            state.orders = [orderWithItems, ...state.orders.filter((entry) => entry.id !== order.id)].slice(0, 10);
            state.checkout.isSubmitting = false;
            state.checkout.tableLabel = '';
            state.checkout.lastOrder = orderWithItems;
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
          state.checkout.tableLabel = '';
          state.checkout.lastOrder = null;
          state.currentView = 'menu';
          persistCart(state.cart);
          renderCurrentView();
        },
        onTrackOrder: () => {}
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
          state.checkout.tableLabel = '';
          state.checkout.lastOrder = null;
          renderCurrentView();
        },
        onClearCart: () => {},
        onUpdateQuantity: () => {},
        onCheckout: () => {},
        onNewOrder: () => {
          state.checkout.errorMessage = '';
          state.checkout.tableLabel = '';
          state.checkout.lastOrder = null;
          state.currentView = 'menu';
          renderCurrentView();
        },
        onTrackOrder: () => {
          void openOrdersView();
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
    if (targetView === 'orders') {
      void openOrdersView();
      return;
    }

    state.currentView = targetView;
    renderCurrentView();
  });

  try {
    await new Promise((resolve) => window.setTimeout(resolve, 550));

    if (!appConfig.isAppActive) {
      stopOrdersPolling();
      stopLoading();
      renderInactiveState(screenRoot);
      return;
    }

    const articles = await fetchArticles();
    state.articles = sortArticles(articles);

    if (state.orders.length) {
      try {
        await syncOrdersFromStorageWithDatabase();
      } catch {
        // Keep the app usable even if stored order synchronization fails at startup.
      }
    }

    stopLoading();
    renderCurrentView();
    showToast(toastRoot, 'Le menu est prêt. Bonne dégustation.', 'info');
  } catch (error) {
    stopOrdersPolling();
    stopLoading();
    renderErrorState(screenRoot, error.message || 'Une erreur est survenue.');
    showToast(toastRoot, 'Le menu n’a pas pu être chargé.', 'error');
  }
}

bootstrap();