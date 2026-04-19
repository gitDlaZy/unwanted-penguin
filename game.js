// FrostBite — Ice arena, Penguin, Leopard Seals, Skuas

// ── BGM ───────────────────────────────────────────────────────────────────────
const bgm = new Audio('sounds/Cowboy%20Bebop%20-%20Opening%20Tank.mp3');
bgm.loop   = true;
bgm.volume = parseFloat(localStorage.getItem('bgmVolume') ?? '0.5');

// Start on first user interaction (browser autoplay policy)
let bgmStarted = false;
function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;
  bgm.play().catch(() => {});
}
window.addEventListener('keydown', startBGM, { once: true });
window.addEventListener('pointerdown', startBGM, { once: true });

// Volume slider (bottom-right corner)
const volWrap = document.createElement('div');
volWrap.style.cssText = 'position:fixed;bottom:16px;right:16px;display:flex;align-items:center;gap:6px;font-family:monospace;font-size:12px;color:#668899;pointer-events:auto;z-index:50';
volWrap.innerHTML = `🎵 <input id="volSlider" type="range" min="0" max="1" step="0.05" value="${bgm.volume}" style="width:72px;accent-color:#44aaff;cursor:pointer">`;
document.body.appendChild(volWrap);
document.getElementById('volSlider').addEventListener('input', e => {
  bgm.volume = parseFloat(e.target.value);
  localStorage.setItem('bgmVolume', bgm.volume);
});

// ── Renderer ──────────────────────────────────────────────────────────────────

// Games played counter
(function() {
  const plays = (parseInt(localStorage.getItem('up_plays') || '0')) + 1;
  localStorage.setItem('up_plays', plays);
  const el = document.getElementById('playsHUD');
  if (el) el.textContent = `▶ ${plays} play${plays === 1 ? '' : 's'}`;
})();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050d1a);
scene.fog = new THREE.FogExp2(0x0a1a2e, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

// Cap horizontal FOV at 80° so landscape/widescreen doesn't reveal dramatically more
function adaptFOV() {
  const aspect = window.innerWidth / window.innerHeight;
  const maxHRad = 80 * Math.PI / 180;
  const hRad = 2 * Math.atan(Math.tan(Math.PI / 3) * aspect); // based on vFOV=60°
  camera.fov = hRad > maxHRad
    ? (2 * Math.atan(Math.tan(maxHRad / 2) / aspect) * 180 / Math.PI)
    : 60;
  camera.updateProjectionMatrix();
}
adaptFOV();

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ── Lighting ──────────────────────────────────────────────────────────────────

scene.add(new THREE.AmbientLight(0x2255aa, 0.6));

const sun = new THREE.DirectionalLight(0xaaddff, 1.4);
sun.position.set(15, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
['left','right','top','bottom'].forEach((s,i) => sun.shadow.camera[s] = [-60,60,60,-60][i]);
sun.shadow.camera.far = 120;
scene.add(sun);

const rimLight = new THREE.PointLight(0x00aaff, 0.8, 60);
scene.add(rimLight);

// ── Ice Floor ─────────────────────────────────────────────────────────────────

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500, 80, 80),
  new THREE.MeshStandardMaterial({ color: 0x6ab8d4, roughness: 0.05, metalness: 0.4 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(500, 80, 0x88ccff, 0x224466);
grid.position.y = 0.01;
grid.material.opacity = 0.1;
grid.material.transparent = true;
scene.add(grid);

// ── Snow Patches ──────────────────────────────────────────────────────────────

const snowPatchMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 1.0 });
const snowPatches = [];
for (let i = 0; i < 120; i++) {
  const r  = Math.random() * 3.5 + 0.5;
  const px = (Math.random() - 0.5) * 200;
  const pz = (Math.random() - 0.5) * 200;
  // Skip patches inside the water zone (68, 68, r=32)
  if (Math.hypot(px - 68, pz - 68) < 34) continue;
  const p  = new THREE.Mesh(new THREE.CircleGeometry(r, 10), snowPatchMat);
  p.rotation.x = -Math.PI / 2;
  p.position.set(px, 0.012, pz);
  scene.add(p);
  snowPatches.push({ x: px, z: pz, r });
}

function isOnSnowPatch(x, z) {
  for (const sp of snowPatches) { if (Math.hypot(x - sp.x, z - sp.z) < sp.r) return true; }
  return false;
}

// ── Ice Crystals ──────────────────────────────────────────────────────────────

function makeCrystalCluster(x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x88ddff, roughness: 0.0, metalness: 0.6, transparent: true, opacity: 0.75 });
  [{ h:2.2,rx:0,rz:0,ox:0,oz:0 }, { h:1.6,rx:0.3,rz:0.2,ox:0.3,oz:0.1 },
   { h:1.3,rx:-0.2,rz:-0.3,ox:-0.25,oz:0.15 }, { h:1.0,rx:0.1,rz:-0.4,ox:0.1,oz:-0.3 }]
  .forEach(s => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.18, s.h, 6), mat);
    m.position.set(s.ox, s.h / 2, s.oz);
    m.rotation.set(s.rx, 0, s.rz);
    m.castShadow = true;
    g.add(m);
  });
  g.position.set(x, 0, z);
  scene.add(g);
}
// Spread clusters across the full new map
[
  [12,12],[-12,12],[12,-12],[-12,-12],[22,5],[-22,5],[22,-5],[-22,-5],
  [5,22],[-5,22],[5,-22],[-5,-22],[18,18],[-18,18],[18,-18],[-18,-18],
  [30,0],[-30,0],[0,30],[0,-30],[40,20],[-40,20],[40,-20],[-40,-20],
  [20,40],[-20,40],[20,-40],[-20,-40],[55,10],[-55,10],[55,-10],[-55,-10],
  [10,55],[-10,55],[10,-55],[-10,-55],[50,50],[-50,50],[50,-50],[70,30],[-70,-30]
].forEach(([x,z]) => makeCrystalCluster(x, z));

// ── Boundary Wall ─────────────────────────────────────────────────────────────

const ARENA = 96;

// Solid glowing wall around the arena border
const wallMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x224488, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });
const wallH = 4;
const wallT = 0.8;
[
  { w: ARENA*2+wallT*2, d: wallT, x: 0,      z: -ARENA },
  { w: ARENA*2+wallT*2, d: wallT, x: 0,      z:  ARENA },
  { w: wallT, d: ARENA*2,         x: -ARENA, z: 0      },
  { w: wallT, d: ARENA*2,         x:  ARENA, z: 0      },
].forEach(({w, d, x, z}) => {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  wall.position.set(x, wallH / 2, z);
  scene.add(wall);
  // Glowing top strip
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d + 0.1),
    new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x44aaff, emissiveIntensity: 2, roughness: 0 }));
  top.position.set(x, wallH + 0.15, z);
  scene.add(top);
});

// Corner pillars for extra clarity
const pillarMat = new THREE.MeshStandardMaterial({ color: 0x44aacc, emissive: 0x0044aa, emissiveIntensity: 0.8, roughness: 0.0, metalness: 0.7 });
[[-ARENA,-ARENA],[-ARENA,ARENA],[ARENA,-ARENA],[ARENA,ARENA]].forEach(([x,z]) => {
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 10, 8), pillarMat);
  pillar.position.set(x, 5, z);
  scene.add(pillar);
  const glow = new THREE.PointLight(0x44aaff, 2, 15);
  glow.position.set(x, 8, z);
  scene.add(glow);
});

// ── Mountain (North-West) ─────────────────────────────────────────────────────

const mountainColliders = []; // { x, z, r } for player collision

function buildMountain(cx, cz) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, roughness: 1.0 });
  const peaks = [
    { x: cx,     z: cz,     h: 22, r: 12 },
    { x: cx+10,  z: cz+8,   h: 16, r: 9  },
    { x: cx-8,   z: cz+10,  h: 14, r: 8  },
    { x: cx+5,   z: cz-10,  h: 12, r: 7  },
    { x: cx-12,  z: cz-4,   h: 10, r: 7  },
  ];
  peaks.forEach(({ x, z, h, r }) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), rockMat);
    peak.position.set(x, h / 2, z);
    peak.castShadow = true;
    scene.add(peak);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, h * 0.3, 8), snowMat);
    cap.position.set(x, h * 0.87, z);
    scene.add(cap);
    mountainColliders.push({ x, z, r }); // register for collision
  });
  for (let i = 0; i < 12; i++) {
    const bx = cx + (Math.random() - 0.5) * 30;
    const bz = cz + (Math.random() - 0.5) * 30;
    const bs = Math.random() * 2 + 1;
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(bs, 0), rockMat);
    boulder.position.set(bx, bs * 0.5, bz);
    boulder.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(boulder);
    mountainColliders.push({ x: bx, z: bz, r: bs * 1.2 });
  }
}
buildMountain(-20, -20);

// ── Water Zone (South-East) ───────────────────────────────────────────────────

const WATER_CX = 68, WATER_CZ = 68, WATER_R = 32;

const waterMesh = new THREE.Mesh(
  new THREE.CircleGeometry(WATER_R, 48),
  new THREE.MeshStandardMaterial({ color: 0x1166aa, emissive: 0x003366, emissiveIntensity: 0.4, roughness: 0.0, metalness: 0.5, transparent: true, opacity: 0.75 })
);
waterMesh.rotation.x = -Math.PI / 2;
waterMesh.position.set(WATER_CX, 0.02, WATER_CZ);
scene.add(waterMesh);

// Water glow light
const waterLight = new THREE.PointLight(0x0088ff, 1.5, 50);
waterLight.position.set(WATER_CX, 2, WATER_CZ);
scene.add(waterLight);

// Water edge label ring
const waterLabel = document.createElement('div');
waterLabel.style.cssText = 'display:none'; // shown via HUD when on water
document.body.appendChild(waterLabel);

function isInWater(x, z) {
  return Math.hypot(x - WATER_CX, z - WATER_CZ) < WATER_R;
}

// ── Falling Snow ──────────────────────────────────────────────────────────────

const SNOW_COUNT = 200;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(SNOW_COUNT * 3);
const snowVel = new Float32Array(SNOW_COUNT);
for (let i = 0; i < SNOW_COUNT; i++) {
  snowPos[i*3]   = (Math.random()-0.5)*100;
  snowPos[i*3+1] = Math.random()*30;
  snowPos[i*3+2] = (Math.random()-0.5)*100;
  snowVel[i] = Math.random()*2+1;
}
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowPoints = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 }));
scene.add(snowPoints);

// ── Geometry merge helpers ────────────────────────────────────────────────────
function mergeGeos(geos) {
  let totalV = 0, totalI = 0;
  for (const g of geos) { totalV += g.attributes.position.count; if (g.index) totalI += g.index.count; }
  const posArr = new Float32Array(totalV * 3);
  const norArr = new Float32Array(totalV * 3);
  const idxArr = totalI ? new Uint32Array(totalI) : null;
  let vOff = 0, iOff = 0;
  for (const g of geos) {
    const vc = g.attributes.position.count;
    posArr.set(g.attributes.position.array, vOff * 3);
    if (g.attributes.normal) norArr.set(g.attributes.normal.array, vOff * 3);
    if (g.index && idxArr) {
      const ia = g.index.array;
      for (let i = 0; i < ia.length; i++) idxArr[iOff + i] = ia[i] + vOff;
      iOff += ia.length;
    }
    vOff += vc;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  out.setAttribute('normal',   new THREE.BufferAttribute(norArr, 3));
  if (idxArr) out.setIndex(new THREE.BufferAttribute(idxArr, 1));
  return out;
}

// Takes an array of Mesh objects (not in scene), groups by material, merges geometry per group.
// Disposes source geometries. Returns a Group with one Mesh per unique material.
function buildMergedGroup(meshes) {
  const byMat = new Map();
  for (const mesh of meshes) {
    mesh.updateMatrix();
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    mesh.geometry.dispose();
    if (!byMat.has(mesh.material)) byMat.set(mesh.material, []);
    byMat.get(mesh.material).push(geo);
  }
  const g = new THREE.Group();
  for (const [mat, geos] of byMat) {
    const merged = mergeGeos(geos);
    for (const geo of geos) geo.dispose();
    g.add(new THREE.Mesh(merged, mat));
  }
  return g;
}

function makeElite(group) {
  group.traverse(child => {
    if (!child.isMesh) return;
    const old = child.material;
    child.material = old.clone();
    child.material.emissive = new THREE.Color(0xffaa00);
    child.material.emissiveIntensity = 0.5;
    old.dispose();
  });
}

// ── Models ────────────────────────────────────────────────────────────────────

function buildPenguin() {
  const g = new THREE.Group();
  const black  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const white  = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), black);
  body.scale.set(1, 1.3, 1); body.position.y = 0.65; body.castShadow = true;
  g.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), white);
  belly.scale.set(1, 1.2, 0.55); belly.position.set(0, 0.63, 0.3);
  g.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), black);
  head.position.y = 1.38; 
  g.add(head);

  [-0.12, 0.12].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), white);
    eye.position.set(x, 1.44, 0.27); g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.033, 8, 8), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    pupil.position.set(x, 1.44, 0.33); g.add(pupil);
  });

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 8), orange);
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.36, 0.44);
  g.add(beak);

  [-1, 1].forEach(side => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), black);
    wing.scale.set(0.35, 0.85, 0.28); wing.position.set(side * 0.53, 0.72, 0);
    wing.rotation.z = side * 0.35; wing.castShadow = true;
    g.add(wing);
  });

  [-0.17, 0.17].forEach(x => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.28), orange);
    foot.position.set(x, 0.025, 0.08); g.add(foot);
  });

  return g;
}

function buildEvilPenguin() {
  const g = new THREE.Group();
  const gray    = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.85 });
  const dkgray  = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.85 });
  const white   = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });
  const redEye  = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, roughness: 0.3 });
  const redPup  = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x440000, roughness: 0.3 });
  const darkbeak= new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.7 });

  // Chubby body — wider & rounder than normal penguin
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), dkgray);
  body.scale.set(1.25, 1.3, 1.15); body.position.y = 0.65; body.castShadow = true;
  g.add(body);

  // White belly patch
  // Dark outline ring sits slightly behind the white patch
  const bellyRing = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), dkgray);
  bellyRing.scale.set(1.15, 1.3, 0.65); bellyRing.position.set(0, 0.62, 0.27);
  g.add(bellyRing);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), white);
  belly.scale.set(1.0, 1.1, 0.65); belly.position.set(0, 0.62, 0.32);
  g.add(belly);

  // Head — slightly bigger/rounder
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), dkgray);
  head.position.y = 1.42;
  g.add(head);

  // Angry brow ridge — dark bars angled inward
  [-0.12, 0.12].forEach(x => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.06), gray);
    brow.position.set(x, 1.62, 0.27);
    brow.rotation.z = x > 0 ? 0.45 : -0.45; // angled inward = angry
    g.add(brow);
  });

  // Red glowing eyes
  [-0.13, 0.13].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), redEye);
    eye.position.set(x, 1.46, 0.29); g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), redPup);
    pupil.position.set(x, 1.46, 0.355); g.add(pupil);
  });

  // Dark beak — slightly downturned (evil frown)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 8), darkbeak);
  beak.rotation.x = Math.PI / 2 + 0.18; // tilt down for frown
  beak.position.set(0, 1.34, 0.45);
  g.add(beak);

  // Chubby wings
  [-1, 1].forEach(side => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), gray);
    wing.scale.set(0.38, 0.88, 0.3); wing.position.set(side * 0.6, 0.7, 0);
    wing.rotation.z = side * 0.3; wing.castShadow = true;
    g.add(wing);
  });

  // Dark feet
  [-0.19, 0.19].forEach(x => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.3), darkbeak);
    foot.position.set(x, 0.025, 0.09); g.add(foot);
  });

  return g;
}

function buildHumanPlayer() {
  const g = new THREE.Group();
  g.rotation.y = Math.PI;
  const skin    = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
  const shirt   = new THREE.MeshStandardMaterial({ color: 0x3a9a3a, roughness: 0.8 });
  const pants   = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.9 });
  const gunMat  = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
  const black   = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const blonde  = new THREE.MeshStandardMaterial({ color: 0xf0d050, roughness: 0.8 });

  // Legs
  [-0.15, 0.15].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.7, 8), pants);
    leg.position.set(x, 0.55, 0); g.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), black);
    shoe.position.set(x, 0.17, -0.04); g.add(shoe);
  });

  // Torso — wide shoulders, narrow waist (human silhouette)
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.36), shirt);
  shoulders.position.y = 1.42; g.add(shoulders);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.34), shirt);
  chest.position.y = 1.2; g.add(chest);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.3), shirt);
  waist.position.y = 0.98; g.add(waist);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 8), skin);
  neck.position.y = 1.56; g.add(neck);

  // Head — round sphere
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skin);
  head.scale.set(1.0, 1.12, 1.0); head.position.y = 1.82; g.add(head);

  // Hair — blonde dome
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), blonde);
  hair.position.y = 1.90; g.add(hair);
  // Side hair strands for volume
  [-0.18, 0.18].forEach(x => {
    const strand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), blonde);
    strand.scale.set(0.6, 1.0, 0.7); strand.position.set(x, 1.84, 0.02); g.add(strand);
  });

  // Eyes
  [-0.08, 0.08].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), black);
    eye.position.set(x, 1.84, -0.2); g.add(eye);
  });

  // Arms — cylinders off shoulders
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.62, 8), shirt);
  armL.position.set(-0.42, 1.18, 0); g.add(armL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 8), shirt);
  armR.position.set(0.42, 1.32, 0.12); armR.rotation.x = -0.65; g.add(armR);

  // Rifle — barrel + stock
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), gunMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0.38, 1.38, -0.48); g.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.3), woodMat);
  stock.position.set(0.38, 1.22, -0.06); g.add(stock);

  return g;
}

function buildWizardCat() {
  const g = new THREE.Group();
  const purple     = new THREE.MeshStandardMaterial({ color: 0x7b3fa0, roughness: 0.8 });
  const dpurple    = new THREE.MeshStandardMaterial({ color: 0x4a1a6a, roughness: 0.8 });
  const lpurple    = new THREE.MeshStandardMaterial({ color: 0xaa66cc, roughness: 0.8 });
  const white      = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9 });
  const black      = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const gold       = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0x886600, roughness: 0.4 });
  const eyeGreen   = new THREE.MeshStandardMaterial({ color: 0x22ee88, emissive: 0x005522, roughness: 0.3 });

  // Body — round chubby
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), purple);
  body.scale.set(1.1, 1.15, 1.0); body.position.y = 0.55; body.castShadow = true;
  g.add(body);

  // Chest fluff
  const fluff = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), lpurple);
  fluff.scale.set(1.0, 1.1, 0.5); fluff.position.set(0, 0.55, 0.36);
  g.add(fluff);

  // Head — oval (wider than tall)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), purple);
  head.scale.set(1.2, 1.0, 1.05); head.position.y = 1.32;
  g.add(head);

  // Big eyes — white outline, black inner
  [-0.16, 0.16].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), white);
    eye.position.set(x, 1.36, 0.33); eye.scale.set(1, 1.2, 0.9);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), black);
    pupil.position.set(x, 1.36, 0.39);
    g.add(pupil);
  });

  // Button nose — pink sphere
  const pink = new THREE.MeshStandardMaterial({ color: 0xff66aa, roughness: 0.6 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), pink);
  nose.scale.set(1.1, 0.8, 0.9); nose.position.set(0, 1.28, 0.42);
  g.add(nose);

  // Whiskers — thicker, light purple (same as belly)
  [-1, 1].forEach(side => {
    [0.05, -0.05].forEach(oy => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, 0.018), lpurple);
      w.position.set(side * 0.34, 1.27 + oy, 0.36);
      w.rotation.z = side * 0.08;
      g.add(w);
    });
  });

  // Cat ears — poke through the hat sides just above the brim
  [-0.27, 0.27].forEach(x => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.63, 6), dpurple);
    ear.position.set(x, 2.02, 0.0);
    ear.rotation.z = x > 0 ? -0.35 : 0.35;
    g.add(ear);
    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.0825, 0.39, 6), lpurple);
    innerEar.position.set(x, 2.02, 0.02);
    innerEar.rotation.z = x > 0 ? -0.35 : 0.35;
    g.add(innerEar);
  });

  // Hat brim — flat disc
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 16), dpurple);
  brim.position.set(0, 1.74, 0);
  g.add(brim);

  // Hat cone — tall pointed
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 16), dpurple);
  hat.position.set(0, 2.35, 0);
  g.add(hat);

  // Gold star on hat
  const star = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), gold);
  star.position.set(0, 2.93, 0);
  g.add(star);

  // Hat band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.08, 16), gold);
  band.position.set(0, 1.84, 0);
  g.add(band);

  // Arms
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), purple);
    arm.scale.set(0.4, 0.9, 0.35); arm.position.set(side * 0.55, 0.6, 0.05);
    arm.rotation.z = side * 0.5;
    g.add(arm);
  });

  // Tail — curved back
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.9, 8), purple);
  tail.position.set(0.0, 0.55, -0.72);
  tail.rotation.x = -1.1; tail.rotation.z = 0.15;
  g.add(tail);

  // Feet
  [-0.18, 0.18].forEach(x => {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), dpurple);
    foot.scale.set(1.2, 0.6, 1.4); foot.position.set(x, 0.08, 0.1);
    g.add(foot);
  });

  return g;
}

function buildSeal() {
  const dark  = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8 });
  const light = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.9 });
  const spot  = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.9 });
  const eye   = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const parts = [];

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), dark);
  body.scale.set(2.2, 0.7, 0.9); body.position.y = 0.42; parts.push(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 7, 5), light);
  belly.scale.set(1.8, 0.5, 0.6); belly.position.set(0, 0.38, 0.3); parts.push(belly);

  [[-0.3,0.6,0.2],[0.2,0.55,-0.25],[0.6,0.65,0.1],[-0.7,0.6,-0.1]].forEach(([x,y,z]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), spot);
    s.scale.set(1.5, 0.3, 1.5); s.position.set(x, y, z); parts.push(s);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 6), dark);
  head.scale.set(1.1, 0.9, 1.0); head.position.set(1.4, 0.58, 0); parts.push(head);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), light);
  snout.scale.set(1.0, 0.7, 0.8); snout.position.set(1.78, 0.52, 0); parts.push(snout);

  [-0.18, 0.18].forEach(z => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 6), eye);
    e.position.set(1.6, 0.68, z); parts.push(e);
    const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), light);
    g2.position.set(1.65, 0.7, z + 0.04); parts.push(g2);
  });

  [-1, 1].forEach(side => {
    const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 6), dark);
    f1.scale.set(0.8, 0.18, 1.6); f1.position.set(0.8, 0.15, side * 0.75);
    f1.rotation.y = side * 0.3; parts.push(f1);
    const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), dark);
    f2.scale.set(0.6, 0.15, 1.4); f2.position.set(-1.3, 0.18, side * 0.5);
    f2.rotation.y = side * 0.5; parts.push(f2);
  });

  return buildMergedGroup(parts); // 4 draw calls → replaces ~16
}

function buildSkua() {
  const brown = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.9 });
  const yell  = new THREE.MeshStandardMaterial({ color: 0xccaa00, roughness: 0.7 });
  const parts = [];

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 7, 5), brown);
  body.scale.set(1.4, 0.8, 1.0); parts.push(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), dark);
  head.position.set(0.5, 0.15, 0); parts.push(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), yell);
  beak.rotation.z = -Math.PI / 2; beak.position.set(0.82, 0.1, 0); parts.push(beak);

  [-1, 1].forEach(side => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), brown);
    wing.scale.set(0.3, 0.1, 2.2); wing.position.set(0, 0, side * 1.2);
    wing.rotation.x = side * 0.15; parts.push(wing);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), dark);
    tip.scale.set(0.25, 0.08, 0.8); tip.position.set(-0.1, -0.05, side * 2.2); parts.push(tip);
  });

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 6), dark);
  tail.rotation.z = Math.PI / 2; tail.position.set(-0.7, -0.05, 0); parts.push(tail);

  const g = buildMergedGroup(parts); // 3 draw calls → replaces ~8
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// ── Player ────────────────────────────────────────────────────────────────────

// Wrapper group controls position/rotation; model inside is pre-rotated 180°
const player = new THREE.Group();
const selectedSkin = localStorage.getItem('playerSkin') || 'normal';

// Placeholder mesh shown until FBX loads
const penguinMesh = new THREE.Group();
penguinMesh.rotation.y = Math.PI;
player.add(penguinMesh);

const builtModel = selectedSkin === 'evil' ? buildEvilPenguin() : selectedSkin === 'wizard' ? buildWizardCat() : selectedSkin === 'human' ? buildHumanPlayer() : buildPenguin();
penguinMesh.add(builtModel);
player.position.set(35, 0, 25);
scene.add(player);

const playerState = { hp: 100, maxHp: 100, iframes: 0, dead: false,
  shaggyCharges: 0, shaggyMaxCharges: 0, shaggyRechargeTimer: 0 };

// ── Player Stats (tome upgrades) ──────────────────────────────────────────────

const playerStats = {
  damage:          1.0,
  critChance:      0,
  attackRate:      1.0,  // snowball fire rate multiplier
  weaponCooldown:  1.0,  // weapon fire rate multiplier (Cooldown Tome)
  projCount:       1,
  projExtraChance: 0,
  projSize:        1.0,
  projSpeed:       1.0,
  maxShield:       0,
  shield:          0,
  shieldRecharge:  0,
  shieldDmgTimer:  0,    // seconds since last shield damage (regen blocked for 30s)
  evasion:         0,
  lifesteal:       0,
  moveSpeed:       1.0,
  pickupRadius:    0.7,
  knockback:       0,
  cursed:          0,
  boomerang:       false,
  iframeDuration:  1.0,
  shaggyStacks:    0,
};

const tomeStacks = {};

// "You obtained ADHD" message for Phrico Rico
const adhdMsg = document.createElement('div');
adhdMsg.style.cssText = 'display:none;position:fixed;top:30%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:20px;font-weight:bold;color:#aaff44;text-shadow:0 0 16px #88ff00;pointer-events:none;z-index:400;letter-spacing:2px;opacity:0;transition:opacity 0.4s';
adhdMsg.textContent = 'You obtained ADHD!';
document.body.appendChild(adhdMsg);
function showAdhdMsg() {
  adhdMsg.style.display = 'block'; adhdMsg.style.opacity = '1';
  clearTimeout(adhdMsg._t);
  adhdMsg._t = setTimeout(() => { adhdMsg.style.opacity = '0'; setTimeout(() => { adhdMsg.style.display = 'none'; }, 400); }, 4000);
}

const TOME_DEFS = [
  { id:'damage',     name:'Damage Tome',           emoji:'⚔️',  color:'#ff6644', desc:'+10% snowball damage',      apply: s => { s.damage     *= 1.1; } },
  { id:'precision',  name:'Precision Tome',        emoji:'🎯',  color:'#ffaa22', desc:'+5% critical hit chance',   apply: s => { s.critChance  = Math.min(0.9, s.critChance+0.05); } },
  { id:'cooldown',   name:'Cooldown Tome',         emoji:'⚡',  color:'#ffdd44', desc:'-8% weapon cooldown',       apply: s => { s.weaponCooldown *= 0.92; } },
  { id:'atkspeed',   name:'Attack Speed Tome',     emoji:'🏹',  color:'#ffcc44', desc:'+8% snowball attack speed',  apply: s => { s.attackRate *= 0.92; } },
  { id:'quantity',   name:'Quantity Tome',         emoji:'❄️',  color:'#aaddff', desc:'+1 snowball (50% less each stack)', apply: (s) => {
    const stacks = tomeStacks['quantity'] || 0;
    if (stacks === 0) { s.projCount += 1; }
    else { s.projExtraChance = Math.min(1, (s.projExtraChance||0) + 0.5); }
    if (playerState.shaggyMaxCharges > 0) {
      playerState.shaggyMaxCharges++;
      playerState.shaggyCharges = Math.min(playerState.shaggyCharges + 1, playerState.shaggyMaxCharges);
    }
  }},
  { id:'size',       name:'Size Tome',             emoji:'🔮',  color:'#cc88ff', desc:'+20% projectile size',      apply: s => { s.projSize   *= 1.2; } },
  { id:'projspeed',  name:'Speed Tome',            emoji:'💨',  color:'#88ffcc', desc:'+15% projectile speed',     apply: s => { s.projSpeed  *= 1.15; } },
  { id:'shield',     name:'Shield Tome',           emoji:'🛡️', color:'#44aaff', desc:'+1 shield charge',          apply: s => { s.maxShield += 1; s.shield = s.maxShield; updateHUD(); } },
  { id:'evasion',    name:'Evasion Tome',          emoji:'🌀',  color:'#44ffaa', desc:'+10% dodge chance',         apply: s => { s.evasion    = Math.min(0.7, s.evasion+0.1); } },
  { id:'bloody',     name:'Bloody Tome',           emoji:'🩸',  color:'#ff4466', desc:'+20% lifesteal on hit',     apply: s => { s.lifesteal  = Math.min(1, s.lifesteal+0.2); } },
  { id:'hp',         name:'HP Tome',               emoji:'💙',  color:'#2266ff', desc:'+25 max HP',                apply: s => { s.maxShield += 1; s.shield = s.maxShield; playerState.maxHp+=25; playerState.hp+=25; updateHUD(); } },
  { id:'phrico',     name:'Phrico Rico',            emoji:'🌪️', color:'#aaff44', desc:'+4% movement speed. "You obtained ADHD!"', apply: s => { s.moveSpeed *= 1.04; showAdhdMsg(); } },
  { id:'attraction', name:'Attraction Tome',       emoji:'🧲',  color:'#ffaa44', desc:'+1 pickup radius',          apply: s => { s.pickupRadius += 1; } },
  { id:'knockback',  name:'Knockback Tome',        emoji:'💥',  color:'#ff8844', desc:'+1.5 knockback on hit',     apply: s => { s.knockback  += 1.5; } },
  { id:'cursed',     name:'Cursed Tome',           emoji:'💀',  color:'#884400', desc:'+25% spawn rate, +30% enemy HP', apply:s => { s.cursed += 1; } },
  { id:'chaos',      name:'Chaos Tome',            emoji:'🎲',  color:'#ff44ff', desc:'Random tome effect!',        apply: (s, chaos) => chaos() },
  { id:'hasper',     name:'Deveh',        emoji:'🪃',  color:'#ffaa88', desc:'Boomerang snowball — deals damage both ways, +0.5 damage. Next shot waits for return.', apply: s => { s.boomerang = true; s.damage += 0.5; } },
  { id:'shaggy',    name:'Shaggy',                emoji:'🦬', color:'#cc9966', desc:'Absorb 1 hit (0.5s iframes). Refresh after 15s. Each pick: +0.2 damage.', apply: s => {
    s.shaggyStacks = Math.max(1, s.shaggyStacks + 1);
    s.damage += 0.2;
    if (playerState.shaggyMaxCharges === 0) {
      playerState.shaggyMaxCharges = 1;
      playerState.shaggyCharges = 1;
    }
    playerState.shaggyRechargeTimer = 0;
    ensureShaggyRing();
  }},
];

// ── Weapons ───────────────────────────────────────────────────────────────────

const WEAPON_DEFS = [
  {
    id:       'gandalf_staff',
    name:     'Staff of Gandalf',
    emoji:    '🪄',
    color:    '#ffffff',
    desc:     'Every 2.5s, strikes a random enemy within range 10. Pick again to add +1 shock.',
    isWeapon: true,
    cooldown: 2.5,
  },
  {
    id:       'aura_farmer',
    name:     'Aura Farmer',
    emoji:    '🌀',
    color:    '#ff4444',
    desc:     'Every 2s, damages ALL enemies in radius 3 (scales with Size Tome).',
    isWeapon: true,
    cooldown: 2.0,
  },
  {
    id:       'toxic_friend',
    name:     'Toxic Friend',
    emoji:    '☠️',
    color:    '#88ff44',
    desc:     'Slows enemies within radius 2 by 20%. Pick again for +5% slow.',
    isWeapon: true,
    cooldown: 0,
  },
  {
    id:       'homhomnomnom',
    name:     'Homhomnomnom',
    emoji:    '🍡',
    color:    '#ffffff',
    desc:     'Every 10s fires a piercing orb through all enemies in its path (range 12).',
    isWeapon: true,
    cooldown: 10.0,
  },
];

const equippedWeapons = new Set();   // supports multiple weapons at once
const weaponTimers    = {};          // per-weapon cooldown timers
const weaponStacks    = {};          // extra hits per proc (gandalf_staff stacks here)

function showLightningStrike(x, z) {
  const boltH = 18;
  const geo  = new THREE.CylinderGeometry(0.04, 0.18, boltH, 6);
  const mat  = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 1.0 });
  const bolt = new THREE.Mesh(geo, mat);
  bolt.position.set(x, boltH / 2, z);
  scene.add(bolt);

  // Point light flash at ground level
  const light = new THREE.PointLight(0x8888ff, 10, 14);
  light.position.set(x, 0.5, z);
  scene.add(light);

  let age = 0;
  const tick = setInterval(() => {
    age += 0.05;
    mat.opacity    = Math.max(0, 1.0 - age * 4);
    light.intensity = Math.max(0, 10 - age * 40);
    if (age >= 0.35) {
      clearInterval(tick);
      scene.remove(bolt);
      scene.remove(light);
      geo.dispose();
      mat.dispose();
    }
  }, 50);
}

const gandalfRecentlyHit = new Set(); // enemies hit this cycle — cleared when all in range used
function fireGandalfStaff() {
  const px = player.position.x, pz = player.position.z;
  const stacks = weaponStacks['gandalf_staff'] || 1;
  const range  = 10 * playerStats.projSize * (1 + (stacks - 1) * 0.15);
  const pool = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dead || !e.mesh) continue;
    const dx = e.mesh.position.x - px, dz = e.mesh.position.z - pz;
    if (dx * dx + dz * dz <= range * range) pool.push(e);
  }
  if (!pool.length) return;
  // Avoid repeating targets — reset cycle when all in range have been hit
  const fresh = [];
  for (let i = 0; i < pool.length; i++) { if (!gandalfRecentlyHit.has(pool[i])) fresh.push(pool[i]); }
  if (!fresh.length) gandalfRecentlyHit.clear();
  const available = (fresh.length ? fresh : pool).slice();
  const targets = [];
  for (let i = 0; i < stacks && available.length; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const t = available.splice(idx, 1)[0];
    targets.push(t);
    gandalfRecentlyHit.add(t);
  }
  targets.forEach(target => {
    const isCrit = Math.random() < playerStats.critChance;
    target.hp -= SNOWBALL_DAMAGE * playerStats.damage * (isCrit ? 2 : 1) * (1 + playerStats.projSize * 0.5 - 0.5);
    if (playerStats.knockback > 0 && target.mesh) {
      const dx = target.mesh.position.x - px, dz = target.mesh.position.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      target.mesh.position.x += (dx / dist) * playerStats.knockback;
      target.mesh.position.z += (dz / dist) * playerStats.knockback;
    }
    showLightningStrike(target.mesh.position.x, target.mesh.position.z);
  });
  if (playerStats.lifesteal > 0 && playerStats.shieldDmgTimer <= 0 && Math.random() < playerStats.lifesteal && playerStats.shield < playerStats.maxShield) {
    playerStats.shield = Math.min(playerStats.maxShield, playerStats.shield + 1);
    updateHUD();
  }
}

// Aura Farmer persistent ring — outer edge indicator, scales with projSize
const auraRingMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
let   auraRingMesh = null;
let   auraRingLastSize = -1;

function getAuraRadius() { return 3 * playerStats.projSize; }

function updateAuraRing() {
  const r = getAuraRadius();
  if (r !== auraRingLastSize) {
    if (auraRingMesh) { scene.remove(auraRingMesh); auraRingMesh.geometry.dispose(); }
    const geo = new THREE.RingGeometry(r - 0.12, r, 48);
    auraRingMesh = new THREE.Mesh(geo, auraRingMat);
    auraRingMesh.rotation.x = -Math.PI / 2;
    scene.add(auraRingMesh);
    auraRingLastSize = r;
  }
  auraRingMesh.position.x = player.position.x;
  auraRingMesh.position.z = player.position.z;
  auraRingMat.opacity = 0.5 + Math.sin(frameTime * 1000 / 350) * 0.15;
}

function showAuraDamageFlash(px, pz) {
  const r   = getAuraRadius();
  const geo  = new THREE.CircleGeometry(r, 20);
  const mat  = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(geo, mat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.set(px, 0.08, pz);
  scene.add(fill);

  let age = 0;
  const tick = setInterval(() => {
    age += 0.05;
    mat.opacity = Math.max(0, 0.35 - age * 1.5);
    if (age >= 0.35) {
      clearInterval(tick);
      scene.remove(fill);
      geo.dispose(); mat.dispose();
    }
  }, 50);
}

function fireAuraFarmer() {
  const px = player.position.x, pz = player.position.z;
  const r = getAuraRadius();
  const inRange = [];
  const r2 = r * r;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dead || !e.mesh) continue;
    const dx = e.mesh.position.x - px, dz = e.mesh.position.z - pz;
    if (dx * dx + dz * dz <= r2) inRange.push(e);
  }
  // always show flash even if no enemies (so player sees the aura active)
  showAuraDamageFlash(px, pz);
  if (!inRange.length) return;
  inRange.forEach(e => {
    const isCrit = Math.random() < playerStats.critChance;
    e.hp -= SNOWBALL_DAMAGE * playerStats.damage * (isCrit ? 2 : 1);
    if (playerStats.knockback > 0 && e.mesh) {
      const dx = e.mesh.position.x - px, dz = e.mesh.position.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      e.mesh.position.x += (dx / dist) * playerStats.knockback;
      e.mesh.position.z += (dz / dist) * playerStats.knockback;
    }
  });
  if (playerStats.lifesteal > 0 && playerStats.shieldDmgTimer <= 0 && Math.random() < playerStats.lifesteal && playerStats.shield < playerStats.maxShield) {
    playerStats.shield = Math.min(playerStats.maxShield, playerStats.shield + 1);
    updateHUD();
  }
}

function tickWeapons(dt) {
  if (!equippedWeapons.size || choosingTome || playerState.dead) return;
  equippedWeapons.forEach(id => {
    const def = WEAPON_DEFS.find(w => w.id === id);
    weaponTimers[id] = (weaponTimers[id] || 0) - dt;
    if (weaponTimers[id] <= 0) {
      weaponTimers[id] = def.cooldown * playerStats.weaponCooldown;
      if (id === 'gandalf_staff') fireGandalfStaff();
      if (id === 'aura_farmer')    fireAuraFarmer();
      if (id === 'homhomnomnom')   fireNomOrb();
    }
  });
}

// Toxic Friend persistent ring (follows player when equipped)
// Toxic Friend — stationary dropped pools
const toxicPools = [];
const TOXIC_POOL_DURATION = 0.5;
const TOXIC_POOL_INTERVAL = 5;

function getToxicRadius() { return playerStats.projSize * (0.8 + (weaponStacks['toxic_friend'] || 1) * 0.2); }

function dropToxicPool() {
  const x = player.position.x, z = player.position.z;
  const r = getToxicRadius();
  const geo = new THREE.RingGeometry(r - 0.12, r, 40);
  const mat = new THREE.MeshBasicMaterial({ color: 0x88ff44, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.08, z);
  scene.add(mesh);
  toxicPools.push({ mesh, mat, x, z, r, life: TOXIC_POOL_DURATION });
}

function toxicExplosion(x, z, r) {
  const geo = new THREE.CircleGeometry(r, 40);
  const mat = new THREE.MeshBasicMaterial({ color: 0x88ff44, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(geo, mat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.set(x, 0.1, z);
  scene.add(fill);
  const light = new THREE.PointLight(0x88ff44, 8, r * 4);
  light.position.set(x, 1, z);
  scene.add(light);
  let age = 0;
  const tick = setInterval(() => {
    age += 0.05;
    mat.opacity = Math.max(0, 0.7 - age * 3.5);
    light.intensity = Math.max(0, 8 - age * 40);
    if (age >= 0.4) { clearInterval(tick); scene.remove(fill); scene.remove(light); geo.dispose(); mat.dispose(); }
  }, 50);
}

function updateToxicPools(dt) {
  for (let i = toxicPools.length - 1; i >= 0; i--) {
    const p = toxicPools[i];
    p.life -= dt;
    p.mat.opacity = Math.max(0, 0.6 * (p.life / TOXIC_POOL_DURATION));
    if (p.life <= 0) {
      // Explode — damage all enemies in radius
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (!e.dead && e.mesh && Math.sqrt((e.mesh.position.x-p.x)**2+(e.mesh.position.z-p.z)**2) < p.r) {
          const isCrit = Math.random() < playerStats.critChance;
          e.hp -= SNOWBALL_DAMAGE * playerStats.damage * (isCrit ? 2 : 1);
          if (e.hp <= 0) {
            if (e.elite) spawnMapItem(e.mesh.position.x, e.mesh.position.z);
            if (e.type === 'seal') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, e.elite ? 5 : 1);
            if (e.type === 'belgica') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, 1);
            killCount++; killHUDEl.textContent = `☠ ${killCount}`;
            disposeMesh(e.mesh); scene.remove(e.mesh); enemies.splice(j, 1);
          }
        }
      }
      toxicExplosion(p.x, p.z, p.r);
      scene.remove(p.mesh); p.mat.dispose(); p.mesh.geometry.dispose();
      toxicPools.splice(i, 1);
    }
  }
}

// Shaggy gold ring (created lazily when first needed)
let shaggyRing = null, shaggyRingMat = null;
function ensureShaggyRing() {
  if (shaggyRing) return;
  shaggyRingMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
  const geo = new THREE.RingGeometry(0.85, 1.0, 40);
  shaggyRing = new THREE.Mesh(geo, shaggyRingMat);
  shaggyRing.rotation.x = -Math.PI / 2;
  shaggyRing.position.y = 0.1;
  shaggyRing.visible = false;
  scene.add(shaggyRing);
}

function applyWeapon(id) {
  if (equippedWeapons.has(id)) {
    weaponStacks[id] = (weaponStacks[id] || 1) + 1;
  } else {
    equippedWeapons.add(id);
    weaponStacks[id] = 1;
    weaponTimers[id] = 0;
    if (id === 'toxic_friend') { dropToxicPool(); weaponTimers['toxic_drop'] = TOXIC_POOL_INTERVAL; }
  }
}

function getToxicSlow() {
  const stacks = weaponStacks['toxic_friend'] || 1;
  return 1 - Math.min(0.8, 0.15 + 0.05 * stacks);
}

// ── HUD ───────────────────────────────────────────────────────────────────────

const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none';
document.body.appendChild(hud);

const hpLabel = document.createElement('div');
hpLabel.style.cssText = 'color:#aee8ff;font-family:monospace;font-size:13px;text-shadow:0 0 6px #44aaff';
hpLabel.textContent = `HP  ${playerState.hp} / ${playerState.maxHp}`;
hud.appendChild(hpLabel);

const hpBarOuter = document.createElement('div');
hpBarOuter.style.cssText = 'width:180px;height:12px;background:#0a2233;border:1px solid #44aaff;border-radius:6px;overflow:hidden';
const hpBarInner = document.createElement('div');
hpBarInner.style.cssText = 'width:100%;height:100%;background:#22ccff;border-radius:6px;transition:width 0.2s';
hpBarOuter.appendChild(hpBarInner);
hud.appendChild(hpBarOuter);

const shieldRow = document.createElement('div');
shieldRow.style.cssText = 'display:none;flex-direction:column;align-items:center;gap:4px';
const shieldLabel = document.createElement('div');
shieldLabel.style.cssText = 'color:#aaffee;font-family:monospace;font-size:11px';
shieldLabel.textContent = 'SHIELD';
const shieldBarOuter = document.createElement('div');
shieldBarOuter.style.cssText = 'width:180px;height:8px;background:#0a2233;border:1px solid #44ffcc;border-radius:4px;overflow:hidden';
const shieldBarInner = document.createElement('div');
shieldBarInner.style.cssText = 'width:100%;height:100%;background:#44ffcc;border-radius:4px;transition:width 0.2s';
shieldBarOuter.appendChild(shieldBarInner);
shieldRow.appendChild(shieldLabel);
shieldRow.appendChild(shieldBarOuter);
hud.insertBefore(shieldRow, hpLabel);

// XP bar — right side
const xpRow = document.createElement('div');
xpRow.style.cssText = 'position:fixed;bottom:8px;right:10%;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none';
const xpLabelEl = document.createElement('div');
xpLabelEl.style.cssText = 'color:#ffee44;font-family:monospace;font-size:11px;text-shadow:0 0 6px #ffaa00';
xpLabelEl.textContent = 'LVL 1 — XP 0 / 3';
const xpBarOuter = document.createElement('div');
xpBarOuter.style.cssText = 'width:180px;height:6px;background:#1a1400;border:1px solid #ffaa0066;border-radius:3px;overflow:hidden';
const xpBarInner = document.createElement('div');
xpBarInner.style.cssText = 'width:0%;height:100%;background:#ffcc00;border-radius:3px;transition:width 0.2s';
xpBarOuter.appendChild(xpBarInner);
xpRow.appendChild(xpLabelEl);
xpRow.appendChild(xpBarOuter);
document.body.appendChild(xpRow);

let crackJumps = 0;
const CRACK_MILESTONE = 20;

// Crack jump progress HUD
const crackHUD = document.createElement('div');
crackHUD.style.cssText = 'position:fixed;bottom:24px;left:10%;pointer-events:none;display:flex;flex-direction:column;align-items:flex-start;gap:3px';
const crackHUDLabel = document.createElement('div');
crackHUDLabel.style.cssText = 'color:#aee8ff;font-family:monospace;font-size:12px;text-shadow:0 0 6px #44aaff';
crackHUDLabel.textContent = `🧊 0 / ${CRACK_MILESTONE}`;
const crackHUDPips = document.createElement('div');
crackHUDPips.style.cssText = 'display:flex;gap:2px;flex-wrap:wrap;max-width:130px';
for (let i = 0; i < CRACK_MILESTONE; i++) {
  const pip = document.createElement('div');
  pip.style.cssText = 'width:8px;height:8px;border-radius:2px;border:1px solid #44aaff44;background:#0a2233';
  crackHUDPips.appendChild(pip);
}
crackHUD.appendChild(crackHUDLabel);
crackHUD.appendChild(crackHUDPips);
document.body.appendChild(crackHUD);

function updateJumpHUD() {
  const progress = crackJumps % CRACK_MILESTONE;
  crackHUDLabel.textContent = `🧊 ${progress} / ${CRACK_MILESTONE}`;
  const pips = crackHUDPips.children;
  for (let i = 0; i < CRACK_MILESTONE; i++) {
    pips[i].style.background = i < progress ? '#44aaff' : '#0a2233';
    pips[i].style.borderColor = i < progress ? '#88ddff' : '#44aaff44';
  }
}

// ── Temporary Power-Up System ─────────────────────────────────────────────────

const activePowerUps = {}; // id → timer remaining

const POWER_UP_DEFS = [
  {
    id: 'aoe_bomb', name: 'AoE Bomb', emoji: '💣', color: '#ff6600',
    desc: 'Instantly obliterate all enemies within 10 units.',
    instant: true,
    apply: () => {
      const px = player.position.x, pz = player.position.z;
      explode(px, pz, 0xff0000);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e.mesh) continue;
        const d = Math.hypot(e.mesh.position.x - px, e.mesh.position.z - pz);
        if (d < 10) {
          if (e.type === 'seal') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, e.elite ? 5 : 1);
          if (e.type === 'belgica') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, 1);
          killCount++; killHUDEl.textContent = `☠ ${killCount}`;
          disposeMesh(e.mesh); scene.remove(e.mesh); enemies.splice(i, 1);
        }
      }
    }
  },
  {
    id: 'attack_speed', name: 'Frenzy', emoji: '⚡', color: '#ffee44',
    desc: '+25% attack speed for 10 seconds.',
    duration: 10,
    apply: () => { playerStats.weaponCooldown *= 0.75; },
    remove: () => { playerStats.weaponCooldown /= 0.75; }
  },
  {
    id: 'invulnerable', name: 'Ice Shield', emoji: '🛡️', color: '#88ddff',
    desc: 'Invulnerable for 3 seconds — activates immediately.',
    duration: 3,
    apply: () => { playerState.iframes = 3; },
    remove: () => {}
  },
  {
    id: 'spell_damage', name: 'Power Surge', emoji: '🔥', color: '#ff44aa',
    desc: '+50% damage for 10 seconds.',
    duration: 10,
    apply: () => { playerStats.damage *= 1.5; },
    remove: () => { playerStats.damage /= 1.5; }
  },
  {
    id: 'shrink', name: 'Ghost Form', emoji: '👻', color: '#aaffaa',
    desc: 'Shrink + 100% dodge + speed boost for 4 seconds.',
    duration: 4,
    apply: () => {
      player.scale.setScalar(0.4);
      playerStats._preGhostEvasion = playerStats.evasion;
      playerStats.evasion = 1.0;
      playerStats.moveSpeed *= 1.4;
    },
    remove: () => {
      player.scale.setScalar(1.0);
      playerStats.evasion = playerStats._preGhostEvasion || 0;
      playerStats.moveSpeed /= 1.4;
    }
  },
];

// Active power-up HUD
const powerUpHUDEl = document.createElement('div');
powerUpHUDEl.style.cssText = 'position:fixed;bottom:80px;left:10%;pointer-events:none;display:flex;flex-direction:column;gap:4px';
document.body.appendChild(powerUpHUDEl);

function updatePowerUpHUD() {
  powerUpHUDEl.innerHTML = Object.entries(activePowerUps).map(([id, t]) => {
    const def = POWER_UP_DEFS.find(p => p.id === id);
    if (!def || def.instant) return '';
    return `<div style="font-family:monospace;font-size:11px;color:${def.color};text-shadow:0 0 6px ${def.color}">${def.emoji} ${def.name} ${t.toFixed(1)}s</div>`;
  }).join('');
}

let _puHudTimer = 0;
function tickPowerUps(dt) {
  if (!Object.keys(activePowerUps).length) return;
  let changed = false;
  for (const id of Object.keys(activePowerUps)) {
    activePowerUps[id] -= dt;
    if (activePowerUps[id] <= 0) {
      const def = POWER_UP_DEFS.find(p => p.id === id);
      if (def && def.remove) def.remove();
      delete activePowerUps[id];
      changed = true;
    }
  }
  _puHudTimer += dt;
  if (changed || _puHudTimer >= 0.1) { _puHudTimer = 0; updatePowerUpHUD(); }
}

// Power-up choice screen (pick 1 of 2)
let choosingPowerUp = false;
let storedPowerUp = null; // picked but not yet activated
const powerUpScreen = document.createElement('div');
powerUpScreen.style.cssText = `
  display:none; position:fixed; inset:0; z-index:210;
  background:rgba(0,8,24,0.92);
  flex-direction:column; align-items:center; justify-content:center;
  font-family:monospace; color:#aee8ff;
  pointer-events:none;
`;
powerUpScreen.innerHTML = `
  <div style="pointer-events:auto;display:flex;flex-direction:column;align-items:center">
    <div style="font-size:30px;font-weight:bold;letter-spacing:4px;text-shadow:0 0 20px #44aaff;margin-bottom:8px">🧊 CRACK POWER-UP</div>
    <div style="font-size:13px;opacity:0.5;margin-bottom:32px">Pick one — activate whenever you're ready</div>
    <div id="powerUpCards" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;max-width:800px"></div>
    <div style="margin-top:28px;font-size:12px;opacity:0.4;letter-spacing:2px">A / D to navigate &nbsp;|&nbsp; P to confirm</div>
  </div>
`;
document.body.appendChild(powerUpScreen);

let puSelectedIdx = 0;
let puChoices = [];

function puHighlight() {
  const cards = document.getElementById('powerUpCards').children;
  for (let i = 0; i < cards.length; i++) {
    const def = puChoices[i];
    if (i === puSelectedIdx) {
      cards[i].style.borderColor = def.color;
      cards[i].style.transform = 'scale(1.04)';
      cards[i].style.boxShadow = `0 0 20px ${def.color}44`;
    } else {
      cards[i].style.borderColor = `${def.color}33`;
      cards[i].style.transform = '';
      cards[i].style.boxShadow = `0 0 12px ${def.color}11`;
    }
  }
}

function confirmPuChoice() {
  const def = puChoices[puSelectedIdx];
  storedPowerUp = def;
  powerUpScreen.style.display = 'none';
  choosingPowerUp = false;
  touchInput.dx = 0; touchInput.dz = 0; touchInput.jump = false;
  updatePowerUpBtn();
}

function showPowerUpChoice() {
  choosingPowerUp = true;
  puSelectedIdx = 0;
  const shuffled = POWER_UP_DEFS.slice().sort(() => Math.random() - 0.5);
  puChoices = shuffled.slice(0, 2);
  const container = document.getElementById('powerUpCards');
  container.innerHTML = '';
  puChoices.forEach((def, i) => {
    const card = document.createElement('div');
    card.style.cssText = `
      cursor:pointer; border:1px solid ${def.color}33; padding:22px 18px;
      width:170px; background:rgba(0,16,36,0.9); border-radius:8px;
      text-align:center; font-family:monospace;
      box-shadow:0 0 12px ${def.color}11;
      transition:border-color 0.12s, transform 0.12s, box-shadow 0.12s;
      pointer-events:auto;
    `;
    card.innerHTML = `
      <div style="font-size:34px;margin-bottom:10px">${def.emoji}</div>
      <div style="font-size:15px;font-weight:bold;color:${def.color};margin-bottom:8px">${def.name}</div>
      <div style="font-size:12px;opacity:0.75;line-height:1.4">${def.desc}</div>
    `;
    card.onmouseenter = () => { puSelectedIdx = i; puHighlight(); };
    card.onclick = () => { puSelectedIdx = i; confirmPuChoice(); };
    container.appendChild(card);
  });
  powerUpScreen.style.display = 'flex';
  puHighlight();
}

function updateXPBar() {
  const needed = xpToNext(playerLevel);
  xpLabelEl.textContent = `LVL ${playerLevel} — XP ${playerXP} / ${needed}`;
  xpBarInner.style.width = (playerXP / needed * 100) + '%';
}

function updateHUD() {
  const pct = Math.max(0, playerState.hp / playerState.maxHp) * 100;
  hpBarInner.style.width = pct + '%';
  hpBarInner.style.background = pct > 50 ? '#22ccff' : pct > 25 ? '#ffaa00' : '#ff3300';
  hpLabel.textContent = `HP  ${playerState.hp} / ${playerState.maxHp}`;
  if (playerStats.maxShield > 0) {
    shieldRow.style.display = 'flex';
    shieldBarInner.style.width = (playerStats.shield / playerStats.maxShield * 100) + '%';
    shieldLabel.textContent = `SHIELD  ${playerStats.shield} / ${playerStats.maxShield}`;
  }
}

// ── Enemies ───────────────────────────────────────────────────────────────────

const enemies = [];

function buildPolarBear() {
  const white = new THREE.MeshStandardMaterial({ color: 0xf0f0e8, roughness: 0.9 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const parts = [];

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 7, 6), white);
  body.scale.set(1.6, 1.0, 1.1); body.position.set(0, 0.75, 0); parts.push(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 7, 6), white);
  head.position.set(1.1, 0.95, 0); parts.push(head);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), cream);
  snout.scale.set(0.9, 0.7, 0.8); snout.position.set(1.55, 0.82, 0); parts.push(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), black);
  nose.position.set(1.82, 0.88, 0); parts.push(nose);

  [-0.22, 0.22].forEach(z => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), black);
    eye.position.set(1.38, 1.08, z); parts.push(eye);
  });
  [-0.3, 0.3].forEach(z => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), white);
    ear.position.set(0.95, 1.44, z); parts.push(ear);
  });

  [[-0.55, 0.9], [-0.55, -0.5], [0.55, 0.9], [0.55, -0.5]].forEach(([x, offZ]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.7, 8), white);
    leg.position.set(x, 0.35, offZ * 0.55); parts.push(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), cream);
    paw.scale.set(1.1, 0.5, 1.3); paw.position.set(x, 0.06, offZ * 0.6); parts.push(paw);
  });

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), white);
  tail.position.set(-1.1, 0.85, 0); parts.push(tail);

  const g = buildMergedGroup(parts); // 3 draw calls → replaces ~16
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildKrill() {
  const g = new THREE.Group();
  const pink    = new THREE.MeshStandardMaterial({ color: 0xff4477, roughness: 0.6, emissive: 0x880022, emissiveIntensity: 0.3 });
  const darkPink = new THREE.MeshStandardMaterial({ color: 0xcc2255, roughness: 0.7 });
  const eye     = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

  // Body segments (3)
  [0, 0.9, 1.7].forEach((x, i) => {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.45 - i * 0.08, 10, 8), pink);
    seg.scale.set(1.1, 0.7, 0.9); seg.position.set(x, 0.5, 0); seg.castShadow = true;
    g.add(seg);
  });

  // Tail fan
  [-0.3, 0, 0.3].forEach(z => {
    const fan = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), darkPink);
    fan.scale.set(0.8, 0.25, 0.5); fan.position.set(2.4, 0.5, z); g.add(fan);
  });

  // Head / eyes
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 7, 5), pink);
  head.position.set(-0.55, 0.6, 0); g.add(head);
  [-0.18, 0.18].forEach(z => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), eye);
    e.position.set(-0.85, 0.78, z); g.add(e);
  });

  // Antennae
  [-0.22, 0.22].forEach(z => {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.01, 1.2, 5), darkPink);
    ant.rotation.z = z > 0 ? -0.4 : 0.4; ant.position.set(-1.1, 1.1, z * 2); g.add(ant);
  });

  // Legs (pairs)
  [-0.1, 0.4, 0.9].forEach(x => {
    [-1, 1].forEach(side => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.7, 5), darkPink);
      leg.rotation.z = side * 0.5; leg.position.set(x, 0.2, side * 0.55); g.add(leg);
    });
  });

  // Boss glow
  const glow = new THREE.PointLight(0xff2255, 3, 12);
  glow.position.set(0, 1.2, 0); g.add(glow);

  return g;
}

let boss = null;
let bossDefeated = false;
let spooksNPC = null;
let bossProjectiles = [];
const bossHUDEl    = document.getElementById('bossHUD');
const bossBarInner = document.getElementById('bossBarInner');
const bossArrowEl  = document.getElementById('bossArrow');
const bossProjectileGeo = new THREE.SphereGeometry(0.3, 8, 8);
const bossProjectileMat = new THREE.MeshStandardMaterial({ color: 0xff2255, emissive: 0xff0033, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });

function spawnBoss(x, z) {
  if (x === undefined) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 40 + Math.random() * 40; // 40–80 units from center
    x = Math.cos(angle) * dist;
    z = Math.sin(angle) * dist;
  }
  if (boss) return;
  const mesh = buildKrill();
  mesh.position.set(x, 0, z);
  mesh.scale.setScalar(2.5);
  scene.add(mesh);
  boss = { mesh, hp: 500, maxHp: 500, shootTimer: 2.0, age: 0, teleportThresholds: [0.75, 0.50, 0.25] };
  bossHUDEl.style.display = 'block';
}

function updateBoss(dt) {
  if (!boss) return;

  const px = player.position.x, pz = player.position.z;
  const dx = px - boss.mesh.position.x;
  const dz = pz - boss.mesh.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  boss.age += dt;
  bossBarInner.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';

  // Screen-edge arrow — camera is fixed: right=+X, down-screen=+Z
  const wdx = boss.mesh.position.x - player.position.x;
  const wdz = boss.mesh.position.z - player.position.z;
  const wlen = Math.sqrt(wdx * wdx + wdz * wdz) || 1;
  const nx = wdx / wlen, nz = wdz / wlen; // screen: nx=right, nz=down

  // On-screen when boss is close and roughly in front of camera
  const bossScreen = boss.mesh.position.clone().project(camera);
  const onScreen = bossScreen.z < 1 && bossScreen.x > -0.9 && bossScreen.x < 0.9 && bossScreen.y > -0.9 && bossScreen.y < 0.9;
  if (onScreen) {
    bossArrowEl.style.display = 'none';
  } else {
    const W = window.innerWidth, H = window.innerHeight, pad = 30;
    const cx = W / 2, cy = H / 2;
    const tx = nx !== 0 ? (nx > 0 ? (W/2 - pad) : -(W/2 - pad)) / nx : Infinity;
    const ty = nz !== 0 ? (nz > 0 ? (H/2 - pad) : -(H/2 - pad)) / nz : Infinity;
    const t = Math.min(Math.abs(tx), Math.abs(ty));
    const ex = cx + nx * t, ey = cy + nz * t;
    bossArrowEl.style.display = 'block';
    bossArrowEl.style.left = (ex - 11) + 'px';
    bossArrowEl.style.top  = (ey - 11) + 'px';
    bossArrowEl.style.transform = `rotate(${Math.atan2(nx, -nz)}rad)`;
  }

  // Face player — krill head faces -X so use atan2(dz, -dx)
  boss.mesh.rotation.y = Math.atan2(dz, -dx);

  // Shoot interval ramps from 2s down to 0.3s after 3s of existence
  const shootInterval = boss.age < 3 ? 2.0 : Math.max(0.3, 2.0 - (boss.age - 3) * 0.1);

  boss.shootTimer -= dt;
  if (boss.shootTimer <= 0) {
    boss.shootTimer = shootInterval;
    if (dist > 0.1) {
      const speed = 8;
      const nx = dx / dist, nz = dz / dist;
      const mesh = new THREE.Mesh(bossProjectileGeo, bossProjectileMat);
      mesh.position.set(boss.mesh.position.x + nx * 2, 0.6, boss.mesh.position.z + nz * 2);
      scene.add(mesh);
      bossProjectiles.push({ mesh, vx: nx * speed, vz: nz * speed });
    }
  }

  // Update projectiles
  for (let i = bossProjectiles.length - 1; i >= 0; i--) {
    const p = bossProjectiles[i];
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.z += p.vz * dt;
    const pdx = p.mesh.position.x - px;
    const pdz = p.mesh.position.z - pz;
    if (pdx * pdx + pdz * pdz < 0.64) {
      damagePlayer(98);
      scene.remove(p.mesh);
      bossProjectiles.splice(i, 1);
      continue;
    }
    // Remove if too far (120² = 14400)
    const odx = p.mesh.position.x - boss.mesh.position.x;
    const odz = p.mesh.position.z - boss.mesh.position.z;
    if (odx * odx + odz * odz > 14400) {
      scene.remove(p.mesh); bossProjectiles.splice(i, 1);
    }
  }

  if (boss.hp <= 0) {
    disposeMesh(boss.mesh); scene.remove(boss.mesh);
    bossProjectiles.forEach(p => scene.remove(p.mesh));
    bossProjectiles = [];
    boss = null;
    bossDefeated = true;
    bossHUDEl.style.display = 'none';
    bossArrowEl.style.display = 'none';
    triggerLevel1End();
  }
}

function triggerLevel1End() {
  const defeated = document.getElementById('krillyDefeated');
  const dialogue = document.getElementById('spooksDialogue');

  // Lock player in place permanently for the end sequence
  movementLockout = Infinity;

  // Remove all hostile entities immediately
  for (let i = enemies.length - 1; i >= 0; i--) {
    disposeMesh(enemies[i].mesh); scene.remove(enemies[i].mesh);
  }
  enemies.length = 0;

  for (let i = bombs.length - 1; i >= 0; i--) {
    scene.remove(bombs[i].mesh);
  }
  bombs.length = 0;

  // Show "Krilly Defeated" for 3 seconds
  defeated.style.display = 'block';
  setTimeout(() => {
    defeated.style.display = 'none';

    // Show dialogue messages sequentially, 3 sec each
    const lines = [
      'Hello myauw fellow traveler',
      'Thanks for killing Krilly *purr*',
      'You pleasantly surprised me',
      '....',
      'wordt vervolgd',
    ];
    const textEl = document.getElementById('spooksDialogueText');
    let idx = 0;
    function showNextLine() {
      if (idx >= lines.length) { dialogue.style.display = 'none'; return; }
      textEl.textContent = '"' + lines[idx++] + '"';
      dialogue.style.display = 'block';
      setTimeout(showNextLine, 3000);
    }
    showNextLine();

    // Spawn Spooks next to the player
    try {
      spooksNPC = buildWizardCat();
      spooksNPC.position.set(
        player.position.x - 2.5,
        player.position.y,
        player.position.z - 2.5
      );
      spooksNPC.rotation.y = Math.PI * 0.25;
      scene.add(spooksNPC);

      // Rotate player to face Spooks
      const dirX = spooksNPC.position.x - player.position.x;
      const dirZ = spooksNPC.position.z - player.position.z;
      player.rotation.y = Math.atan2(-dirX, -dirZ);
    } catch(e) { console.error('Spooks spawn failed:', e); }
  }, 3000);
}

function spawnSeal(hpScale = 1) {
  let angle, sx, sz, tries = 0;
  do { angle = Math.random() * Math.PI * 2; sx = Math.cos(angle) * 88; sz = Math.sin(angle) * 88; tries++; }
  while (tries < 10 && (sx-player.position.x)**2 + (sz-player.position.z)**2 < 400);
  const elite = Math.random() < 0.05;
  const mesh = elite ? buildPolarBear() : buildSeal();
  if (!elite) mesh.scale.setScalar(0.8);
  mesh.position.set(sx, 0, sz);
  scene.add(mesh);
  enemies.push({ mesh, type: 'seal', hp: Math.round((elite ? 100 : 30) * hpScale), elite });
}

function spawnSkua(hpScale = 1) {
  let angle, sx, sz, tries = 0;
  do { angle = Math.random() * Math.PI * 2; sx = Math.cos(angle) * 140; sz = Math.sin(angle) * 140; tries++; }
  while (tries < 10 && (sx-player.position.x)**2 + (sz-player.position.z)**2 < 400);
  const mesh = buildSkua();
  mesh.position.set(sx, 7, sz);
  const elite = Math.random() < 0.05;
  if (elite) makeElite(mesh);
  scene.add(mesh);
  enemies.push({ mesh, type: 'skua', hp: Math.round((elite ? 40 : 20) * hpScale), dropTimer: 3 + Math.random() * 3, state: 'approaching', elite });
}

let sealSpawnTimer = 2;
let skuaSpawnTimer = 2;
let sepFrame = 0; // alternating frame flag for seal separation
let gameTime = 0; // seconds elapsed
let _lastTimerSec = -1;
let swarmTimer = 90; // seconds until first belgica swarm

function buildBelgica() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const parts = [];

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), mat);
  body.scale.set(2.2, 1.0, 1.0); body.position.y = 0.09; parts.push(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 4), mat);
  head.position.set(0.22, 0.09, 0); parts.push(head);

  [-1, 1].forEach(side => {
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.06, 0.005), mat);
      leg.position.set((i - 1) * 0.08, 0.03, side * 0.09);
      leg.rotation.z = side * 0.4; parts.push(leg);
    }
  });

  return buildMergedGroup(parts); // 1 draw call → replaces ~8
}

function spawnSwarmWave() {
  const count = 15 + Math.floor(Math.random() * 6); // 15-20
  for (let i = 0; i < count; i++) {
    const edge = Math.floor(Math.random() * 4);
    let sx, sz;
    const edgeVal = 85 + Math.random() * 8;
    if      (edge === 0) { sx =  edgeVal; sz = (Math.random() - 0.5) * 160; }
    else if (edge === 1) { sx = -edgeVal; sz = (Math.random() - 0.5) * 160; }
    else if (edge === 2) { sx = (Math.random() - 0.5) * 160; sz =  edgeVal; }
    else                 { sx = (Math.random() - 0.5) * 160; sz = -edgeVal; }

    const mesh = buildBelgica();
    mesh.position.set(sx, 0, sz);
    scene.add(mesh);
    enemies.push({ mesh, type: 'belgica', hp: 8 });
  }
}

function updateEnemies(dt) {
  gameTime += dt;
  if (gameTime >= 300 && !boss && !bossDefeated && !playerState.dead) { spawnBoss(); }
  const remaining = Math.max(0, 300 - gameTime);
  const secs = Math.floor(remaining % 60);
  if (timerHUDEl && secs !== _lastTimerSec) {
    _lastTimerSec = secs;
    if (gameTime >= 4) timerHUDEl.style.display = 'block';
    timerHUDEl.textContent = `⏱ ${Math.floor(remaining / 60)}:${String(secs).padStart(2,'0')}`;
  }

  // Pressure ramps gradually over 5 min (k=150), floors at 0.1; cursed stacks each add 25% spawn rate
  const pressure = Math.max(0.1, Math.exp(-gameTime / 150)) * Math.pow(0.75, playerStats.cursed);
  sealSpawnTimer -= dt;
  skuaSpawnTimer -= dt;
  const hpScale = (gameTime >= 120 ? Math.pow(1.002, gameTime - 120) : 1) * Math.pow(1.3, playerStats.cursed);
  if (!bossDefeated && sealSpawnTimer <= 0) { spawnSeal(hpScale); sealSpawnTimer = (0.9 + Math.random() * 0.5) * pressure; }
  if (!bossDefeated && skuaSpawnTimer <= 0) { spawnSkua(hpScale); skuaSpawnTimer = (1.75 + Math.random() * 1) * pressure; }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = player.position.x - e.mesh.position.x;
    const dz = player.position.z - e.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 80) continue; // skip AI for off-screen distant enemies

    if (e.type === 'seal') {
      if (dist > 0.1) {
        // Seal-seal separation — run every other frame to halve O(n²) cost
        if ((i + sepFrame) % 2 === 0) {
          let sepX = 0, sepZ = 0;
          for (let k = 0; k < enemies.length; k++) {
            if (k === i || enemies[k].type !== 'seal') continue;
            const ox = e.mesh.position.x - enemies[k].mesh.position.x;
            const oz = e.mesh.position.z - enemies[k].mesh.position.z;
            if (Math.abs(ox) > 3 || Math.abs(oz) > 3) continue; // cheap early-out
            const od = Math.hypot(ox, oz);
            const minDist = e.elite ? 2.5 : 1.6;
            if (od < minDist && od > 0.01) { sepX += (ox / od) * (minDist - od); sepZ += (oz / od) * (minDist - od); }
          }
          e.mesh.position.x += sepX * 0.3;
          e.mesh.position.z += sepZ * 0.3;
        }

        let inPool = false;
        if (toxicPools.length > 0) {
          for (let pi = 0; pi < toxicPools.length; pi++) {
            const p = toxicPools[pi];
            const pdx = e.mesh.position.x - p.x, pdz = e.mesh.position.z - p.z;
            if (pdx * pdx + pdz * pdz < p.r * p.r) { inPool = true; break; }
          }
        }
        if (e.nomSlowTimer > 0) e.nomSlowTimer -= dt;
        const toxicMult = inPool ? getToxicSlow() : 1;
        const nomMult   = (e.nomSlowTimer > 0) ? 0.8 : 1;
        e.mesh.position.x += (dx / dist) * 6.3 * dt * toxicMult * nomMult;
        e.mesh.position.z += (dz / dist) * 6.3 * dt * toxicMult * nomMult;
        // Model faces +X — use atan2(-dz, dx) for correct orientation
        e.mesh.rotation.y = Math.atan2(-dz, dx);
      }
      if (dist < 0.7 && playerY < 0.5 && playerState.iframes <= 0) {
        damagePlayer(e.elite ? 85 : 51);
      }
    }

    if (e.type === 'skua') {
      if (e.state === 'approaching') {
        // Fly in from outside until close to player
        if (dist > 6) {
          e.mesh.position.x += (dx / dist) * 1.5 * dt;
          e.mesh.position.z += (dz / dist) * 1.5 * dt;
        }
        e.mesh.position.y = 7 + Math.sin(frameTime * 1000 / 500 + i) * 0.4;
        e.mesh.rotation.y = Math.atan2(-dz, dx);

        e.dropTimer -= dt;
        if (e.dropTimer <= 0) {
          const fallTime = e.mesh.position.y / 10;
          const leadTime = fallTime + 1.0;
          const leadX = player.position.x + playerVel.x * leadTime + (Math.random() - 0.5) * 0.75;
          const leadZ = player.position.z + playerVel.z * leadTime + (Math.random() - 0.5) * 0.75;
          dropBomb(leadX, leadZ, e.mesh.position.y);
          e.state = 'leaving';
          // Fly away in the opposite direction from player
          e.exitDX = -dx / (dist || 1);
          e.exitDZ = -dz / (dist || 1);
        }
      } else if (e.state === 'leaving') {
        // Climb and flee — remove when far above/outside
        e.mesh.position.x += e.exitDX * 4 * dt;
        e.mesh.position.z += e.exitDZ * 4 * dt;
        e.mesh.position.y += 6 * dt;
        if (e.mesh.position.y > 30) {
          scene.remove(e.mesh);
          enemies.splice(i, 1);
        }
      }
    }

    if (e.type === 'belgica') {
      // Ground-based walk toward player at speed 3
      if (dist > 0.1) {
        e.mesh.position.x += (dx / dist) * 3 * dt;
        e.mesh.position.z += (dz / dist) * 3 * dt;
        e.mesh.position.y = 0;
        e.mesh.rotation.y = Math.atan2(-dz, dx);
      }
      // Kill player on contact
      if (dist < 0.6 && playerState.iframes <= 0) damagePlayer(51);
    }
  }

  // Swarm timer — independent of storm
  swarmTimer -= dt;
  if (swarmTimer <= 0) {
    spawnSwarmWave();
    swarmTimer = 90;
  }
}

// ── Bombs ─────────────────────────────────────────────────────────────────────

const bombs = [];
const explosionFX = [];
const _bombGeo = new THREE.SphereGeometry(0.22, 6, 6);
const _bombBaseMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6 });
const _warnGeo = new THREE.RingGeometry(0.1, 3, 12);
const _warnBaseMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
const _impactGeo     = new THREE.SphereGeometry(0.4, 6, 6);
const _impactCritGeo = new THREE.SphereGeometry(0.6, 6, 6);
const _explodeGeo    = new THREE.SphereGeometry(3, 10, 10);
const _gustGeo       = new THREE.RingGeometry(0.05, 0.28, 16);
const _gustMat       = new THREE.MeshBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const _gustFX        = []; // active gust rings

// Pre-allocated pools — reused instead of create/destroy every hit
function _makeImpactMesh(crit) {
  return new THREE.Mesh(
    crit ? _impactCritGeo : _impactGeo,
    new THREE.MeshBasicMaterial({ color: crit ? 0xffee44 : 0xaaddff, transparent: true, opacity: 0.9 })
  );
}
const _impactPool     = Array.from({ length: 12 }, () => _makeImpactMesh(false));
const _impactCritPool = Array.from({ length: 6  }, () => _makeImpactMesh(true));

// ── Snowballs ─────────────────────────────────────────────────────────────────

const snowballs = [];
let attackTimer = 0;
let boomerangInFlight = false; // blocks next shot until boomerang returns

// Homhomnomnom piercing orbs
const nomOrbs = [];
function fireNomOrb() {
  const target = findNearestEnemy();
  if (!target || !target.mesh) return;
  const tx = target.mesh.position.x - player.position.x;
  const tz = target.mesh.position.z - player.position.z;
  const len = Math.sqrt(tx*tx + tz*tz) || 1;
  const dir = new THREE.Vector3(tx / len, 0, tz / len);
  const speed = 5.2; // 4 * 1.3
  const stacks = weaponStacks['homhomnomnom'] || 1;
  const w = 0.8 * playerStats.projSize * (1 + (stacks - 1) * 0.25); // -20%, stacks wider
  // Elongated capsule oriented in travel direction
  const geo = new THREE.CapsuleGeometry(w, 0.55, 4, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9933ff, emissive: 0x6600cc, emissiveIntensity: 1.0, roughness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  // Rotate capsule to align with travel direction (capsule default is Y-axis)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
  mesh.position.copy(player.position);
  mesh.position.y = 1.0;
  scene.add(mesh);
  nomOrbs.push({ mesh, vel: dir.clone().multiplyScalar(speed), spawnPos: player.position.clone(), hitCooldowns: new Map(), w, stacks });
}

function updateNomOrbs(dt) {
  for (let i = nomOrbs.length - 1; i >= 0; i--) {
    const orb = nomOrbs[i];
    orb.mesh.position.addScaledVector(orb.vel, dt);
    // Tick per-enemy hit cooldowns (0.4s between hits on same enemy)
    for (const [e, t] of orb.hitCooldowns) orb.hitCooldowns.set(e, t - dt);
    const hitR = (orb.w || 0.8) * 1.5;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!e.mesh) continue;
      const dx = orb.mesh.position.x - e.mesh.position.x;
      const dz = orb.mesh.position.z - e.mesh.position.z;
      if (Math.sqrt(dx*dx + dz*dz) < hitR) {
        const cd = orb.hitCooldowns.get(e) || 0;
        if (cd > 0) continue;
        orb.hitCooldowns.set(e, 0.4);
        e.nomSlowTimer = 1.0; // 20% slow for 1 second
        const isCrit = Math.random() < playerStats.critChance;
        e.hp -= SNOWBALL_DAMAGE * playerStats.damage * (isCrit ? 2 : 1) * 3 * Math.pow(1.25, (orb.stacks || 1) - 1);
        spawnImpact(orb.mesh.position.x, orb.mesh.position.y, orb.mesh.position.z, isCrit);
        if (e.hp <= 0) {
          if (e.elite) spawnMapItem(e.mesh.position.x, e.mesh.position.z);
          if (e.type === 'seal') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, e.elite ? 5 : 1);
          if (e.type === 'belgica') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, 1);
          killCount++; killHUDEl.textContent = `☠ ${killCount}`;
          disposeMesh(e.mesh); scene.remove(e.mesh); enemies.splice(j, 1);
        }
      }
    }
    if (orb.mesh.position.distanceTo(orb.spawnPos) > 12) {
      scene.remove(orb.mesh); nomOrbs.splice(i, 1);
    }
  }
}
const ATTACK_RATE = 0.8; // seconds between shots
const SNOWBALL_SPEED = 23.4;
const SNOWBALL_DAMAGE = 10;

function findNearestEnemy() {
  let nearest = null, bestDist = Infinity;
  for (const e of enemies) {
    const dx = e.mesh.position.x - player.position.x;
    const dz = e.mesh.position.z - player.position.z;
    const d = dx*dx + dz*dz;
    if (d < bestDist) { bestDist = d; nearest = e; }
  }
  // Prefer boss if it's closer
  if (boss) {
    const bdx = boss.mesh.position.x - player.position.x;
    const bdz = boss.mesh.position.z - player.position.z;
    const bd = bdx*bdx + bdz*bdz;
    if (bd < bestDist) nearest = boss;
  }
  return nearest;
}

const burstQueue = []; // sequential snowball shots

function fireSnowball(target) {
  const bonus = Math.random() < (playerStats.projExtraChance || 0) ? 1 : 0;
  const count = playerStats.projCount + bonus;
  for (let i = 0; i < count; i++) {
    burstQueue.push({ target, delay: i * 0.13 });
  }
}

function fireSingleSnowball(target) {
  if (!target.mesh) return;
  const tx = target.mesh.position.x - player.position.x;
  const tz = target.mesh.position.z - player.position.z;
  const len = Math.sqrt(tx*tx + tz*tz) || 1;
  const dir = new THREE.Vector3(tx / len, 0, tz / len);
  const speed  = SNOWBALL_SPEED * playerStats.projSpeed;
  const radius = 0.18 * playerStats.projSize;
  const isWizard = selectedSkin === 'wizard';
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 8),
    new THREE.MeshStandardMaterial({
      color:             isWizard ? 0xcc44ff : 0xeef8ff,
      emissive:          isWizard ? 0x9900ff : 0x88ccff,
      emissiveIntensity: isWizard ? 1.2 : 0.6,
      roughness: 0.3
    })
  );
  mesh.position.copy(player.position);
  mesh.position.y = 1.0;
  scene.add(mesh);
  const isBoomerang = playerStats.boomerang;
  if (isBoomerang) boomerangInFlight = true;
  snowballs.push({ mesh, vel: dir.clone().multiplyScalar(speed), target,
    boomerang: isBoomerang, returning: false, hitOut: false, hitReturn: false,
    spawnPos: isBoomerang ? player.position.clone() : null });
}

function updateBurst(dt) {
  for (let i = burstQueue.length - 1; i >= 0; i--) {
    burstQueue[i].delay -= dt;
    if (burstQueue[i].delay <= 0) {
      fireSingleSnowball(burstQueue[i].target);
      burstQueue.splice(i, 1);
    }
  }
}

function hitEnemy(j, impactX, impactY, impactZ) {
  const e = enemies[j];
  const isCrit = Math.random() < playerStats.critChance;
  e.hp -= SNOWBALL_DAMAGE * playerStats.damage * (isCrit ? 2 : 1);
  spawnImpact(impactX, impactY, impactZ, isCrit);
  if (playerStats.knockback > 0 && e.mesh) {
    const kx = impactX - e.mesh.position.x, kz = impactZ - e.mesh.position.z;
    const kd = Math.sqrt(kx*kx + kz*kz) || 1;
    e.mesh.position.x -= (kx / kd) * playerStats.knockback;
    e.mesh.position.z -= (kz / kd) * playerStats.knockback;
  }
  if (playerStats.lifesteal > 0 && playerStats.shieldDmgTimer <= 0 && Math.random() < playerStats.lifesteal && playerStats.shield < playerStats.maxShield) {
    playerStats.shield = Math.min(playerStats.maxShield, playerStats.shield + 1);
    updateHUD();
  }
  if (e.hp <= 0) {
    if (e.elite) spawnMapItem(e.mesh.position.x, e.mesh.position.z);
    if (e.type === 'seal') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, e.elite ? 5 : 1);
    if (e.type === 'belgica') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, 1);
    killCount++;
    killHUDEl.textContent = `☠ ${killCount}`;
    disposeMesh(e.mesh); scene.remove(e.mesh);
    enemies.splice(j, 1);
    return true; // killed
  }
  return false;
}

function updateSnowballs(dt) {
  for (let i = snowballs.length - 1; i >= 0; i--) {
    const s = snowballs[i];

    // Boomerang: flip direction when far enough from spawn, return to player
    if (s.boomerang) {
      if (!s.returning && s.spawnPos.distanceTo(s.mesh.position) > 9) {
        s.returning = true;
        s.hitReturn = false; // allowed one hit on return leg
      }
      if (s.returning) {
        const toPlayer = new THREE.Vector3(
          player.position.x - s.mesh.position.x, 0,
          player.position.z - s.mesh.position.z
        ).normalize().multiplyScalar(SNOWBALL_SPEED * playerStats.projSpeed);
        s.vel.lerp(toPlayer, 0.35);
        if (s.mesh.position.distanceTo(player.position) < 1.2) {
          boomerangInFlight = false;
          scene.remove(s.mesh);
          snowballs.splice(i, 1);
          continue;
        }
      }
    }

    s.mesh.position.addScaledVector(s.vel, dt);

    // Check hit against all enemies
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const dx = s.mesh.position.x - e.mesh.position.x;
      const dz = s.mesh.position.z - e.mesh.position.z;
      if (dx*dx + dz*dz < (1.2 * playerStats.projSize) ** 2) {
        if (s.boomerang) {
          // Each enemy hit once per leg — pierces through all
          if (!s.hitSet) s.hitSet = { out: new Set(), ret: new Set() };
          const legSet = s.returning ? s.hitSet.ret : s.hitSet.out;
          if (!legSet.has(e)) { legSet.add(e); hitEnemy(j, s.mesh.position.x, s.mesh.position.y, s.mesh.position.z); }
          continue; // pierce — keep checking other enemies this frame
        } else {
          hitEnemy(j, s.mesh.position.x, s.mesh.position.y, s.mesh.position.z);
          hit = true;
        }
        break;
      }
    }
    // Check hit against boss
    if (!hit && boss) {
      const bdx = s.mesh.position.x - boss.mesh.position.x;
      const bdz = s.mesh.position.z - boss.mesh.position.z;
      if (bdx*bdx + bdz*bdz < (3.0 * playerStats.projSize) ** 2) {
        const isCrit = Math.random() < playerStats.critChance;
        boss.hp -= SNOWBALL_DAMAGE * playerStats.damage * (isCrit ? 2 : 1);
        spawnImpact(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, isCrit);
        // Teleport at 75/50/25% thresholds
        const hpPct = boss.hp / boss.maxHp;
        for (let ti = boss.teleportThresholds.length - 1; ti >= 0; ti--) {
          if (hpPct <= boss.teleportThresholds[ti]) {
            boss.teleportThresholds.splice(ti, 1);
            const tx = (Math.random() - 0.5) * 140;
            const tz = (Math.random() - 0.5) * 140;
            boss.mesh.position.set(tx, 0, tz);
            spawnGust(boss.mesh.position.x, boss.mesh.position.z);
            break;
          }
        }
        if (!s.boomerang) hit = true;
      }
    }

    // Boomerang: only removed when it returns to player (handled above) or times out
    if (s.boomerang) {
      s.age = (s.age || 0) + dt;
      if (s.age > 6) { boomerangInFlight = false; disposeMesh(s.mesh); scene.remove(s.mesh); snowballs.splice(i, 1); }
      continue; // skip normal removal
    }

    // Normal snowball: remove on hit or out of range
    if (hit || s.mesh.position.distanceTo(player.position) > 12) {
      disposeMesh(s.mesh); scene.remove(s.mesh);
      snowballs.splice(i, 1);
    }
  }
}

function spawnImpact(x, y, z, crit = false) {
  const pool = crit ? _impactCritPool : _impactPool;
  const mesh = pool.length > 0 ? pool.pop() : _makeImpactMesh(crit);
  mesh.material.opacity = 0.9;
  mesh.scale.setScalar(1);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  explosionFX.push({ mesh, flash: null, duration: crit ? 0.35 : 0.2, timer: crit ? 0.35 : 0.2, ownGeo: false, crit });
}

function dropBomb(tx, tz, fromY) {
  if (bombs.filter(b => !b.landed).length >= 3) return; // cap in-flight bombs
  const mesh = new THREE.Mesh(_bombGeo, _bombBaseMat.clone());
  mesh.position.set(tx, fromY, tz);
  scene.add(mesh);
  const warnMesh = new THREE.Mesh(_warnGeo, _warnBaseMat.clone());
  warnMesh.rotation.x = -Math.PI / 2;
  warnMesh.position.set(tx, 0.05, tz);
  scene.add(warnMesh);
  bombs.push({ mesh, warnMesh, tx, tz, fromY, landed: false, timer: 1.0 });
}

function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];

    if (!b.landed) {
      b.mesh.position.y -= 10 * dt;
      if (b.mesh.position.y <= 0.22) { b.mesh.position.y = 0.22; b.landed = true; }
    } else {
      b.timer -= dt;
      // pulsing warning — speeds up as time runs out
      const pulse = Math.sin(frameTime * 1000 / (b.timer * 80 + 20));
      b.warnMesh.material.opacity = 0.2 + Math.abs(pulse) * 0.55;
      b.mesh.material.emissiveIntensity = 0.4 + Math.abs(pulse) * 0.8;

      if (b.timer <= 0) {
        explode(b.tx, b.tz);
        // hurt player if close
        const dx = player.position.x - b.tx;
        const dz = player.position.z - b.tz;
        if (Math.sqrt(dx*dx + dz*dz) < 3.0 && playerState.iframes <= 0) {
          killPlayer();
        }
        scene.remove(b.mesh);
        scene.remove(b.warnMesh);
        bombs.splice(i, 1);
      }
    }
  }
}

function explode(x, z, color = 0xff6600) {
  const mesh = new THREE.Mesh(
    _explodeGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );
  mesh.position.set(x, 1.5, z);
  scene.add(mesh);

  // point light flash
  const flash = new THREE.PointLight(color, 3, 20);
  flash.position.set(x, 2, z);
  scene.add(flash);

  explosionFX.push({ mesh, flash, duration: 0.45, timer: 0.45, ownGeo: true });
}

function updateExplosions(dt) {
  for (let i = explosionFX.length - 1; i >= 0; i--) {
    const e = explosionFX[i];
    e.timer -= dt;
    const t = 1 - e.timer / e.duration;
    e.mesh.scale.setScalar(1 + t * 1.8);
    e.mesh.material.opacity = 0.85 * (1 - t);
    if (e.flash) e.flash.intensity = 3 * (1 - t);
    if (e.timer <= 0) {
      scene.remove(e.mesh);
      if (e.ownGeo) {
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
      } else {
        (e.crit ? _impactCritPool : _impactPool).push(e.mesh); // return to pool
      }
      if (e.flash) scene.remove(e.flash);
      explosionFX.splice(i, 1);
    }
  }
}

function spawnGust(x, z) {
  for (let i = 0; i < 1; i++) {
    const mesh = new THREE.Mesh(_gustGeo, _gustMat.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x + (Math.random() - 0.5) * 0.4, 0.05, z + (Math.random() - 0.5) * 0.4);
    scene.add(mesh);
    _gustFX.push({ mesh, timer: 0.3 + i * 0.07, duration: 0.3 + i * 0.07, delay: i * 0.04 });
  }
}

function updateGusts(dt) {
  for (let i = _gustFX.length - 1; i >= 0; i--) {
    const g = _gustFX[i];
    g.delay -= dt;
    if (g.delay > 0) continue;
    g.timer -= dt;
    const t = 1 - g.timer / g.duration;
    g.mesh.scale.setScalar(1 + t * 1.25);
    g.mesh.material.opacity = 0.65 * (1 - t);
    if (g.timer <= 0) {
      scene.remove(g.mesh);
      g.mesh.material.dispose();
      _gustFX.splice(i, 1);
    }
  }
}

// ── Jump ─────────────────────────────────────────────────────────────────────

let playerY  = 0;
let playerVY = 0;
const playerVel = new THREE.Vector3(); // xz velocity, updated each frame
const GRAVITY    = -22;
const JUMP_FORCE =  9;
let jumpPressed      = false;
let _airBoost        = false; // active during jump after a perfect landing
let _jumpBuffer      = 0;     // counts down after P pressed — landing within window = perfect
let _perfectCooldown = 0;     // prevents chaining perfect jumps by spamming
let _jumpSpammed     = false; // true if P pressed more than once this airtime

// ── Ice Cracks ────────────────────────────────────────────────────────────────

const cracks = [];

function pointToSegDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const lenSq = dx*dx + dz*dz;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px-ax)*dx + (pz-az)*dz) / lenSq));
  return Math.hypot(px - (ax + t*dx), pz - (az + t*dz));
}

function spawnCrack(x, z, length, angle) {
  const group = new THREE.Group();

  // Dark gap
  const gap = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.04, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x000a14, roughness: 1 })
  );
  gap.position.y = 0.022;
  group.add(gap);

  // Jagged edges — a few thin shards either side
  for (let i = 0; i < 6; i++) {
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(Math.random()*0.8+0.3, 0.03, Math.random()*0.25+0.05),
      new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.2, metalness: 0.5 })
    );
    shard.position.set((Math.random()-0.5)*length*0.8, 0.03, (Math.random()-0.5)*0.5);
    group.add(shard);
  }

  group.position.set(x, 0, z);
  group.rotation.y = angle;
  scene.add(group);

  // Collision segment in world space
  const half = length / 2;
  cracks.push({
    ax: x + Math.cos(angle)*half, az: z - Math.sin(angle)*half,
    bx: x - Math.cos(angle)*half, bz: z + Math.sin(angle)*half,
    halfWidth: 0.32,
    cooldownTimer: 0, // 20-sec cooldown after jump-clear
  });
}

// Generate cracks across the full map on a jittered grid
(function placeCracks() {
  const step = 14;
  for (let gx = -85; gx <= 85; gx += step) {
    for (let gz = -85; gz <= 85; gz += step) {
      const x = gx + (Math.random() - 0.5) * 12;
      const z = gz + (Math.random() - 0.5) * 12;
      if (Math.hypot(x, z) < 9) continue;                      // old origin area
      if (Math.hypot(x - 35, z - 25) < 10) continue;          // player spawn
      if (Math.hypot(x + 20, z + 20) < 22) continue;           // mountain
      if (Math.hypot(x - WATER_CX, z - WATER_CZ) < 36) continue; // water
      if (Math.abs(x) > 90 || Math.abs(z) > 90) continue;
      spawnCrack(x, z, Math.random() * 4 + 4, Math.random() * Math.PI);
    }
  }
})();

// ── Thin Ice Zone (South-West) ────────────────────────────────────────────────

const THIN_ICE_CX = -60, THIN_ICE_CZ = 60, THIN_ICE_R = 20;
const thinIceTiles = [];

const thinIceNormalMat  = new THREE.MeshStandardMaterial({ color: 0x99ccee, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.75 });
const thinIceCrackedMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.5, transparent: true, opacity: 0.9 });
const thinIceBrokenMat  = new THREE.MeshStandardMaterial({ color: 0x050d14, roughness: 1.0, transparent: true, opacity: 0.95 });

// Build thin ice tiles on a grid inside the SW zone
(function placeThinIce() {
  const step = 5;
  for (let tx = THIN_ICE_CX - THIN_ICE_R; tx <= THIN_ICE_CX + THIN_ICE_R; tx += step) {
    for (let tz = THIN_ICE_CZ - THIN_ICE_R; tz <= THIN_ICE_CZ + THIN_ICE_R; tz += step) {
      const jx = tx + (Math.random() - 0.5) * 2;
      const jz = tz + (Math.random() - 0.5) * 2;
      if (Math.hypot(jx - THIN_ICE_CX, jz - THIN_ICE_CZ) > THIN_ICE_R) continue;
      if (Math.hypot(jx, jz) < 10) continue; // avoid spawn
      const tileR = 1.8 + Math.random() * 0.4;
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(tileR, 10), thinIceNormalMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(jx, 0.03, jz);
      scene.add(mesh);
      thinIceTiles.push({ mesh, x: jx, z: jz, r: tileR, state: 'normal', crackTimer: 0, recoverTimer: 0 });
    }
  }

  // Stepping stone ice spots in the zone
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * (THIN_ICE_R - 2);
    const sx = THIN_ICE_CX + Math.cos(a) * d;
    const sz = THIN_ICE_CZ + Math.sin(a) * d;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(1.5, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 }));
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(sx, 0.06, sz);
    scene.add(spot);
  }
})();

function updateThinIce(dt) {
  if (playerState.dead) return;
  const px = player.position.x, pz = player.position.z;
  const onGround = playerY === 0;

  for (const tile of thinIceTiles) {
    const dist = Math.hypot(px - tile.x, pz - tile.z);
    const playerOnTile = dist < tile.r && onGround;

    if (tile.state === 'normal') {
      if (playerOnTile) {
        // Start cracking
        tile.state = 'cracking';
        tile.crackTimer = 0.5;
        tile.mesh.material = thinIceCrackedMat;
        movementLockout = Math.max(movementLockout, 0); // slight warning
      }
    } else if (tile.state === 'cracking') {
      tile.crackTimer -= dt;
      if (tile.crackTimer <= 0) {
        tile.state = 'broken';
        tile.recoverTimer = 20;
        tile.mesh.material = thinIceBrokenMat;
        if (playerOnTile) movementLockout = Math.max(movementLockout, 1.0);
      }
    } else if (tile.state === 'broken') {
      tile.recoverTimer -= dt;
      // Kill player if standing on broken tile at ground level
      if (playerOnTile && playerY === 0 && playerState.iframes <= 0) {
        killPlayer();
      }
      if (tile.recoverTimer <= 0) {
        tile.state = 'normal';
        tile.mesh.material = thinIceNormalMat;
      }
    }
  }
}

// ── Snowstorm ─────────────────────────────────────────────────────────────────

let stormActive    = false;
let stormTimer     = 0;
let stormCooldown  = 30; // seconds until next storm (replaces one-shot flag)
let stormSlow      = 1.0; // multiplier on player speed

const stormOverlay = document.createElement('div');
stormOverlay.style.cssText = `
  display:none; position:fixed; inset:0; pointer-events:none;
  background:rgba(150,210,255,0.13);
  transition: opacity 0.5s;
`;
document.body.appendChild(stormOverlay);

const stormLabel = document.createElement('div');
stormLabel.style.cssText = `
  display:none; position:fixed; top:54px; left:50%; transform:translateX(-50%);
  color:#aee8ff; font-family:monospace; font-size:14px;
  text-shadow:0 0 8px #88ddff; pointer-events:none;
`;
stormLabel.textContent = '❄ SNOWSTORM — movement slowed ❄';
document.body.appendChild(stormLabel);

function triggerStorm() {
  stormActive   = true;
  stormTimer    = 5;
  stormOverlay.style.display = 'block';
  stormLabel.style.display   = 'block';
  // Triple snow speed visually
  for (let i = 0; i < SNOW_COUNT; i++) snowVel[i] *= 3;
}

function updateStorm(dt) {
  if (!stormActive) {
    // Count down until next storm
    stormCooldown -= dt;
    if (stormCooldown <= 0) triggerStorm();
  }

  if (stormActive) {
    stormTimer -= dt;
    stormSlow   = 0.85;
    if (stormTimer <= 0) {
      stormActive   = false;
      stormSlow     = 1.0;
      stormCooldown = 30; // reset for next storm
      stormOverlay.style.display = 'none';
      stormLabel.style.display   = 'none';
      for (let i = 0; i < SNOW_COUNT; i++) snowVel[i] /= 3;
    }
  }
}

// ── Death ─────────────────────────────────────────────────────────────────────

// ── Scoreboard ────────────────────────────────────────────────────────────────

// ── Online Leaderboard (Supabase) ─────────────────────────────────────────────

const SUPABASE_URL = 'https://geylqcfmkxcflbcksrjt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdleWxxY2Zta3hjZmxiY2tzcmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjM4MjQsImV4cCI6MjA5MTkzOTgyNH0.XC8kpKHnhybR8xC7Th_BX9KIpmFrpcH2CXgeeklUSOI';

function getDeviceId() {
  let id = localStorage.getItem('frostbite_device_id');
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('frostbite_device_id', id); }
  return id;
}

async function fetchLeaderboard() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=name,kills,level,date&order=kills.desc&limit=15`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

async function submitOnlineScore(name, kills, level) {
  const deviceId  = getDeviceId();
  const cleanName = name.trim().slice(0, 16) || 'Anonymous';
  const _now = new Date();
  const date = _now.toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' }) + ' ' + _now.toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
  const headers   = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
  try {
    const check    = await fetch(`${SUPABASE_URL}/rest/v1/scores?device_id=eq.${deviceId}&select=kills`, { headers });
    const existing = await check.json();

    if (existing.length > 0) {
      if (existing[0].kills >= kills) return false; // not a new high score
      // Update existing row
      await fetch(`${SUPABASE_URL}/rest/v1/scores?device_id=eq.${deviceId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ name: cleanName, kills, level, date })
      });
    } else {
      // Insert new row
      await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: cleanName, kills, level, device_id: deviceId, date })
      });
    }
    return true;
  } catch(e) { console.error(e); return false; }
}

function renderScoreboard(scores) {
  if (!scores.length) return '<div style="opacity:0.4;font-size:13px;padding:12px">No scores yet — be the first!</div>';
  return `
    <table style="border-collapse:collapse;font-size:13px;width:320px">
      <tr style="opacity:0.5;border-bottom:1px solid #44aaff44">
        <td style="padding:4px 10px">#</td>
        <td style="padding:4px 10px">Name</td>
        <td style="padding:4px 10px">Kills</td>
        <td style="padding:4px 10px">Lvl</td>
        <td style="padding:4px 10px">Date</td>
      </tr>
      ${scores.map((s, i) => `
        <tr style="background:${i===0?'rgba(255,220,50,0.07)':''}">
          <td style="padding:4px 10px;opacity:0.5">${i+1}</td>
          <td style="padding:4px 10px;color:${i===0?'#ffee44':'#aee8ff'};font-weight:${i===0?'bold':'normal'}">${s.name}</td>
          <td style="padding:4px 10px;color:#ff8888">☠ ${s.kills}</td>
          <td style="padding:4px 10px;color:#ffcc44">${s.level}</td>
          <td style="padding:4px 10px;opacity:0.4">${s.date}</td>
        </tr>`).join('')}
    </table>`;
}

const deathScreen = document.createElement('div');
deathScreen.style.cssText = `
  display:none; position:fixed; inset:0; overflow-y:auto;
  background:rgba(0,10,30,0.92);
  flex-direction:column; align-items:center; justify-content:center; gap:16px;
  font-family:monospace; color:#aee8ff; padding:20px;
`;
document.body.appendChild(deathScreen);

function showDeathScreen() {
  deathScreen.innerHTML = `
    <div style="font-size:46px;font-weight:bold;letter-spacing:6px;text-shadow:0 0 30px #00aaff">YOU FROZE</div>
    <div style="font-size:15px;opacity:0.5">☠ ${killCount} kills &nbsp;|&nbsp; Level ${playerLevel}</div>
<div style="display:flex;gap:10px;align-items:center;margin-bottom:4px">
      <input id="nameInput" type="text" maxlength="16" placeholder="Enter your name"
        style="background:rgba(0,20,50,0.8);border:1px solid #44aaff;color:#aee8ff;
               font-family:monospace;font-size:16px;padding:8px 14px;border-radius:4px;
               outline:none;width:200px;text-align:center;-webkit-appearance:none;" />
      <button id="submitScore"
        style="background:transparent;border:2px solid #44aaff;color:#aee8ff;
               font-family:monospace;font-size:14px;padding:8px 18px;cursor:pointer;border-radius:4px;
               letter-spacing:2px;white-space:nowrap">SUBMIT</button>
    </div>
    <div style="display:flex;justify-content:center;margin-bottom:4px">
      <button id="refreshBtn"
        style="background:transparent;border:1px solid #44aaff44;color:#aee8ff99;
               font-family:monospace;font-size:12px;padding:4px 14px;cursor:pointer;border-radius:4px;
               letter-spacing:1px">↻ REFRESH</button>
    </div>
    <div id="scoreboardEl" style="min-height:60px"><div style="opacity:0.4;font-size:13px">Loading scores...</div></div>
    <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
      <button id="skinNormal"
        style="background:${localStorage.getItem('playerSkin')==='normal'||!localStorage.getItem('playerSkin')?'#1a3a5a':'transparent'};border:2px solid #44aaff;color:#aee8ff;
               font-family:monospace;font-size:12px;padding:6px 14px;cursor:pointer;border-radius:4px;letter-spacing:1px">
        🐧 CLASSIC</button>
      <button id="skinEvil"
        style="background:${localStorage.getItem('playerSkin')==='evil'?'#3a1a1a':'transparent'};border:2px solid #ff4444;color:#ffaaaa;
               font-family:monospace;font-size:12px;padding:6px 14px;cursor:pointer;border-radius:4px;letter-spacing:1px">
        😈 EVIL</button>
      <button id="skinHuman"
        style="background:${localStorage.getItem('playerSkin')==='human'?'#1a3a1a':'transparent'};border:2px solid #3a9a3a;color:#aaffaa;
               font-family:monospace;font-size:12px;padding:6px 14px;cursor:pointer;border-radius:4px;letter-spacing:1px">
        🧍 HUMAN</button>
    </div>
    <button id="retryBtn"
      style="margin-top:8px;background:transparent;border:2px solid #44aaff55;color:#aee8ff;
             font-family:monospace;font-size:18px;padding:10px 36px;cursor:pointer;letter-spacing:3px">RETRY</button>
    <div style="position:fixed;top:16px;right:20px;text-align:right;font-family:monospace;font-size:11px;color:#aee8ff66;line-height:1.8;pointer-events:none">
      Special thanks to<br>Hommienommie<br>Deveh<br>Shaggy<br>EhdMusic
    </div>
  `;
  deathScreen.style.display = 'flex';

  // Load leaderboard immediately
  fetchLeaderboard().then(scores => {
    const el = document.getElementById('scoreboardEl');
    if (el) el.innerHTML = renderScoreboard(scores);
  });

  const input  = document.getElementById('nameInput');
  const submit = document.getElementById('submitScore');
  const savedName = localStorage.getItem('playerName');
  if (savedName) input.value = savedName;
  let submitted = false;

  async function doSubmit() {
    if (submitted) return;
    submitted = true;
    submit.textContent = 'SAVING...';
    submit.disabled = true;
    localStorage.setItem('playerName', input.value);
    const isNewHigh = await submitOnlineScore(input.value, killCount, playerLevel);
    submit.textContent = isNewHigh ? '✓ NEW HIGH SCORE' : '✓ SUBMITTED';
    submit.style.borderColor = '#44ffaa';
    submit.style.color = '#44ffaa';
    const el = document.getElementById('scoreboardEl');
    if (el) el.innerHTML = '<div style="opacity:0.4;font-size:13px">Refreshing...</div>';
    const scores = await fetchLeaderboard();
    if (el) el.innerHTML = renderScoreboard(scores);
  }

  submit.addEventListener('click', doSubmit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSubmit(); } });
  const _skins = { normal:['skinNormal','#1a3a5a'], evil:['skinEvil','#3a1a1a'], human:['skinHuman','#1a3a1a'] };
  Object.entries(_skins).forEach(([key,[id,bg]]) => {
    document.getElementById(id).addEventListener('click', () => {
      localStorage.setItem('playerSkin', key);
      Object.entries(_skins).forEach(([k,[i,b]]) => document.getElementById(i).style.background = k===key ? b : 'transparent');
    });
  });
  document.getElementById('retryBtn').addEventListener('click', () => { location.href = location.pathname + '?v=' + Date.now(); });
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const el = document.getElementById('scoreboardEl');
    if (el) el.innerHTML = '<div style="opacity:0.4;font-size:13px">Refreshing...</div>';
    fetchLeaderboard().then(scores => {
      if (el) el.innerHTML = renderScoreboard(scores);
    });
  });
}

window.addEventListener('keydown', e => {
  const typingName = document.activeElement && document.activeElement.id === 'nameInput';
  if ((e.code === 'Space' || e.key === 'r') && playerState.dead && !typingName) location.href = location.pathname + '?v=' + Date.now();
});

function triggerShaggy() {
  playerState.shaggyCharges--;
  playerState.shaggyRechargeTimer = 0;
  playerState.iframes = 0.5;
  if (playerStats.shaggyStacks > 0) {
    const nearest = findNearestEnemy();
    if (nearest) nearest.hp -= playerStats.shaggyStacks;
  }
}

function damagePlayer(amount) {
  if (playerState.dead || playerState.iframes > 0) return;
  if (playerStats.evasion > 0 && Math.random() < playerStats.evasion) {
    playerState.iframes = 0.8;
    return;
  }
  if (playerState.shaggyCharges > 0) {
    triggerShaggy();
    return;
  }
  if (playerStats.shield > 0) {
    playerStats.shield--;
    playerStats.shieldDmgTimer = 30;
    playerState.iframes = 1.2;
    updateHUD();
    return;
  }
  playerState.hp = Math.max(0, playerState.hp - amount);
  updateHUD();
  if (playerState.hp > 0) {
    playerState.iframes = playerStats.iframeDuration;
    return;
  }
  playerState.dead = true;
  penguinMesh.visible = false;
  showDeathScreen();
}

function killPlayer() {
  if (playerState.dead) return;
  playerState.dead = true;
  penguinMesh.visible = false;
  showDeathScreen();
}

// ── Map Items & Tome Choice ───────────────────────────────────────────────────

const mapItems   = []; // still used by elite drops
let choosingTome        = false;
let selectedTomeIdx     = 1;
let tomeInputDelay      = 0;
let currentTomeChoices  = [];
let prevTomeLeft        = false;
let prevTomeRight       = false;
let prevTomeConfirm     = false;

// Tome choice UI
const tomeScreen = document.createElement('div');
tomeScreen.style.cssText = `
  display:none; position:fixed; inset:0; z-index:210;
  background:rgba(0,8,24,0.92);
  flex-direction:column; align-items:center; justify-content:center;
  font-family:monospace; color:#aee8ff;
  pointer-events:none;
`;
tomeScreen.innerHTML = `
  <div style="pointer-events:auto;display:flex;flex-direction:column;align-items:center">
    <div style="font-size:30px;font-weight:bold;letter-spacing:4px;text-shadow:0 0 20px #44aaff;margin-bottom:8px">CHOOSE AN UPGRADE</div>
    <div style="font-size:13px;opacity:0.5;margin-bottom:32px">Pick one tome to carry forward</div>
    <div id="tomeCards" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;max-width:800px"></div>
    <div style="margin-top:28px;font-size:12px;opacity:0.4;letter-spacing:2px">A / D to navigate &nbsp;|&nbsp; P to confirm</div>
  </div>
`;
document.body.appendChild(tomeScreen);

function pickRandomTomes(count) {
  const pool = [...TOME_DEFS, ...WEAPON_DEFS];
  const result = [];
  while (result.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function updateTomeHighlight() {
  const cards = document.querySelectorAll('.tome-card');
  cards.forEach((card, i) => {
    const tome = currentTomeChoices[i];
    const selected = i === selectedTomeIdx;
    card.style.borderColor   = selected ? tome.color : tome.color + '33';
    card.style.transform     = selected ? 'scale(1.07)' : '';
    card.style.boxShadow     = selected ? `0 0 32px ${tome.color}88` : `0 0 12px ${tome.color}11`;
    card.style.background    = selected ? 'rgba(0,28,56,0.95)' : 'rgba(0,16,36,0.9)';
  });
}

let pendingTomes = 0;

// Right-side level-up indicator (mid-screen)
const levelIndicator = document.createElement('div');
levelIndicator.style.cssText = `
  display:none; position:fixed; left:calc(50% + 20%); top:37%; transform:translate(-50%, -50%);
  font-family:monospace; font-size:13px; font-weight:bold; color:#ffee44;
  text-shadow:0 0 10px #ffaa00; letter-spacing:2px; pointer-events:none;
  z-index:100; text-align:center; line-height:1.6;
  animation: levelPulse 1s ease-in-out infinite alternate;
`;
document.head.insertAdjacentHTML('beforeend', `<style>
  @keyframes levelPulse { from { opacity:0.6; } to { opacity:1; } }
</style>`);
document.body.appendChild(levelIndicator);

function updateLevelBtn() {
  if (pendingTomes > 0) {
    levelBtn.style.opacity       = '1';
    levelBtn.style.pointerEvents = 'auto';
    levelBtn.style.borderColor   = '#ffee44cc';
    levelBtn.style.background    = 'rgba(40,30,0,0.6)';
    levelBtn.textContent         = pendingTomes > 1 ? `LEVEL\n×${pendingTomes}` : 'LEVEL';
    levelIndicator.style.display = 'block';
    levelIndicator.innerHTML     = `⬆ LEVEL UP<br>${pendingTomes > 1 ? `×${pendingTomes}` : ''}<br><span style="font-size:10px;opacity:0.6">[ O ]</span>`;
  } else {
    levelBtn.style.opacity       = '0.25';
    levelBtn.style.pointerEvents = 'none';
    levelBtn.style.borderColor   = '#ffee4433';
    levelBtn.style.background    = 'rgba(0,15,40,0.4)';
    levelBtn.textContent         = 'LEVEL';
    levelIndicator.style.display = 'none';
  }
}

function queueTome() {
  pendingTomes++;
  updateLevelBtn();
}

function openPendingTome() {
  if (pendingTomes > 0 && !choosingTome && !playerState.dead) {
    pendingTomes--;
    updateLevelBtn();
    showTomeChoice();
  }
}

function showTomeChoice() {
  choosingTome       = true;
  selectedTomeIdx    = 1;   // start on middle card
  tomeInputDelay     = 0.3; // 0.3s grace period
  prevTomeLeft       = true;  // treat as held so first release registers
  prevTomeRight      = true;
  prevTomeConfirm    = true;
  currentTomeChoices = pickRandomTomes(3);

  const container = document.getElementById('tomeCards');
  container.innerHTML = '';
  currentTomeChoices.forEach((tome, i) => {
    const stacks = tomeStacks[tome.id] || 0;
    const card = document.createElement('div');
    card.className = 'tome-card';
    card.style.cssText = `
      cursor:pointer; border:1px solid ${tome.color}33; padding:22px 18px;
      width:170px; background:rgba(0,16,36,0.9); border-radius:8px;
      text-align:center; transition:border-color 0.12s, transform 0.12s, box-shadow 0.12s;
      box-shadow:0 0 12px ${tome.color}11;
    `;
    card.innerHTML = `
      ${tome.isWeapon ? `<div style="font-size:10px;letter-spacing:2px;color:${tome.color};opacity:0.7;margin-bottom:6px">⚔ WEAPON</div>` : ''}
      <div style="font-size:34px;margin-bottom:10px">${tome.emoji}</div>
      <div style="font-size:15px;font-weight:bold;color:${tome.color};margin-bottom:8px">${tome.name}</div>
      <div style="font-size:12px;opacity:0.75;line-height:1.4">${tome.desc}</div>
      ${!tome.isWeapon && stacks > 0 ? `<div style="font-size:11px;opacity:0.45;margin-top:8px">Stack: ${stacks}</div>` : ''}
      ${tome.isWeapon && equippedWeapons.has(tome.id) ? `<div style="font-size:11px;opacity:0.55;margin-top:8px;color:${tome.color}">✓ ${
        tome.id === 'gandalf_staff' ? `${weaponStacks['gandalf_staff'] || 1} shocks`
        : tome.id === 'toxic_friend' ? `${Math.round((0.15 + 0.05*(weaponStacks['toxic_friend']||1))*100)}% slow`
        : 'Equipped'}</div>` : ''}
    `;
    card.onclick = () => { selectedTomeIdx = i; applyTome(tome.id); };
    container.appendChild(card);
  });

  tomeScreen.style.display = 'flex';
  updateTomeHighlight();
}

const chaosNotif = document.createElement('div');
chaosNotif.style.cssText = `
  display:none; position:fixed; top:38%; left:50%; transform:translateX(-50%);
  font-family:monospace; font-size:22px; color:#ff44ff; font-weight:bold;
  text-shadow:0 0 20px #ff44ff; pointer-events:none; z-index:300;
  letter-spacing:2px; transition:opacity 0.4s;
`;
document.body.appendChild(chaosNotif);

function showChaosReveal(tome) {
  chaosNotif.textContent = `🎲 CHAOS → ${tome.emoji} ${tome.name}!`;
  chaosNotif.style.display = 'block';
  chaosNotif.style.opacity = '1';
  setTimeout(() => {
    chaosNotif.style.opacity = '0';
    setTimeout(() => { chaosNotif.style.display = 'none'; }, 400);
  }, 1800);
}

// ── Post-tome resume gate ─────────────────────────────────────────────────────

let waitingToResume = false;

const resumeHint = document.createElement('div');
resumeHint.style.cssText = `
  display:none; position:fixed; bottom:220px; left:50%; transform:translateX(-50%);
  font-family:monospace; font-size:13px; color:#aee8ff; opacity:0.7;
  letter-spacing:2px; pointer-events:none; z-index:210;
  text-shadow:0 0 8px #44aaff;
`;
resumeHint.textContent = 'TAP ANYWHERE / PRESS ANY KEY TO CONTINUE';
document.body.appendChild(resumeHint);

function enterResumeState() {
  waitingToResume     = true;
  playerState.iframes = 999; // fully invulnerable until resumed
  touchInput.dx = 0; touchInput.dz = 0; touchInput.jump = false;
  resumeHint.style.display = 'block';
}

function resumeGame() {
  if (!waitingToResume) return;
  waitingToResume             = false;
  resumeHint.style.display    = 'none';
  playerState.iframes         = 0;
  movementLockout             = 0.3;
  touchInput.dx = 0; touchInput.dz = 0; touchInput.jump = false;
}

// Any tap or key resumes
document.addEventListener('touchstart', () => resumeGame(), { passive: true });

function applyTome(id) {
  if (WEAPON_DEFS.find(w => w.id === id)) {
    applyWeapon(id);
    tomeScreen.style.display = 'none';
    choosingTome = false;
    touchInput.dx = 0; touchInput.dz = 0; touchInput.jump = false;
    if (pendingTomes > 0) { pendingTomes--; updateLevelBtn(); showTomeChoice(); }
    else enterResumeState();
    return;
  }
  if (id === 'chaos') {
    const others = TOME_DEFS.filter(t => t.id !== 'chaos');
    const random = others[Math.floor(Math.random() * others.length)];
    random.apply(playerStats, () => {});
    tomeStacks[random.id] = (tomeStacks[random.id] || 0) + 1;
    showChaosReveal(random);
  } else {
    const def = TOME_DEFS.find(t => t.id === id);
    def.apply(playerStats, () => applyTome(TOME_DEFS.filter(t => t.id !== 'chaos')[Math.floor(Math.random() * 14)].id));
    tomeStacks[id] = (tomeStacks[id] || 0) + 1;
  }
  // Knock nearby enemies back on level-up
  const lx = player.position.x, lz = player.position.z;
  enemies.forEach(e => {
    if (!e.mesh) return;
    const ex = e.mesh.position.x - lx, ez = e.mesh.position.z - lz;
    const ed = Math.sqrt(ex*ex + ez*ez);
    if (ed < 5 && ed > 0) { e.mesh.position.x += (ex/ed)*2; e.mesh.position.z += (ez/ed)*2; }
  });
  tomeScreen.style.display = 'none';
  choosingTome = false;
  touchInput.dx = 0; touchInput.dz = 0; touchInput.jump = false;
  // Chain to next pending tome immediately, resume gate only after all done
  if (pendingTomes > 0) {
    pendingTomes--;
    updateLevelBtn();
    showTomeChoice();
  } else {
    enterResumeState();
  }
}

function updateTomeInput(dt) {
  if (!choosingTome) return;
  tomeInputDelay -= dt;

  const goLeft    = keys['a'] || keys['arrowleft'];
  const goRight   = keys['d'] || keys['arrowright'];
  const confirm   = keys['l'] || keys['p'];

  if (tomeInputDelay <= 0) {
    if (goLeft  && !prevTomeLeft)  { selectedTomeIdx = Math.max(0, selectedTomeIdx - 1); updateTomeHighlight(); }
    if (goRight && !prevTomeRight) { selectedTomeIdx = Math.min(currentTomeChoices.length - 1, selectedTomeIdx + 1); updateTomeHighlight(); }
    if (confirm && !prevTomeConfirm) applyTome(currentTomeChoices[selectedTomeIdx].id);
  }

  prevTomeLeft    = goLeft;
  prevTomeRight   = goRight;
  prevTomeConfirm = confirm;
}

function spawnMapItem(x, z) {
  const group = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0x8833ff, emissiveIntensity: 1.4, roughness: 0 })
  );
  group.add(orb);
  group.position.set(x, 1.0, z);
  scene.add(group);
  mapItems.push({ group, orb, bobOffset: Math.random() * Math.PI * 2 });
}

function updateItems(dt) {
  // Elite-drop items (purple orbs) still work
  if (choosingTome) return;
  const t = frameTime;
  for (let i = mapItems.length - 1; i >= 0; i--) {
    const item = mapItems[i];
    item.group.position.y = 1.0 + Math.sin(t * 2 + item.bobOffset) * 0.25;
    item.orb.rotation.y += dt * 1.5;
    const dx = player.position.x - item.group.position.x;
    const dz = player.position.z - item.group.position.z;
    if (Math.sqrt(dx*dx + dz*dz) < playerStats.pickupRadius) {
      scene.remove(item.group);
      mapItems.splice(i, 1);
      queueTome();
      break;
    }
  }
}

// ── XP System ─────────────────────────────────────────────────────────────────

let playerLevel = 1;
let playerXP    = 0;
let killCount   = 0;

// Cached DOM refs — avoid getElementById every frame/kill
const killHUDEl    = document.getElementById('killHUD');
const coordHUDEl   = document.getElementById('coordHUD');
const timerHUDEl   = document.getElementById('timerHUD');

function disposeMesh(obj) {
  obj.traverse(child => {
    if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
  });
}

function xpToNext(level) {
  const table = [2, 4, 6, 9, 12, 15, 19, 24, 29, 35, 42, 50];
  return table[Math.min(level - 1, table.length - 1)];
}

const xpOrbs = [];

function spawnXpOrb(x, z, amount = 1) {
  const group = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.15, 0),
    new THREE.MeshStandardMaterial({ color: 0xffee44, emissive: 0xffaa00, emissiveIntensity: 1.6, roughness: 0 })
  );
  group.add(orb);
  group.position.set(x, 0.5, z);
  scene.add(group);
  xpOrbs.push({ group, orb, amount, bobOffset: Math.random() * Math.PI * 2 });
}

function gainXP(amount) {
  playerXP += amount;
  const needed = xpToNext(playerLevel);
  if (playerXP >= needed) {
    playerXP -= needed;
    playerLevel++;
    updateXPBar();
    queueTome();
  }
  updateXPBar();
}

function updateXpOrbs(dt) {
  if (choosingTome) return;
  const t = frameTime;
  for (let i = xpOrbs.length - 1; i >= 0; i--) {
    const orb = xpOrbs[i];
    orb.group.position.y = 0.5 + Math.sin(t * 3 + orb.bobOffset) * 0.15;
    orb.orb.rotation.y += dt * 2;
    const dx = player.position.x - orb.group.position.x;
    const dz = player.position.z - orb.group.position.z;
    const pr = playerStats.pickupRadius + 0.8;
    if (dx*dx + dz*dz < pr * pr) {
      disposeMesh(orb.group); scene.remove(orb.group);
      xpOrbs.splice(i, 1);
      gainXP(orb.amount);
    }
  }
}

// ── Fish Pickups ──────────────────────────────────────────────────────────────

const fish = [];

function buildFishModel() {
  const g = new THREE.Group();
  const fishMat = new THREE.MeshStandardMaterial({ color: 0xff9900, roughness: 0.6, emissive: 0xff6600, emissiveIntensity: 0.3 });

  // Body — flat oval
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 7), fishMat);
  body.scale.set(1.8, 0.7, 1.0);
  g.add(body);

  // Tail fin
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 4), fishMat);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.36;
  g.add(tail);

  return g;
}

function randomFishPos() {
  let x, z, tries = 0;
  do {
    x = (Math.random() - 0.5) * 160;
    z = (Math.random() - 0.5) * 160;
    tries++;
  } while (tries < 60 && (
    Math.hypot(x, z) < 10 ||
    Math.hypot(x + 20, z + 20) < 22 ||
    Math.hypot(x - WATER_CX, z - WATER_CZ) < WATER_R + 4 ||
    Math.abs(x) > 88 || Math.abs(z) > 88
  ));
  return { x, z };
}

// HP flash notification
const fishFlash = document.createElement('div');
fishFlash.style.cssText = 'display:none;position:fixed;top:32%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:20px;color:#44ffaa;font-weight:bold;text-shadow:0 0 12px #00ff88;pointer-events:none;z-index:400;opacity:0;transition:opacity 0.3s';
document.body.appendChild(fishFlash);

function showFishFlash(text, color) {
  fishFlash.textContent = text;
  fishFlash.style.color = color;
  fishFlash.style.textShadow = `0 0 12px ${color}`;
  fishFlash.style.display = 'block';
  fishFlash.style.opacity = '1';
  setTimeout(() => {
    fishFlash.style.opacity = '0';
    setTimeout(() => { fishFlash.style.display = 'none'; }, 320);
  }, 900);
}

(function spawnFish() {
  for (let i = 0; i < 8; i++) {
    const { x, z } = randomFishPos();
    const mesh = buildFishModel();
    mesh.position.set(x, 0.25, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    fish.push({ mesh, bobOffset: Math.random() * Math.PI * 2 });
  }
})();

function updateFish(dt) {
  const t = frameTime;
  for (let i = fish.length - 1; i >= 0; i--) {
    const f = fish[i];
    f.mesh.position.y = 0.25 + Math.sin(t * 2 + f.bobOffset) * 0.08;
    f.mesh.rotation.y += dt * 0.8;
    const dx = player.position.x - f.mesh.position.x;
    const dz = player.position.z - f.mesh.position.z;
    if (Math.hypot(dx, dz) < 1.2) {
      scene.remove(f.mesh);
      fish.splice(i, 1);
      if (playerState.hp < playerState.maxHp) {
        playerState.hp++;
        updateHUD();
        showFishFlash('+1 HP 🐟', '#44ffaa');
      } else {
        showFishFlash('wasted 🐟', '#ffaa44');
      }
    }
  }
}

// ── Orcas ─────────────────────────────────────────────────────────────────────

const orcas = [];
let playerWaterTimer = 0; // seconds player has been in water
let orcasChasing     = false;

function buildOrca() {
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.8 });
  const parts = [];

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), black);
  body.scale.set(2.6, 0.9, 1.0); parts.push(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), white);
  belly.scale.set(1.7, 0.45, 0.65); belly.position.set(0.1, -0.28, 0.42); parts.push(belly);

  [-1, 1].forEach(side => {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), white);
    patch.scale.set(0.7, 0.55, 0.22); patch.position.set(1.3, 0.28, side * 0.72); parts.push(patch);
  });

  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.0, 6), black);
  fin.position.set(-0.1, 0.9, 0); parts.push(fin);

  [-1, 1].forEach(side => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), black);
    f.scale.set(1.1, 0.16, 0.75); f.position.set(0.6, -0.32, side * 0.95);
    f.rotation.z = side * 0.28; parts.push(f);
    const fluke = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 5), black);
    fluke.scale.set(0.65, 0.13, 1.05); fluke.position.set(-2.1, -0.1, side * 0.5);
    fluke.rotation.y = side * 0.38; parts.push(fluke);
  });

  return buildMergedGroup(parts); // 2 draw calls → replaces ~10
}

function spawnOrcas() {
  for (let i = 0; i < 2; i++) {
    const angle = (i / 2) * Math.PI * 2;
    const r     = WATER_R * 0.45;
    const mesh  = buildOrca();
    mesh.position.set(WATER_CX + Math.cos(angle) * r, 0.2, WATER_CZ + Math.sin(angle) * r);
    scene.add(mesh);
    orcas.push({ mesh, idleAngle: angle, idleSpeed: 0.28 + Math.random() * 0.15 });
  }
}

function updateOrcas(dt) {
  const playerGrounded  = playerY < 0.4;
  const playerInWaterZone = isInWater(player.position.x, player.position.z);
  const inWater = playerGrounded && playerInWaterZone;

  if (inWater) {
    playerWaterTimer += dt;
    if (playerWaterTimer >= 1.0) orcasChasing = true;
  } else if (playerGrounded) {
    // Only reset when player is physically on ground outside water
    playerWaterTimer = 0;
    orcasChasing     = false;
  }
  // While airborne: preserve chasing state — no position reset

  for (const o of orcas) {
    const bob = Math.sin(frameTime * 1000 / 700 + o.idleAngle) * 0.08;

    if (orcasChasing) {
      const dx   = player.position.x - o.mesh.position.x;
      const dz   = player.position.z - o.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (playerOnWaterIceSpot()) {
        // Player on safe spot — retreat toward idle circle position
        const targetX = WATER_CX + Math.cos(o.idleAngle) * WATER_R * 0.48;
        const targetZ = WATER_CZ + Math.sin(o.idleAngle) * WATER_R * 0.48;
        const rdx = targetX - o.mesh.position.x;
        const rdz = targetZ - o.mesh.position.z;
        const rdist = Math.hypot(rdx, rdz);
        if (rdist > 0.5) {
          o.mesh.position.x += (rdx / rdist) * 4.0 * dt;
          o.mesh.position.z += (rdz / rdist) * 4.0 * dt;
          o.idleAngle += o.idleSpeed * dt; // keep idle angle drifting
        }
      } else if (dist > 0.5) {
        // 125% of water speed (7.8 * 1.2 * 1.25 = 11.7)
        let nx = o.mesh.position.x + (dx / dist) * 11.7 * dt;
        let nz = o.mesh.position.z + (dz / dist) * 11.7 * dt;
        // Clamp inside water pool
        const fc = Math.hypot(nx - WATER_CX, nz - WATER_CZ);
        if (fc > WATER_R - 1.0) {
          const a = Math.atan2(nz - WATER_CZ, nx - WATER_CX);
          nx = WATER_CX + Math.cos(a) * (WATER_R - 1.0);
          nz = WATER_CZ + Math.sin(a) * (WATER_R - 1.0);
        }
        o.mesh.position.x = nx;
        o.mesh.position.z = nz;
        o.mesh.rotation.y = Math.atan2(-dz, dx);
      }

      if (dist < 1.4 && inWater && playerY < 0.3 && !playerOnWaterIceSpot() && playerState.iframes <= 0) killPlayer();
    } else {
      // Idle — circle the pool
      o.idleAngle += o.idleSpeed * dt;
      const r = WATER_R * 0.48;
      o.mesh.position.x = WATER_CX + Math.cos(o.idleAngle) * r;
      o.mesh.position.z = WATER_CZ + Math.sin(o.idleAngle) * r;
      // Face direction of travel (tangent)
      o.mesh.rotation.y = Math.atan2(-Math.cos(o.idleAngle), Math.sin(o.idleAngle));
    }

    o.mesh.position.y = 0.2 + bob;
  }
}

spawnOrcas();

// ── Ice Safe Spots (inside water pool) ───────────────────────────────────────

const waterIceSpots = []; // { x, z, r } — orca-safe platforms inside the pool

(function placeWaterIceSpots() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a7c45, roughness: 0.9 });
  // Place 4 platforms at ~55% of pool radius so they're reachable by jumping
  const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  angles.forEach(a => {
    const r   = WATER_R * 0.55;
    const x   = WATER_CX + Math.cos(a) * r;
    const z   = WATER_CZ + Math.sin(a) * r;
    const rad = 2.2;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(rad, 12), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    scene.add(mesh);
    waterIceSpots.push({ x, z, r: rad });
  });
})();

function playerOnWaterIceSpot() {
  const px = player.position.x, pz = player.position.z;
  return waterIceSpots.some(s => Math.hypot(px - s.x, pz - s.z) < s.r);
}

// ── Humans (Observers) ───────────────────────────────────────────────────────

const HUMAN_VISION_RANGE = 12; // doubled from 6
const HUMAN_VISION_COS   = Math.cos(Math.PI / 4); // 45° half-angle = 90° total cone
const HUMAN_PHOTO_CHARGE = 1.0;  // seconds to take photo
const HUMAN_PHOTO_COOLDOWN = 12; // seconds before they can aim again

const humans = [];
let playerPhotoStun = 0; // seconds remaining of post-photo slow

function makeVisionConeMesh() {
  const halfAngle = Math.acos(HUMAN_VISION_COS);
  const segments  = 24;
  const shape     = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = -halfAngle + t * 2 * halfAngle;
    // -cos maps shape -Y → human-local +Z (camera direction) after rotation.x=-PI/2
    shape.lineTo(Math.sin(a) * HUMAN_VISION_RANGE, -Math.cos(a) * HUMAN_VISION_RANGE);
  }
  shape.lineTo(0, 0);
  const geo  = new THREE.ShapeGeometry(shape);
  const mat  = new THREE.MeshBasicMaterial({
    color: 0xffee44, transparent: true, opacity: 0.12,
    side: THREE.DoubleSide, depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

function buildHuman() {
  const g = new THREE.Group();
  const skin    = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.8 });
  const jacket  = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.8 });
  const pants   = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.9 });
  const camMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.7 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.0, metalness: 0.9, transparent: true, opacity: 0.85 });

  // Legs
  [-0.15, 0.15].forEach(x => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.28), pants);
    leg.position.set(x, 0.55, 0); g.add(leg);
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.38), jacket);
  torso.position.y = 1.1; torso.castShadow = true; g.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), skin);
  head.position.y = 1.72; g.add(head);

  // Left arm — relaxed
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.24), jacket);
  armL.position.set(-0.42, 1.08, 0); g.add(armL);

  // Right arm — raised, holding camera
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.24), jacket);
  armR.position.set(0.42, 1.38, 0.14);
  armR.rotation.x = -0.65; g.add(armR);

  // Camera body
  const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.18), camMat);
  camBody.position.set(0.25, 1.7, 0.34); g.add(camBody);

  // Lens
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.16, 8), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.25, 1.7, 0.46); g.add(lens);

  // Charge ring — shown above head while aiming
  const chargeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.045, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0 })
  );
  chargeRing.rotation.x = Math.PI / 2;
  chargeRing.position.y = 2.25;
  g.add(chargeRing);
  g.userData.chargeRing = chargeRing;

  // Vision cone indicator on the ground
  const visionCone = makeVisionConeMesh();
  g.add(visionCone);
  g.userData.visionCone = visionCone;

  return g;
}

// Screen flash for photo
const photoFlash = document.createElement('div');
photoFlash.style.cssText = 'display:none;position:fixed;inset:0;background:white;pointer-events:none;z-index:500;opacity:0;transition:opacity 0.35s';
document.body.appendChild(photoFlash);

const photoNotif = document.createElement('div');
photoNotif.style.cssText = 'display:none;position:fixed;top:32%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:22px;color:#fff;font-weight:bold;text-shadow:0 0 12px #000;pointer-events:none;z-index:501;letter-spacing:2px;opacity:0;transition:opacity 0.35s';
document.body.appendChild(photoNotif);

function triggerPhoto(h) {
  h.charge   = 0;
  h.cooldown = HUMAN_PHOTO_COOLDOWN;
  h.mesh.userData.chargeRing.material.opacity = 0;
  playerPhotoStun = 1.5;

  // Flash on, then fade
  photoFlash.style.display = 'block';
  photoFlash.style.opacity = '0.92';
  setTimeout(() => {
    photoFlash.style.opacity = '0';
    setTimeout(() => { photoFlash.style.display = 'none'; }, 360);
  }, 60);

  photoNotif.textContent = '📸 PHOTO TAKEN!';
  photoNotif.style.display = 'block';
  photoNotif.style.opacity = '1';
  setTimeout(() => {
    photoNotif.style.opacity = '0';
    setTimeout(() => { photoNotif.style.display = 'none'; }, 360);
  }, 1400);
}

function spawnHumans() {
  for (let i = 0; i < 9; i++) {
    let x, z, tries = 0;
    do {
      x = (Math.random() - 0.5) * 160;
      z = (Math.random() - 0.5) * 160;
      tries++;
    } while (tries < 60 && (
      Math.hypot(x, z) < 12 ||                    // avoid spawn area
      Math.hypot(x + 20, z + 20) < 20 ||          // avoid mountain
      Math.hypot(x - WATER_CX, z - WATER_CZ) < 36 || // avoid water
      Math.abs(x) > 88 || Math.abs(z) > 88
    ));

    const mesh = buildHuman();
    const facing = Math.random() * Math.PI * 2;
    mesh.rotation.y = facing;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    humans.push({ mesh, facing, charge: 0, cooldown: 0 });
  }
}

function updateHumans(dt) {
  if (playerState.dead) return;
  if (playerPhotoStun > 0) playerPhotoStun = Math.max(0, playerPhotoStun - dt);

  for (const h of humans) {
    const ring = h.mesh.userData.chargeRing;
    const cone = h.mesh.userData.visionCone;

    if (h.cooldown > 0) {
      h.cooldown -= dt;
      ring.material.opacity = 0;
      cone.material.opacity = 0.12;
      cone.material.color.setHex(0xffee44);
      continue;
    }

    const dx   = player.position.x - h.mesh.position.x;
    const dz   = player.position.z - h.mesh.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < HUMAN_VISION_RANGE) {
      const fwdX = Math.sin(h.facing);   // human camera faces local +Z
      const fwdZ = Math.cos(h.facing);
      const dot  = (dx / dist) * fwdX + (dz / dist) * fwdZ;

      if (dot > HUMAN_VISION_COS) {
        h.charge += dt / HUMAN_PHOTO_CHARGE;
        ring.material.opacity = 0.45 + h.charge * 0.55;
        ring.material.color.setHex(h.charge < 0.6 ? 0xffee44 : 0xff8800);
        // Cone brightens and shifts orange as charge builds
        cone.material.opacity = 0.18 + h.charge * 0.35;
        cone.material.color.setHex(h.charge < 0.6 ? 0xffee44 : 0xff8800);
        if (h.charge >= 1.0) triggerPhoto(h);
        continue;
      }
    }

    // Out of sight — drain charge, cone stays dim yellow
    h.charge = Math.max(0, h.charge - dt * 0.6);
    ring.material.opacity = h.charge * 0.45;
    cone.material.opacity = 0.12;
    cone.material.color.setHex(0xffee44);
  }
}

spawnHumans();
ensureShaggyRing(); // player starts with 1 shaggy charge
spawnMapItem(31, 10); // single tome on the map


// ── Touch Controls ───────────────────────────────────────────────────────────

const touchInput = { dx: 0, dz: 0, jump: false };
let joystickTouchId = null;
const JOY_RADIUS = 55; // max handle travel in px

// ── Left controller — movement joystick ──────────────────────────────────────

const leftPad = document.createElement('div');
leftPad.style.cssText = `
  position:fixed; bottom:40px; left:40px; z-index:250;
  width:140px; height:140px; border-radius:50%;
  border:2px solid rgba(170,220,255,0.2);
  background:rgba(0,15,40,0.35);
  touch-action:none; user-select:none; -webkit-user-select:none;
`;
document.body.appendChild(leftPad);

const joyHandle = document.createElement('div');
joyHandle.style.cssText = `
  position:absolute; top:50%; left:50%;
  width:52px; height:52px; border-radius:50%;
  background:rgba(100,200,255,0.45);
  border:2px solid rgba(170,220,255,0.75);
  transform:translate(-50%,-50%);
  transition:background 0.1s;
  pointer-events:none;
`;
leftPad.appendChild(joyHandle);

// ── Right controller — action buttons ────────────────────────────────────────

const rightPad = document.createElement('div');
rightPad.style.cssText = `
  position:fixed; bottom:40px; right:40px; z-index:250;
  display:flex; flex-direction:column; align-items:center; gap:14px;
  touch-action:none; user-select:none; -webkit-user-select:none;
`;
document.body.appendChild(rightPad);

// Top row: POWERUP + LEVEL side by side
const rightTopRow = document.createElement('div');
rightTopRow.style.cssText = 'display:flex; gap:14px; align-items:center;';
rightPad.appendChild(rightTopRow);

function makeActionBtn(label, color, parent) {
  const btn = document.createElement('div');
  btn.style.cssText = `
    width:80px; height:80px; border-radius:50%;
    border:2px solid ${color}66;
    background:rgba(0,15,40,0.4);
    font-family:monospace; font-size:12px; font-weight:bold;
    color:${color}; letter-spacing:1px;
    display:flex; align-items:center; justify-content:center;
    touch-action:none;
  `;
  btn.textContent = label;
  (parent || rightPad).appendChild(btn);
  return btn;
}

// POWERUP button — dimmed until power-ups are pending
let pendingPowerUps = 0;
const powerUpBtn = document.createElement('div');
powerUpBtn.style.cssText = `
  width:80px; height:80px; border-radius:50%;
  border:2px solid #88ddff33;
  background:rgba(0,15,40,0.4);
  font-family:monospace; font-size:11px; font-weight:bold;
  color:#88ddff; letter-spacing:1px;
  display:flex; align-items:center; justify-content:center;
  touch-action:none; opacity:0.25; pointer-events:none;
  transition:opacity 0.2s, border-color 0.2s, background 0.2s;
`;
powerUpBtn.textContent = 'POWER';
rightTopRow.appendChild(powerUpBtn);

function updatePowerUpBtn() {
  if (storedPowerUp) {
    powerUpBtn.style.opacity       = '1';
    powerUpBtn.style.pointerEvents = 'auto';
    powerUpBtn.style.borderColor   = `${storedPowerUp.color}cc`;
    powerUpBtn.style.background    = 'rgba(0,30,50,0.8)';
    powerUpBtn.style.color         = storedPowerUp.color;
    powerUpBtn.textContent         = `USE\n${storedPowerUp.emoji}`;
  } else if (pendingPowerUps > 0) {
    powerUpBtn.style.opacity       = '1';
    powerUpBtn.style.pointerEvents = 'auto';
    powerUpBtn.style.borderColor   = '#88ddffcc';
    powerUpBtn.style.background    = 'rgba(0,30,50,0.6)';
    powerUpBtn.style.color         = '#88ddff';
    powerUpBtn.textContent         = pendingPowerUps > 1 ? `POWER ×${pendingPowerUps}` : 'POWER';
  } else {
    powerUpBtn.style.opacity       = '0.25';
    powerUpBtn.style.pointerEvents = 'none';
    powerUpBtn.style.borderColor   = '#88ddff33';
    powerUpBtn.style.background    = 'rgba(0,15,40,0.4)';
    powerUpBtn.style.color         = '#88ddff';
    powerUpBtn.textContent         = 'POWER';
  }
}

function activatePowerUpBtn() {
  if (playerState.dead) return;
  if (storedPowerUp) {
    storedPowerUp.apply();
    if (storedPowerUp.duration) activePowerUps[storedPowerUp.id] = storedPowerUp.duration;
    storedPowerUp = null;
    updatePowerUpBtn();
    updatePowerUpHUD();
  } else if (pendingPowerUps > 0 && !choosingPowerUp) {
    pendingPowerUps--;
    updatePowerUpBtn();
    showPowerUpChoice();
  }
}
powerUpBtn.addEventListener('pointerdown', activatePowerUpBtn);
powerUpBtn.addEventListener('touchstart', e => { e.preventDefault(); activatePowerUpBtn(); }, { passive: false });

// LEVEL button — dimmed until tomes are pending
const levelBtn = document.createElement('div');
levelBtn.style.cssText = `
  width:80px; height:80px; border-radius:50%;
  border:2px solid #ffee4433;
  background:rgba(0,15,40,0.4);
  font-family:monospace; font-size:11px; font-weight:bold;
  color:#ffee44; letter-spacing:1px;
  display:flex; align-items:center; justify-content:center;
  touch-action:none; opacity:0.25; pointer-events:none;
  transition:opacity 0.2s, border-color 0.2s, background 0.2s;
`;
levelBtn.textContent = 'LEVEL';
rightTopRow.appendChild(levelBtn);

// JUMP button — bottom row, centered
const jumpBtn = makeActionBtn('JUMP', '#aee8ff', rightPad);


// ── Joystick logic ────────────────────────────────────────────────────────────

function getJoyCenter() {
  const r = leftPad.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function setHandle(ox, oy) {
  const d = Math.hypot(ox, oy) || 1;
  const c = Math.min(d, JOY_RADIUS);
  touchInput.dx = (ox / d) * (c / JOY_RADIUS);
  touchInput.dz = (oy / d) * (c / JOY_RADIUS);
  joyHandle.style.left = `calc(50% + ${(ox / d) * c}px)`;
  joyHandle.style.top  = `calc(50% + ${(oy / d) * c}px)`;
  joyHandle.style.background = 'rgba(150,220,255,0.65)';
}

function resetHandle() {
  touchInput.dx = 0; touchInput.dz = 0;
  joyHandle.style.left = '50%'; joyHandle.style.top = '50%';
  joyHandle.style.background = 'rgba(100,200,255,0.45)';
}

leftPad.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joystickTouchId = t.identifier;
  const c = getJoyCenter();
  setHandle(t.clientX - c.x, t.clientY - c.y);
}, { passive: false });

leftPad.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = [...e.changedTouches].find(t => t.identifier === joystickTouchId);
  if (!t) return;
  const c = getJoyCenter();
  setHandle(t.clientX - c.x, t.clientY - c.y);
}, { passive: false });

leftPad.addEventListener('touchend', e => {
  const t = [...e.changedTouches].find(t => t.identifier === joystickTouchId);
  if (t) { joystickTouchId = null; resetHandle(); }
}, { passive: true });

// ── Jump button logic ─────────────────────────────────────────────────────────

jumpBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  touchInput.jump = true;
  jumpBtn.style.background = 'rgba(100,180,255,0.35)';
}, { passive: false });

jumpBtn.addEventListener('touchend', () => {
  touchInput.jump = false;
  jumpBtn.style.background = 'rgba(0,15,40,0.4)';
}, { passive: true });

levelBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  openPendingTome();
}, { passive: false });

// ── Input ─────────────────────────────────────────────────────────────────────

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'o') openPendingTome();
  if (e.key.toLowerCase() === 'l') activatePowerUpBtn();
  if (choosingPowerUp) {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  { puSelectedIdx = 0; puHighlight(); }
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { puSelectedIdx = 1; puHighlight(); }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Enter') confirmPuChoice();
    e.preventDefault();
  }
  if ((e.key === '6' || e.key === '7') && keys['6'] && keys['7'] && !playerState.dead) {
    penguinMesh.clear();
    penguinMesh.add(buildWizardCat());
  }
  const typing = document.activeElement?.id === 'nameInput';
  if (!typing) resumeGame();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ── Game Loop ─────────────────────────────────────────────────────────────────

const SPEED      = 7.9;
const CAM_OFFSET = new THREE.Vector3(0, 14, 13);

let lastTime = performance.now();

let movementLockout = 0;
let frameTime = 0; // cached Date.now()/1000 per frame — avoids repeated calls in update loops

function update(dt) {
  frameTime = Date.now() / 1000;
  updateTomeInput(dt);
  if (playerState.dead || choosingTome || choosingPowerUp || waitingToResume) return;
  tickPowerUps(dt);
  playerState.iframes   = Math.max(0, playerState.iframes - dt);
  if (playerState.shaggyMaxCharges > 0 && playerState.shaggyCharges < playerState.shaggyMaxCharges) {
    playerState.shaggyRechargeTimer += dt;
    if (playerState.shaggyRechargeTimer >= 30) {
      playerState.shaggyCharges = playerState.shaggyMaxCharges;
      playerState.shaggyRechargeTimer = 0;
    }
  }
  // Shield lifesteal blocked for 30s after taking shield damage
  if (playerStats.shieldDmgTimer > 0) playerStats.shieldDmgTimer = Math.max(0, playerStats.shieldDmgTimer - dt);
  // HP regen — 1 HP every 5s
  playerState.regenTimer = (playerState.regenTimer || 0) + dt;
  if (playerState.regenTimer >= 5 && playerState.hp < playerState.maxHp && !playerState.dead) {
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + 1);
    playerState.regenTimer = 0;
    updateHUD();
  }
  // Shaggy gold ring follows player
  if (shaggyRing) {
    shaggyRing.visible = playerState.shaggyCharges > 0;
    if (shaggyRing.visible) {
      shaggyRing.position.x = player.position.x;
      shaggyRing.position.z = player.position.z;
      shaggyRingMat.opacity = 0.55 + Math.sin(frameTime * 1000 / 300) * 0.15;
    }
  }
  movementLockout       = Math.max(0, movementLockout - dt);

  // Player movement — preserve air momentum during post-tome lockout
  if (movementLockout > 0 && playerY > 0 && (playerVel.x !== 0 || playerVel.z !== 0)) {
    player.position.x = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.x + playerVel.x * dt));
    player.position.z = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.z + playerVel.z * dt));
  } else {
    let dx = movementLockout > 0 ? 0 : touchInput.dx;
    let dz = movementLockout > 0 ? 0 : touchInput.dz;
    if (movementLockout <= 0) {
      if (keys['w'] || keys['arrowup'])    dz -= 1;
      if (keys['s'] || keys['arrowdown'])  dz += 1;
      if (keys['a'] || keys['arrowleft'])  dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
    }

    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx*dx + dz*dz);
      dx /= len; dz /= len;
      const onSnow  = playerY < 0.3 && isOnSnowPatch(player.position.x, player.position.z);
      const onWater = playerY < 0.3 && isInWater(player.position.x, player.position.z);
      const stunMult = playerPhotoStun > 0 ? 0.35 : 1.0;
      const airMult  = (_airBoost && playerY > 0) ? 1.1 : 1.0;
      const effSpeed = SPEED * stormSlow * playerStats.moveSpeed * stunMult * airMult * (onSnow ? 0.7 : onWater ? 1.2 : 1.0);
      document.getElementById('ui').style.color = onWater ? '#44ffcc' : '#aee8ff';
      player.position.x = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.x + dx * effSpeed * dt));
      player.position.z = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.z + dz * effSpeed * dt));
      player.rotation.y = Math.atan2(-dx, -dz);
      playerVel.set(dx * effSpeed, 0, dz * effSpeed);
    } else {
      playerVel.set(0, 0, 0);
    }
  }

  // Mountain collision — push player out of peak radii
  for (const col of mountainColliders) {
    const mdx = player.position.x - col.x;
    const mdz = player.position.z - col.z;
    const dist = Math.hypot(mdx, mdz);
    if (dist < col.r && dist > 0.01) {
      player.position.x = col.x + (mdx / dist) * col.r;
      player.position.z = col.z + (mdz / dist) * col.r;
    }
  }

  // Jump (P)
  const wantsJump = keys['p'] || touchInput.jump;
  const justPressed = wantsJump && !jumpPressed;
  if (justPressed) {
    if (playerY === 0) {
      playerVY    = JUMP_FORCE;
      _jumpSpammed = false; // reset spam flag on each ground jump
    } else if (!_jumpSpammed && _jumpBuffer <= 0) {
      _jumpBuffer = 0.18;   // first airborne press — open window
    } else {
      _jumpBuffer  = 0;     // spammed — close window, lock it out
      _jumpSpammed = true;
    }
  }
  if (_jumpBuffer > 0) _jumpBuffer -= dt;
  if (_perfectCooldown > 0) _perfectCooldown -= dt;
  jumpPressed = wantsJump;

  const wasAirborne = playerY > 0;
  playerVY += GRAVITY * dt;
  playerY  += playerVY * dt;
  if (playerY < 0) {
    playerY = 0; playerVY = 0;
    if (wasAirborne) {
      if (_jumpBuffer > 0 && _perfectCooldown <= 0) {
        // Perfect landing — jump again immediately with air boost
        playerVY  = JUMP_FORCE;
        _airBoost = true;
        _jumpBuffer = 0;
        _perfectCooldown = 0.6; // must wait 0.6s before next perfect jump
        spawnGust(player.position.x, player.position.z);
      } else {
        _airBoost = false;
      }
    }
  }
  player.position.y = playerY;

  // While airborne — check if crossing a crack (generous 3-unit radius)
  if (playerY > 0) {
    const px = player.position.x, pz = player.position.z;
    for (const c of cracks) {
      if (!c.clearedThisJump && c.cooldownTimer <= 0 && pointToSegDist(px, pz, c.ax, c.az, c.bx, c.bz) < 3.0) {
        c.clearedThisJump = true;
        c.cooldownTimer = 20; // 20-sec per-crack cooldown
      }
    }
  }

  // Landing — tally cleared cracks
  if (wasAirborne && playerY === 0) {
    let cleared = 0;
    for (const c of cracks) {
      if (c.clearedThisJump) { cleared++; c.clearedThisJump = false; }
    }
    if (cleared > 0) {
      const before = Math.floor(crackJumps / CRACK_MILESTONE);
      crackJumps += cleared;
      updateJumpHUD();
      if (Math.floor(crackJumps / CRACK_MILESTONE) > before) { pendingPowerUps++; updatePowerUpBtn(); }
    }
  }

  // Ice crack collision — only lethal when on the ground
  if (playerY < 0.4) {
    const px = player.position.x, pz = player.position.z;
    for (const c of cracks) {
      if (pointToSegDist(px, pz, c.ax, c.az, c.bx, c.bz) < c.halfWidth) {
        killPlayer();
        break;
      }
    }
  }

  // Decrement per-crack cooldown timers
  for (const c of cracks) { if (c.cooldownTimer > 0) c.cooldownTimer -= dt; }

  // Flash penguin red during iframes
  penguinMesh.visible = !(playerState.iframes > 0 && Math.floor(playerState.iframes * 10) % 2 === 0);

  camera.position.copy(player.position).add(CAM_OFFSET);
  camera.lookAt(player.position);
  coordHUDEl.textContent = `${Math.round(player.position.x)}, ${Math.round(player.position.z)}`;
  rimLight.position.set(player.position.x, 1, player.position.z);

  // Snow
  const pos = snowPoints.geometry.attributes.position;
  for (let i = 0; i < SNOW_COUNT; i++) {
    pos.array[i*3+1] -= snowVel[i] * dt;
    if (pos.array[i*3+1] < 0) {
      pos.array[i*3+1] = 28;
      pos.array[i*3]   = player.position.x + (Math.random()-0.5)*100;
      pos.array[i*3+2] = player.position.z + (Math.random()-0.5)*100;
    }
  }
  pos.needsUpdate = true;

  // Auto-attack (boomerang waits for return before firing again)
  if ((enemies.length > 0 || boss) && !boomerangInFlight) {
    attackTimer -= dt;
    if (attackTimer <= 0) {
      const target = findNearestEnemy();
      if (target) fireSnowball(target);
      attackTimer = ATTACK_RATE * playerStats.attackRate;
    }
  }

  tickWeapons(dt);
  if (equippedWeapons.has('toxic_friend')) {
    weaponTimers['toxic_drop'] = (weaponTimers['toxic_drop'] || 0) - dt;
    if (weaponTimers['toxic_drop'] <= 0) { dropToxicPool(); weaponTimers['toxic_drop'] = TOXIC_POOL_INTERVAL; }
    updateToxicPools(dt);
  }
  if (equippedWeapons.has('aura_farmer')) updateAuraRing();
  updateBurst(dt);
  updateOrcas(dt);
  updateHumans(dt);
  updateItems(dt);
  updateXpOrbs(dt);
  updateFish(dt);
  updateThinIce(dt);
  updateStorm(dt);
  sepFrame ^= 1;
  updateEnemies(dt);
  updateBoss(dt);
  updateSnowballs(dt);
  updateNomOrbs(dt);
  updateBombs(dt);
  updateExplosions(dt);
  updateGusts(dt);
}

const fpsHUD = document.getElementById('fpsHUD');
let _fpsTimer = 0, _fpsFrames = 0, _fpsDisplay = 0;

const DEAD_ZONE = 0.15;
const _gpPrev = {}; // tracks previous button states to detect press edges
function pollGamepad() {
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (!gp) return;
  const ax = gp.axes[0] ?? 0; // left stick X
  const ay = gp.axes[1] ?? 0; // left stick Y
  touchInput.dx = Math.abs(ax) > DEAD_ZONE ? ax : 0;
  touchInput.dz = Math.abs(ay) > DEAD_ZONE ? ay : 0;

  const btn = (i) => !!gp.buttons[i]?.pressed;
  const pressed = (i) => btn(i) && !_gpPrev[i]; // true only on the frame it goes down

  // A / Cross / B(Switch) — jump + confirm tome/powerup choice
  touchInput.jump = btn(0);
  if (btn(0)) keys['p'] = true; else delete keys['p'];

  // B / Circle / A(Switch) — level up tome
  if (pressed(1)) openPendingTome();

  // X / Square / Y(Switch) — activate power up
  if (pressed(2)) activatePowerUpBtn();

  // Y / Triangle / X(Switch) — enter name on death screen
  if (pressed(3) && playerState.dead) {
    const input = document.getElementById('nameInput');
    if (input) {
      const name = prompt('Enter your name:', input.value || '');
      if (name !== null) input.value = name;
    }
  }

  // D-pad left/right + left stick — navigate tome and power-up choices
  const goingLeft  = btn(14) || ax < -DEAD_ZONE;
  const goingRight = btn(15) || ax >  DEAD_ZONE;
  if (pressed(14) || (goingLeft  && !_gpPrev._stickLeft))  { keys['a'] = true;  _gpPrev._stickLeft  = true; }
  if (pressed(15) || (goingRight && !_gpPrev._stickRight)) { keys['d'] = true;  _gpPrev._stickRight = true; }
  if (!goingLeft)  { delete keys['a']; _gpPrev._stickLeft  = false; }
  if (!goingRight) { delete keys['d']; _gpPrev._stickRight = false; }

  // Any button — dismiss intro screen
  if (gp.buttons.some(b => b.pressed) && document.getElementById('introScreen')) {
    document.getElementById('introScreen').remove();
  }

  // Any button — resume after tome pick
  if (waitingToResume && gp.buttons.some(b => b.pressed)) resumeGame();

  // Start / Options / Plus — retry when dead
  if (pressed(9) && playerState.dead) {
    location.href = location.pathname + '?v=' + Date.now();
  }

  gp.buttons.forEach((b, i) => { _gpPrev[i] = b.pressed; });
}

window.addEventListener('gamepadconnected',    e => console.log('Gamepad connected:', e.gamepad.id));
window.addEventListener('gamepaddisconnected', e => console.log('Gamepad disconnected:', e.gamepad.id));

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.05);
  lastTime  = now;
  _fpsFrames++;
  _fpsTimer += dt;
  if (_fpsTimer >= 0.5) {
    _fpsDisplay = Math.round(_fpsFrames / _fpsTimer);
    fpsHUD.textContent = _fpsDisplay + ' fps';
    _fpsFrames = 0; _fpsTimer = 0;
  }
  pollGamepad();
  update(dt);
  if (spooksNPC) spooksNPC.position.y = 0.30 + 0.18 * Math.sin(Date.now() / 500);
  renderer.render(scene, camera);
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  adaptFOV();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
