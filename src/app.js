import './styles.css';

import { bindAdminPageActions, renderAdminPage, updateAdminOrdersView } from './adminUi.js';
import { login, logout, getSession, subscribeToAuthChanges } from './auth.js';
import { addToCart, loadCart, persistCart, removeFromCart, updateCartItemQuantity } from './cart.js';
import { appConfig } from './config.js';
import {
  createOrder,
  fetchAdminOrders,
  fetchArticles,
  reconcileStoredOrders
} from './supabaseClient.js';
import {
  clearAuthenticatedUser,
  getUserState,
  isAuthenticatedUser,
  setAuthenticatedUser,
  setUserCheckingState
} from './userState.js';
import {
  bindAdminLoginActions,
  bindCartActions,
  bindMenuActions,
  bindNavigationActions,
  bindOrdersActions,
  mountBaseLayout,
  renderAdminLogin,
  renderCart,
  renderErrorState,
  renderInactiveState,
  renderLoader,
  renderMenu,
  renderNavigation,
  renderOrderConfirmation,
  renderOrders,
  showToast
} from './ui.js';

const ADMIN_VIEWS = new Set(['dashboard', 'admin-orders', 'admin-articles', 'admin-categories', 'admin-settings']);
const ADMIN_LIVE_VIEWS = new Set(['dashboard', 'admin-orders']);
const PUBLIC_VIEWS = new Set(['menu', 'cart', 'orders', 'account', 'confirmation']);

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
      createdAt: String(order?.createdAt || '')
    }))
  );
}

function getCartCount(cartItems) {
  return (Array.isArray(cartItems) ? cartItems : []).reduce((total, item) => total + Number(item?.quantity || 0), 0);
}

function isAdminView(view) {
  return ADMIN_VIEWS.has(view);
}

function getPublicNavigationView(view) {
  return PUBLIC_VIEWS.has(view) ? view : 'menu';
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
    window.localStorage.setItem(appConfig.ordersStorageKey, JSON.stringify((Array.isArray(orders) ? orders : []).slice(0, 10)));
  } catch {
    // Ignore storage failures to keep the orders view usable.
  }
}

function createOrderItemsSnapshot(cartItems) {
  return (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => ({
      name: String(item?.name || '').trim().slice(0, appConfig.maxTextLength),
      quantity: Math.max(1, Number(item?.quantity) || 1)
    }))
    .filter((item) => item.name);
}

async function bootstrap() {
  const ordersPollingIntervalMs = 10000;
  const rootElement = document.querySelector('#app');
  const { navRoot, screenRoot, toastRoot } = mountBaseLayout(rootElement);
  const stopLoading = renderLoader(screenRoot);

  const state = {
    currentView: 'menu',
    articles: [],
    cart: loadCart(),
    orders: loadOrders(),
    ordersSyncPromise: null,
    ordersPollingTimer: null,
    authUnsubscribe: null,
    account: {
      email: '',
      password: '',
      errorMessage: '',
      isSubmitting: false,
      showPassword: false,
      adminProfile: null
    },
    admin: {
      orders: [],
      ordersError: '',
      isLoading: false,
      lastSyncedAt: '',
      snapshot: '[]',
      pollingTimer: null
    },
    checkout: {
      isSubmitting: false,
      errorMessage: '',
      tableLabel: '',
      lastOrder: null
    }
  };

  function updateNavigation() {
    const authState = getUserState();
    const isAuthenticated = isAuthenticatedUser(authState);

    renderNavigation(navRoot, {
      mode: isAuthenticated ? 'admin' : 'public',
      activeView: isAuthenticated ? (isAdminView(state.currentView) ? state.currentView : 'dashboard') : getPublicNavigationView(state.currentView),
      user: authState.user,
      cartCount: getCartCount(state.cart)
    });
  }

  async function syncOrdersFromStorageWithDatabase() {
    if (state.ordersSyncPromise) {
      return state.ordersSyncPromise;
    }

    state.orders = loadOrders();
    const previousOrdersSnapshot = createOrdersSnapshot(state.orders);

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
          renderCurrentView();
        }
      } catch {
        // Keep background polling silent for the user.
      }
    }, ordersPollingIntervalMs);
  }

  function stopAdminPolling() {
    if (state.admin.pollingTimer !== null) {
      window.clearInterval(state.admin.pollingTimer);
      state.admin.pollingTimer = null;
    }
  }

  async function refreshAdminOrders(options = {}) {
    const authState = getUserState();

    if (!isAuthenticatedUser(authState)) {
      state.admin.orders = [];
      state.admin.ordersError = '';
      state.admin.isLoading = false;
      state.admin.lastSyncedAt = '';
      state.admin.snapshot = '[]';
      return;
    }

    const shouldRenderLoading = !options.silent && isAdminView(state.currentView);
    const shouldPatchOnly = Boolean(options.patchOnly) && ADMIN_LIVE_VIEWS.has(state.currentView);
    state.admin.isLoading = true;

    if (shouldRenderLoading) {
      renderCurrentView();
    } else if (shouldPatchOnly) {
      updateAdminOrdersView(screenRoot, {
        activeView: state.currentView,
        orders: state.admin.orders,
        adminState: state.admin
      });
    }

    try {
      const orders = await fetchAdminOrders();
      const snapshot = createOrdersSnapshot(orders);
      const hasChanged = state.admin.snapshot !== snapshot;

      state.admin.orders = orders;
      state.admin.snapshot = snapshot;
      state.admin.ordersError = '';
      state.admin.lastSyncedAt = new Date().toISOString();
      state.admin.isLoading = false;

      if (shouldPatchOnly && isAdminView(state.currentView)) {
        updateAdminOrdersView(screenRoot, {
          activeView: state.currentView,
          orders: state.admin.orders,
          adminState: state.admin
        });
        return;
      }

      if (isAdminView(state.currentView) && (hasChanged || shouldRenderLoading || options.forceRender)) {
        renderCurrentView();
      }
    } catch (error) {
      state.admin.ordersError = error.message || 'Lecture des commandes admin impossible. Vérifiez les policies SELECT sur public.orders.';
      state.admin.isLoading = false;

      if (shouldPatchOnly && isAdminView(state.currentView)) {
        updateAdminOrdersView(screenRoot, {
          activeView: state.currentView,
          orders: state.admin.orders,
          adminState: state.admin
        });
        return;
      }

      if (isAdminView(state.currentView)) {
        renderCurrentView();
      }
    }
  }

  function startAdminPolling() {
    if (state.admin.pollingTimer !== null) {
      return;
    }

    state.admin.pollingTimer = window.setInterval(() => {
      if (!isAdminView(state.currentView) || !ADMIN_LIVE_VIEWS.has(state.currentView) || !isAuthenticatedUser(getUserState())) {
        stopAdminPolling();
        return;
      }

      void refreshAdminOrders({ silent: true, patchOnly: true });
    }, ordersPollingIntervalMs);
  }

  function updatePollingState() {
    if (state.currentView === 'orders') {
      startOrdersPolling();
    } else {
      stopOrdersPolling();
    }

    if (isAdminView(state.currentView) && ADMIN_LIVE_VIEWS.has(state.currentView) && isAuthenticatedUser(getUserState())) {
      startAdminPolling();
    } else {
      stopAdminPolling();
    }
  }

  async function openOrdersView() {
    state.currentView = 'orders';
    renderCurrentView();

    try {
      const syncResult = await syncOrdersFromStorageWithDatabase();
      if (state.currentView === 'orders' && syncResult?.hasChanged) {
        renderCurrentView();
      }
    } catch (error) {
      showToast(toastRoot, error.message || 'La synchronisation des commandes a échoué.', 'error');
    }
  }

  async function applyAuthenticatedContext(authContext, options = {}) {
    setAuthenticatedUser(authContext);
    state.account.adminProfile = authContext.user;
    state.account.email = authContext.user?.email || state.account.email;
    state.account.password = '';
    state.account.errorMessage = '';
    state.account.isSubmitting = false;

    if (!isAdminView(state.currentView) || options.forceDashboard) {
      state.currentView = 'dashboard';
    }

    renderCurrentView();
    await refreshAdminOrders({ silent: true, forceRender: true });
  }

  function applyUnauthenticatedContext() {
    clearAuthenticatedUser();
    state.account.adminProfile = null;
    state.account.password = '';
    state.account.isSubmitting = false;
    state.admin.orders = [];
    state.admin.ordersError = '';
    state.admin.isLoading = false;
    state.admin.lastSyncedAt = '';
    state.admin.snapshot = '[]';
    stopAdminPolling();

    if (isAdminView(state.currentView) || state.currentView === 'confirmation') {
      state.currentView = 'menu';
    }

    renderCurrentView();
  }

  function syncCurrentViewToAuthState() {
    const authState = getUserState();

    if (isAuthenticatedUser(authState) && !isAdminView(state.currentView)) {
      state.currentView = 'dashboard';
    }

    if (!isAuthenticatedUser(authState) && isAdminView(state.currentView)) {
      state.currentView = 'menu';
    }
  }

  function renderCurrentView() {
    syncCurrentViewToAuthState();
    updateNavigation();
    updatePollingState();

    const authState = getUserState();
    const isAuthenticated = isAuthenticatedUser(authState);

    if (isAuthenticated) {
      renderAdminPage(screenRoot, {
        activeView: state.currentView,
        user: authState.user,
        orders: state.admin.orders,
        articles: state.articles,
        adminState: state.admin
      });

      bindAdminPageActions(screenRoot, {
        onNavigate: (nextView) => {
          state.currentView = nextView;
          renderCurrentView();

          if (ADMIN_LIVE_VIEWS.has(nextView) && state.admin.orders.length === 0) {
            void refreshAdminOrders({ silent: false, forceRender: true });
          }
        },
        onRefresh: async () => {
          await refreshAdminOrders({ silent: false, forceRender: true });
          if (!state.admin.ordersError) {
            showToast(toastRoot, 'Vue admin synchronisée.', 'info');
          }
        },
        onSignOut: async () => {
          await logout();
          applyUnauthenticatedContext();
          showToast(toastRoot, 'Session admin fermée.', 'info');
        }
      });
      return;
    }

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
          if (state.checkout.isSubmitting || state.cart.length === 0) {
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
            state.checkout.errorMessage = 'Renseignez votre numéro de table ou un repère dans l\'événement pour que le service vous retrouve.';
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

    if (state.currentView === 'account') {
      renderAdminLogin(screenRoot, state.account);
      bindAdminLoginActions(screenRoot, {
        onEmailChange: (value) => {
          state.account.email = value;
          if (state.account.errorMessage) {
            state.account.errorMessage = '';
            renderCurrentView();
          }
        },
        onPasswordChange: (value) => {
          state.account.password = value;
          if (state.account.errorMessage) {
            state.account.errorMessage = '';
            renderCurrentView();
          }
        },
        onTogglePassword: () => {
          state.account.showPassword = !state.account.showPassword;
          renderCurrentView();
        },
        onSubmit: async () => {
          const email = String(state.account.email || '').trim();
          const password = String(state.account.password || '');

          if (!email || !password) {
            state.account.errorMessage = 'Renseignez vos identifiants administrateur.';
            renderCurrentView();
            return;
          }

          state.account.isSubmitting = true;
          state.account.errorMessage = '';
          renderCurrentView();

          try {
            const authContext = await login(email, password);
            await applyAuthenticatedContext(authContext, { forceDashboard: true });
            showToast(toastRoot, 'Connexion admin réussie.', 'success');
          } catch (error) {
            state.account.adminProfile = null;
            state.account.password = '';
            state.account.isSubmitting = false;
            state.account.errorMessage = error.message || 'Connexion admin impossible.';
            renderCurrentView();
          }
        }
      });
      return;
    }

    renderMenu(screenRoot, state.articles);
    bindMenuActions(screenRoot, (article) => {
      state.cart = addToCart(state.cart, article);
      state.checkout.errorMessage = '';
      persistCart(state.cart);
      updateNavigation();
      showToast(toastRoot, `${article.name} ajouté au panier.`, 'success');
    });
  }

  bindNavigationActions(navRoot, {
    onNavigate: (targetView) => {
      if (targetView === 'orders') {
        void openOrdersView();
        return;
      }

      if (targetView === 'account') {
        state.currentView = 'account';
        state.account.errorMessage = '';
        renderCurrentView();
        return;
      }

      state.currentView = targetView;
      renderCurrentView();

      if (isAdminView(targetView) && ADMIN_LIVE_VIEWS.has(targetView) && state.admin.orders.length === 0) {
        void refreshAdminOrders({ silent: false, forceRender: true });
      }
    },
    onAction: async (action) => {
      if (action !== 'logout') {
        return;
      }

      await logout();
      applyUnauthenticatedContext();
      showToast(toastRoot, 'Retour au mode public.', 'info');
    }
  });

  try {
    setUserCheckingState();
    await new Promise((resolve) => window.setTimeout(resolve, 550));

    if (!appConfig.isAppActive) {
      stopOrdersPolling();
      stopAdminPolling();
      stopLoading();
      renderInactiveState(screenRoot);
      return;
    }

    const articles = await fetchArticles();
    state.articles = sortArticles(articles);

    const authContext = await getSession();
    if (authContext.user) {
      await applyAuthenticatedContext(authContext, { forceDashboard: true });
    } else {
      applyUnauthenticatedContext();
    }

    if (state.orders.length) {
      try {
        await syncOrdersFromStorageWithDatabase();
      } catch {
        // Keep the app usable even if stored order synchronization fails at startup.
      }
    }

    if (state.authUnsubscribe) {
      state.authUnsubscribe();
    }

    state.authUnsubscribe = subscribeToAuthChanges((nextAuthContext) => {
      void (async () => {
        const previousState = getUserState();
        const wasAuthenticated = isAuthenticatedUser(previousState);

        if (nextAuthContext?.user) {
          await applyAuthenticatedContext(nextAuthContext, { forceDashboard: !wasAuthenticated });
          return;
        }

        applyUnauthenticatedContext();

        if (wasAuthenticated) {
          showToast(toastRoot, 'Déconnexion détectée. Retour au mode public.', 'info');
        }
      })();
    });

    stopLoading();
    renderCurrentView();
    showToast(toastRoot, 'Le menu est prêt. Bonne dégustation.', 'info');
  } catch (error) {
    stopOrdersPolling();
    stopAdminPolling();
    stopLoading();
    renderErrorState(screenRoot, error.message || 'Une erreur est survenue.');
    showToast(toastRoot, 'Le menu n’a pas pu être chargé.', 'error');
  }
}

bootstrap();