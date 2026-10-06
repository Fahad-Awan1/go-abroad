import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export { THREE };

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

export function createRenderer(canvas, { maxDpr = 1.75, antialias = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

// Soft studio reflections without loading an HDR file.
export function addEnvironment(renderer, scene, intensity = 0.5) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = intensity;
  pmrem.dispose();
}

/**
 * Runs `tick(time, dt)` only while the canvas is on screen and the tab is visible,
 * and resizes the renderer/camera to the canvas' CSS box.
 */
export function runLoop({ canvas, renderer, camera, onResize, tick }) {
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let width = 0;
  let height = 0;

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w; height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    onResize?.(w, h);
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();
    tick(now / 1000, dt);
  };
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible && !document.hidden ? start() : stop();
  }, { rootMargin: '100px' }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden || !visible ? stop() : start()));
  new ResizeObserver(resize).observe(canvas);
  resize();
  start();
  return { stop, start };
}

/** World-space size of the camera frustum at a given z (camera looking down -Z). */
export function frustumAt(camera, z) {
  const d = camera.position.z - z;
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * d;
  return { w: h * camera.aspect, h };
}

/** Procedural puffy cloud texture (no image download). */
export function cloudTexture(seed = 1, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const r = size * (0.12 + rand() * 0.2);
    const a = rand() * Math.PI * 2;
    const dist = rand() * size * 0.22;
    const x = size / 2 + Math.cos(a) * dist * 1.3;
    const y = size / 2 + Math.sin(a) * dist * 0.75;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
