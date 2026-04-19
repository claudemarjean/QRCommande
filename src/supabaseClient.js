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

function normalizeText(value, fallback = 'Autres') {
  const normalizedValue = String(value ?? fallback)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, appConfig.maxTextLength);

  return normalizedValue || fallback;
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

  return {
    id: record?.id ?? null,
    orderNumber: String(record?.order_number || ''),
    status: String(record?.status || 'pending'),
    createdAt
  };
}

function isMissingColumnError(error, columnName) {
  return Boolean(error?.message) && new RegExp(`\\b${columnName}\\b`, 'i').test(error.message);
}

function isRowLevelSecurityError(error) {
  return /row-level security policy/i.test(error?.message || '');
}

function formatSupabaseWriteError(error) {
  if (isRowLevelSecurityError(error)) {
    return new Error('Insertion bloquée par Supabase (RLS) sur les commandes. Ajoutez une policy INSERT pour les roles anon/authenticated sur orders et order_items.');
  }

  return new Error(error?.message || 'Impossible de créer la commande.');
}

async function insertOrderRecord() {
  let response = await supabase
    .from('orders')
    .insert({
      status: 'pending'
    })
    .select('id, order_number, status, created_at')
    .single();

  if (response.error && isMissingColumnError(response.error, 'created_at')) {
    response = await supabase
      .from('orders')
      .insert({
        status: 'pending'
      })
      .select('id, order_number, status, created_at')
      .single();
  }

  if (response.error) {
    throw formatSupabaseWriteError(response.error);
  }

  return response.data;
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

async function createDemoOrder(cartItems) {
  await new Promise((resolve) => window.setTimeout(resolve, 900));

  return normalizeOrderRecord(
    {
      id: `demo-${Date.now()}`,
      order_number: `${Math.floor(Date.now() / 1000)}`,
      status: 'pending',
      created_at: new Date().toISOString()
    },
    new Date().toISOString()
  );
}

export async function createOrder(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Votre panier est vide. Ajoutez au moins un article avant de valider.');
  }

  if (!supabase) {
    if (appConfig.useDemoData) {
      return createDemoOrder(cartItems);
    }

    throw new Error('Erreur de configuration E_CFG_002. Contactez l\'administrateur.');
  }

  const createdAt = new Date().toISOString();
  const orderRow = await insertOrderRecord();
  const normalizedOrder = normalizeOrderRecord(orderRow, createdAt);
  await insertOrderItems(normalizedOrder.id, cartItems);
  return normalizedOrder;
}