function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
}

function normalizeEnvString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidSupabaseUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

const supabaseUrl = normalizeEnvString(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvString(import.meta.env.VITE_SUPABASE_ANON_KEY);
const defaultOrderPendingStatusId = normalizeEnvString(import.meta.env.VITE_DEFAULT_ORDER_PENDING_STATUS_ID) || '93cc19cc-a7d1-433b-84a0-6c8f231e7aad';

export const appConfig = Object.freeze({
  isAppActive: parseBoolean(import.meta.env.VITE_APP_ACTIVE, true),
  useDemoData: parseBoolean(import.meta.env.VITE_USE_DEMO_DATA, false),
  supabaseUrl: isValidSupabaseUrl(supabaseUrl) ? supabaseUrl : '',
  supabaseAnonKey,
  defaultOrderPendingStatusId,
  defaultOrderPendingStatusCode: 'pending',
  defaultOrderPendingStatusLabel: 'En attente',
  cartStorageKey: 'qrcommande-cart',
  ordersStorageKey: 'qrcommande-orders',
  maxCartEntries: 50,
  maxCartItemQuantity: 20,
  maxTextLength: 120
});