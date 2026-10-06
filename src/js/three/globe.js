import { THREE, createRenderer, runLoop, isMobile } from './core.js';
import { MASK, MASK_W, MASK_H } from './landmask.js';
import { destinations } from '../data/destinations.js';
import { gsap, ScrollTrigger, reducedMotion } from '../anim/scroll.js';

const ORIGIN = { lat: 30.4, lon: 69.3 }; // Pakistan — change to your office's country
const R = 5;
const DEG = Math.PI / 180;

export const latLonToVec = (lat, lon, r = R) => {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
};

function landTest() {
  const bin = atob(MASK);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return (lat, lon) => {
    const x = Math.min(MASK_W - 1, Math.floor(((lon + 180) / 360) * MASK_W));
    const y = Math.min(MASK_H - 1, Math.floor(((90 - lat) / 180) * MASK_H));
    const i = y * MASK_W + x;
    return (bytes[i >> 3] >> (i & 7)) & 1;
  };
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}

export function initGlobe(canvas, list) {
  const renderer = createRenderer(canvas, { maxDpr: 2 });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 21.5);

  const globe = new THREE.Group();
  const spin = new THREE.Group(); // auto/drag spin lives here, focus rotation on `globe`
  spin.add(globe);
  scene.add(spin);

  // base sphere
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.995, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x0f4250 })
  ));

  // atmosphere glow (fresnel)
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.18, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(0x2bb8c9) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      // brightest right at the globe's edge (|n·v| ≈ 0.55 for a 1.18x shell), fading outwards
      fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float a = abs(dot(vN, vV)); float g = smoothstep(0.0, 0.55, a) * (1.0 - smoothstep(0.55, 0.62, a)); gl_FragColor = vec4(c, pow(g, 1.6) * 0.75); }',
    })
  ));

  // land dots on a Fibonacci sphere
  const isLand = landTest();
  const N = isMobile() ? 9000 : 16000;
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    const lat = Math.asin(y) / DEG;
    const lon = Math.atan2(z, -x) / DEG - 180;
    const lonN = ((lon + 540) % 360) - 180;
    if (isLand(lat, lonN)) pts.push(x * R, y * R, z * R);
  }
  const dotsGeo = new THREE.BufferGeometry();
  dotsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  globe.add(new THREE.Points(dotsGeo, new THREE.PointsMaterial({
    size: 0.1, map: dotTexture(), transparent: true, alphaTest: 0.4, color: 0x8ae6ef, sizeAttenuation: true,
  })));

  // flight arcs with a travelling glow
  const arcMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t; varying vec2 vUv; uniform float offset;
      void main(){
        float head = fract(t * 0.25 + offset);
        float d = head - vUv.x;
        float trail = d > 0.0 ? exp(-d * 6.0) : 0.0;
        float base = 0.35;
        vec3 col = mix(vec3(0.17,0.72,0.79), vec3(1.0), trail * 0.6);
        gl_FragColor = vec4(col, base + trail);
      }`,
  });
  const origin = latLonToVec(ORIGIN.lat, ORIGIN.lon);
  const markers = {};
  const ringGeo = new THREE.RingGeometry(0.12, 0.18, 32);
  const addMarker = (pos, color, big = false) => {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.lookAt(pos.clone().multiplyScalar(2));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(big ? 0.13 : 0.09, 24), new THREE.MeshBasicMaterial({ color }));
    dot.position.z = 0.02;
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
    ring.position.z = 0.02;
    g.add(dot, ring);
    g.userData.ring = ring;
    globe.add(g);
    return g;
  };
  addMarker(origin, 0xffffff, true);
  destinations.forEach((d, i) => {
    const end = latLonToVec(d.lat, d.lon);
    const mid = origin.clone().add(end).multiplyScalar(0.5);
    const dist = origin.distanceTo(end);
    mid.setLength(R + dist * 0.35);
    const c1 = origin.clone().lerp(mid, 0.66).setLength(R + dist * 0.28);
    const c2 = end.clone().lerp(mid, 0.66).setLength(R + dist * 0.28);
    const curve = new THREE.CubicBezierCurve3(origin, c1, c2, end);
    const mat = arcMat.clone();
    mat.uniforms = { t: arcMat.uniforms.t, offset: { value: i / destinations.length } };
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.03, 6, false), mat);
    globe.add(tube);
    markers[d.id] = { group: addMarker(end, 0x2bb8c9), lat: d.lat, lon: d.lon, phase: i * 0.7 };
  });

  // ---- Interaction ---------------------------------------------------------
  const focus = { x: 0, y: 0 };
  const faceRotation = (lat, lon) => ({ y: Math.PI / 2 - (lon + 180) * DEG, x: lat * DEG * 0.7 });
  const start = faceRotation(ORIGIN.lat - 5, ORIGIN.lon - 40);
  globe.rotation.set(start.x, start.y, 0);

  let auto = !reducedMotion;
  let drag = null;
  let dragV = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; canvas.style.cursor = 'grabbing'; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dragV = (e.clientX - drag.x) * 0.006;
    spin.rotation.y += dragV;
    drag.x = e.clientX;
  }, { passive: true });
  window.addEventListener('pointerup', () => { drag = null; canvas.style.cursor = ''; });
  canvas.style.cursor = 'grab';

  const focusCountry = (id) => {
    const m = markers[id];
    if (!m) return;
    auto = false;
    const r = faceRotation(m.lat, m.lon);
    // shortest path including the current spin offset
    let target = r.y - spin.rotation.y - sr;
    const cur = globe.rotation.y;
    target = cur + ((((target - cur) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    gsap.to(globe.rotation, { x: r.x, y: target, duration: 1.4, ease: 'expo.out' });
    Object.entries(markers).forEach(([k, v]) => gsap.to(v.group.scale, { x: k === id ? 1.9 : 1, y: k === id ? 1.9 : 1, z: 1, duration: 0.6 }));
  };
  list?.querySelectorAll('[data-country]').forEach((btn) => {
    const go = () => {
      list.querySelectorAll('[data-country]').forEach((b) => b.classList.toggle('is-active', b === btn));
      focusCountry(btn.dataset.country);
    };
    btn.addEventListener('mouseenter', go);
    btn.addEventListener('focus', go);
    btn.addEventListener('click', go);
  });
  list?.addEventListener('mouseleave', () => { auto = !reducedMotion; });

  let scrollRot = 0;
  if (!reducedMotion) {
    ScrollTrigger.create({ trigger: canvas, start: 'top bottom', end: 'bottom top', onUpdate: (s) => (scrollRot = s.progress * 1.2) });
    gsap.from(spin.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: canvas, start: 'top 80%' } });
  }

  let sr = 0;
  runLoop({
    canvas, renderer, camera,
    tick: (t, dt) => {
      arcMat.uniforms.t.value = t;
      if (!drag) { dragV *= 0.94; spin.rotation.y += dragV; }
      if (auto) spin.rotation.y += dt * 0.08;
      sr += (scrollRot - sr) * 0.08;
      scene.rotation.y = sr;
      Object.values(markers).forEach((m) => {
        const k = (t * 0.8 + m.phase) % 1;
        m.group.userData.ring.scale.setScalar(1 + k * 1.6);
        m.group.userData.ring.material.opacity = 1 - k;
      });
      renderer.render(scene, camera);
    },
  });
  return { focusCountry };
}
