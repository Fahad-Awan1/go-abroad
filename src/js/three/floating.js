import { THREE, createRenderer, addEnvironment, runLoop, cloudTexture, isMobile } from './core.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap, ScrollTrigger, reducedMotion } from '../anim/scroll.js';

const TEAL = 0x0e8fa8;
const GOLD = '#e2bd6b';

/* ---------- Objects ----------------------------------------------------- */

function paperPlane(color = 0xffffff) {
  const nose = [1.6, 0, 0], wl = [-1, 0.12, -1.15], wr = [-1, 0.12, 1.15], top = [-1, 0.02, 0], keel = [-0.95, -0.5, 0];
  const tris = [nose, wl, top, nose, top, wr, nose, top, keel];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

function coverTexture(lines) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 720;
  const g = c.getContext('2d');
  g.strokeStyle = GOLD; g.fillStyle = GOLD; g.lineWidth = 6;
  g.textAlign = 'center';
  g.font = '600 46px Outfit, sans-serif';
  g.fillText(lines[0], 256, 150);
  // globe emblem
  g.beginPath(); g.arc(256, 370, 105, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(256, 370, 45, 105, 0, 0, Math.PI * 2); g.stroke();
  [-55, 0, 55].forEach((dy) => { const w = Math.sqrt(105 * 105 - dy * dy); g.beginPath(); g.moveTo(256 - w, 370 + dy); g.lineTo(256 + w, 370 + dy); g.stroke(); });
  g.font = '500 30px Outfit, sans-serif';
  g.fillText(lines[1], 256, 590);
  // biometric chip symbol
  g.lineWidth = 4;
  g.strokeRect(226, 630, 60, 40);
  g.beginPath(); g.arc(256, 650, 10, 0, Math.PI * 2); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function passport() {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new RoundedBoxGeometry(2.2, 3.1, 0.26, 4, 0.08), new THREE.MeshStandardMaterial({ color: 0x0b4f5e, roughness: 0.75 }));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(2.08, 2.98, 0.2), new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.9 }));
  pages.position.x = 0.07;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.95), new THREE.MeshStandardMaterial({ map: coverTexture(['PASSPORT', 'GO ABROAD']), transparent: true, roughness: 0.3, metalness: 0.6 }));
  front.position.z = 0.135;
  g.add(pages, cover, front);
  // boarding pass tucked inside
  const pass = new THREE.Mesh(new RoundedBoxGeometry(1.2, 2.3, 0.02, 2, 0.01), new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.5 }));
  pass.position.set(0.55, 0.85, 0.02);
  pass.rotation.z = -0.2;
  g.add(pass);
  return g;
}

function suitcase() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 3, 1.1, 5, 0.22), new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.4, metalness: 0.1 }));
  g.add(body);
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x0b6f84, roughness: 0.45 });
  [-0.6, 0, 0.6].forEach((x) => {
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.16, 2.9, 1.16, 2, 0.06), ribMat);
    rib.position.x = x;
    g.add(rib);
  });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.25, metalness: 0.9 });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 12, 32, Math.PI), metal);
  handle.position.y = 1.5;
  g.add(handle);
  [-0.8, 0.8].forEach((x) => [-0.35, 0.35].forEach((z) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x1b2330 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -1.6, z);
    g.add(wheel);
  }));
  // travel stickers
  const sticker = (color, x, y, r) => {
    const s = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    s.position.set(x, y, 0.565);
    g.add(s);
  };
  sticker(0xffffff, -0.35, 0.6, 0.32);
  sticker(0xf5a524, 0.4, -0.5, 0.26);
  sticker(0x111827, -0.3, -0.75, 0.18);
  return g;
}

function gradCap() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 0.6 });
  const board = new THREE.Mesh(new RoundedBoxGeometry(3, 0.12, 3, 2, 0.04), black);
  board.rotation.y = Math.PI / 4;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.9, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 0.6, side: THREE.DoubleSide }));
  base.position.y = -0.45;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: TEAL }));
  button.position.y = 0.09;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), new THREE.MeshStandardMaterial({ color: TEAL }));
  cord.rotation.z = Math.PI / 2;
  cord.position.set(0.8, 0.08, 0);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 16), new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.8 }));
  tassel.position.set(1.58, -0.35, 0);
  const tCord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), cord.material);
  tCord.position.set(1.58, -0.12, 0);
  g.add(board, base, button, cord, tCord, tassel);
  // diploma
  const diploma = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 24), new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.85 }));
  diploma.rotation.z = Math.PI / 2 + 0.3;
  diploma.position.set(-0.2, -1.6, 0.8);
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: TEAL }));
  ribbon.rotation.y = Math.PI / 2;
  ribbon.rotation.x = 0.3;
  ribbon.position.copy(diploma.position);
  g.add(diploma, ribbon);
  return g;
}

const BUILDERS = { passport, suitcase, cap: gradCap, plane: () => { const p = paperPlane(0xf4f8f9); p.scale.setScalar(1.9); return p; } };

/* ---------- Scene ------------------------------------------------------- */

export function initFloating(canvas, variant = 'passport') {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  addEnvironment(renderer, scene, 0.6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fd3da, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-5, 6, 7);
  scene.add(key);

  const hero = new THREE.Group();
  const obj = (BUILDERS[variant] || passport)();
  hero.add(obj);
  scene.add(hero);

  // orbiting paper planes
  const orbiters = [];
  const count = isMobile() ? 2 : 3;
  for (let i = 0; i < count; i++) {
    const p = paperPlane(i % 2 ? 0xbfe9ee : 0xffffff);
    p.scale.setScalar(0.38 - i * 0.05);
    p.userData = { r: 3.4 + i * 0.6, speed: 0.35 + i * 0.12, phase: (i / count) * Math.PI * 2, tilt: 0.35 - i * 0.25 };
    scene.add(p);
    orbiters.push(p);
  }

  // soft clouds behind
  const tex = cloudTexture(7);
  const clouds = [];
  [[-2.4, -2.3, -3, 2.4], [2.5, 2.4, -4, 2.2], [2.3, -2.5, -2, 2]].forEach(([x, y, z, s], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    sp.position.set(x, y, z);
    sp.scale.set(s * 1.6, s, 1);
    sp.userData = { x, y, seed: i * 2 };
    scene.add(sp);
    clouds.push(sp);
  });

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const state = { scroll: 0, intro: reducedMotion ? 1 : 0 };
  if (!reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
    ScrollTrigger.create({ trigger: canvas, start: 'top top', end: 'bottom top', scrub: 0.5, onUpdate: (s) => (state.scroll = s.progress) });
    gsap.to(state, { intro: 1, duration: 2.2, ease: 'expo.out', delay: 0.2 });
  }

  const baseRot = { passport: [0.15, -0.5, 0.18], suitcase: [0.15, -0.6, 0.08], cap: [0.45, 0.4, -0.12], plane: [0.75, -0.55, 0.3] }[variant] || [0, 0, 0];

  runLoop({
    canvas, renderer, camera,
    onResize: (w, h) => {
      const s = Math.min(1, (w / h) / 0.9);
      hero.scale.setScalar(s);
    },
    tick: (t) => {
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      const i = state.intro, p = state.scroll;
      obj.rotation.set(
        baseRot[0] + pointer.y * 0.4 + Math.sin(t * 0.6) * 0.06 + p * 0.6,
        baseRot[1] + pointer.x * 0.6 + (1 - i) * -2.5 + p * 1.6,
        baseRot[2] + Math.sin(t * 0.8) * 0.04
      );
      hero.position.y = Math.sin(t * 0.9) * 0.18 + (1 - i) * -3 - p * 2;
      hero.position.x = 0;
      orbiters.forEach((o) => {
        const d = o.userData;
        const a = t * d.speed + d.phase;
        o.position.set(Math.cos(a) * d.r, Math.sin(a * 1.3) * 0.8 + d.tilt * Math.sin(a) * 2, Math.sin(a) * d.r * 0.6);
        // face the direction of travel
        o.rotation.set(0, -a - Math.PI / 2, Math.cos(a * 1.3) * 0.3);
        o.visible = i > 0.2;
      });
      clouds.forEach((c) => {
        c.position.x = c.userData.x + Math.sin(t * 0.15 + c.userData.seed) * 0.4 - pointer.x * 0.6;
        c.position.y = c.userData.y + p * 3 - pointer.y * 0.4;
        c.material.opacity = 0.9 * i;
      });
      renderer.render(scene, camera);
    },
  });
  document.documentElement.classList.add('has-webgl');
}
