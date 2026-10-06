import { gsap, ScrollTrigger, reducedMotion } from '../anim/scroll.js';
import { journeyForPath } from '../data/journeys.js';
import { PLANE_SVG } from './plane.js';

/**
 * "Your visa journey": a dotted flight route that runs down the page margins and
 * crosses the page only in the empty gap between two sections. A small plane rides
 * the route level with the reader's eye line, the travelled part of the route is
 * drawn solid, and each section ("stop") gets a passport stamp as the plane passes.
 *
 * Everything lives in one absolutely positioned layer in document coordinates, so it
 * scrolls natively with the page. The route is rebuilt from the sections' boxes on
 * every ScrollTrigger refresh (resize, pins, accordions, filters).
 */

const NS = 'http://www.w3.org/2000/svg';
const FOCUS = 0.45; // the plane sits level with this fraction of the viewport height
const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
// what a stamp must never cover
const CONTENT = 'main h1, main h2, main h3, main p, main li, main a, main button, main img, main input, main select, main textarea, main .field, main .dest-card, main .service-card, main .testimonial, main .process__step, main .faq summary, main .chip, main .badge';


const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

/** Top of an element in document coordinates (uses the pin spacer for pinned sections). */
function docBox(el) {
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const r = box.getBoundingClientRect();
  return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, box };
}

export function initRoute() {
  const journey = journeyForPath(location.pathname);
  const stops = journey.stops.map((s) => ({ ...s, fixed: s.side, el: document.querySelector(s.sel) })).filter((s) => s.el);
  if (!stops.length) return null;

  // ---- DOM ---------------------------------------------------------------------
  const layer = document.createElement('div');
  layer.className = 'journey';
  layer.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('journey__svg');
  const base = document.createElementNS(NS, 'path');
  base.classList.add('journey__base');
  const trail = document.createElementNS(NS, 'path');
  trail.classList.add('journey__trail');
  svg.append(base, trail);
  const plane = document.createElement('div');
  plane.className = 'journey__plane';
  plane.innerHTML = PLANE_SVG;
  const startDot = document.createElement('div');
  startDot.className = 'journey__dot';
  startDot.innerHTML = `<span>${journey.from}</span>`;
  const endDot = document.createElement('div');
  endDot.className = 'journey__dot journey__dot--end';
  endDot.innerHTML = `<span>${journey.to}</span>`;
  layer.append(svg, startDot, endDot);

  const date = today();
  stops.forEach((s, i) => {
    const stamp = document.createElement('div');
    const dark = s.el.matches('.section--dark, .hscroll') || !!s.el.closest('.section--dark, .hscroll');
    stamp.className = `stamp${dark ? ' stamp--light' : ''}`;
    stamp.innerHTML = `<span class="stamp__stage">${s.stage}</span><span class="stamp__meta">${s.code} · ${date}</span>`;
    s.tilt = ((i * 37) % 13) - 6; // stable "random" tilt per stop
    s.stamp = stamp;
    s.stamped = false;
    layer.appendChild(stamp);
  });
  layer.appendChild(plane);
  document.body.appendChild(layer);

  // ---- Geometry ------------------------------------------------------------------
  // The route is sampled by our own maths (lines + flattened cubic curves), never by
  // asking the browser for path points, and every layout read happens before any write.
  let lut = { len: [], x: [], y: [] };
  let total = 1;
  let startY = 0, endY = 1;
  const STEP = 10;
  const range = document.createRange();

  const build = () => {
    svg.style.height = '0px'; // keep the old route from inflating the page while we measure

    // ---- reads --------------------------------------------------------------------
    const vw = document.documentElement.clientWidth;
    const docH = document.documentElement.scrollHeight;
    const mobile = isMobile();
    const ref = document.querySelector('main .container');
    const contentLeft = ref ? ref.getBoundingClientRect().left + parseFloat(getComputedStyle(ref).paddingLeft) : 24;
    const contentRight = vw - contentLeft;
    const gx = { L: Math.max(12, contentLeft / 2), R: Math.min(vw - 12, vw - contentLeft / 2) };

    let prev = 'R';
    stops.forEach((s) => {
      s.side = s.fixed || (prev === 'L' ? 'R' : 'L');
      prev = s.side;
      Object.assign(s, docBox(s.el));
      s.padTop = parseFloat(getComputedStyle(s.el).paddingTop) || 0;
      const before = s.box.previousElementSibling;
      s.gapBefore = before ? parseFloat(getComputedStyle(before).paddingBottom) || 0 : 0;
      s.stampW = s.stamp.offsetWidth || 150;
      s.stampH = s.stamp.offsetHeight || 50;
    });
    // Content near each stop. Elements waiting for their entrance animation are still
    // translated (cards hang 180px above their place), so that offset is removed to get
    // the resting position. Only the bands around the stops are measured, nothing else.
    const bands = stops.map((s) => [s.top - 260, s.top + s.padTop + 260]);
    const near = (y) => bands.some(([a, b]) => y >= a && y <= b);
    const shiftMemo = new Map();
    const shift = (node) => { // cumulative translate of an element's own + ancestors' transforms
      if (!node || node === document.body) return [0, 0];
      let v = shiftMemo.get(node);
      if (!v) {
        const [px, py] = shift(node.parentElement);
        const tr = getComputedStyle(node).transform;
        if (tr && tr !== 'none') { const m = new DOMMatrix(tr); v = [px + m.m41, py + m.m42]; } else v = [px, py];
        shiftMemo.set(node, v);
      }
      return v;
    };
    const blocks = [];
    document.querySelectorAll(CONTENT).forEach((e) => {
      if (e.closest('.journey') || e.offsetParent === null || e.closest('details:not([open]) > :not(summary)')) return;
      let r = e.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return;
      const [dx, dy] = shift(e);
      const top = r.top + window.scrollY - dy;
      if (!near(top) && !near(r.bottom + window.scrollY - dy)) return;
      // text elements: measure the words themselves, not the full-width block
      if (/^(H1|H2|H3|P|LI)$/.test(e.tagName)) { range.selectNodeContents(e); r = range.getBoundingClientRect(); }
      blocks.push({ l: r.left - dx, r: r.right - dx, t: r.top + window.scrollY - dy, b: r.bottom + window.scrollY - dy });
    });

    // ---- route path ---------------------------------------------------------------
    // phones: hug the screen edges (the plane grows while it crosses in the gaps)
    const xOf = (s) => (mobile ? (s.side === 'L' ? 14 : vw - 14) : gx[s.side]);
    const first = stops[0], last = stops[stops.length - 1];
    startY = first.top + 4;
    endY = Math.max(startY + 10, last.bottom - 48);

    const pts = [[xOf(first), startY]]; // flattened polyline
    let d = `M${xOf(first)} ${startY}`;
    stops.forEach((s, i) => {
      const next = stops[i + 1];
      if (!next) return;
      const x1 = xOf(s), x2 = xOf(next);
      if (x1 === x2) { d += ` L${x2} ${next.top}`; pts.push([x2, next.top]); return; }
      // cross inside the gap above the next stop
      const gap = Math.max(60, Math.min(170, next.gapBefore));
      const y1 = next.top - gap, y2 = next.top - gap * 0.12, h = y2 - y1;
      const c1y = y1 + h * 0.75, c2y = y2 - h * 0.75;
      d += ` L${x1} ${y1} C${x1} ${c1y} ${x2} ${c2y} ${x2} ${y2}`;
      pts.push([x1, y1]);
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, u = 1 - t;
        pts.push([
          u * u * u * x1 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x2,
          u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2,
        ]);
      }
    });
    d += ` L${xOf(last)} ${endY}`;
    pts.push([xOf(last), endY]);

    // length -> point table along the polyline (y never decreases, so y -> length is a binary search)
    lut = { len: [], x: [], y: [] };
    let acc = 0, nextSample = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const seg = Math.hypot(bx - ax, by - ay);
      while (nextSample <= acc + seg) {
        const t = seg ? (nextSample - acc) / seg : 0;
        lut.len.push(nextSample); lut.x.push(ax + (bx - ax) * t); lut.y.push(ay + (by - ay) * t);
        nextSample += STEP;
      }
      acc += seg;
    }
    lut.len.push(acc); lut.x.push(pts[pts.length - 1][0]); lut.y.push(pts[pts.length - 1][1]);
    total = acc || 1;

    // stamp spots: the first candidate near each stop that touches no content
    const overlap = (c) => blocks.reduce((sum, r) =>
      sum + Math.max(0, Math.min(c.r, r.r) - Math.max(c.l, r.l)) * Math.max(0, Math.min(c.b, r.b) - Math.max(c.t, r.t)), 0);
    stops.forEach((s) => {
      const w = s.stampW, h = s.stampH, m = 10;
      const sides = [s.side, s.side === 'L' ? 'R' : 'L'];
      // inside the top padding, just above the section edge, straddling the edge, just inside it
      const ys = [s.top + Math.max(0, s.padTop * 0.5 - h / 2), s.top - h - 14, s.top - h / 2, s.top + 8];
      let best = null;
      for (const side of sides) {
        const x = mobile ? (side === 'L' ? 22 : vw - 22 - w) : side === 'L' ? contentLeft : contentRight - w;
        for (const y of ys) {
          const score = overlap({ l: x - m, r: x + w + m, t: y - m, b: y + h + m });
          if (!best || score < best.score) best = { x, y, score };
          if (score === 0) break;
        }
        if (best.score === 0) break;
      }
      s.stampX = best.x;
      s.stampY = best.y;
    });

    // ---- writes -------------------------------------------------------------------
    svg.setAttribute('width', vw);
    svg.setAttribute('height', docH);
    svg.setAttribute('viewBox', `0 0 ${vw} ${docH}`);
    svg.style.height = `${docH}px`;
    base.setAttribute('d', d);
    trail.setAttribute('d', d);
    trail.style.strokeDasharray = `${total} ${total}`;
    startDot.style.transform = `translate(${xOf(first)}px, ${startY}px)`;
    endDot.style.transform = `translate(${xOf(last)}px, ${endY}px)`;
    startDot.classList.toggle('journey__dot--right', first.side === 'R');
    endDot.classList.toggle('journey__dot--right', last.side === 'R');
    stops.forEach((s) => {
      s.stamp.style.left = `${s.stampX}px`;
      s.stamp.style.top = `${s.stampY}px`;
      s.stamp.style.setProperty('--tilt', `${s.tilt}deg`);
    });
  };

  const lengthAtY = (y) => {
    const ys = lut.y;
    if (!ys.length) return 0;
    if (y <= ys[0]) return 0;
    if (y >= ys[ys.length - 1]) return total;
    let lo = 0, hi = ys.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ys[mid] < y) lo = mid; else hi = mid; }
    const t = (y - ys[lo]) / Math.max(1e-6, ys[hi] - ys[lo]);
    return lut.len[lo] + t * (lut.len[hi] - lut.len[lo]);
  };
  const pointAt = (l) => {
    const i = Math.min(lut.len.length - 2, Math.max(0, Math.floor(l / STEP)));
    const t = (l - lut.len[i]) / STEP;
    return { x: lut.x[i] + (lut.x[i + 1] - lut.x[i]) * t, y: lut.y[i] + (lut.y[i + 1] - lut.y[i]) * t };
  };

  // ---- Stamps ------------------------------------------------------------------------
  const stamp = (s, on) => {
    if (s.stamped === on) return;
    s.stamped = on;
    gsap.killTweensOf(s.stamp);
    if (on) {
      s.stamp.classList.add('is-stamped');
      if (reducedMotion) { gsap.set(s.stamp, { opacity: 1, scale: 1, rotate: s.tilt }); return; }
      gsap.fromTo(s.stamp, { opacity: 0, scale: 1.9, rotate: s.tilt + 12 },
        { opacity: 1, scale: 1, rotate: s.tilt, duration: 0.42, ease: 'back.out(2.2)' });
      gsap.fromTo(s.stamp, { x: -2 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)', delay: 0.38 });
      if (isMobile()) gsap.to(s.stamp, { opacity: 0, duration: 0.5, delay: 2.2 });
    } else {
      s.stamp.classList.remove('is-stamped');
      gsap.to(s.stamp, { opacity: 0, scale: 1.15, duration: 0.25 });
    }
  };

  // ---- Frame --------------------------------------------------------------------------
  let cur = 0, angle = 90, lastAngle = 90, facing = 1, last = performance.now();
  const frame = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const vh = window.innerHeight;
    const eyeY = window.scrollY + vh * FOCUS;
    const target = lengthAtY(eyeY);
    cur = reducedMotion ? target : cur + (target - cur) * (1 - Math.exp(-dt * 7));
    const p = pointAt(cur);
    const a = pointAt(Math.max(0, cur - 8)), b = pointAt(Math.min(total, cur + 8));
    // nose along the route; turn around (face upward) while the reader scrolls back up
    if (Math.abs(target - cur) > 3) facing = target > cur ? 1 : -1;
    const tangent = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const goal = tangent + (facing < 0 ? 180 : 0);
    angle += ((((goal - angle) % 360) + 540) % 360 - 180) * 0.16; // shortest way round
    const turn = Math.min(0.35, Math.abs(angle - lastAngle) * 0.06);
    lastAngle = angle;
    // bigger while crossing the page in a gap between sections (horizontal flight)
    const crossing = Math.abs(Math.cos((tangent * Math.PI) / 180));
    const size = 1 + crossing * (isMobile() ? 0.55 : 0.2);

    // appear once the reader reaches the route (after the hero), fade near the very end
    const appear = gsap.utils.clamp(0, 1, (eyeY - (startY - vh * 0.25)) / (vh * 0.2));
    plane.style.opacity = appear.toFixed(3);
    plane.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angle}deg) scale(${size}, ${size * (1 - turn)})`;
    trail.style.strokeDashoffset = String(reducedMotion ? 0 : total - cur);

    for (const s of stops) stamp(s, reducedMotion || p.y >= s.stampY - 12);
  };

  build();
  frame();
  gsap.ticker.add(frame);
  let pending = 0;
  ScrollTrigger.addEventListener('refresh', () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(build); });
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  return { rebuild: build };
}
