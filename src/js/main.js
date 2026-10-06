import '../css/base.css';
import '../css/components.css';
import '../css/home.css';
import '../css/pages.css';
import '../css/chat.css';
import '../css/journey.css';
import '../css/cards.css';

import { initScroll, scrollToHash, reducedMotion, gsap, ScrollTrigger } from './anim/scroll.js';
import * as scroll from './anim/scroll.js';
import { initNav, initCtaBar } from './anim/nav.js';
import { initReveals, animateSplit, splitLines } from './anim/reveal.js';
import { initBadges, initSliders, initMarquees, initCursor, initMagnetic, initProcess, initHScroll, initScrollSpy, initTransitions } from './anim/interactions.js';
import { initRoute } from './journey/route.js';
import { initCards } from './anim/cards.js';
import { initVisaSearch, initContactForm, initDestinationFilter, initAccordions } from './forms.js';

const page = document.body.dataset.page;

initScroll();
initNav();
initCtaBar();
const introDone = initTransitions();

/* ---------- Chatbot (lazy) ------------------------------------------------ */
let chatPromise = null;
const getChat = () =>
  (chatPromise ||= import('./chatbot/chat.js').then((m) => {
    const chat = m.mountChat(document.querySelector('[data-chat]'), { lenis: scroll.lenis });
    chatReady = true;
    return chat;
  }));
const launcher = document.querySelector('[data-chat-toggle]');
// Once mounted, the chat handles its own launcher clicks; this only covers clicks before that.
let chatReady = false;
launcher?.addEventListener('click', () => { if (!chatReady) getChat().then((c) => c.open()); });
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
idle(() => getChat(), { timeout: 4000 });
window.goAbroadChat = { ask: (q) => getChat().then((c) => c.ask(q)) };
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-chat-ask]');
  if (t) { e.preventDefault(); window.goAbroadChat.ask(t.dataset.chatAsk); }
});

/* ---------- WebGL scenes (lazy, only where present) -------------------------- */
// Creating a test WebGL context is slow, so it only happens when a scene is about to start.
let webglChecked = null;
const hasWebgl = () => {
  if (webglChecked === null) {
    try { const c = document.createElement('canvas'); webglChecked = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { webglChecked = false; }
  }
  return webglChecked;
};

function whenNear(el, fn, margin = '400px') {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
}

// Home hero 3D: started only once the headline is on screen, so the heavy WebGL set-up
// never delays the first paint. The plane then flies in a moment later.
let heroScene = null;
const heroCanvas = document.querySelector('[data-hero-canvas]');
let heroResolve;
const heroReady = new Promise((r) => (heroResolve = r));
const startHero = () => {
  if (!heroCanvas || !hasWebgl()) return heroResolve();
  import('./three/heroPlane.js')
    .then((m) => { heroScene = m.initHeroPlane(heroCanvas); })
    .catch((err) => console.warn('Hero 3D disabled:', err))
    .finally(heroResolve);
};

const globeCanvas = document.querySelector('[data-globe-canvas]');
if (globeCanvas) {
  whenNear(globeCanvas, () => {
    if (hasWebgl()) import('./three/globe.js').then((m) => m.initGlobe(globeCanvas, document.querySelector('[data-globe-list]')));
    else globeCanvas.closest('.globe-section__stage')?.classList.add('no-webgl');
  });
}

// Inner-page 3D objects: desktop only (phones show the photo fallback), and loaded after
// the page has settled so the 3D library never competes with the first paint.
const floatCanvas = document.querySelector('[data-floating]');
if (floatCanvas && !window.matchMedia('(max-width: 900px)').matches) {
  idle(() => { if (hasWebgl()) import('./three/floating.js').then((m) => m.initFloating(floatCanvas, floatCanvas.dataset.floating)); }, { timeout: 2500 });
}

/* ---------- Page animations --------------------------------------------------- */
const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 500))]);

fontsReady.then(() => {
  initCards();
  initReveals();
  initBadges();
  initSliders();
  initMarquees();
  initCursor();
  initMagnetic();
  initProcess();
  initHScroll();
  initScrollSpy();
  initAccordions();
  initDestinationFilter();
  initContactForm();
  initVisaSearch(getChat);
  scrollToHash();

  // Intro: hero / page-hero headline and supporting elements
  const heroTitle = document.querySelector('[data-split-immediate]');
  const introEls = document.querySelectorAll('[data-intro]');
  if (!reducedMotion) {
    if (heroTitle) gsap.set(splitLines(heroTitle), { yPercent: 110 });
    gsap.set(introEls, { opacity: 0, y: 30 });
    if (page === 'home') gsap.set('.hero .dest-card', { opacity: 0, y: 40, rotate: 2 });
  }

  introDone.then(() => {
    // headline first, 3D a moment later (two frames so the text animation has started),
    // and the scroll journey route once the browser is idle (it is only needed on scroll)
    requestAnimationFrame(() => requestAnimationFrame(startHero));
    idle(() => initRoute(), { timeout: 1500 });
    if (!reducedMotion) {
      if (heroTitle) animateSplit(heroTitle, 0.05);
      gsap.to(introEls, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.35 });
      if (page === 'home') gsap.to('.hero .dest-card', { opacity: 1, y: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.6, clearProps: 'transform' });
    }
    heroReady.then(() => heroScene?.intro());
    ScrollTrigger.refresh();
  });
});

// Keep ScrollTrigger measurements correct once images/fonts settle
window.addEventListener('load', () => ScrollTrigger.refresh());
