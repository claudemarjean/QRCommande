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