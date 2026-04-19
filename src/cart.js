import { appConfig } from './config.js';

function normalizeCartItem(item) {
  if (!item || typeof item !== 'object' || item.id === undefined || item.id === null) {
    return null;
  }

  return {
    id: String(item.id),
    name: String(item.name || '').trim().slice(0, appConfig.maxTextLength),
    category: String(item.category || 'Autres').trim().slice(0, appConfig.maxTextLength),
    quantity: Math.min(
      appConfig.maxCartItemQuantity,
      Math.max(1, Number(item.quantity) || 1)
    )
  };
}

export function loadCart() {
  try {
    const rawCart = window.localStorage.getItem(appConfig.cartStorageKey);
    if (!rawCart) {
      return [];
    }

    const parsedCart = JSON.parse(rawCart);
    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .map(normalizeCartItem)
      .filter(Boolean)
      .slice(0, appConfig.maxCartEntries);
  } catch {
    return [];
  }
}

export function persistCart(cartItems) {
  try {
    const safeCart = cartItems
      .map(normalizeCartItem)
      .filter(Boolean)
      .slice(0, appConfig.maxCartEntries);

    window.localStorage.setItem(appConfig.cartStorageKey, JSON.stringify(safeCart));
  } catch {
    // Ignore storage write failures to keep the UI usable.
  }
}

export function addToCart(cartItems, article) {
  const normalizedArticle = normalizeCartItem({ ...article, quantity: 1 });
  if (!normalizedArticle) {
    return cartItems;
  }

  const existingItem = cartItems.find((item) => item.id === normalizedArticle.id);

  if (existingItem) {
    return cartItems.map((item) => item.id === normalizedArticle.id
      ? {
          ...item,
          quantity: Math.min(appConfig.maxCartItemQuantity, item.quantity + 1)
        }
      : item);
  }

  return [...cartItems, normalizedArticle].slice(0, appConfig.maxCartEntries);
}

export function removeFromCart(cartItems, articleId) {
  const normalizedArticleId = String(articleId);
  return cartItems.filter((item) => item.id !== normalizedArticleId);
}