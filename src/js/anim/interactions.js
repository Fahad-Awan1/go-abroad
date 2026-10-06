import { gsap, ScrollTrigger, reducedMotion, isTouch, lenis } from './scroll.js';
import { journeyForPath } from '../data/journeys.js';

/* Rotating circular-text badges: constant spin that speeds up with scroll velocity. */
export function initBadges() {
  const rings = [...document.querySelectorAll('[data-badge] .badge__ring')];
  if (!rings.length || reducedMotion) return;
  let rot = 0;
  let boost = 0;
  ScrollTrigger.create({ onUpdate: (self) => { boost = gsap.utils.clamp(-12, 12, self.getVelocity() / 150); } });
  gsap.ticker.add((_, dt) => {
    boost *= 0.92;
    rot += (dt / 1000) * 22 + boost;
    rings.forEach((r) => (r.style.transform = `rotate(${rot}deg)`));
  });
}

/* Draggable slider with inertia, arrows and progress (destination cards). */
export function initSliders() {
  document.querySelectorAll('[data-slider]').forEach((root) => {
    const viewport = root.querySelector('[data-slider-viewport]');
    const track = root.querySelector('[data-slider-track]');
    const prev = root.querySelector('[data-slider-prev]');
    const next = root.querySelector('[data-slider-next]');
    const bar = root.querySelector('.slider__progress span');
    let x = 0, target = 0, max = 0, dragging = false, startX = 0, startTarget = 0, moved = 0, lastX = 0, vel = 0;

    const measure = () => {
      const visible = viewport.clientWidth - parseFloat(getComputedStyle(viewport).paddingRight) - parseFloat(getComputedStyle(viewport).paddingLeft);
      max = Math.max(0, track.scrollWidth - visible);
      target = gsap.utils.clamp(-max, 0, target);
    };
    const step = () => (track.children[0]?.getBoundingClientRect().width || 250) + 16;

    const render = () => {
      x += (target - x) * (dragging ? 0.35 : 0.12);
      if (Math.abs(target - x) < 0.05) x = target;
      track.style.transform = `translate3d(${x}px,0,0)`;
      if (bar) bar.style.transform = `scaleX(${max ? 0.15 + 0.85 * (-x / max) : 1})`;
      if (prev) prev.disabled = target >= -1;
      if (next) next.disabled = target <= -max + 1;
    };
    gsap.ticker.add(render);

    const down = (e) => {
      dragging = true; moved = 0; startX = lastX = e.clientX; startTarget = target; vel = 0;
      viewport.classList.add('is-dragging');
    };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      vel = e.clientX - lastX; lastX = e.clientX;
      let t = startTarget + dx;
      if (t > 0) t *= 0.35; if (t < -max) t = -max + (t + max) * 0.35; // rubber band
      target = t;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      target = gsap.utils.clamp(-max, 0, target + vel * 12);
    };
    viewport.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    // swallow the click that ends a drag
    viewport.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    viewport.addEventListener('dragstart', (e) => e.preventDefault());
    // horizontal wheel / trackpad
    viewport.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      target = gsap.utils.clamp(-max, 0, target - e.deltaX);
    }, { passive: false });
    prev?.addEventListener('click', () => (target = gsap.utils.clamp(-max, 0, target + step())));
    next?.addEventListener('click', () => (target = gsap.utils.clamp(-max, 0, target - step())));
    // keyboard: keep focused card in view
    track.addEventListener('focusin', (e) => {
      const card = e.target.closest('a');
      if (!card) return;
      viewport.scrollLeft = 0;
      target = gsap.utils.clamp(-max, 0, -card.offsetLeft + 10);
    });

    window.addEventListener('resize', measure);
    measure();
    if (document.fonts) document.fonts.ready.then(measure);
  });
}

/* Infinite marquee whose speed and direction react to scroll; draggable on testimonials. */
export function initMarquees() {
  document.querySelectorAll('.marquee').forEach((m) => {
    const track = m.querySelector('.marquee__track');
    if (!track) return;
    // duplicate content so the loop is seamless
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', '-1'));
    m.appendChild(clone);
    m.style.display = 'flex';
    if (reducedMotion) return;

    const base = parseFloat(m.dataset.speed || 60); // px per second
    let x = 0, dir = -1, boost = 0, w = track.offsetWidth;
    let dragging = false, lastX = 0, dragV = 0;
    ScrollTrigger.create({ trigger: m, start: 'top bottom', end: 'bottom top', onUpdate: (self) => {
      dir = self.direction === 1 ? -1 : 1;
      boost = Math.min(Math.abs(self.getVelocity()) / 40, 25);
    } });
    window.addEventListener('resize', () => (w = track.offsetWidth));

    if (m.hasAttribute('data-marquee')) {
      m.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; m.style.cursor = 'grabbing'; });
      window.addEventListener('pointermove', (e) => { if (!dragging) return; dragV = e.clientX - lastX; x += dragV; lastX = e.clientX; }, { passive: true });
      window.addEventListener('pointerup', () => { dragging = false; m.style.cursor = ''; });
    }

    let visible = true;
    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(m);
    gsap.ticker.add((_, dt) => {
      if (!visible) return;
      boost *= 0.94;
      if (!dragging) x += dir * (base / 1000) * dt * (1 + boost * 0.15);
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      track.style.transform = clone.style.transform = `translate3d(${x}px,0,0)`;
    });
  });
}

/* Custom cursor follower with contextual labels ("Drag", "View"). */
export function initCursor() {
  if (isTouch || reducedMotion) return;
  const c = document.querySelector('.cursor');
  if (!c) return;
  const label = c.querySelector('.cursor__label');
  const xTo = gsap.quickTo(c, 'x', { duration: 0.45, ease: 'power3' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.45, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    c.classList.add('is-visible');
    xTo(e.clientX); yTo(e.clientY);
  }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('is-visible'));
  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button, summary, input, select, textarea, label');
    if (labelled) { label.textContent = labelled.dataset.cursor; c.classList.add('is-label'); c.classList.remove('is-hover'); }
    else { c.classList.remove('is-label'); c.classList.toggle('is-hover', !!interactive); }
  });
}

/* Magnetic buttons + 3D tilt cards. */
export function initMagnetic() {
  if (isTouch || reducedMotion) return;
  document.querySelectorAll('.magnetic').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 900, duration: 0.6, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, 0.5)' }));
  });
}

/* Home: pinned "how it works" — steps activate as a plane travels along the meter. */
export function initProcess() {
  const section = document.querySelector('[data-process]');
  if (!section || reducedMotion) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const steps = [...section.querySelectorAll('[data-step]')];
    const meter = section.querySelector('[data-process-meter]');
    const plane = section.querySelector('[data-process-plane]');
    section.classList.add('is-pinned');
    steps[0].classList.add('is-active');
    const st = ScrollTrigger.create({
      trigger: section.querySelector('.process__pin'),
      start: 'top top',
      end: () => `+=${window.innerHeight * 2.2}`,
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(meter, { scaleX: p });
        gsap.set(plane, { left: `${p * 100}%` });
        const idx = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
        steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      },
    });
    return () => { st.kill(); section.classList.remove('is-pinned'); };
  });
}

/* Highlights the side-nav link of the section in view (services page). */
export function initScrollSpy() {
  const nav = document.querySelector('[data-spy-nav]');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a')];
  document.querySelectorAll('[data-spy]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section, start: 'top 45%', end: 'bottom 45%',
      onToggle: (self) => self.isActive && links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${section.id}`)),
    });
  });
}

/* Pinned horizontal scroll sections (timelines) — desktop only, native swipe on mobile. */
export function initHScroll() {
  if (reducedMotion) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const triggers = [...document.querySelectorAll('[data-hscroll]')].map((section) => {
      const track = section.querySelector('[data-hscroll-track]');
      const bar = section.querySelector('[data-hscroll-bar]');
      const dist = () => Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (self) => bar && gsap.set(bar, { scaleX: self.progress }),
        },
      });
      return tween;
    });
    return () => triggers.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
  });
}

/* Page fly-through: first-visit intro and page-to-page transitions.
   Leaving: a big airliner sweeps in from the bottom left trailing a sky wake that covers
   the page. Arriving: the page starts covered (state set before first paint by the head
   script), the same plane flies on to the top right and the sky clears behind it. */
const leaveHooks = [];
export const onPageLeave = (fn) => leaveHooks.push(fn);
export const arrivedByFlight = document.documentElement.classList.contains('ga-fly');

export function initTransitions() {
  const root = document.documentElement;
  const el = document.querySelector('[data-flyby]');
  const first = root.classList.contains('ga-first');
  const here = journeyForPath(location.pathname);
  try { sessionStorage.setItem('ga-visited', '1'); sessionStorage.removeItem('ga-fly'); } catch {}
  if (!el) return Promise.resolve();

  const sky = el.querySelector('[data-flyby-sky]');
  const plane = el.querySelector('[data-flyby-plane]');
  const label = el.querySelector('[data-flyby-label]');
  const nameEl = el.querySelector('[data-flyby-name]');
  const W = () => window.innerWidth, H = () => window.innerHeight;
  const COVER = 'circle(150% at 50% 50%)';

  // GSAP owns these properties: always set them explicitly.
  const park = () => {
    root.classList.remove('ga-fly', 'ga-first');
    el.style.visibility = '';
    gsap.set(plane, { x: 0, y: 0, scale: 1, opacity: 1 });
    gsap.set(label, { opacity: 1, y: 0 });
  };

  let intro = Promise.resolve();
  if ((arrivedByFlight || first) && !reducedMotion) {
    if (first) nameEl.textContent = 'Welcome aboard';
    else if (here === journeyForPath('/404.html')) nameEl.textContent = 'Flight cancelled';
    gsap.set(sky, { clipPath: 'circle(150% at 100% 0%)' });
    gsap.set(plane, { x: 0, y: 0, scale: 1, opacity: 1 });
    intro = new Promise((res) => {
      gsap.timeline({ onComplete: park, delay: first ? 0.45 : 0.1 })
        .to(label, { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' }, 0)
        // the plane flies on towards the top right, climbing and growing as it passes the camera
        .to(plane, { x: () => W() * 0.75, y: () => -H() * 0.75, scale: 1.6, duration: 1.05, ease: 'power2.in' }, 0)
        // the sky clears behind it, shrinking towards where the plane exits
        .to(sky, { clipPath: 'circle(0% at 100% 0%)', duration: 1.1, ease: 'power3.inOut' }, 0.15)
        .add(res, 0.7);
    });
  } else {
    park();
  }

  if (!reducedMotion) {
    let leaving = false;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || /^(mailto|tel):/.test(a.href)) return;
      if (url.pathname === location.pathname && url.hash) return; // same-page anchor
      e.preventDefault();
      if (leaving || (url.pathname === location.pathname && url.search === location.search)) return;
      leaving = true;
      const dest = journeyForPath(url.pathname);
      try { sessionStorage.setItem('ga-fly', JSON.stringify({ to: dest.name })); } catch {}

      nameEl.textContent = dest.name;
      el.style.visibility = 'visible';
      const hooks = leaveHooks.map((fn) => fn(url));
      // sweep in from the bottom left; the sky wake grows out of the corner behind the plane
      gsap.timeline({ onComplete: () => Promise.all(hooks).then(() => (location.href = url.href)) })
        .fromTo(plane, { x: () => -W() * 0.75, y: () => H() * 0.75, scale: 0.55, opacity: 1 },
          { x: 0, y: 0, scale: 1, duration: 0.95, ease: 'power3.out' }, 0)
        .fromTo(sky, { clipPath: 'circle(0% at 0% 100%)' }, { clipPath: `circle(150% at 0% 100%)`, duration: 0.95, ease: 'power2.inOut' }, 0.05)
        .fromTo(label, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.55);
    });
    // restore state when returning via the back/forward cache
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { leaving = false; park(); }
    });
  }
  return intro;
}

export { lenis };
