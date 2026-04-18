import { gsap } from 'gsap';

export function animateLoader(loaderElement) {
  if (!loaderElement) {
    return;
  }

  gsap.to(loaderElement, {
    rotate: 360,
    duration: 1.2,
    repeat: -1,
    ease: 'none'
  });
}

export function stopLoader(loaderElement) {
  if (!loaderElement) {
    return;
  }

  gsap.killTweensOf(loaderElement);
}

export function animateMenuEntrance(rootElement) {
  const hero = rootElement.querySelector('[data-hero]');
  const categories = rootElement.querySelectorAll('[data-category-block]');
  const cards = rootElement.querySelectorAll('[data-article-card]');

  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (hero) {
    timeline.from(hero.children, {
      y: 22,
      opacity: 0,
      duration: 0.7,
      stagger: 0.08
    });
  }

  if (categories.length) {
    timeline.from(
      categories,
      {
        y: 24,
        opacity: 0,
        duration: 0.55,
        stagger: 0.12
      },
      hero ? '-=0.25' : 0
    );
  }

  if (cards.length) {
    timeline.from(
      cards,
      {
        y: 18,
        opacity: 0,
        scale: 0.98,
        duration: 0.4,
        stagger: 0.05
      },
      '-=0.35'
    );
  }
}

export function animateToast(toastElement) {
  if (!toastElement) {
    return;
  }

  gsap.fromTo(
    toastElement,
    { y: 18, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
  );
}