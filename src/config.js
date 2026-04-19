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

export const appConfig = Object.freeze({
  isAppActive: parseBoolean(import.meta.env.VITE_APP_ACTIVE, true),
  useDemoData: parseBoolean(import.meta.env.VITE_USE_DEMO_DATA, false),
  supabaseUrl: isValidSupabaseUrl(supabaseUrl) ? supabaseUrl : '',
  supabaseAnonKey,
  cartStorageKey: 'qrcommande-cart',
  maxCartEntries: 50,
  maxCartItemQuantity: 20,
  maxTextLength: 120
});