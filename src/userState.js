const listeners = new Set();

let userState = {
  status: 'checking',
  session: null,
  user: null
};

function emit() {
  const snapshot = getUserState();
  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

export function getUserState() {
  return { ...userState };
}

export function subscribeUserState(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setUserCheckingState() {
  userState = {
    status: 'checking',
    session: null,
    user: null
  };

  emit();
}

export function setAuthenticatedUser(authContext) {
  userState = {
    status: 'authenticated',
    session: authContext?.session || null,
    user: authContext?.user || null
  };

  emit();
}

export function clearAuthenticatedUser() {
  userState = {
    status: 'unauthenticated',
    session: null,
    user: null
  };

  emit();
}

export function isAuthenticatedUser(state = userState) {
  return state.status === 'authenticated' && Boolean(state.user?.userId);
}