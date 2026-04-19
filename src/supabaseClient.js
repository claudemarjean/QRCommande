import { createClient } from '@supabase/supabase-js';
import { appConfig } from './config.js';

const demoArticles = [
  { id: 1, name: 'Champagne Signature', category: 'Cocktails', is_active: true },
  { id: 2, name: 'Negroni Saphir', category: 'Cocktails', is_active: true },
  { id: 3, name: 'Eau infusée agrumes', category: 'Softs', is_active: true },
  { id: 4, name: 'Jus de fruits pressés', category: 'Softs', is_active: false },
  { id: 5, name: 'Mini tarte truffe', category: 'Bouchées', is_active: true },
  { id: 6, name: 'Macaron ivoire', category: 'Desserts', is_active: false }
];

export const supabase = appConfig.supabaseUrl && appConfig.supabaseAnonKey
  ? createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: appConfig.adminAuthStorageKey
      },
      global: {
        headers: {
          'X-Client-Info': 'qrcommande-web'
        }
      }
    })
  : null;

let cachedActiveOrderStatuses = null;

const fallbackPendingStatus = Object.freeze({
  id: appConfig.defaultOrderPendingStatusId,
  code: appConfig.defaultOrderPendingStatusCode,
  label: appConfig.defaultOrderPendingStatusLabel
});

function normalizeAdminRole(value) {
  return String(value || 'admin')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizeAdminProfile(record, user) {
  const email = normalizeLabel(record?.email || user?.email || '', '');

  return {
    userId: String(record?.user_id || user?.id || ''),
    email,
    displayName: normalizeLabel(record?.display_name, email || 'Administrateur'),
    role: normalizeAdminRole(record?.role),
    isActive: Boolean(record?.is_active ?? true)
  };
}

function isAdminDirectoryMissingError(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || /admin_users/i.test(message) && /does not exist|relation/i.test(message);
}

function formatAdminDirectoryError(error) {
  if (isAdminDirectoryMissingError(error)) {
    return new Error('Configuration admin incomplète. Créez la table public.admin_users et ses policies avant d’utiliser la connexion admin.');
  }

  if (isRowLevelSecurityError(error)) {
    return new Error('Lecture admin bloquée par Supabase (RLS). Vérifiez les policies SELECT sur public.admin_users.');
  }

  return new Error(error?.message || 'Impossible de vérifier les droits administrateur.');
}

function formatAdminAuthError(error) {
  const message = String(error?.message || '');

  if (/invalid login credentials|email not confirmed|invalid_credentials/i.test(message)) {
    return new Error('Identifiants invalides ou accès refusé.');
  }

  if (/Email logins are disabled/i.test(message)) {
    return new Error('La connexion email/mot de passe est désactivée dans Supabase Auth.');
  }

  return new Error('Connexion admin impossible pour le moment.');
}

async function fetchOwnAdminProfile(userId) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, display_name, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw formatAdminDirectoryError(error);
  }

  return data || null;
}

async function resolveAdminContext(session, { signOutOnFailure = false } = {}) {
  if (!session?.user || !supabase) {
    return { session: null, admin: null };
  }

  const adminRecord = await fetchOwnAdminProfile(session.user.id);

  if (!adminRecord || adminRecord.is_active === false) {
    if (signOutOnFailure) {
      await supabase.auth.signOut();
    }

    return { session: null, admin: null };
  }

  return {
    session,
    admin: normalizeAdminProfile(adminRecord, session.user)
  };
}

export async function restoreAdminSession() {
  if (!supabase) {
    return { session: null, admin: null };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error('Impossible de restaurer la session administrateur.');
  }

  if (!data?.session) {
    return { session: null, admin: null };
  }

  return resolveAdminContext(data.session, { signOutOnFailure: true });
}

export async function signInAdmin(email, password) {
  if (!supabase) {
    throw new Error('Erreur de configuration E_CFG_003. Contactez l\'administrateur.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: String(password || '')
  });

  if (error) {
    throw formatAdminAuthError(error);
  }

  const adminContext = await resolveAdminContext(data?.session || null, { signOutOnFailure: true });

  if (!adminContext.admin) {
    throw new Error('Accès refusé. Cet espace est réservé aux administrateurs.');
  }

  return adminContext;
}

export async function signOutAdmin() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

function normalizeText(value, fallback = 'Autres') {
  const normalizedValue = String(value ?? fallback)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, appConfig.maxTextLength);

  return normalizedValue || fallback;
}

function normalizeLabel(value, fallback = '') {
  const normalizedValue = String(value ?? fallback)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, appConfig.maxTextLength);

  return normalizedValue || fallback;
}

function normalizeStatusCode(value, fallback = 'pending') {
  return normalizeText(value, fallback)
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function getLegacyOrderStatusLabel(code) {
  const labels = {
    pending: 'En attente',
    preparing: 'En preparation',
    served: 'Servie'
  };

  return labels[normalizeStatusCode(code, 'pending')] || 'En attente';
}

function normalizeStatusRecord(record) {
  if (!record || typeof record !== 'object') {
    return {
      id: '',
      code: 'pending',
      label: 'En attente'
    };
  }

  const code = normalizeStatusCode(record.code || '', 'pending');

  return {
    id: record.id ? String(record.id) : '',
    code,
    label: normalizeLabel(record.label, getLegacyOrderStatusLabel(code))
  };
}

function getFallbackPendingStatus() {
  return {
    id: String(fallbackPendingStatus.id || ''),
    code: normalizeStatusCode(fallbackPendingStatus.code, 'pending'),
    label: normalizeLabel(fallbackPendingStatus.label, 'En attente')
  };
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function normalizeArticle(record) {
  if (!record || typeof record !== 'object' || record.id === undefined || record.id === null) {
    return null;
  }

  return {
    id: String(record.id),
    name: normalizeText(record.name, 'Article'),
    category: normalizeText(record.category, 'Autres'),
    is_active: Boolean(record.is_active)
  };
}

export async function fetchArticles() {
  if (!supabase) {
    if (appConfig.useDemoData) {
      return demoArticles.map(normalizeArticle).filter(Boolean);
    }

    // Note dev : si cette erreur survient hors mode demo, verifiez VITE_SUPABASE_URL
    // et VITE_SUPABASE_ANON_KEY dans la configuration d'environnement locale/deploiement.
    throw new Error('Erreur de configuration E_CFG_001. Contactez l\'administrateur.');
  }

  const { data, error } = await supabase
    .from('articles')
    .select('id, name, category, is_active')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Impossible de récupérer les articles.');
  }

  return Array.isArray(data)
    ? data.map(normalizeArticle).filter(Boolean)
    : [];
}

function getOrderStatusId(record) {
  if (record?.statusId) {
    return String(record.statusId);
  }

  if (isUuidLike(record?.status)) {
    return String(record.status);
  }

  return '';
}

function getOrderNumber(record) {
  const orderNumber = record?.orderNumber ?? record?.order_number ?? '';
  return String(orderNumber || '').trim();
}

function normalizeOrderRecord(record, fallbackDate, options = {}) {
  const createdAt = record?.created_at || fallbackDate;
  const statusLookup = options?.statusById instanceof Map ? options.statusById : new Map();
  const statusId = getOrderStatusId(record);
  const lookupStatus = statusLookup.get(statusId) || null;
  const legacyStatusCode = typeof record?.status === 'string' && !isUuidLike(record.status)
    ? normalizeStatusCode(record.status, 'pending')
    : normalizeStatusCode(record?.statusCode || '', 'pending');
  const statusRecord = lookupStatus
    ? normalizeStatusRecord(lookupStatus)
    : {
        id: statusId,
        code: legacyStatusCode,
        label: normalizeLabel(record?.statusLabel, getLegacyOrderStatusLabel(legacyStatusCode))
      };

  return {
    id: record?.id ?? null,
    orderNumber: String(record?.order_number || ''),
    tableLabel: normalizeText(record?.table_label, ''),
    status: statusRecord.code,
    statusId: statusRecord.id,
    statusCode: statusRecord.code,
    statusLabel: statusRecord.label,
    createdAt
  };
}

function normalizeOrderItemsSnapshot(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      name: normalizeText(item?.name, '').slice(0, appConfig.maxTextLength),
      quantity: Math.max(1, Number(item?.quantity) || 1)
    }))
    .filter((item) => item.name);
}

function normalizeStoredOrder(record) {
  const normalizedOrder = normalizeOrderRecord(record, record?.createdAt || new Date().toISOString());

  return {
    ...normalizedOrder,
    orderNumber: getOrderNumber(record) || normalizedOrder.orderNumber,
    items: normalizeOrderItemsSnapshot(record?.items)
  };
}

async function fetchActiveOrderStatuses() {
  if (cachedActiveOrderStatuses) {
    return cachedActiveOrderStatuses;
  }

  const { data, error } = await supabase
    .from('order_statuses')
    .select('id, code, label, is_active, position, created_at')
    .eq('is_active', true)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  cachedActiveOrderStatuses = Array.isArray(data)
    ? data.map(normalizeStatusRecord).filter((status) => status.id)
    : [];

  return cachedActiveOrderStatuses;
}

async function resolveInitialOrderStatus() {
  const fallbackStatus = getFallbackPendingStatus();
  const statuses = await fetchActiveOrderStatuses();

  if (!statuses.length) {
    if (fallbackStatus.id) {
      return fallbackStatus;
    }

    throw new Error('Aucun statut exploitable disponible pour initialiser la commande. Configurez le statut pending dans order_statuses ou VITE_DEFAULT_ORDER_PENDING_STATUS_ID.');
  }

  return statuses.find((status) => status.code === fallbackStatus.code)
    || statuses[0]
    || fallbackStatus;
}

function isMissingColumnError(error, columnName) {
  return Boolean(error?.message) && new RegExp(`\\b${columnName}\\b`, 'i').test(error.message);
}

function isRowLevelSecurityError(error) {
  return /row-level security policy/i.test(error?.message || '');
}

function isDuplicateOrderNumberError(error) {
  const message = String(error?.message || '');
  return error?.code === '23505' && /order_number/i.test(message)
    || /duplicate key value violates unique constraint/i.test(message) && /order_number/i.test(message);
}

function formatSupabaseWriteError(error) {
  if (isRowLevelSecurityError(error)) {
    return new Error('Insertion bloquée par Supabase (RLS) sur les commandes. Ajoutez une policy INSERT pour les roles anon/authenticated sur orders et order_items.');
  }

  if (isDuplicateOrderNumberError(error)) {
    return new Error('Le numero de commande genere existe deja. Activez une contrainte UNIQUE sur orders.order_number et une generation serveur, puis reessayez.');
  }

  return new Error(error?.message || 'Impossible de créer la commande.');
}

async function insertOrderRecordAttempt(tableLabel, statusId, selectColumns) {
  return supabase
    .from('orders')
    .insert({
      status: statusId,
      table_label: tableLabel
    })
    .select(selectColumns)
    .single();
}

async function insertOrderRecord(tableLabel) {
  const normalizedTableLabel = normalizeText(tableLabel, '');
  const initialStatus = await resolveInitialOrderStatus();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response = await insertOrderRecordAttempt(
      normalizedTableLabel,
      initialStatus.id,
      'id, order_number, table_label, created_at, status, status_details:status(id, code, label)'
    );

    if (response.error && isMissingColumnError(response.error, 'created_at')) {
      response = await insertOrderRecordAttempt(
        normalizedTableLabel,
        initialStatus.id,
        'id, order_number, table_label, status, status_details:status(id, code, label)'
      );
    }

    if (!response.error) {
      if (response.data?.order_number === undefined || response.data?.order_number === null || response.data?.order_number === '') {
        throw new Error('La base n\'a pas retourne de numero de commande. Configurez une generation automatique sur orders.order_number.');
      }

      return response.data;
    }

    if (!isDuplicateOrderNumberError(response.error)) {
      throw formatSupabaseWriteError(response.error);
    }
  }

  throw new Error('Impossible de garantir un numero de commande unique apres plusieurs tentatives. Verifiez la contrainte UNIQUE sur orders.order_number.');
}

async function fetchOrdersByIds(orderIds) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, table_label, created_at, status')
    .in('id', orderIds);

  if (error) {
    throw new Error(error.message || 'Impossible de synchroniser les commandes.');
  }

  return Array.isArray(data) ? data : [];
}

async function fetchOrdersByOrderNumbers(orderNumbers) {
  if (!orderNumbers.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, table_label, created_at, status')
    .in('order_number', orderNumbers);

  if (error) {
    throw new Error(error.message || 'Impossible de synchroniser les commandes par numero.');
  }

  return Array.isArray(data) ? data : [];
}

async function fetchOrderStatusesByIds(statusIds) {
  if (!statusIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('order_statuses')
    .select('id, code, label')
    .in('id', statusIds);

  if (error) {
    throw new Error(error.message || 'Impossible de synchroniser les statuts des commandes.');
  }

  return new Map(
    (Array.isArray(data) ? data : [])
      .map((status) => normalizeStatusRecord(status))
      .filter((status) => status.id)
      .map((status) => [status.id, status])
  );
}

async function buildStatusLookup(statusIds) {
  const directStatuses = await fetchOrderStatusesByIds(statusIds);

  if (directStatuses.size === statusIds.length) {
    return directStatuses;
  }

  const activeStatuses = await fetchActiveOrderStatuses();
  const mergedStatuses = new Map(directStatuses);

  activeStatuses.forEach((status) => {
    if (!mergedStatuses.has(status.id)) {
      mergedStatuses.set(status.id, status);
    }
  });

  return mergedStatuses;
}

function findMissingStatusIds(statusIds, statusById) {
  return statusIds.filter((statusId) => statusId && !statusById.has(statusId));
}

async function fetchOrderItemsByOrderIds(orderIds) {
  const { data, error } = await supabase
    .from('order_items')
    .select('order_id, article_id, quantity')
    .in('order_id', orderIds);

  if (error) {
    throw new Error(error.message || 'Impossible de synchroniser les articles des commandes.');
  }

  return Array.isArray(data) ? data : [];
}

async function fetchArticleNamesByIds(articleIds) {
  if (!articleIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('articles')
    .select('id, name')
    .in('id', articleIds);

  if (error) {
    throw new Error(error.message || 'Impossible de synchroniser les noms des articles.');
  }

  return new Map(
    (Array.isArray(data) ? data : [])
      .filter((record) => record?.id !== undefined && record?.id !== null)
      .map((record) => [String(record.id), normalizeText(record.name, 'Article')])
  );
}

async function buildOrderItemsSnapshot(orderIds) {
  const orderItems = await fetchOrderItemsByOrderIds(orderIds);
  const articleIds = [...new Set(orderItems
    .map((item) => item?.article_id)
    .filter((articleId) => articleId !== undefined && articleId !== null)
    .map((articleId) => String(articleId)))];
  const articleNamesById = await fetchArticleNamesByIds(articleIds);
  const itemsByOrderId = new Map();

  orderItems.forEach((item) => {
    const orderId = String(item?.order_id || '');
    if (!orderId) {
      return;
    }

    const currentItems = itemsByOrderId.get(orderId) || [];
    const articleId = String(item?.article_id || '');
    const articleName = articleNamesById.get(articleId);

    if (!articleName) {
      return;
    }

    currentItems.push({
      name: articleName,
      quantity: Math.max(1, Number(item?.quantity) || 1)
    });

    itemsByOrderId.set(orderId, currentItems);
  });

  return itemsByOrderId;
}

export async function reconcileStoredOrders(storedOrders) {
  const normalizedOrders = Array.isArray(storedOrders)
    ? storedOrders.map(normalizeStoredOrder).filter((order) => order.orderNumber || order.id)
    : [];

  if (!normalizedOrders.length || !supabase) {
    return normalizedOrders.slice(0, 10);
  }

  const persistentOrderIds = [...new Set(normalizedOrders
    .map((order) => order?.id)
    .filter((orderId) => orderId !== undefined && orderId !== null)
    .map((orderId) => String(orderId))
    .filter((orderId) => orderId && !orderId.startsWith('demo-')))];
  const orderNumbersWithoutIds = [...new Set(normalizedOrders
    .filter((order) => !order?.id || String(order.id).startsWith('demo-'))
    .map((order) => getOrderNumber(order))
    .filter(Boolean))];

  const fetchedOrders = [
    ...(persistentOrderIds.length ? await fetchOrdersByIds(persistentOrderIds) : []),
    ...(orderNumbersWithoutIds.length ? await fetchOrdersByOrderNumbers(orderNumbersWithoutIds) : [])
  ];
  const orderRows = [...new Map(fetchedOrders.map((order) => [String(order.id), order])).values()];
  const ordersById = new Map(orderRows.map((order) => [String(order.id), order]));
  const ordersByNumber = new Map(orderRows.map((order) => [getOrderNumber(order), order]));
  const orderStatusIds = [...new Set([
    ...orderRows.map((order) => getOrderStatusId(order)),
    ...normalizedOrders.map((order) => getOrderStatusId(order))
  ].filter(Boolean))];
  const statusById = await buildStatusLookup(orderStatusIds);
  const missingStatusIds = findMissingStatusIds(orderStatusIds, statusById);

  if (missingStatusIds.length) {
    throw new Error('Impossible de resoudre certains statuts de commande depuis order_statuses. Verifiez la policy SELECT/RLS sur order_statuses et la presence des IDs references dans orders.status.');
  }

  const normalizedFallbackStatuses = new Map(normalizedOrders
    .map((order) => {
      const statusId = getOrderStatusId(order);

      if (!statusId) {
        return null;
      }

      return [statusId, {
        id: statusId,
        code: order.statusCode,
        label: order.statusLabel
      }];
    })
    .filter(Boolean));
  const mergedStatusById = new Map([...normalizedFallbackStatuses, ...statusById]);
  const persistentEntries = normalizedOrders.filter((order) => {
    const orderId = String(order?.id || '');

    return orderId && !orderId.startsWith('demo-') || getOrderNumber(order);
  });

  if (!persistentEntries.length) {
    return normalizedOrders.slice(0, 10);
  }

  let itemsByOrderId = new Map();

  try {
    itemsByOrderId = await buildOrderItemsSnapshot([...ordersById.keys()]);
  } catch {
    itemsByOrderId = new Map();
  }

  const syncedPersistentOrders = persistentEntries
    .flatMap((localOrder) => {
      const localOrderId = String(localOrder?.id || '');
      const localOrderNumber = getOrderNumber(localOrder);
      const remoteOrder = ordersById.get(localOrderId) || ordersByNumber.get(localOrderNumber);

      if (!remoteOrder && localOrderId && !localOrderId.startsWith('demo-')) {
        return [];
      }

      const orderSource = remoteOrder || {
        ...localOrder,
        order_number: localOrderNumber,
        table_label: localOrder.tableLabel,
        created_at: localOrder.createdAt,
        status: getOrderStatusId(localOrder) || localOrder.statusCode || localOrder.status,
        statusId: getOrderStatusId(localOrder),
        statusCode: localOrder.statusCode,
        statusLabel: localOrder.statusLabel
      };

      const syncedOrder = normalizeOrderRecord(orderSource, localOrder.createdAt, {
        statusById: mergedStatusById
      });

      return [{
        ...syncedOrder,
        items: normalizeOrderItemsSnapshot(itemsByOrderId.get(String(remoteOrder?.id || localOrderId)) || localOrder.items)
      }];
    });

  const demoOrders = normalizedOrders.filter((order) => String(order?.id || '').startsWith('demo-'));

  return [...syncedPersistentOrders, ...demoOrders]
    .slice(0, 10);
}

async function insertOrderItems(orderId, cartItems) {
  const rows = cartItems.map((item) => ({
    order_id: orderId,
    article_id: item.id,
    quantity: Math.max(1, Number(item.quantity) || 1)
  }));

  const response = await supabase
    .from('order_items')
    .insert(rows);

  if (response.error) {
    throw formatSupabaseWriteError(response.error);
  }
}

async function createDemoOrder(cartItems, tableLabel) {
  await new Promise((resolve) => window.setTimeout(resolve, 900));

  const randomToken = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

  return normalizeOrderRecord(
    {
      id: `demo-${Date.now()}`,
      order_number: `DEMO-${randomToken}`,
      table_label: normalizeText(tableLabel, ''),
      statusId: fallbackPendingStatus.id,
      statusCode: fallbackPendingStatus.code,
      statusLabel: fallbackPendingStatus.label,
      created_at: new Date().toISOString()
    },
    new Date().toISOString()
  );
}

export async function createOrder(cartItems, tableLabel) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Votre panier est vide. Ajoutez au moins un article avant de valider.');
  }

  if (!normalizeText(tableLabel, '')) {
    throw new Error('Indiquez votre numero de table ou un repere dans l\'evenement avant de valider.');
  }

  if (!supabase) {
    if (appConfig.useDemoData) {
      return createDemoOrder(cartItems, tableLabel);
    }

    throw new Error('Erreur de configuration E_CFG_002. Contactez l\'administrateur.');
  }

  const createdAt = new Date().toISOString();
  const orderRow = await insertOrderRecord(tableLabel);
  const normalizedOrder = normalizeOrderRecord(orderRow, createdAt);
  await insertOrderItems(normalizedOrder.id, cartItems);
  return normalizedOrder;
}