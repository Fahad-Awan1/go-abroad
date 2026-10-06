import { lenis } from './scroll.js';

export function initNav() {
  const header = document.querySelector('[data-header]');
  const burger = document.querySelector('[data-burger]');
  const drawer = document.querySelector('[data-mobile-menu]');
  let lastY = 0;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    // hide on scroll down, reveal on scroll up
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !drawer?.classList.contains('is-open'));
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Desktop capsule: a pill slides under the hovered link and rests on the active one
  const nav = document.querySelector('[data-primary-nav]');
  const pill = document.querySelector('[data-nav-pill]');
  if (nav && pill) {
    const links = [...nav.querySelectorAll('.nav__link')];
    const active = links.find((a) => a.hasAttribute('aria-current'));
    const moveTo = (a) => {
      if (!a) { pill.classList.remove('is-on'); return; }
      pill.style.left = `${a.offsetLeft + a.parentElement.offsetLeft}px`;
      pill.style.width = `${a.offsetWidth}px`;
      pill.classList.add('is-on');
    };
    links.forEach((a) => {
      a.addEventListener('pointerenter', () => moveTo(a));
      a.addEventListener('focus', () => moveTo(a));
    });
    nav.addEventListener('pointerleave', () => moveTo(active));
    nav.addEventListener('focusout', () => moveTo(active));
    const settle = () => { pill.style.transition = 'none'; moveTo(active); requestAnimationFrame(() => (pill.style.transition = '')); };
    settle();
    window.addEventListener('resize', settle);
    if (document.fonts) document.fonts.ready.then(settle);
  }

  // ---- Drawer (phones & tablets)
  if (burger && drawer) {
    let closeTimer = 0;
    const setOpen = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      clearTimeout(closeTimer);
      if (open) {
        drawer.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
        lenis?.stop();
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.classList.add('menu-open');
        setTimeout(() => drawer.querySelector('.drawer__nav a')?.focus({ preventScroll: true }), 450);
      } else {
        drawer.classList.remove('is-open');
        lenis?.start();
        document.documentElement.style.overflow = '';
        document.documentElement.classList.remove('menu-open');
        closeTimer = setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 600);
      }
    };
    burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
    drawer.querySelectorAll('[data-drawer-close]').forEach((el) => el.addEventListener('click', () => { setOpen(false); burger.focus(); }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setOpen(false); burger.focus(); } });
    drawer.addEventListener('click', (e) => { if (e.target.closest('.drawer__nav a')) setOpen(false); });
    // close if the window grows past the breakpoint
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches && drawer.classList.contains('is-open')) setOpen(false); });
  }

  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* Sticky call-to-action bar (desktop only): appears once the visitor has scrolled past
   the hero. Not shown on the contact and 404 pages; phones use the drawer's buttons. */
export function initCtaBar() {
  const bar = document.querySelector('[data-cta-bar]');
  if (!bar) return;
  const page = document.body.dataset.page;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('ga-cta-hidden') === '1'; } catch {}
  if (page === 'contact' || page === '404' || dismissed || window.matchMedia('(max-width: 760px)').matches) { bar.remove(); return; }

  bar.hidden = false;
  const hero = document.querySelector('[data-hero], .page-hero');
  const threshold = () => (hero ? hero.getBoundingClientRect().top + window.scrollY + hero.offsetHeight * 0.6 : 400);
  const update = () => {
    const chatOpen = document.querySelector('[data-chat]')?.classList.contains('is-open');
    const menuOpen = document.documentElement.classList.contains('menu-open');
    bar.classList.toggle('is-visible', window.scrollY > threshold() && !chatOpen && !menuOpen);
  };
  window.addEventListener('scroll', update, { passive: true });
  new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const chat = document.querySelector('[data-chat]');
  if (chat) new MutationObserver(update).observe(chat, { attributes: true, attributeFilter: ['class'] });
  update();

  bar.querySelector('[data-cta-close]')?.addEventListener('click', () => {
    bar.classList.remove('is-visible');
    try { sessionStorage.setItem('ga-cta-hidden', '1'); } catch {}
    setTimeout(() => bar.remove(), 700);
  });
}
