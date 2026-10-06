import { gsap, ScrollTrigger, reducedMotion, isTouch } from './scroll.js';

// Every card style on the site
const CARDS = '.dest-tile, .service-card, .test-card, .value, .member, .testimonial, .info-item, .hscroll__card, .dest-card';

/**
 * Card motion:
 *  - entrance: when a group of cards scrolls into view they fall down one by one from
 *    above and land with a small bounce (grouped per parent so each grid plays in order);
 *  - a cursor-following spotlight and, for photo cards, a gentle 3D tilt (pointer only).
 * Must run before initReveals() so cards are not also faded by the generic reveal.
 */
export function initCards() {
  const cards = [...document.querySelectorAll(CARDS)];
  if (!cards.length) return;

  // hero slider cards, pinned timelines and the testimonial marquee have their own motion
  const entering = cards.filter((c) => !c.closest('.hero, .hscroll, .marquee'));
  entering.forEach((c) => c.classList.remove('reveal-up'));

  if (!reducedMotion) {
    const groups = new Map();
    entering.forEach((c) => {
      const list = groups.get(c.parentElement) || [];
      list.push(c);
      groups.set(c.parentElement, list);
    });
    groups.forEach((list, parent) => {
      gsap.set(list, { opacity: 0, y: -180, rotate: (i) => (i % 2 ? -6 : 6), transformOrigin: '50% 0%' });
      ScrollTrigger.create({
        trigger: parent,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          gsap.to(list, { opacity: 1, duration: 0.35, ease: 'power1.out', stagger: 0.16 });
          gsap.to(list, {
            y: 0, rotate: 0, duration: 1.2, ease: 'bounce.out', stagger: 0.16,
            clearProps: 'transform', // hand the transform back to the CSS hover lift / tilt
          });
        },
      });
    });
  }

  if (isTouch || reducedMotion) return;

  cards.forEach((card) => {
    card.classList.add('has-spotlight');
    // colour cards lift on hover (CSS); photo tiles and team cards tilt towards the cursor
    const tilt = card.matches('.dest-tile');
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      if (tilt) gsap.to(card, { rotateY: (px - 0.5) * 7, rotateX: -(py - 0.5) * 7, transformPerspective: 1000, duration: 0.6, ease: 'power3.out' });
    });
    card.addEventListener('pointerleave', () => {
      if (tilt) gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    });
  });
}
