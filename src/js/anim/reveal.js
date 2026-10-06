import { gsap, ScrollTrigger, reducedMotion } from './scroll.js';

// Splits a heading into masked lines, keeping inline markup like <span class="accent">.
export function splitLines(el) {
  if (el.dataset.splitDone) return el.querySelectorAll('.line-inner');
  const words = [];
  const walk = (node, wrappers) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) words.push({ space: true });
          else words.push({ text: part, wrappers });
        });
      } else if (child.nodeName === 'BR') {
        words.push({ br: true });
      } else if (child.nodeType === 1) {
        walk(child, [...wrappers, child.cloneNode(false)]);
      }
    });
  };
  walk(el, []);
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  el.innerHTML = '';
  const spans = [];
  words.forEach((w) => {
    if (w.space) return el.appendChild(document.createTextNode(' '));
    if (w.br) return el.appendChild(document.createElement('br'));
    const span = document.createElement('span');
    span.className = 'word';
    span.style.display = 'inline-block';
    let inner = document.createTextNode(w.text);
    for (let i = w.wrappers.length - 1; i >= 0; i--) {
      const wrap = w.wrappers[i].cloneNode(false);
      wrap.appendChild(inner);
      inner = wrap;
    }
    span.appendChild(inner);
    el.appendChild(span);
    spans.push(span);
  });
  // group words by their rendered line
  const lines = [];
  let top = null;
  spans.forEach((s) => {
    const t = s.offsetTop;
    if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
    lines[lines.length - 1].push(s);
  });
  el.innerHTML = '';
  lines.forEach((ws) => {
    const line = document.createElement('span');
    line.className = 'line';
    line.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'line-inner';
    ws.forEach((w, i) => { inner.appendChild(w); if (i < ws.length - 1) inner.appendChild(document.createTextNode(' ')); });
    line.appendChild(inner);
    el.appendChild(line);
  });
  el.dataset.splitDone = '1';
  return el.querySelectorAll('.line-inner');
}

export function animateSplit(el, delay = 0) {
  const lines = splitLines(el);
  gsap.set(lines, { yPercent: 110 });
  return gsap.to(lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, delay });
}

export function initReveals(root = document) {
  if (reducedMotion) {
    root.querySelectorAll('[data-count]').forEach((el) => (el.textContent = Number(el.dataset.count).toLocaleString()));
    return;
  }

  // Split headings (those marked data-split-immediate are animated by the page intro)
  root.querySelectorAll('.split:not([data-split-immediate])').forEach((el) => {
    const lines = splitLines(el);
    gsap.set(lines, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(lines, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.09 }),
    });
  });

  // Fade-up elements, batched so siblings stagger nicely
  ScrollTrigger.batch(root.querySelectorAll('.reveal-up'), {
    start: 'top 92%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });

  // Clip-path image reveals
  root.querySelectorAll('.img-reveal').forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    tl.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' });
    if (img && !el.hasAttribute('data-parallax-media')) tl.from(img, { scale: 1.3, duration: 1.8, ease: 'expo.out' }, 0.1);
  });

  // Inner parallax on framed media
  root.querySelectorAll('[data-parallax-media] img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Free-floating parallax (data-parallax = speed factor)
  root.querySelectorAll('[data-parallax]').forEach((el) => {
    const s = parseFloat(el.dataset.parallax) || 0.2;
    gsap.to(el, { yPercent: -100 * s, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Counters
  root.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(obj, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString()), onComplete: () => (el.textContent = end.toLocaleString()) }),
    });
  });
}
