import './styles.css';

import { fetchArticles } from './supabaseClient.js';
import {
  bindAddToasts,
  mountBaseLayout,
  renderErrorState,
  renderInactiveState,
  renderLoader,
  renderMenu,
  showToast
} from './ui.js';

async function checkAppStatus() {
  return String(import.meta.env.VITE_APP_ACTIVE ?? 'true').toLowerCase() === 'true';
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

async function bootstrap() {
  const rootElement = document.querySelector('#app');
  const { screenRoot, toastRoot } = mountBaseLayout(rootElement);
  const stopLoading = renderLoader(screenRoot);

  try {
    await new Promise((resolve) => window.setTimeout(resolve, 550));

    if (!(await checkAppStatus())) {
      stopLoading();
      renderInactiveState(screenRoot);
      return;
    }

    const articles = await fetchArticles();
    const sortedArticles = sortArticles(articles);

    stopLoading();
    renderMenu(screenRoot, sortedArticles);
    bindAddToasts(screenRoot, toastRoot);
    showToast(toastRoot, 'Le menu est prêt. Bonne dégustation.', 'info');
  } catch (error) {
    stopLoading();
    renderErrorState(screenRoot, error.message || 'Une erreur est survenue.');
    showToast(toastRoot, 'Le menu n’a pas pu être chargé.', 'error');
  }
}

bootstrap();