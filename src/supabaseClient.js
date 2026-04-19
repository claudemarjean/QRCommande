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
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
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

function normalizeOrderRecord(record, fallbackDate) {
  const createdAt = record?.created_at || fallbackDate;
  const relationStatus = record?.status_details;
  const legacyStatusCode = !relationStatus && typeof record?.status === 'string' && !isUuidLike(record.status)
    ? normalizeStatusCode(record.status, 'pending')
    : normalizeStatusCode(record?.statusCode || '', 'pending');
  const statusRecord = relationStatus
    ? normalizeStatusRecord(relationStatus)
    : {
        id: record?.statusId ? String(record.statusId) : (isUuidLike(record?.status) ? String(record.status) : ''),
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