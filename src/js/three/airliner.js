import { THREE } from './core.js';

/**
 * Procedural four-engine wide-body airliner (nose along +X, wings along ±Z).
 * Built from primitives so no model file has to be downloaded.
 */
export function buildAirliner({ windows = true } = {}) {
  const plane = new THREE.Group();

  const white = new THREE.MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.32, metalness: 0.15 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xc9d0d8, roughness: 0.45, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 0.5, metalness: 0.2 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x0e8fa8, roughness: 0.35, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0d1520, roughness: 0.1, metalness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.2, metalness: 0.9, side: THREE.DoubleSide });
  const inner = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });

  // ---- Fuselage (lathe profile, then laid along X) --------------------------
  const R = 0.62;
  const profile = [
    [0, -4.3], [0.1, -4.25], [0.26, -3.95], [0.42, -3.4], [0.56, -2.5], [R, -1.6],
    [R, 2.5], [0.6, 3.05], [0.54, 3.45], [0.44, 3.8], [0.3, 4.08], [0.14, 4.25], [0, 4.3],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const fusGeo = new THREE.LatheGeometry(profile, 48);
  fusGeo.rotateZ(-Math.PI / 2); // lathe axis Y -> X
  const fuselage = new THREE.Mesh(fusGeo, white);
  fuselage.scale.set(1, 1.12, 1); // double-deck oval section
  // raise the tail cone a little, like a real airliner
  const pos = fusGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    if (x < -1.6) pos.setY(i, pos.getY(i) + Math.pow((-1.6 - x) / 2.7, 2) * 0.32);
  }
  fusGeo.computeVertexNormals();
  plane.add(fuselage);

  // ---- Wings ----------------------------------------------------------------
  const extrude = (pts, depth, bevel = 0.025) => {
    const shape = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  };
  const flatGeo = (pts, depth, bevel) => {
    const g = extrude(pts, depth, bevel);
    g.translate(0, 0, -depth / 2);
    g.rotateX(Math.PI / 2); // shape Y -> world Z
    return g;
  };

  const wingPts = (s) => [[1.25, 0], [-1.7, 4.5 * s], [-2.25, 4.5 * s], [-1.0, 0.2 * s], [-1.05, 0]];
  [1, -1].forEach((s) => {
    const wing = new THREE.Mesh(flatGeo(wingPts(s), 0.07, 0.03), white);
    wing.position.set(0.15, -0.38, 0);
    wing.rotation.x = -0.07 * s; // dihedral (tips up)
    plane.add(wing);

    // winglet
    const winglet = new THREE.Mesh(extrude([[0, 0], [-0.35, 0.42], [-0.55, 0.42], [-0.45, 0]], 0.03, 0.01), teal);
    winglet.position.set(-1.38 + 0.15, -0.38 + 0.31, 4.5 * s);
    plane.add(winglet);

    // horizontal stabiliser
    const stab = new THREE.Mesh(flatGeo([[-2.95, 0.2 * s], [-3.85, 1.75 * s], [-4.2, 1.75 * s], [-3.95, 0]], 0.05, 0.02), white);
    stab.position.y = 0.2;
    plane.add(stab);

    // engines: inner & outer
    [1.35, 2.75].forEach((z) => {
      const lead = 1.25 - (2.95 / 4.5) * z; // leading-edge x at this span
      const wingY = -0.38 + z * 0.07; // follows the dihedral
      const eng = buildEngine(white, metal, inner, grey);
      eng.position.set(lead + 0.45, wingY - 0.44, z * s);
      plane.add(eng);
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 0.08), white);
      pylon.position.set(lead + 0.05, wingY - 0.18, z * s);
      plane.add(pylon);
    });
  });

  // vertical tail (brand teal) with a white stripe
  const finGeo = extrude([[-2.75, 0.45], [-3.95, 2.55], [-4.5, 2.55], [-4.3, 0.45]], 0.08, 0.03);
  finGeo.translate(0, 0, -0.04);
  plane.add(new THREE.Mesh(finGeo, teal));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.14), white);
  stripe.position.set(-3.85, 1.65, 0);
  stripe.rotation.z = -1.05;
  plane.add(stripe);

  // ---- Cockpit & windows ------------------------------------------------------
  // cockpit windscreen: small panes following the nose contour
  const radiusAt = (x) => {
    for (let i = 1; i < profile.length; i++) {
      const a = profile[i - 1], b = profile[i];
      if (x <= b.y) return a.x + ((x - a.y) / (b.y - a.y)) * (b.x - a.x);
    }
    return 0;
  };
  const paneGeo = new THREE.BoxGeometry(0.13, 0.085, 0.02);
  const paneY = 0.24;
  [3.66, 3.8, 3.93].forEach((x, k) => [1, -1].forEach((s) => {
    const r = radiusAt(x);
    const z = Math.sqrt(Math.max(0, r * r - Math.pow(paneY / 1.12, 2)));
    const pane = new THREE.Mesh(paneGeo, glass);
    pane.position.set(x, paneY - k * 0.015, z * s);
    pane.rotation.set(0.25 * s, (0.35 + k * 0.25) * s, -0.15);
    plane.add(pane);
  }));

  if (windows) {
    const winGeo = new THREE.BoxGeometry(0.075, 0.1, 0.02);
    const decks = [0.3, -0.05];
    const xs = [];
    for (let x = -2.3; x <= 2.7; x += 0.16) xs.push(x);
    const count = xs.length * decks.length * 2;
    const inst = new THREE.InstancedMesh(winGeo, glass, count);
    const m = new THREE.Object3D();
    let i = 0;
    decks.forEach((y) => {
      const z = Math.sqrt(R * R - Math.pow(y / 1.12, 2)) + 0.004;
      const tilt = Math.asin(y / 1.12 / R);
      [1, -1].forEach((s) => xs.forEach((x) => {
        m.position.set(x, y, z * s);
        m.rotation.set(-tilt * s, 0, 0);
        m.updateMatrix();
        inst.setMatrixAt(i++, m.matrix);
      }));
    });
    plane.add(inst);

    // doors
    const doorGeo = new THREE.BoxGeometry(0.16, 0.34, 0.02);
    [2.95, 1.2, -0.9, -2.2].forEach((x) => [1, -1].forEach((s) => {
      const d = new THREE.Mesh(doorGeo, grey);
      d.position.set(x, 0.1, (R - 0.005) * s);
      plane.add(d);
    }));
  }

  // belly fairing
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), white);
  belly.scale.set(1.9, 0.32, 0.6);
  belly.position.set(-0.3, -0.55, 0);
  plane.add(belly);

  plane.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });
  return plane;
}

function buildEngine(white, metal, inner, grey) {
  const g = new THREE.Group();
  const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 1.15, 32, 1, true), white);
  nacelle.rotation.z = Math.PI / 2;
  nacelle.material = white.clone();
  nacelle.material.side = THREE.DoubleSide;
  g.add(nacelle);
  // intake lip
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.03, 10, 32), metal);
  lip.rotation.y = Math.PI / 2;
  lip.position.x = 0.575;
  g.add(lip);
  // fan face
  const fan = new THREE.Mesh(new THREE.CircleGeometry(0.27, 32), inner);
  fan.rotation.y = Math.PI / 2;
  fan.position.x = 0.45;
  g.add(fan);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 20), metal);
  spinner.rotation.z = -Math.PI / 2;
  spinner.position.x = 0.54;
  g.add(spinner);
  // exhaust cone
  const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 20), grey);
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.x = -0.72;
  g.add(exhaust);
  g.userData.fan = fan;
  return g;
}
