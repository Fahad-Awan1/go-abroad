import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

export let lenis = null;

// Smooth inertial scroll driven by GSAP's ticker so ScrollTrigger stays in sync.
export function initScroll() {
  if (reducedMotion) return null;
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // in-page anchors scroll smoothly (and account for the fixed header)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -70 });
  });
  return lenis;
}

export function scrollToHash() {
  if (!location.hash) return;
  let el = null;
  try { el = document.querySelector(location.hash); } catch { return; }
  if (!el) return;
  if (el.tagName === 'DETAILS') el.open = true;
  el.querySelector('details')?.setAttribute('open', '');
  if (lenis) lenis.scrollTo(el, { offset: -100, immediate: true });
  else el.scrollIntoView();
}

export { gsap, ScrollTrigger };
