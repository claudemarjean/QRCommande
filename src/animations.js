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
  const reveals = rootElement.querySelectorAll('[data-reveal]');

  const timeline = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      gsap.set([hero, categories, cards, reveals], { clearProps: 'all' });
    }
  });

  if (hero) {
    timeline.from(hero.children, {
      y: 22,
      opacity: 0,
      duration: 0.55,
      stagger: 0.08
    });
  }

  if (categories.length) {
    timeline.from(
      categories,
      {
        y: 16,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08
      },
      hero ? '-=0.25' : 0
    );
  }

  if (cards.length) {
    timeline.from(
      cards,
      {
        y: 8,
        opacity: 0,
        duration: 0.25,
        stagger: 0.02
      },
      '-=0.2'
    );
  }

  if (reveals.length) {
    timeline.from(
      reveals,
      {
        y: 14,
        opacity: 0,
        duration: 0.4,
        stagger: 0.04
      },
      hero || categories.length || cards.length ? '-=0.25' : 0
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

export function animateOrderConfirmation(rootElement) {
  if (!rootElement) {
    return;
  }

  const confirmationCard = rootElement.querySelector('[data-confirmation-card]');
  const checkmark = rootElement.querySelector('[data-confirmation-check]');
  const reveals = rootElement.querySelectorAll('[data-confirmation-reveal]');

  const timeline = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      gsap.set([confirmationCard, checkmark, reveals], { clearProps: 'all' });
    }
  });

  if (confirmationCard) {
    timeline.fromTo(
      confirmationCard,
      { y: 24, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.48 }
    );
  }

  if (checkmark) {
    timeline.fromTo(
      checkmark,
      { scale: 0.6, opacity: 0, rotate: -14 },
      { scale: 1, opacity: 1, rotate: 0, duration: 0.42, ease: 'back.out(1.7)' },
      '-=0.2'
    );

    timeline.to(
      checkmark,
      {
        boxShadow: '0 20px 40px rgba(22, 155, 98, 0.28)',
        duration: 0.28,
        yoyo: true,
        repeat: 1
      },
      '-=0.05'
    );
  }

  if (reveals.length) {
    timeline.from(
      reveals,
      { y: 14, opacity: 0, duration: 0.34, stagger: 0.06 },
      '-=0.22'
    );
  }
}