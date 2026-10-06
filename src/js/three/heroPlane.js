import { THREE, createRenderer, addEnvironment, runLoop, frustumAt, cloudTexture, isMobile } from './core.js';
import { buildAirliner } from './airliner.js';
import { gsap, ScrollTrigger, reducedMotion } from '../anim/scroll.js';

/**
 * Home hero: a 3D airliner banking over the aerial photo, framed by drifting cloud
 * sprites. Scrolling through the hero makes it climb out to the top left; the small
 * plane on the journey route (journey/route.js) then picks up the flight.
 */
export function initHeroPlane(canvas) {
  const hero = canvas.closest('[data-hero]');
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 20);
  const mobile = isMobile();
  if (!mobile) addEnvironment(renderer, scene, 0.55);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6fb7c2, mobile ? 1.6 : 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-6, 10, 8);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbfe9ee, 0.8);
  rim.position.set(8, -4, -6);
  scene.add(rim);

  // ---- Plane --------------------------------------------------------------
  const root = new THREE.Group();   // position (layout + scroll)
  const tilt = new THREE.Group();   // pointer tilt + idle bob
  const model = buildAirliner({ windows: !isMobile() });
  model.rotation.order = 'YZX';
  model.rotation.set(-0.32, -2.5, 0.16); // roll, heading (nose toward viewer-left), pitch
  tilt.rotation.x = 0.42;
  tilt.add(model);
  root.add(tilt);
  scene.add(root);

  // ---- Clouds ---------------------------------------------------------------
  const textures = [1, 2, 3, 4].map((s) => cloudTexture(s));
  const clouds = [];
  const addCloud = (spec) => {
    const mat = new THREE.SpriteMaterial({ map: textures[clouds.length % textures.length], transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
    const sprite = new THREE.Sprite(mat);
    sprite.userData = { ...spec, seed: Math.random() * 10 };
    scene.add(sprite);
    clouds.push(sprite);
  };

  // Each cloud: fx/fy = screen fraction, z = depth, s = scale (x frame height), o = opacity, k = scroll speed
  const rand = (a, b) => a + Math.random() * (b - a);
  if (!isMobile()) {
    for (let i = 0; i < 16; i++) addCloud({ fx: rand(0.29, 0.43), fy: i / 15 + rand(-0.04, 0.04), z: rand(-1, 4), s: rand(0.22, 0.38), o: rand(0.85, 1), k: rand(0.6, 1.2) });
    for (let i = 0; i < 7; i++) addCloud({ fx: rand(0.4, 1), fy: rand(0.93, 1.06), z: rand(0, 3), s: rand(0.25, 0.36), o: 1, k: rand(0.8, 1.4) });
    for (let i = 0; i < 5; i++) addCloud({ fx: rand(0.42, 1), fy: rand(-0.06, 0.04), z: rand(-1, 2), s: rand(0.2, 0.3), o: 0.9, k: rand(0.4, 0.8) });
    for (let i = 0; i < 4; i++) addCloud({ fx: rand(0.5, 0.95), fy: rand(0.3, 0.75), z: rand(-6, -3), s: rand(0.12, 0.2), o: 0.35, k: 0.3 });
    for (let i = 0; i < 3; i++) addCloud({ fx: rand(0.55, 1.05), fy: rand(0.78, 0.98), z: 7, s: rand(0.3, 0.45), o: 0.75, k: 2.4 });
  } else {
    for (let i = 0; i < 10; i++) addCloud({ fx: i / 9 + rand(-0.05, 0.05), fy: rand(0.86, 1.02), z: rand(0, 3), s: rand(0.32, 0.45), o: 1, k: rand(0.8, 1.2) });
    for (let i = 0; i < 4; i++) addCloud({ fx: rand(0, 1), fy: rand(-0.05, 0.05), z: rand(0, 2), s: rand(0.25, 0.35), o: 0.9, k: 0.5 });
    for (let i = 0; i < 2; i++) addCloud({ fx: rand(0.1, 0.9), fy: rand(0.35, 0.6), z: -4, s: 0.18, o: 0.35, k: 0.3 });
  }

  // ---- Layout ---------------------------------------------------------------
  const base = { x: 0, y: 0, scale: 1 };
  const layout = () => {
    const f0 = frustumAt(camera, 0);
    const m = isMobile();
    base.x = (m ? 0.02 : 0.2) * f0.w;
    base.y = 0.08 * f0.h;
    base.scale = (m ? Math.min(f0.w * 0.9, f0.h * 1.3) : Math.min(f0.w * 0.46, f0.h * 0.95)) / 9;
    root.scale.setScalar(base.scale);
    clouds.forEach((c) => {
      const d = c.userData;
      const f = frustumAt(camera, d.z);
      d.bx = (d.fx - 0.5) * f.w;
      d.by = (0.5 - d.fy) * f.h;
      d.fh = f.h;
      const s = d.s * f.h * (m ? 0.8 : 1);
      c.scale.set(s * 1.6, s, 1);
      c.position.set(d.bx, d.by, d.z);
    });
  };

  // ---- Motion state -----------------------------------------------------------
  const state = { intro: reducedMotion ? 1 : 0, scroll: 0, cloudsIn: reducedMotion ? 1 : 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6, onUpdate: (self) => (state.scroll = self.progress) });
    const photo = hero.querySelector('[data-hero-visual] img');
    if (photo) gsap.fromTo(photo, { scale: 1.12 }, { scale: 1.3, yPercent: 8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  const intro = () => {
    if (reducedMotion) return;
    gsap.to(state, { cloudsIn: 1, duration: 2, ease: 'power2.out' });
    gsap.to(state, { intro: 1, duration: 2.6, ease: 'expo.out', delay: 0.15 });
    const pic = hero.querySelector('[data-hero-visual] picture');
    if (pic) gsap.from(pic, { scale: 1.2, duration: 2.6, ease: 'expo.out' });
  };

  // ---- Frame ------------------------------------------------------------------
  const ease = (t) => t * t * (3 - 2 * t);
  const tick = (t) => {
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    const p = state.scroll;
    const i = state.intro;
    const f0 = frustumAt(camera, 0);

    // fly in from the bottom right on load; on scroll, climb out towards the top left
    const inX = (1 - i) * f0.w * 0.55, inY = (1 - i) * -f0.h * 0.5, inZ = (1 - i) * -18;
    const sp = ease(Math.min(1, p * 1.4));
    root.position.set(
      base.x + inX - sp * f0.w * 0.75,
      base.y + inY + sp * f0.h * 0.75 + Math.sin(t * 0.9) * 0.08 * base.scale * 4,
      inZ + sp * 4
    );
    tilt.rotation.z = Math.sin(t * 0.7) * 0.03 - pointer.y * 0.12 + sp * 0.35;
    tilt.rotation.y = pointer.x * 0.35 - sp * 0.3;
    tilt.rotation.x = 0.42 + Math.sin(t * 0.6) * 0.02 + (1 - i) * 0.4 - sp * 0.2;
    model.rotation.x = -0.32 - (1 - i) * 0.6 - sp * 0.6 + Math.sin(t * 0.5) * 0.03;

    clouds.forEach((c) => {
      const d = c.userData;
      c.position.x = d.bx + Math.sin(t * 0.08 + d.seed) * 0.4 + pointer.x * -0.5 * (d.z + 2) * 0.2;
      c.position.y = d.by + p * d.fh * 0.25 * d.k + pointer.y * 0.3 * (d.z + 2) * 0.1;
      c.material.opacity = d.o * state.cloudsIn * (1 - Math.max(0, p - 0.7) / 0.3);
      c.material.rotation = Math.sin(t * 0.05 + d.seed) * 0.05;
    });

    renderer.render(scene, camera);
  };

  runLoop({ canvas, renderer, camera, onResize: layout, tick });
  layout();
  document.documentElement.classList.add('has-webgl');
  return { intro };
}
