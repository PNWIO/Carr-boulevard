/**
 * Carr Boulevard — interactive 3D site model.
 *
 * Ground is the project topographic survey: 86 contour polylines (33,232 vertices, 246–302 ft)
 * interpolated to a 300 x 203 grid at ~3.9 ft spacing. Buildings, paving, landscape areas,
 * the pond, retaining walls and existing trees are the civil base drawing, read through the
 * same classifier that produces the permit set.
 *
 * Building heights are NOT in the civil drawings — the base is 2D. They are extruded at a
 * uniform assumed height, stated on the page and adjustable by the viewer.
 *
 * Loaded as a module from /model/carr-model.js so the site's CSP (script-src 'self') holds:
 * three.js is vendored beside it, the model data is fetched same-origin.
 */
import * as THREE from "./three.module.min.js";

const mount = document.getElementById("carr-model");
if (mount) boot(mount).catch((err) => fail(mount, err));

function fail(el, err) {
  console.error("[carr-model]", err);
  const n = el.querySelector("[data-model-status]");
  if (n) n.textContent = "The 3D model could not be loaded in this browser. The site plan tab has the same layout in 2D.";
}

async function boot(el) {
  if (!window.WebGLRenderingContext) throw new Error("no WebGL");
  const res = await fetch("/model/carr-site.json");
  if (!res.ok) throw new Error("model data " + res.status);
  const D = await res.json();

  /* ---------- heights ---------- */
  const raw = atob(D.z);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const q = new Int16Array(bytes.buffer);
  const NX = D.nx, NY = D.ny, W = D.w, H = D.h;
  const hAt = (i, j) => D.zmin + q[j * NX + i] / 10;
  const sample = (x, y) => {
    const fx = Math.min(Math.max((x / W) * (NX - 1), 0), NX - 1.001);
    const fy = Math.min(Math.max((y / H) * (NY - 1), 0), NY - 1.001);
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    return (hAt(i, j) * (1 - tx) + hAt(i + 1, j) * tx) * (1 - ty)
         + (hAt(i, j + 1) * (1 - tx) + hAt(i + 1, j + 1) * tx) * ty;
  };

  const stage = el.querySelector("[data-stage]");
  const CW = () => stage.clientWidth || 800;
  const CH = () => stage.clientHeight || 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef0f2);
  const camera = new THREE.PerspectiveCamera(42, CW() / CH(), 1, 9000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(CW(), CH());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xdfe7f2, 0x6a6354, 1.5));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.0);
  sun.position.set(-620, 900, 520);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 760;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 50, far: 2600 });
  sun.shadow.bias = -0.0012;
  scene.add(sun);

  const root = new THREE.Group();
  root.position.set(-W / 2, 0, H / 2);
  scene.add(root);
  const layers = {};
  const addLayer = (k, o) => { layers[k] = o; root.add(o); };

  /* ---------- terrain ---------- */
  const tg = new THREE.PlaneGeometry(W, H, NX - 1, NY - 1);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color(0x3f6a4e), c2 = new THREE.Color(0x7a9a5c),
        c3 = new THREE.Color(0xc3b579), c4 = new THREE.Color(0xefe7dc);
  const span = Math.max(0.001, D.zmax - D.zmin);
  for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
    const k = iy * NX + ix;
    const j = NY - 1 - iy;                 // keep PlaneGeometry's winding, so normals face up
    const z = hAt(ix, j);
    pos.setX(k, (ix / (NX - 1)) * W);
    pos.setZ(k, -(j / (NY - 1)) * H);
    pos.setY(k, z);
    const t = (z - D.zmin) / span;
    const col = t < 0.34 ? c1.clone().lerp(c2, t / 0.34)
              : t < 0.68 ? c2.clone().lerp(c3, (t - 0.34) / 0.34)
                         : c3.clone().lerp(c4, (t - 0.68) / 0.32);
    colors[k * 3] = col.r; colors[k * 3 + 1] = col.g; colors[k * 3 + 2] = col.b;
  }
  pos.needsUpdate = true;
  tg.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  tg.computeVertexNormals();
  tg.computeBoundingBox(); tg.computeBoundingSphere();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.97, metalness: 0 }));
  terrain.receiveShadow = true;
  addLayer("terrain", terrain);

  /* ---------- draped surfaces ---------- */
  const shapeFrom = (ring) => {
    const s = new THREE.Shape();
    s.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length; i++) s.lineTo(ring[i][0], ring[i][1]);
    s.closePath();
    return s;
  };
  const drape = (rings, color, lift, opacity) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0,
      transparent: opacity < 1, opacity, side: THREE.DoubleSide });
    for (const ring of rings) {
      if (ring.length < 4) continue;
      const geo = new THREE.ShapeGeometry(shapeFrom(ring));
      geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, sample(p.getX(i), -p.getZ(i)) + lift);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.receiveShadow = true;
      g.add(m);
    }
    return g;
  };
  addLayer("landscape", drape(D.landscape_area, 0x8fae6b, 0.28, 1));
  addLayer("paving", drape(D.driveway.concat(D.parking, D.sidewalk), 0x9aa0a8, 0.42, 1));
  addLayer("pond", drape(D.pond, 0x5b87b8, 0.3, 0.85));

  /* ---------- buildings ---------- */
  const buildings = new THREE.Group();
  addLayer("buildings", buildings);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xdad6cf, roughness: 0.82, metalness: 0 });
  const bEdge = new THREE.LineBasicMaterial({ color: 0x6f6a63, transparent: true, opacity: 0.5 });
  function buildBuildings(height) {
    buildings.clear();
    D.building.forEach((ring, idx) => {
      if (ring.length < 4) return;
      const base = D.building_z[idx][0] - 1.2;
      const geo = new THREE.ExtrudeGeometry(shapeFrom(ring),
        { depth: (D.building_z[idx][1] - base) + height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, bMat);
      m.position.y = base; m.castShadow = true; m.receiveShadow = true;
      buildings.add(m);
      const ln = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 32), bEdge);
      ln.position.y = base;
      buildings.add(ln);
    });
  }
  buildBuildings(24);

  /* ---------- walls, trees ---------- */
  const walls = new THREE.Group();
  const wMat = new THREE.MeshStandardMaterial({ color: 0xa8a39a, roughness: 0.9 });
  for (const ring of D.retaining_wall) {
    if (ring.length < 4) continue;
    const geo = new THREE.ExtrudeGeometry(shapeFrom(ring), { depth: 3.5, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    let lo = Infinity;
    for (const [x, y] of ring) lo = Math.min(lo, sample(x, y));
    const m = new THREE.Mesh(geo, wMat);
    m.position.y = lo; m.castShadow = true;
    walls.add(m);
  }
  addLayer("walls", walls);

  const trees = new THREE.Group();
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x6b5844, roughness: 1 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x4e7f46, roughness: 0.95 });
  const trunkG = new THREE.CylinderGeometry(0.6, 0.85, 10, 6);
  const leafG = new THREE.SphereGeometry(8.5, 12, 9);
  for (const [x, y, z] of D.tree) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(trunkG, trunkM); t.position.y = 5; t.castShadow = true;
    const c = new THREE.Mesh(leafG, leafM); c.position.y = 15; c.scale.y = 1.15; c.castShadow = true;
    g.add(t, c); g.position.set(x, z, -y);
    trees.add(g);
  }
  addLayer("trees", trees);

  /* ---------- camera ---------- */
  const target = new THREE.Vector3(0, (D.zmin + D.zmax) / 2, 0);
  let radius = 1460, theta = -0.72, phi = 0.86, exag = 1;
  const needle = el.querySelector("[data-needle]");
  function updateCompass() {
    if (!needle) return;
    const a = target.clone().project(camera);
    const b = target.clone().add(new THREE.Vector3(0, 0, -120)).project(camera);  // -z is north
    const ang = Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI;
    needle.setAttribute("transform", `rotate(${ang.toFixed(1)})`);
  }
  function place() {
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.sin(theta));
    camera.lookAt(target);
    updateCompass();
  }
  function reset() {
    radius = 1460; theta = -0.72; phi = 0.86;
    target.set(0, ((D.zmin + D.zmax) / 2) * exag, 0);
    place();
  }
  place();

  const cv = renderer.domElement;
  cv.style.touchAction = "none";
  let drag = null;
  cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointerup", () => { drag = null; });
  cv.addEventListener("pointercancel", () => { drag = null; });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.b === 2 || e.shiftKey) {
      const k = radius * 0.0016;
      const right = new THREE.Vector3().subVectors(camera.position, target).cross(camera.up).normalize();
      const fwd = new THREE.Vector3().subVectors(camera.position, target).setY(0).normalize().cross(camera.up).normalize();
      target.addScaledVector(right, -dx * k);
      target.addScaledVector(fwd, dy * k);
    } else {
      theta -= dx * 0.0052;
      phi = Math.min(Math.PI / 2 - 0.03, Math.max(0.1, phi - dy * 0.0042));
    }
    place();
  });
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  cv.addEventListener("wheel", (e) => {
    e.preventDefault();
    radius = Math.min(3600, Math.max(120, radius * (1 + Math.sign(e.deltaY) * 0.09)));
    place();
  }, { passive: false });

  /* ---------- controls ---------- */
  const q1 = (sel) => el.querySelector(sel);
  const exagEl = q1("[data-exag]"), exagOut = q1("[data-exag-out]");
  if (exagEl) exagEl.addEventListener("input", () => {
    exag = +exagEl.value;
    exagOut.textContent = exag.toFixed(1) + "×";
    root.scale.y = exag;
    target.y = ((D.zmin + D.zmax) / 2) * exag;
    renderer.shadowMap.needsUpdate = true;
    place();
  });
  const bhEl = q1("[data-height]"), bhOut = q1("[data-height-out]");
  if (bhEl) bhEl.addEventListener("input", () => {
    bhOut.textContent = bhEl.value + " ft";
    buildBuildings(+bhEl.value);
  });
  el.querySelectorAll("[data-layer]").forEach((input) => {
    input.addEventListener("change", () => {
      const l = layers[input.getAttribute("data-layer")];
      if (l) l.visible = input.checked;
    });
  });
  const rs = q1("[data-reset]");
  if (rs) rs.addEventListener("click", reset);

  const lo = q1("[data-lo]"), hi = q1("[data-hi]");
  if (lo) lo.textContent = Math.round(D.zmin) + " ft";
  if (hi) hi.textContent = Math.round(D.zmax) + " ft";

  function fit() {
    camera.aspect = CW() / CH();
    camera.updateProjectionMatrix();
    renderer.setSize(CW(), CH());
  }
  addEventListener("resize", fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);

  el.setAttribute("data-ready", "true");
  const status = el.querySelector("[data-model-status]");
  if (status) status.remove();

  let running = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { running = e.isIntersecting; }, { threshold: 0 }).observe(stage);
  }
  (function loop() {
    requestAnimationFrame(loop);
    if (running) renderer.render(scene, camera);
  })();
}
