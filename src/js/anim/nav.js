import { lenis } from './scroll.js';

export function initNav() {
  const header = document.querySelector('[data-header]');
  const burger = document.querySelector('[data-burger]');
  const menu = document.querySelector('[data-mobile-menu]');
  let lastY = 0;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    // hide on scroll down, reveal on scroll up
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !menu.classList.contains('is-open'));
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      lenis?.stop();
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.classList.add('menu-open');
    } else {
      menu.classList.remove('is-open');
      lenis?.start();
      document.documentElement.style.overflow = '';
      document.documentElement.classList.remove('menu-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 800);
    }
  };
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false); });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });

  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* Sticky call-to-action bar (+ WhatsApp button on phones): appears once the
   visitor has scrolled past the hero. Not shown on the contact and 404 pages. */
export function initCtaBar() {
  const bar = document.querySelector('[data-cta-bar]');
  const fab = document.querySelector('[data-wa-fab]');
  if (!bar) return;
  const page = document.body.dataset.page;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('ga-cta-hidden') === '1'; } catch {}
  if (page === 'contact' || page === '404' || dismissed) { bar.remove(); fab?.remove(); return; }

  bar.hidden = false;
  document.documentElement.classList.add('has-cta-bar');
  const hero = document.querySelector('[data-hero], .page-hero');
  const threshold = () => (hero ? hero.getBoundingClientRect().top + window.scrollY + hero.offsetHeight * 0.6 : 400);
  let past = false;
  const update = () => {
    past = window.scrollY > threshold();
    const chatOpen = document.querySelector('[data-chat]')?.classList.contains('is-open');
    const menuOpen = document.documentElement.classList.contains('menu-open');
    const show = past && !chatOpen && !menuOpen;
    bar.classList.toggle('is-visible', show);
    fab?.classList.toggle('is-visible', show);
  };
  window.addEventListener('scroll', update, { passive: true });
  new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const chat = document.querySelector('[data-chat]');
  if (chat) new MutationObserver(update).observe(chat, { attributes: true, attributeFilter: ['class'] });
  update();

  bar.querySelector('[data-cta-close]')?.addEventListener('click', () => {
    bar.classList.remove('is-visible');
    fab?.classList.remove('is-visible');
    document.documentElement.classList.remove('has-cta-bar');
    try { sessionStorage.setItem('ga-cta-hidden', '1'); } catch {}
    setTimeout(() => { bar.remove(); fab?.remove(); }, 700);
  });
}
