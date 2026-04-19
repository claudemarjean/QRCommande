import { supabase } from './supabaseClient.js';

const AUTHORIZED_ROLES = new Set(['admin', 'staff']);

function normalizeRole(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizeLabel(value, fallback = '') {
  const normalizedValue = String(value ?? fallback)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  return normalizedValue || fallback;
}

function isRowLevelSecurityError(error) {
  return /row-level security policy/i.test(error?.message || '');
}

function isAdminDirectoryMissingError(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || (/admin_users/i.test(message) && /does not exist|relation/i.test(message));
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

function normalizeUserProfile(record, user) {
  const email = normalizeLabel(record?.email || user?.email || '', '');
  const role = normalizeRole(record?.role || '');

  return {
    userId: String(record?.user_id || user?.id || ''),
    email,
    displayName: normalizeLabel(record?.display_name, email || 'Administrateur'),
    role,
    isActive: Boolean(record?.is_active ?? true),
    isAuthorized: AUTHORIZED_ROLES.has(role)
  };
}

async function fetchOwnUserProfile(userId) {
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

async function resolveUserSession(session, { signOutOnFailure = false } = {}) {
  if (!session?.user || !supabase) {
    return { session: null, user: null };
  }

  const profile = await fetchOwnUserProfile(session.user.id);
  const normalizedProfile = profile ? normalizeUserProfile(profile, session.user) : null;

  if (!normalizedProfile?.isActive || !normalizedProfile?.isAuthorized) {
    if (signOutOnFailure) {
      await supabase.auth.signOut();
    }

    return { session: null, user: null };
  }

  return {
    session,
    user: normalizedProfile
  };
}

export async function getSession() {
  if (!supabase) {
    return { session: null, user: null };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error('Impossible de restaurer la session administrateur.');
  }

  if (!data?.session) {
    return { session: null, user: null };
  }

  return resolveUserSession(data.session, { signOutOnFailure: true });
}

export async function login(email, password) {
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

  const authContext = await resolveUserSession(data?.session || null, { signOutOnFailure: true });

  if (!authContext.user) {
    throw new Error('Accès refusé. Cet espace est réservé aux profils admin ou staff.');
  }

  return authContext;
}

export async function logout() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export function subscribeToAuthChanges(onChange) {
  if (!supabase || typeof onChange !== 'function') {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void (async () => {
      try {
        onChange(await resolveUserSession(session, { signOutOnFailure: true }));
      } catch (error) {
        onChange({ session: null, user: null, error });
      }
    })();
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export function isAuthorizedRole(role) {
  return AUTHORIZED_ROLES.has(normalizeRole(role));
}