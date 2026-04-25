// Unwanted Penguin — shared engine for all levels
const CURRENT_LEVEL = window.CURRENT_LEVEL || 1;
const _levelSave    = JSON.parse(sessionStorage.getItem('levelProgress') || 'null');

// ── Difficulty ────────────────────────────────────────────────────────────────
// 'normal' = balanced (saved balancing), 'easy' = player 20% stronger + 10x L3 gold
const DIFFICULTY = 'easy';
const EASY = DIFFICULTY === 'easy';


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

scene.add(new THREE.AmbientLight(0x3366bb, 1.1));

const sun = new THREE.DirectionalLight(0xccddff, 2.2);
sun.position.set(15, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
['left','right','top','bottom'].forEach((s,i) => sun.shadow.camera[s] = [-60,60,60,-60][i]);
sun.shadow.camera.far = 120;
scene.add(sun);

const rimLight = new THREE.PointLight(0x00aaff, 0.8, 60);
scene.add(rimLight);

// ── Level-specific map setup ──────────────────────────────────────────────────

if (CURRENT_LEVEL === 2) {
  scene.background = new THREE.Color(0x020c18);
  scene.fog = new THREE.FogExp2(0x020c18, 0.014);
}
if (CURRENT_LEVEL === 3) {
  scene.background = new THREE.Color(0x3a1a00);
  scene.fog = new THREE.FogExp2(0x3a1a00, 0.01);
}

// ── Ice Floor (Level 1 only) ──────────────────────────────────────────────────

const floor = CURRENT_LEVEL === 1 ? (() => {
  const f = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500, 80, 80),
    new THREE.MeshStandardMaterial({ color: 0x6ab8d4, roughness: 0.05, metalness: 0.4 })
  );
  f.rotation.x = -Math.PI / 2;
  f.receiveShadow = true;
  scene.add(f);
  return f;
})() : null;

if (CURRENT_LEVEL === 1) {
  const grid = new THREE.GridHelper(500, 80, 0x88ccff, 0x224466);
  grid.position.y = 0.01;
  grid.material.opacity = 0.1;
  grid.material.transparent = true;
  scene.add(grid);
}

// ── Snow Patches (Level 1 only) ───────────────────────────────────────────────

const snowPatchMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 1.0 });
const snowPatches = [];
if (CURRENT_LEVEL === 1) {
  for (let i = 0; i < 120; i++) {
    const r  = Math.random() * 3.5 + 0.5;
    const px = (Math.random() - 0.5) * 200;
    const pz = (Math.random() - 0.5) * 200;
    if (Math.hypot(px - 68, pz - 68) < 34) continue;
    const p  = new THREE.Mesh(new THREE.CircleGeometry(r, 10), snowPatchMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(px, 0.012, pz);
    scene.add(p);
    snowPatches.push({ x: px, z: pz, r });
  }
}

function isOnSnowPatch(x, z) {
  for (const sp of snowPatches) { if (Math.hypot(x - sp.x, z - sp.z) < sp.r) return true; }
  return false;
}

// ── Ice Crystals ─────────────────────────────────────────────────────────────

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
if (CURRENT_LEVEL === 1) {
  [
    [12,12],[-12,12],[12,-12],[-12,-12],[22,5],[-22,5],[22,-5],[-22,-5],
    [5,22],[-5,22],[5,-22],[-5,-22],[18,18],[-18,18],[18,-18],[-18,-18],
    [30,0],[-30,0],[0,30],[0,-30],[40,20],[-40,20],[40,-20],[-40,-20],
    [20,40],[-20,40],[20,-40],[-20,-40],[55,10],[-55,10],[55,-10],[-55,-10],
    [10,55],[-10,55],[10,-55],[-10,-55],[50,50],[-50,50],[50,-50],[70,30],[-70,-30]
  ].forEach(([x,z]) => makeCrystalCluster(x, z));
}

// ── Boundary Wall ─────────────────────────────────────────────────────────────

const ARENA = 96;

if (CURRENT_LEVEL === 1) {
  // Solid glowing wall around the arena border
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x224488, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });
  const wallH = 4, wallT = 0.8;
  [
    { w: ARENA*2+wallT*2, d: wallT, x: 0,      z: -ARENA },
    { w: ARENA*2+wallT*2, d: wallT, x: 0,      z:  ARENA },
    { w: wallT, d: ARENA*2,         x: -ARENA, z: 0      },
    { w: wallT, d: ARENA*2,         x:  ARENA, z: 0      },
  ].forEach(({w, d, x, z}) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    wall.position.set(x, wallH / 2, z);
    scene.add(wall);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d + 0.1),
      new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x44aaff, emissiveIntensity: 2, roughness: 0 }));
    top.position.set(x, wallH + 0.15, z);
    scene.add(top);
  });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x44aacc, emissive: 0x0044aa, emissiveIntensity: 0.8, roughness: 0.0, metalness: 0.7 });
  [[-ARENA,-ARENA],[-ARENA,ARENA],[ARENA,-ARENA],[ARENA,ARENA]].forEach(([x,z]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 10, 8), pillarMat);
    pillar.position.set(x, 5, z);
    scene.add(pillar);
    const glow = new THREE.PointLight(0x44aaff, 2, 15);
    glow.position.set(x, 8, z);
    scene.add(glow);
  });
}

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
if (CURRENT_LEVEL === 1) buildMountain(-20, -20);

// ── Water Zone (Level 1 South-East corner) ────────────────────────────────────

const WATER_CX = 68, WATER_CZ = 68, WATER_R = 32;

let waterMesh = null, waterLight = null;
if (CURRENT_LEVEL === 1) {
  waterMesh = new THREE.Mesh(
    new THREE.CircleGeometry(WATER_R, 48),
    new THREE.MeshStandardMaterial({ color: 0x1166aa, emissive: 0x003366, emissiveIntensity: 0.4, roughness: 0.0, metalness: 0.5, transparent: true, opacity: 0.75 })
  );
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(WATER_CX, 0.02, WATER_CZ);
  scene.add(waterMesh);
  waterLight = new THREE.PointLight(0x0088ff, 1.5, 50);
  waterLight.position.set(WATER_CX, 2, WATER_CZ);
  scene.add(waterLight);
  const waterLabel = document.createElement('div');
  waterLabel.style.cssText = 'display:none';
  document.body.appendChild(waterLabel);
}

function isInWater(x, z) {
  if (CURRENT_LEVEL === 2) return !_l2OnIce(x, z); // whole map is water on L2
  return Math.hypot(x - WATER_CX, z - WATER_CZ) < WATER_R;
}

// ── Portal ────────────────────────────────────────────────────────────────────

// ── Dark Portal ───────────────────────────────────────────────────────────────

const portalGroup = new THREE.Group();
portalGroup.position.set(56, 0, 81);

// Obsidian/cracked stone material
const _darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85, metalness: 0.3 });
const _voidMat      = new THREE.MeshStandardMaterial({ color: 0x050005, emissive: 0x1a0033, emissiveIntensity: 1.0, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
const _swirl1Mat    = new THREE.MeshStandardMaterial({ color: 0x1a0044, emissive: 0x6600aa, emissiveIntensity: 1.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
const _swirl2Mat    = new THREE.MeshStandardMaterial({ color: 0x330011, emissive: 0xaa0022, emissiveIntensity: 1.0, transparent: true, opacity: 0.38, side: THREE.DoubleSide });
const _crackMat     = new THREE.MeshStandardMaterial({ color: 0xaa0033, emissive: 0xff0044, emissiveIntensity: 2.0, roughness: 0.2 });

// Two jagged obsidian pillars — low-poly cylinders, slightly tilted for unease
const pillarGeoL = new THREE.CylinderGeometry(0.18, 0.3, 5.0, 5);
const pillarL    = new THREE.Mesh(pillarGeoL, _darkStoneMat);
pillarL.position.set(-1.4, 2.5, 0);
pillarL.rotation.z = 0.06;
portalGroup.add(pillarL);

const pillarGeoR = new THREE.CylinderGeometry(0.16, 0.28, 5.0, 5);
const pillarR    = new THREE.Mesh(pillarGeoR, _darkStoneMat);
pillarR.position.set(1.4, 2.5, 0);
pillarR.rotation.z = -0.05;
portalGroup.add(pillarR);

// Jagged shard crown — spike-like shards jutting up from the top
[[-1.4,5.05,-0.18],[-0.6,5.4,0.12],[0,5.6,-0.08],[0.65,5.35,0.15],[1.4,5.0,-0.1]].forEach(([x,y,rz]) => {
  const shard = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 5), _darkStoneMat);
  shard.position.set(x, y, 0);
  shard.rotation.z = rz;
  portalGroup.add(shard);
});

// Crack-glow lines on pillars (thin emissive boxes)
[[-1.4, 1.5], [-1.4, 3.2], [1.4, 2.0], [1.4, 4.0]].forEach(([x, y]) => {
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7 + Math.random() * 0.5, 0.05), _crackMat);
  crack.position.set(x + (Math.random()-0.5)*0.2, y, 0.22);
  crack.rotation.z = (Math.random()-0.5) * 0.4;
  portalGroup.add(crack);
});

// Void center — near-black abyss
const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.32, 64), _voidMat);
portalDisc.position.z = 0.0;
portalGroup.add(portalDisc);

// Swirl layer 1 — purple
const portalShimmer = new THREE.Mesh(new THREE.CircleGeometry(1.32, 48), _swirl1Mat);
portalShimmer.position.z = 0.02;
portalGroup.add(portalShimmer);

// Swirl layer 2 — blood red, counter-rotating
const portalShimmer2 = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), _swirl2Mat);
portalShimmer2.position.z = 0.03;
portalGroup.add(portalShimmer2);

// Outer ring — blood-red crackling frame
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0x220011, emissive: 0xcc0033, emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.5 });
const portalRing    = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.13, 10, 52), portalRingMat);
portalGroup.add(portalRing);

// Floating debris — small dark shards orbiting the portal
const _debrisMat = new THREE.MeshStandardMaterial({ color: 0x0a0010, emissive: 0x440033, emissiveIntensity: 0.8, roughness: 0.6 });
const portalDebris = [];
for (let i = 0; i < 10; i++) {
  const d = new THREE.Mesh(new THREE.BoxGeometry(0.07 + Math.random()*0.08, 0.07 + Math.random()*0.08, 0.04), _debrisMat);
  const angle = (i / 10) * Math.PI * 2;
  d.userData.angle = angle;
  d.userData.radius = 1.55 + Math.random() * 0.35;
  d.userData.speed  = 0.4 + Math.random() * 0.3;
  d.userData.yOff   = (Math.random()-0.5) * 1.2;
  portalGroup.add(d);
  portalDebris.push(d);
}

// Base — cracked obsidian slabs
[[-0.9,0],[0,0],[0.9,0]].forEach(([x]) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.7), _darkStoneMat);
  b.position.set(x, 0.07, 0);
  portalGroup.add(b);
});

// Flickering red/purple light
const portalLight = new THREE.PointLight(0xcc0044, 4.0, 20);
portalLight.position.set(0, 2.5, 0.8);
portalGroup.add(portalLight);

// Secondary dim purple fill light
const portalLight2 = new THREE.PointLight(0x440066, 1.5, 12);
portalLight2.position.set(0, 2.5, -1.0);
portalGroup.add(portalLight2);

scene.add(portalGroup);

// ── Level 2 Map ───────────────────────────────────────────────────────────────

const _l2IcePlatforms = []; // { x, z, r }
const _l2Jellyfish = [];
const _l2Sharks = [];
let   _l2Ships    = [];
const _l2Orcas    = [];
const _l2Crabs    = [];
const _l2Currents = [];
let   _l2Bottle   = null;
const _l2BeachPirates = [];
const _beachPirateBullets = [];
// Shark drag state
let _sharkDragging  = false;
let _dragShark      = null;
let _dragBreakCount = 0;
const DRAG_BREAKS_NEEDED = 10; // jump presses to escape
const L2_SOUTH_DANGER = 75;   // z > this → strong current toward death
const L2_KILL_BORDER  = 100;  // z > this → die
const L2_NORTH_LIMIT  = -115; // z < this → can't go further north
let   _l2JellySlowTimer = 0;
const _l2SharkAlertEl = { style: { display: '' } }; // removed shark alert
let   _ghostPirate     = null;   // { mesh, hp, state, timers… }
const _ghostBullets    = [];
let   _rustyKeyMesh    = null;
let   _hasRustyKey           = false;
let   _hasAntiHeatSunglasses = _levelSave?.sunglasses ?? false;
let   _chestOpened           = false;

// ── Level 3 State ─────────────────────────────────────────────────────────────
const _l3Enemies     = [];   // bandits, reptilians, scorpions, mummies
let   _l3Wight       = null;
const _l3WightBullets = [];
const _l3DeathPuddles = [];  // { mesh, x, z, r }
let   _l3Lamp        = null;
let   _l3LampPickedUp = false;
let   _l3GenieSpawned = false;
let   _l3PuddleContactTime = 0;
let   _l3PoisonActive = false;
let   _l3PoisonTimer  = 0;
let   _l3WightTriggered = false;
let   _l3BanditSpawnTimer = 3;
let   _l3CaveEnemySpawnTimer = 5;
let   _l3WightHUDShown = false;
const _l3Bullets         = [];   // bandit + reptilian ranged shots in L3
let   _l3InteractPrompt  = '';
// Puzzle
const _l3Torches         = [];          // interactive puzzle torches
const _l3TorchOrder      = [2, 1, 3, 0]; // correct sequence: MOON→DAWN→SUN→DUSK
let   _l3TorchProgress   = 0;
let   _l3JumpPlatCount   = 0;
let   _l3JumpPlatActivated = false;
let   _l3PlateLastY      = 0;
let   _l3PuzzleGate      = null;
let   _l3PuzzleSolved    = false;
let   _l3PuzzleGateColIdx = -1; // mountainColliders start index for gate row
// Bridge
const _l3LooseTiles      = [];   // { mesh, triggered, timer, x, z }
const _l3FireJets        = [];   // { z, side, cooldown, timer, active, beamMesh, beamLight }
const _l3ActiveArrows    = [];   // { mesh, vx, life }
const _l3ArrowTraps      = [];   // { z, side, cooldown, timer }
// Boss gate
let   _l3BossGate        = null;
let   _l3BossGateClosed  = false;
let   _sharkEscapeCooldown   = 0;
let   _desertPortalStandTimer = 0;
let   _desertPortalGroup      = null;
let   _desertPortalShimmer1   = null;
let   _desertPortalShimmer2   = null;
let   _desertPortalLight      = null;
const _desertPortalDebris     = [];
const _l2ClueEl = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;bottom:50px;left:50%;transform:translateX(-50%);background:rgba(10,5,0,0.88);border:2px solid #aa8833;border-radius:10px;padding:14px 28px;font-family:monospace;font-size:15px;color:#f0d080;text-shadow:0 0 6px #aa7700;pointer-events:none;z-index:9999;text-align:center;max-width:460px';
  el.innerHTML = '<span style="color:#aa7733;font-size:11px;letter-spacing:2px;display:block;margin-bottom:5px">📜 PIRATE LOG</span><span id="_l2ClueText"></span>';
  document.body.appendChild(el);
  return el;
})();

function _l2OnIce(x, z) {
  return _l2IcePlatforms.some(p => Math.hypot(x - p.x, z - p.z) < p.r - 0.3);
}

if (CURRENT_LEVEL === 2) {
  // Full water floor
  scene.add(new THREE.AmbientLight(0x112244, 0.4));
  const _wFloor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x0a3a6a, emissive: 0x001a44, emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.88 }));
  _wFloor.rotation.x = -Math.PI / 2;
  scene.add(_wFloor);

  // Deep glow patches
  for (let i = 0; i < 10; i++) {
    const gl = new THREE.PointLight(0x0044aa, 0.5 + Math.random() * 0.4, 20);
    gl.position.set((Math.random()-0.5)*160, -1, (Math.random()-0.5)*160);
    scene.add(gl);
  }

  // Ice platforms
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x226688, emissiveIntensity: 0.15, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 });
  const ICE_SPOTS = [
    { x:  0,  z:  0,  r: 5.0 },{ x: 12, z:  3, r: 2.8 },{ x:-11, z:  7, r: 2.2 },
    { x:  5,  z: 14,  r: 3.0 },{ x: -6, z:-12, r: 2.5 },{ x: 22, z: 10, r: 2.0 },
    { x: 18,  z:-14,  r: 1.8 },{ x:-18, z: 16, r: 2.2 },{ x:-20, z: -8, r: 1.6 },
    { x:  8,  z:-22,  r: 2.0 },{ x: -8, z: 25, r: 1.8 },{ x: 30, z: -4, r: 1.5 },
    { x:-28,  z:  2,  r: 1.6 },{ x: 14, z: 28, r: 2.0 },{ x:-14, z:-24, r: 1.5 },
    { x: 35,  z: 20,  r: 1.4 },{ x: 40, z: 12, r: 1.3 },{ x: 44, z:  2, r: 1.5 },
    { x:-32,  z: 28,  r: 1.4 },{ x:-38, z: 18, r: 1.3 },{ x:-40, z:  6, r: 1.2 },
    { x: 28,  z:-28,  r: 1.4 },{ x: 36, z:-20, r: 1.3 },{ x:-22, z:-32, r: 1.5 },
    { x:-30,  z:-22,  r: 1.3 },{ x: 50, z:  8, r: 2.5 },{ x:-46, z: 22, r: 2.0 },
    { x: 32,  z:-38,  r: 2.0 },{ x:-28, z:-42, r: 2.2 },{ x:  2, z: 44, r: 1.8 },
  ];
  ICE_SPOTS.forEach(s => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.9, 0.22, 10), iceMat);
    mesh.position.set(s.x, 0.11, s.z);
    scene.add(mesh);
    _l2IcePlatforms.push({ x: s.x, z: s.z, r: s.r });
  });

  // Safe spawn plateau — player starts here (35, 0, 25)
  const _spawnIceMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x224466, emissiveIntensity: 0.3, roughness: 0.5 });
  const _spawnPlat = new THREE.Mesh(new THREE.CylinderGeometry(7, 6.2, 0.35, 14), _spawnIceMat);
  _spawnPlat.position.set(35, 0.17, 25);
  scene.add(_spawnPlat);
  // Cracked edge ring for visual interest
  const _spawnRing = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.18, 6, 20), new THREE.MeshStandardMaterial({ color: 0x88ccee, roughness: 0.8 }));
  _spawnRing.rotation.x = Math.PI / 2;
  _spawnRing.position.set(35, 0.36, 25);
  scene.add(_spawnRing);
  _l2IcePlatforms.push({ x: 35, z: 25, r: 6.8 });

  // Shipwrecks
  const _wdMat = new THREE.MeshStandardMaterial({ color: 0x4a2e12, roughness: 0.95 });
  const _wdDk  = new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.9 });
  const _wdSail= new THREE.MeshStandardMaterial({ color: 0xd4c9a0, roughness: 1.0, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  const _wdIron= new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.5 });
  const _wdGold= new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa8800, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.8 });
  const _wdBar = new THREE.MeshStandardMaterial({ color: 0x5a3010, roughness: 0.9 });
  const _wdFlg = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, side: THREE.DoubleSide });

  function _buildShip(gx, gz, rotY, tiltZ, clue) {
    const g = new THREE.Group();
    g.position.set(gx, 0, gz);
    g.rotation.y = rotY;
    const bx = (w,h,d,m,px,py,pz) => { const mb = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); mb.position.set(px,py,pz); mb.castShadow=true; g.add(mb); return mb; };
    bx(10,0.8,5,_wdMat,0,0.4,0); bx(10,2.2,0.4,_wdDk,0,1.5,2.5); bx(10,2.2,0.4,_wdDk,0,1.5,-2.5);
    bx(0.4,2.2,5,_wdDk,5,1.5,0); bx(0.4,2.2,5,_wdDk,-5,1.5,0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,6,8),_wdDk); mast.position.set(1.5,3.8,0); mast.rotation.z=tiltZ; g.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.2),_wdSail); sail.position.set(0,5.8,0.6); sail.rotation.y=0.3; g.add(sail);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.6),_wdFlg); flag.position.set(2.0,7.5+tiltZ*-3,0); g.add(flag);
    [[1.0,0.6],[-0.5,-0.8],[2.0,-0.5]].forEach(([bpx,bpz])=>{ const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.48,8),_wdBar); bar.position.set(bpx,1.08,bpz); g.add(bar); });
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.45,0.42),_wdMat); chest.position.set(-1.5,1.28,0.8); g.add(chest);
    for(let i=0;i<5;i++){const coin=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.03,8),_wdGold); coin.position.set(-1.5+(Math.random()-0.5)*0.5,0.86,0.8+(Math.random()-0.5)*0.4); g.add(coin);}
    g.userData.clue = clue;
    scene.add(g);
    _l2IcePlatforms.push({ x: gx, z: gz, r: 7.0 });
    _l2Ships.push(g);
    return g;
  }
  _buildShip( 50,  8,  0.3,  0.12, "The ghost pirate... I saw him to the west. His island rose from the fog — pale sand where there should be ice. He carries something that doesn't belong to him.");
  _buildShip(-46, 22, -0.5, -0.18, "Sail southwest and you'll find his cursed isle. A spirit in a tricorne hat, sword drawn, muttering about a key. We didn't dare linger.");
  _buildShip( 32,-38,  1.1,  0.22, "Three nights his laughter came from the northwest — from an island of unnatural warmth. Only the brave will face him. He holds a key to something greater.");
  _buildShip(-28,-42, -1.8, -0.15, "Day 47: The ghost pirate drifts south-southwest of here, guarding an isle of cursed sand. His key, they say, opens an ancient chest. We lacked the courage. Perhaps you don't.");

  // Jellyfish
  const _jBodyMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.55 });
  const _jTentMat = new THREE.MeshStandardMaterial({ color: 0xaabbff, emissive: 0x3355ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 });
  for (let i = 0; i < 45; i++) {
    let jx, jz, tries = 0;
    do { jx = (Math.random()-0.5)*140; jz = (Math.random()-0.5)*140; tries++; }
    while ((_l2OnIce(jx,jz) || Math.hypot(jx-35,jz-25)<9 || Math.hypot(jx+64,jz-50)<10) && tries < 30);
    const jg = new THREE.Group();
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.32,8,6), _jBodyMat); bell.scale.y=0.65; jg.add(bell);
    for(let t=0;t<6;t++){ const a=(t/6)*Math.PI*2; const tent=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.01,0.5+Math.random()*0.4,4),_jTentMat); tent.position.set(Math.cos(a)*0.15,-0.35,Math.sin(a)*0.15); jg.add(tent); }
    jg.position.set(jx, 0.3, jz);
    scene.add(jg);
    _l2Jellyfish.push({ mesh: jg, x: jx, z: jz, angle: Math.random()*Math.PI*2, speed: 0.3+Math.random()*0.2 });
  }

  // Sharks — spread across the whole water area, idle in lazy circles
  for (let i = 0; i < 14; i++) {
    let sx, sz, tries = 0;
    do { sx=(Math.random()-0.5)*140; sz=(Math.random()-0.5)*120; tries++; }
    while ((_l2OnIce(sx,sz) || Math.hypot(sx-35,sz-25)<9 || Math.hypot(sx+64,sz-50)<10) && tries < 30);
    const sg = buildShark();
    sg.position.set(sx, 0.12, sz);
    scene.add(sg);
    _l2Sharks.push({
      mesh: sg,
      idleX: sx, idleZ: sz,           // centre of idle circle
      idleAngle: Math.random()*Math.PI*2,
      idleRadius: 4 + Math.random()*6,
      speed: 6.01 + Math.random()*2.19, hp: 120,
      chasing: false,
    });
  }

  // Orcas — 3 large predators, stronger than sharks
  for (let i = 0; i < 3; i++) {
    const o = buildOrca();
    let ox, oz; do { ox=(Math.random()-0.5)*90; oz=(Math.random()-0.5)*60; }
    while (Math.hypot(ox-35,oz-25)<9 || Math.hypot(ox+64,oz-50)<10);
    o.position.set(ox, 0.18, oz);
    scene.add(o);
    _l2Orcas.push({ mesh: o, hp: 280, speed: 4.5 + Math.random(), chasing: false,
      patrolAngle: Math.random() * Math.PI * 2 });
  }

  // Water currents — animated drifting planes
  const _curMat = new THREE.MeshBasicMaterial({ color: 0x1166cc, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.18), _curMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = 0.18 + (Math.random()-0.5)*0.3;
    m.position.set((Math.random()-0.5)*150, 0.04, (Math.random()-0.5)*110);
    scene.add(m);
    _l2Currents.push({ mesh: m, speed: 1.8 + Math.random() * 1.2, ox: m.position.x, oz: m.position.z });
  }

  // Danger-zone currents near south kill border — red/orange, denser, faster
  const _dangerCurMat = new THREE.MeshBasicMaterial({ color: 0xcc1100, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 0.3), _dangerCurMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = 0.05 + (Math.random()-0.5)*0.15; // nearly south-pointing
    m.position.set((Math.random()-0.5)*160, 0.06, 72 + Math.random() * 30);
    scene.add(m);
    _l2Currents.push({ mesh: m, speed: 8 + Math.random() * 5, ox: m.position.x, oz: m.position.z, danger: true });
  }

  // Warning signs along south danger zone
  const _signPost = new THREE.MeshStandardMaterial({ color: 0x8b5e2a, roughness: 0.9 });
  const _signBoard = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xaa8800, emissiveIntensity: 0.5, roughness: 0.7 });
  const _signText  = new THREE.MeshStandardMaterial({ color: 0x220000, roughness: 1.0 });
  const _signXs = [-64, -44, -24, -4, 16, 36, 56, 76];
  _signXs.forEach(sx => {
    const g = new THREE.Group();
    g.position.set(sx, 0, 73 + (Math.random()-0.5)*3);
    // Post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.2, 8), _signPost);
    post.position.y = 1.6; g.add(post);
    // Board
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.12), _signBoard);
    board.position.y = 3.5; g.add(board);
    // Red X bar (cross — two thin boxes)
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.14), _signText);
    bar1.position.set(0, 3.5, 0.01); bar1.rotation.z = 0.6; g.add(bar1);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.14), _signText);
    bar2.position.set(0, 3.5, 0.01); bar2.rotation.z = -0.6; g.add(bar2);
    // Skull dot eyes + nose
    [[-0.35, 3.72], [0.35, 3.72]].forEach(([ex, ey]) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), _signText);
      eye.position.set(ex, ey, 0.07); g.add(eye);
    });
    // Slight bob — store ref
    g.userData.bobPhase = Math.random() * Math.PI * 2;
    scene.add(g);
    _l2Currents.push({ mesh: g, speed: 0, ox: sx, oz: g.position.z, sign: true, phase: g.userData.bobPhase });
  });

  // Ghost pirate island at (-64, 50) — sandy 15×15 platform
  const _pirateIslandMat = new THREE.MeshStandardMaterial({ color: 0xd4aa70, roughness: 1.0 });
  const _pirateIsland = new THREE.Mesh(new THREE.CylinderGeometry(9, 8.2, 0.4, 14), _pirateIslandMat);
  _pirateIsland.position.set(-64, 0.2, 50);
  scene.add(_pirateIsland);
  for (let i = 0; i < 4; i++) {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(0.9+Math.random()*0.6,6,4), _pirateIslandMat);
    dune.scale.y = 0.45;
    dune.position.set(-64+(Math.random()-0.5)*13, 0.5, 50+(Math.random()-0.5)*13);
    scene.add(dune);
  }
  _l2IcePlatforms.push({ x: -64, z: 50, r: 9 });

  // Locked chest at (-63, -100) — west beach (swapped from east)
  (() => {
    const g = new THREE.Group();
    const chestMat = new THREE.MeshStandardMaterial({ color: 0x6b3a10, roughness: 0.9 });
    const goldMat  = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa8800, emissiveIntensity: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.7,0.8), chestMat); body.position.y=0.35; g.add(body);
    const lid  = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.38,0.8), new THREE.MeshStandardMaterial({color:0x5a3008,roughness:0.9})); lid.position.set(0,0.89,0); g.add(lid);
    const b1   = new THREE.Mesh(new THREE.BoxGeometry(1.22,0.08,0.82), goldMat); b1.position.set(0,0.3,0); g.add(b1);
    const b2   = b1.clone(); b2.position.set(0,0.6,0); g.add(b2);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.22,0.1), goldMat); lock.position.set(0,0.55,0.42); g.add(lock);
    g.position.set(-63, 0, -100);
    scene.add(g);
    const glow = new THREE.PointLight(0xffaa00, 1.0, 10);
    glow.position.set(-63, 2, -100);
    scene.add(glow);
    // Store for animation and interaction
    window._l2ChestGroup = g;
    window._l2ChestGlow  = glow;
  })();

  // Spawn ghost pirate on the island
  spawnGhostPirate();

  // North beach
  buildBeachL2();

  // Desert portal at (47, -85) — east beach (swapped with chest)
  (() => {
    const sandStoneMat = new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.9 });
    const sandVoidMat  = new THREE.MeshStandardMaterial({ color: 0x3a1a00, emissive: 0xcc6600, emissiveIntensity: 0.9, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    const sandSwirl1   = new THREE.MeshStandardMaterial({ color: 0xff9933, emissive: 0xdd6600, emissiveIntensity: 1.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const sandSwirl2   = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 0.9, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const sandRingMat  = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff9900, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.4 });

    const pg = new THREE.Group();
    pg.position.set(47, 0, -85);

    // Sandy stone pillars
    const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 5.0, 6), sandStoneMat);
    pL.position.set(-1.4, 2.5, 0); pL.rotation.z = 0.05; pg.add(pL);
    const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5.0, 6), sandStoneMat);
    pR.position.set( 1.4, 2.5, 0); pR.rotation.z = -0.04; pg.add(pR);

    // Shard crown — jagged desert sandstone spires
    [[-1.4,5.05,-0.2],[-0.6,5.4,0.1],[0,5.6,-0.05],[0.65,5.35,0.15],[1.4,5.0,-0.1]].forEach(([x,y,rz]) => {
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.85, 5), sandStoneMat);
      sh.position.set(x, y, 0); sh.rotation.z = rz; pg.add(sh);
    });

    // Void center — warm amber darkness
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.32, 64), sandVoidMat);
    disc.position.z = 0; pg.add(disc);

    // Swirl layers
    const sw1 = new THREE.Mesh(new THREE.CircleGeometry(1.32, 48), sandSwirl1);
    sw1.position.z = 0.02; pg.add(sw1);
    const sw2 = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), sandSwirl2);
    sw2.position.z = 0.03; pg.add(sw2);

    // Outer ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.13, 10, 52), sandRingMat);
    pg.add(ring);

    // Orbiting sand debris
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x8b5e1a, emissive: 0xcc8800, emissiveIntensity: 0.6, roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.07+Math.random()*0.08, 0.07+Math.random()*0.08, 0.04), debrisMat);
      const angle = (i/10)*Math.PI*2;
      d.userData.angle  = angle;
      d.userData.radius = 1.55 + Math.random()*0.35;
      d.userData.speed  = 0.35 + Math.random()*0.25;
      d.userData.yOff   = (Math.random()-0.5)*1.2;
      pg.add(d);
      _desertPortalDebris.push(d);
    }

    // Sandy base slabs
    [[-0.9,0],[0,0],[0.9,0]].forEach(([x]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.7), sandStoneMat);
      b.position.set(x, 0.07, 0); pg.add(b);
    });

    // Warm orange light
    const lt = new THREE.PointLight(0xff8800, 3.5, 18);
    lt.position.set(0, 2.5, 0.8); pg.add(lt);

    scene.add(pg);
    _desertPortalGroup   = pg;
    _desertPortalShimmer1 = sw1;
    _desertPortalShimmer2 = sw2;
    _desertPortalLight    = lt;

    // Register as walkable surface so player doesn't sink on approach
    _l2IcePlatforms.push({ x: 47, z: -85, r: 4 });
  })();
}

// ── Level 3 Map Setup ─────────────────────────────────────────────────────────
if (CURRENT_LEVEL === 3) {
  const sandMat  = new THREE.MeshStandardMaterial({ color: 0xd4aa60, roughness: 0.95 });
  const caveMat  = new THREE.MeshStandardMaterial({ color: 0x9a7840, roughness: 0.9 });
  const rockMat  = new THREE.MeshStandardMaterial({ color: 0xa08050, roughness: 0.95 });
  const goldMat  = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa8800, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.8 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.9 });
  const voidMat  = new THREE.MeshStandardMaterial({ color: 0x060300, roughness: 1.0 });

  // Sandy outside floor
  const outsideFloor = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), sandMat);
  outsideFloor.rotation.x = -Math.PI / 2; outsideFloor.position.set(0, 0, 45); scene.add(outsideFloor);

  // Puzzle room floor (z: +8 to -52)
  const puzzleFloor = new THREE.Mesh(new THREE.PlaneGeometry(70, 62), caveMat);
  puzzleFloor.rotation.x = -Math.PI / 2; puzzleFloor.position.set(0, 0.01, -22); scene.add(puzzleFloor);

  // Dark void chasm under the bridge (visual depth)
  const voidFloor = new THREE.Mesh(new THREE.PlaneGeometry(80, 66), voidMat);
  voidFloor.rotation.x = -Math.PI / 2; voidFloor.position.set(0, -8, -86); scene.add(voidFloor);

  // Boss arena floor
  const arenaFloor = new THREE.Mesh(new THREE.PlaneGeometry(50, 52), caveMat);
  arenaFloor.rotation.x = -Math.PI / 2; arenaFloor.position.set(0, 0.01, -142); scene.add(arenaFloor);

  // ── Cliff face & entrance arch ────────────────────────────────────────────
  const cliffH = 8, cliffY = 4;
  [[-46,0],[46,0]].forEach(([bx]) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(70, cliffH, 5), rockMat);
    w.position.set(bx, cliffY, 9); scene.add(w);
    for (let cx = bx-34; cx <= bx+34; cx += 2) mountainColliders.push({ x: cx, z: 9, r: 1.3 });
  });
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(22, 3, 5), stoneMat); archTop.position.set(0, 7, 9); scene.add(archTop);
  const archL = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 5), stoneMat); archL.position.set(-10, 3.5, 9); scene.add(archL); mountainColliders.push({ x:-10, z:9, r:1.2 });
  const archR = archL.clone(); archR.position.set(10, 3.5, 9); scene.add(archR); mountainColliders.push({ x:10, z:9, r:1.2 });

  // ── Puzzle room cave walls (x=±36, z: 8 → -50) ───────────────────────────
  [-36,36].forEach(wx => {
    for (let wz = 8; wz > -50; wz -= 8) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 8), rockMat);
      seg.position.set(wx, 3, wz); scene.add(seg); mountainColliders.push({ x: wx, z: wz, r: 3.5 });
    }
  });

  // ── Puzzle room columns & gold piles ─────────────────────────────────────
  [[-20,-15],[20,-15],[-20,-40],[20,-40]].forEach(([cx,cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,5.5,8), stoneMat); col.position.set(cx, 2.75, cz); scene.add(col); mountainColliders.push({ x:cx, z:cz, r:1.8 });
    const pile = new THREE.Mesh(new THREE.SphereGeometry(0.9,6,4), goldMat); pile.scale.y=0.4; pile.position.set(cx, 0.2, cz+2); scene.add(pile);
  });
  // ── Gold mine decoration — coins, cups, statues, nuggets, veins everywhere ──
  const _gm  = goldMat;
  const _gDk = new THREE.MeshStandardMaterial({ color:0xcc8800, emissive:0x884400, emissiveIntensity:0.4, roughness:0.4, metalness:0.9 });
  const _gBr = new THREE.MeshStandardMaterial({ color:0xffee88, emissive:0xddcc00, emissiveIntensity:0.6, roughness:0.2, metalness:1.0 });

  // 80 floor coins scattered throughout entire level
  for (let i = 0; i < 80; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.04,10), _gBr);
    const zRange = Math.random(); const cz = zRange < 0.4 ? 10+Math.random()*60 : -2-Math.random()*48;
    coin.position.set((Math.random()-0.5)*58, 0.02, cz); coin.rotation.y = Math.random()*Math.PI; scene.add(coin);
  }

  // Gold cups (chalice shape) — 12 scattered
  for (let i = 0; i < 12; i++) {
    const cg = new THREE.Group();
    const base  = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,0.07,10), _gBr); base.position.y=0.035; cg.add(base);
    const stem  = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,0.22,8), _gm);   stem.position.y=0.145; cg.add(stem);
    const cup   = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.1,0.3,10,1,true), _gBr); cup.position.y=0.38; cg.add(cup);
    const rim   = new THREE.Mesh(new THREE.TorusGeometry(0.22,0.03,6,16), _gDk); rim.position.y=0.53; cg.add(rim);
    const cz2   = Math.random() < 0.5 ? 15+Math.random()*50 : -4-Math.random()*44;
    cg.position.set((Math.random()-0.5)*54, 0, cz2); cg.rotation.y=Math.random()*Math.PI; scene.add(cg);
  }

  // Gold nuggets/chunks — 30 small lumps on the floor
  for (let i = 0; i < 30; i++) {
    const ng = new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.1,5,4), _gDk);
    ng.scale.set(1.5+Math.random(),0.8+Math.random()*0.5,1.2+Math.random());
    const cz3 = Math.random() < 0.45 ? 10+Math.random()*58 : -3-Math.random()*46;
    ng.position.set((Math.random()-0.5)*56, 0.06, cz3); ng.rotation.y=Math.random()*Math.PI; scene.add(ng);
  }

  // Gold statues (simple penguin-shaped gold idol, 6 of them)
  for (let i = 0; i < 6; i++) {
    const sg = new THREE.Group();
    const sb = new THREE.Mesh(new THREE.SphereGeometry(0.28,7,6), _gBr); sb.scale.set(1,1.2,0.9); sb.position.y=0.45; sg.add(sb);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.2,7,6), _gBr);  sh.position.y=0.88; sg.add(sh);
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.06,5,5), _gDk); st.position.set(0.09,0.91,0.17); sg.add(st);
    const st2= st.clone(); st2.position.set(-0.09,0.91,0.17); sg.add(st2);
    const ped2= new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.38,0.22,8), stoneMat); ped2.position.y=0.11; sg.add(ped2);
    const cz4 = Math.random() < 0.5 ? 18+Math.random()*44 : -4-Math.random()*38;
    sg.position.set((Math.random()-0.5)*46, 0, cz4); sg.rotation.y=Math.random()*Math.PI*2; scene.add(sg);
    // Glow
    const sl = new THREE.PointLight(0xffcc44, 0.7, 6); sl.position.set(sg.position.x, 1.2, sg.position.z); scene.add(sl);
  }

  // Gold vein streaks on cave walls (boss arena + puzzle room)
  for (let i = 0; i < 20; i++) {
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.08+Math.random()*0.12, 0.6+Math.random()*1.2, 0.06), _gDk);
    const side = Math.random() < 0.5 ? -34.5 : 34.5;
    vein.position.set(side, 1+Math.random()*3, -5-Math.random()*42); vein.rotation.z=(Math.random()-0.5)*0.6; scene.add(vein);
  }

  // Large gold pile mounds (3 big piles in corners of puzzle room)
  [[-24,-8],[24,-8],[0,-48]].forEach(([px2,pz2]) => {
    for (let j = 0; j < 8; j++) {
      const lump = new THREE.Mesh(new THREE.SphereGeometry(0.15+Math.random()*0.2,6,5), j%2===0?_gBr:_gDk);
      lump.scale.y = 0.5+Math.random()*0.5; lump.position.set(px2+(Math.random()-0.5)*1.8, 0.12, pz2+(Math.random()-0.5)*1.8); scene.add(lump);
    }
    const pl = new THREE.PointLight(0xffaa00, 0.6, 5); pl.position.set(px2, 0.8, pz2); scene.add(pl);
  });

  // Arena gold: coins and cups on the boss arena floor
  for (let i = 0; i < 25; i++) {
    const angle = Math.random()*Math.PI*2; const r = Math.random()*18;
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.04,10), _gBr);
    coin.position.set(Math.sin(angle)*r, 0.02, -140+Math.cos(angle)*r); scene.add(coin);
  }
  for (let i = 0; i < 6; i++) {
    const angle = Math.random()*Math.PI*2; const r = 5+Math.random()*14;
    const ng2 = new THREE.Mesh(new THREE.SphereGeometry(0.1+Math.random()*0.12,5,4), _gDk);
    ng2.scale.set(1.4,0.7,1.2); ng2.position.set(Math.sin(angle)*r, 0.05, -140+Math.cos(angle)*r); scene.add(ng2);
  }

  // ── Sandstone ruins outside ────────────────────────────────────────────────
  [[-35,30],[-20,55],[25,40],[40,60],[-45,50]].forEach(([rx,rz]) => {
    const ruin = new THREE.Mesh(new THREE.BoxGeometry(4+Math.random()*3, 2+Math.random()*4, 4+Math.random()*3), rockMat);
    ruin.position.set(rx, ruin.geometry.parameters.height/2, rz); scene.add(ruin); mountainColliders.push({ x:rx, z:rz, r:3 });
  });

  // ── Riddle stone (engraved slab near cave entrance) ────────────────────────
  (() => {
    const rs = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.3), stoneMat); rs.position.set(-12, 1.1, -3); scene.add(rs);
    const gl = new THREE.PointLight(0xffcc44, 0.8, 5); gl.position.set(-12, 2.2, -3); scene.add(gl);
  })();

  // ── Pressure plate — jump on it twice to unlock torches ───────────────────
  (() => {
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.7, emissive: 0x221100, emissiveIntensity: 0.4 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 2.6), plateMat); plate.position.set(0, 0.05, -28); scene.add(plate); window._l3PlateMesh = plate;
    [[-0.4,0.06,0.3],[0.5,0.06,-0.3],[-0.1,0.06,0.7]].forEach(([ox,oy,oz]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.0+Math.random()*0.5, 0.04, 0.07), new THREE.MeshBasicMaterial({color:0x221100}));
      c.rotation.y = Math.random()*Math.PI; c.position.set(ox,oy,oz); plate.add(c);
    });
    window._l3PlateGlow = new THREE.PointLight(0x664400, 0.5, 4); window._l3PlateGlow.position.set(0, 1, -28); scene.add(window._l3PlateGlow);
  })();

  // ── Interactive puzzle torches (light in MOON→DAWN→SUN→DUSK order) ────────
  // _l3TorchOrder = [2,1,3,0]: idx2=MOON first, idx1=DAWN second, idx3=SUN third, idx0=DUSK last
  const torchDefs = [
    { name:'DUSK', x:-17, z:-10, litCol:0xff4400, unlitCol:0x220800 },  // idx 0 — light 4th
    { name:'DAWN', x: 17, z:-10, litCol:0xff8844, unlitCol:0x220800 },  // idx 1 — light 2nd
    { name:'MOON', x:-17, z:-42, litCol:0x88aaff, unlitCol:0x080818 },  // idx 2 — light 1st
    { name:'SUN',  x: 17, z:-42, litCol:0xffee00, unlitCol:0x221100 },  // idx 3 — light 3rd
  ];
  torchDefs.forEach((td) => {
    const g = new THREE.Group(); g.position.set(td.x, 0, td.z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,1.8,6), new THREE.MeshStandardMaterial({color:0x554433,roughness:0.9})); pole.position.y=0.9; g.add(pole);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.15,0.22,8), stoneMat); bowl.position.y=1.85; g.add(bowl);
    const sym = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.35,0.06), stoneMat); sym.position.set(0,0.55,-0.16); sym.rotation.x=-0.25; g.add(sym);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1,0.28,6), new THREE.MeshBasicMaterial({color:td.unlitCol})); flame.position.y=2.06; g.add(flame);
    const light = new THREE.PointLight(td.litCol, 0, 8); light.position.y=2.1; g.add(light);
    scene.add(g);
    _l3Torches.push({ group:g, flame, light, lit:false, name:td.name, litCol:td.litCol, unlitCol:td.unlitCol });
  });

  // Decorative wall torches & puzzle room ambient
  [[-18,-22],[18,-22]].forEach(([tx,tz]) => {
    const tl = new THREE.PointLight(0xff6600, 1.8, 12); tl.position.set(tx,3,tz); scene.add(tl);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.2,0.5,6), new THREE.MeshBasicMaterial({color:0xff8800})); fl.position.set(tx,3,tz); scene.add(fl);
  });
  const puzzleAmb = new THREE.PointLight(0xffaa44, 2.0, 50); puzzleAmb.position.set(0,4,-25); scene.add(puzzleAmb);

  // ── Puzzle gate (z=-53, sinks into ground when puzzle solved) ─────────────
  (() => {
    const gMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9 });
    const g = new THREE.Group(); g.position.set(0, 0, -53);
    const gw = new THREE.Mesh(new THREE.BoxGeometry(72, 8, 2), gMat); gw.position.y=4; g.add(gw);
    [-20,-10,0,10,20].forEach(rx => {
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.15), new THREE.MeshBasicMaterial({color:0xffcc44})); rune.position.set(rx,4,1.1); g.add(rune);
    });
    const gl = new THREE.PointLight(0xffcc44, 1.2, 15); gl.position.set(0,4,1); g.add(gl);
    scene.add(g); _l3PuzzleGate = g;
    _l3PuzzleGateColIdx = mountainColliders.length;
    for (let gx = -33; gx <= 33; gx += 3) mountainColliders.push({ x: gx, z: -53, r: 1.6 });
  })();

  // ── Bridge: chasm walls (x=±8, z: -56 → -116) ────────────────────────────
  [-8,8].forEach(wx => {
    for (let wz = -57; wz > -117; wz -= 8) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 8), rockMat); seg.position.set(wx, 5, wz); scene.add(seg); mountainColliders.push({ x:wx, z:wz, r:2.5 });
    }
  });

  // Bridge floor slabs (some are loose — they crumble under foot)
  const slabMat  = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.85 });
  const looseMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9, emissive: 0x110800, emissiveIntensity: 0.5 });
  const looseTileZSet = new Set([-74, -90, -106]);
  for (let sz = -58; sz >= -114; sz -= 8) {
    const isLoose = looseTileZSet.has(sz);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 7.5), isLoose ? looseMat : slabMat);
    slab.position.set(0, 0.09, sz); scene.add(slab);
    if (isLoose) _l3LooseTiles.push({ mesh: slab, x: 0, z: sz, triggered: false, timer: 0 });
    [-2.85,2.85].forEach(rx => { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.55,7.5), stoneMat); rail.position.set(rx,0.36,sz); scene.add(rail); });
  }
  // Eerie bridge lighting
  [-66,-86,-106].forEach(bz => { const bl = new THREE.PointLight(0xff4400, 0.55, 12); bl.position.set(0,3,bz); scene.add(bl); });

  // ── Fire jet emitters (alternating sides, 3 on bridge) ───────────────────
  [{z:-67,side:-1},{z:-85,side:1},{z:-103,side:-1}].forEach((jd, ji) => {
    const bkt = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55), new THREE.MeshStandardMaterial({color:0x554433})); bkt.position.set(jd.side*3.1, 1.1, jd.z); scene.add(bkt);
    _l3FireJets.push({ z:jd.z, side:jd.side, cooldown:3.5+ji*0.7, timer:1.8+ji*0.9, active:false, beamMesh:null, beamLight:null });
  });

  // ── Arrow traps (4 across bridge, alternating sides) ─────────────────────
  [{z:-63,side:-1},{z:-79,side:1},{z:-95,side:-1},{z:-111,side:1}].forEach((ad, ai) => {
    const bkt = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,0.45), new THREE.MeshStandardMaterial({color:0x443322})); bkt.position.set(ad.side*3.1, 0.9, ad.z); scene.add(bkt);
    const notch = new THREE.Mesh(new THREE.ConeGeometry(0.07,0.28,4), new THREE.MeshBasicMaterial({color:0x886644})); notch.rotation.z=ad.side<0?-Math.PI/2:Math.PI/2; notch.position.set(ad.side*2.9, 0.9, ad.z); scene.add(notch);
    _l3ArrowTraps.push({ z:ad.z, side:ad.side, cooldown:3.8+ai*0.5, timer:2.2+ai*0.7 });
  });

  // ── Boss gate (starts raised, slams shut on arena entry) ──────────────────
  (() => {
    const gMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    const gw = new THREE.Mesh(new THREE.BoxGeometry(16, 10, 2), gMat); gw.position.set(0, 12, -118); scene.add(gw); _l3BossGate = gw;
    [-8.5,8.5].forEach(fx => {
      const fp = new THREE.Mesh(new THREE.BoxGeometry(2,10,2.5), gMat); fp.position.set(fx,5,-118); scene.add(fp); mountainColliders.push({ x:fx, z:-118, r:1.2 });
    });
    const ft = new THREE.Mesh(new THREE.BoxGeometry(16,2,2.5), gMat); ft.position.set(0,10,-118); scene.add(ft);
    const sk = new THREE.Mesh(new THREE.SphereGeometry(0.45,6,5), new THREE.MeshStandardMaterial({color:0xddccaa})); sk.position.set(0,9.5,-117.9); scene.add(sk);
  })();

  // ── Boss arena: circular walls (centre z=-140, r=22) ─────────────────────
  (() => {
    const arMat = new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.95 });
    for (let i = 0; i < 14; i++) {
      const angle = (i/14)*Math.PI*2;
      if (Math.abs(angle - Math.PI/2) < 0.6) continue; // south entrance gap
      const wx = Math.sin(angle)*22, wz = -140+Math.cos(angle)*22;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(11,10,5), arMat); seg.position.set(wx,5,wz); seg.rotation.y=-angle; scene.add(seg); mountainColliders.push({ x:wx, z:wz, r:5 });
    }
    const al1 = new THREE.PointLight(0x44ff88, 1.5, 38); al1.position.set(0,4,-133); scene.add(al1);
    const al2 = new THREE.PointLight(0x8800ff, 0.9, 28); al2.position.set(0,4,-148); scene.add(al2);
  })();

  // ── Magic lamp on pedestal (deep in arena) ────────────────────────────────
  (() => {
    const pedMat   = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8 });
    const lampBrass = new THREE.MeshStandardMaterial({ color: 0xcc9900, emissive: 0xaa7700, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.9 });
    const pg = new THREE.Group(); pg.position.set(0, 0, -148);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.0,1.0,8), pedMat); ped.position.y=0.5; pg.add(ped);
    const lb  = new THREE.Mesh(new THREE.SphereGeometry(0.38,8,6), lampBrass); lb.scale.set(1.2,0.8,1.0); lb.position.y=1.4; pg.add(lb);
    const lsp = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.1,0.5,6), lampBrass); lsp.rotation.z=0.8; lsp.position.set(0.52,1.38,0); pg.add(lsp);
    const lhd = new THREE.Mesh(new THREE.TorusGeometry(0.22,0.04,6,12), lampBrass); lhd.rotation.y=Math.PI/2; lhd.position.set(-0.4,1.4,0); pg.add(lhd);
    const lgw = new THREE.PointLight(0xffcc44, 1.2, 6); lgw.position.y=1.5; pg.add(lgw);
    scene.add(pg);
    _l3Lamp = { group: pg, x: 0, z: -148 };
  })();

  // Defer initial spawns — player isn't defined yet (TDZ) at map-setup time
  setTimeout(() => {
    for (let i = 0; i < 5; i++) _l3SpawnBandit();
    for (let i = 0; i < 3; i++) _l3SpawnReptilian();
  }, 0);
}

function _l3SpawnBandit() {
  let sx, sz; do { sx=(Math.random()-0.5)*80; sz=20+Math.random()*55; } while(Math.hypot(sx-player.position.x,sz-player.position.z)<14);
  const m = buildHumanPlayer(); m.scale.setScalar(0.88);
  // Desert recolor: swap to desert tones
  m.traverse(c => { if(c.isMesh && c.material.color) { const col=c.material.color.getHex(); if(col===0x334455) c.material = new THREE.MeshStandardMaterial({color:0x8b5e1a,roughness:0.9}); if(col===0x111111 && !c.material.emissive) c.material = new THREE.MeshStandardMaterial({color:0x8b3a1a,roughness:0.8}); } });
  m.position.set(sx,0,sz); m.rotation.y=Math.random()*Math.PI*2; scene.add(m);
  _l3Enemies.push({ mesh:m, type:'bandit3', hp:60, maxHp:60, shootTimer:3+Math.random()*2 });
}
function _l3SpawnReptilian() {
  let sx,sz; do{sx=(Math.random()-0.5)*80;sz=20+Math.random()*55;}while(Math.hypot(sx-player.position.x,sz-player.position.z)<14);
  const m=buildReptilian(); m.position.set(sx,0,sz); m.rotation.y=Math.random()*Math.PI*2; scene.add(m);
  _l3Enemies.push({ mesh:m, type:'reptilian', hp:45, maxHp:45 });
}
function _l3SpawnScorpion() {
  let sx,sz; do{sx=(Math.random()-0.5)*50;sz=-10-Math.random()*70;}while(Math.hypot(sx-player.position.x,sz-player.position.z)<10);
  const m=buildScorpion3(); m.position.set(sx,0,sz); m.rotation.y=Math.random()*Math.PI*2; scene.add(m);
  _l3Enemies.push({ mesh:m, type:'scorpion3', hp:55, maxHp:55 });
}
function _l3SpawnMummy() {
  let sx,sz; do{sx=(Math.random()-0.5)*40;sz=-80-Math.random()*25;}while(Math.hypot(sx-player.position.x,sz-player.position.z)<12);
  const m=buildMummy(); m.position.set(sx,0,sz); m.rotation.y=Math.random()*Math.PI*2; scene.add(m);
  _l3Enemies.push({ mesh:m, type:'mummy', hp:80, maxHp:80 });
}

function updateL2Enemies(dt) {
  if (CURRENT_LEVEL !== 2) return;
  const px = player.position.x, pz = player.position.z;
  const inWater = !_l2OnIce(px, pz);
  if (_l2JellySlowTimer > 0) _l2JellySlowTimer -= dt;

  let sharkNear = false;
  _l2Jellyfish.forEach(j => {
    j.angle += j.speed * dt * 0.4;
    j.mesh.position.set(j.x + Math.cos(j.angle)*2.5, 0.25+Math.sin(Date.now()/800+j.angle)*0.18, j.z + Math.sin(j.angle)*2.5);
    j.mesh.rotation.y += 0.01;
    const pulse = 0.9+0.12*Math.sin(Date.now()/400+j.angle);
    j.mesh.children[0].scale.set(pulse, pulse*0.65, pulse);
    if (inWater && _l2JellySlowTimer <= 0) {
      if (Math.hypot(px-j.mesh.position.x, pz-j.mesh.position.z) < 0.7) {
        damagePlayer(8); _l2JellySlowTimer = 2.0;
        playerStats.moveSpeed = Math.max(0.3, playerStats.moveSpeed * 0.8); // 20% slow
        setTimeout(() => { playerStats.moveSpeed = (_levelSave?.stats?.moveSpeed ?? 1.0); }, 2000);
      }
    }
  });

  _l2Sharks.forEach(sh => {
    const pdx = px - sh.mesh.position.x, pdz = pz - sh.mesh.position.z;
    const pdist = Math.hypot(pdx, pdz);
    sh.chasing = inWater && pdist < 20;

    let nx, nz;
    if (sh.chasing) {
      const sdx=pdx, sdz=pdz, sdist=pdist;
      if (sdist > 0.5) {
        nx = sh.mesh.position.x + (sdx/sdist)*sh.speed*dt;
        nz = sh.mesh.position.z + (sdz/sdist)*sh.speed*dt;
      }
      sh.mesh.rotation.y = Math.atan2(-(pz - sh.mesh.position.z), px - sh.mesh.position.x);
    } else {
      // Lazy idle circle around spawn point
      sh.idleAngle += 0.35 * dt;
      const tx = sh.idleX + Math.cos(sh.idleAngle) * sh.idleRadius;
      const tz = sh.idleZ + Math.sin(sh.idleAngle) * sh.idleRadius;
      const sdx=tx-sh.mesh.position.x, sdz=tz-sh.mesh.position.z, sdist=Math.hypot(sdx,sdz);
      if (sdist > 0.3) {
        nx = sh.mesh.position.x + (sdx/sdist)*2.5*dt;
        nz = sh.mesh.position.z + (sdz/sdist)*2.5*dt;
      }
      sh.mesh.rotation.y = Math.atan2(-(tz - sh.mesh.position.z), tx - sh.mesh.position.x);
    }

    if (nx !== undefined && !_l2OnIce(nx, nz)) { sh.mesh.position.x = nx; sh.mesh.position.z = nz; }
    sh.mesh.position.y = 0.12 + Math.sin(Date.now()/600+sh.mesh.position.x)*0.04;

    // Bite → start drag (blocked for 0.3s after escaping)
    if (sh.chasing && pdist < 1.2 && playerState.iframes <= 0 && !_sharkDragging && !_godMode && _sharkEscapeCooldown <= 0) {
      _sharkDragging = true; _dragShark = sh; _dragBreakCount = 0;
    }
  });
  _l2SharkAlertEl.style.display = sharkNear ? 'block' : 'none';

  // Clue proximity
  let nearClue = null;
  if (CURRENT_LEVEL === 2) {
    for (const ship of _l2Ships) { if (Math.hypot(px-ship.position.x,pz-ship.position.z)<9) nearClue=ship.userData.clue; }
  }
  if(nearClue){ document.getElementById('_l2ClueText').textContent=nearClue; _l2ClueEl.style.display='block'; }
  else _l2ClueEl.style.display='none';

  // Orcas — water only
  _l2Orcas.forEach(o => {
    const odx = px - o.mesh.position.x, odz = pz - o.mesh.position.z;
    const odist = Math.hypot(odx, odz);
    o.chasing = inWater && odist < 24;
    if (o.chasing) {
      const nx = o.mesh.position.x + (odx/odist) * o.speed * dt;
      const nz = o.mesh.position.z + (odz/odist) * o.speed * dt;
      if (!_l2OnIce(nx, nz)) { o.mesh.position.x = nx; o.mesh.position.z = nz; }
      if (odist < 1.6 && playerState.iframes <= 0) damagePlayer(55);
    } else {
      o.patrolAngle += 0.3 * dt;
      const nx = o.mesh.position.x + Math.cos(o.patrolAngle) * 2.5 * dt;
      const nz = o.mesh.position.z + Math.sin(o.patrolAngle) * 2.5 * dt;
      if (!_l2OnIce(nx, nz)) { o.mesh.position.x = nx; o.mesh.position.z = nz; }
    }
    o.mesh.rotation.y = Math.atan2(-(pz - o.mesh.position.z), px - o.mesh.position.x);
    o.mesh.position.y = 0.18 + Math.sin(Date.now() / 700 + o.patrolAngle) * 0.05;
  });

  // Beach pirates — face player and shoot
  for (let bi = _l2BeachPirates.length - 1; bi >= 0; bi--) {
    const bp = _l2BeachPirates[bi];
    const bdx = px - bp.mesh.position.x, bdz = pz - bp.mesh.position.z;
    const bdist = Math.hypot(bdx, bdz);
    if (bdist < 35) {
      bp.mesh.rotation.y = Math.atan2(-bdx, -bdz);
      bp.shootTimer -= dt;
      if (bp.shootTimer <= 0) {
        bp.shootTimer = 2.5 + Math.random() * 2;
        const bMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 5, 5),
          new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        bMesh.position.set(bp.mesh.position.x + bdx / bdist * 1.1, 0.8, bp.mesh.position.z + bdz / bdist * 1.1);
        scene.add(bMesh);
        _beachPirateBullets.push({ mesh: bMesh, vx: bdx / bdist * 9, vz: bdz / bdist * 9, life: 4 });
      }
    }
  }
  // Beach pirate bullets
  for (let i = _beachPirateBullets.length - 1; i >= 0; i--) {
    const b = _beachPirateBullets[i];
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.z += b.vz * dt;
    b.life -= dt;
    const bpdx = b.mesh.position.x - px, bpdz = b.mesh.position.z - pz;
    if (bpdx * bpdx + bpdz * bpdz < 0.5 && playerState.iframes <= 0) {
      damagePlayer(12);
      scene.remove(b.mesh); _beachPirateBullets.splice(i, 1);
    } else if (b.life <= 0) {
      scene.remove(b.mesh); _beachPirateBullets.splice(i, 1);
    }
  }

  // Crabs — wander on beach
  _l2Crabs.forEach(c => {
    c.timer -= dt;
    if (c.timer <= 0) { c.angle = Math.random() * Math.PI * 2; c.timer = 1.5 + Math.random() * 2; }
    c.mesh.position.x += Math.cos(c.angle) * c.speed * dt;
    c.mesh.position.z += Math.sin(c.angle) * c.speed * dt;
    c.mesh.position.x = Math.max(-68, Math.min(68, c.mesh.position.x));
    c.mesh.position.z = Math.max(-113, Math.min(-65, c.mesh.position.z));
    c.mesh.rotation.y = c.angle;
    c.mesh.position.y = 0.05 + Math.abs(Math.sin(Date.now() / 200 + c.angle)) * 0.02;
  });

  // Water currents — drift then wrap
  _l2Currents.forEach(cur => {
    if (cur.sign) {
      // Signs bob gently in place
      cur.mesh.position.y = Math.sin(Date.now() / 900 + cur.phase) * 0.08;
      cur.mesh.rotation.z = Math.sin(Date.now() / 1100 + cur.phase) * 0.06;
      return;
    }
    if (cur.danger) {
      // Danger currents flow southward (toward kill border)
      cur.mesh.position.z += cur.speed * dt;
      if (cur.mesh.position.z > cur.oz + 20) cur.mesh.position.z = cur.oz - 4;
    } else {
      cur.mesh.position.x += cur.speed * dt * 0.95;
      cur.mesh.position.z += cur.speed * dt * 0.22;
      if (cur.mesh.position.x > cur.ox + 18) { cur.mesh.position.x = cur.ox - 18; cur.mesh.position.z = cur.oz; }
    }
  });

  // Bottle interaction prompt
  let showInteract = '';
  if (_l2Bottle && !_bottlePopupOpen && !_shipPopupOpen) {
    if (Math.hypot(px - _l2Bottle.x, pz - _l2Bottle.z) < 3.5) showInteract = 'E — Read bottle';
  }
  if (!showInteract && !_chestOpened && Math.hypot(px+63,pz+100)<3.5) {
    showInteract = _hasRustyKey ? 'E — Open chest' : 'E — Locked chest (need rusty key)';
  }
  if (!showInteract && _desertPortalGroup && Math.hypot(px-47,pz+85)<4) {
    showInteract = _hasAntiHeatSunglasses ? 'E — Enter Desert Portal' : 'E — Desert Portal (need Anti-Heat Sunglasses)';
  }
  if (!showInteract && !_shipPopupOpen && !_bottlePopupOpen) {
    for (const ship of _l2Ships) {
      if (Math.hypot(px - ship.position.x, pz - ship.position.z) < 5.5) { showInteract = 'E — Board ship'; break; }
    }
  }
  _interactPrompt.style.display = showInteract ? 'block' : 'none';
  if (showInteract) _interactPrompt.textContent = showInteract;

  // Shark drag — pull toward south, 10% HP/sec, break with jump spam
  if (_sharkDragging && _dragShark) {
    if (!playerState.dead) {
      _dragHUD.style.display = 'block';
      _dragHUD.textContent = `🦈 DRAGGING! SPAM JUMP TO ESCAPE (${_dragBreakCount}/${DRAG_BREAKS_NEEDED})`;
      player.position.z += 5.5 * dt;
      player.position.x += (_dragShark.mesh.position.x - player.position.x) * 0.3 * dt;
      _dragShark.mesh.position.x = player.position.x;
      _dragShark.mesh.position.z = player.position.z + 0.9;
      if (playerState.iframes <= 0 && !_godMode) playerState.hp = Math.max(1, playerState.hp - playerState.maxHp * 0.10 * dt);
      updateHUD();
      if (_dragBreakCount >= DRAG_BREAKS_NEEDED) { _sharkDragging = false; _dragShark = null; playerState.iframes = 1.5; _sharkEscapeCooldown = 0.3; _dragHUD.style.display = 'none'; }
    } else { _sharkDragging = false; _dragShark = null; _dragHUD.style.display = 'none'; }
  } else { _dragHUD.style.display = 'none'; }
  _sharkEscapeCooldown = Math.max(0, _sharkEscapeCooldown - dt);

  // North wall (can't go past beach)
  if (player.position.z < L2_NORTH_LIMIT) player.position.z = L2_NORTH_LIMIT;

  // South current — drag toward border
  if (player.position.z > L2_SOUTH_DANGER && !_l2OnIce(px, pz)) {
    const strength = Math.min(1, (player.position.z - L2_SOUTH_DANGER) / 20) * 14;
    player.position.z += strength * dt;
  }

  // Border death
  if (player.position.z > L2_KILL_BORDER && !playerState.dead) killPlayer();

  // Swimming animation — belly-down on surface, upright when airborne
  if (!playerState.dead) {
    const t = Date.now() / 500;
    const onWaterSurface = inWater && playerY < 0.15;
    const targetX = onWaterSurface ? -Math.PI / 2 : 0;
    penguinMesh.rotation.x += (targetX - penguinMesh.rotation.x) * 0.15;
    penguinMesh.rotation.z = onWaterSurface ? Math.sin(t) * 0.12 : penguinMesh.rotation.z * 0.85;
    penguinMesh.position.y = onWaterSurface ? Math.sin(t * 1.2) * 0.07 : 0;
  }
}

function _updateWightHUD() {
  const el  = document.getElementById('wightHUD');
  const bar = document.getElementById('wightBarInner');
  if (!el) return;
  if (_l3Wight) {
    el.style.display = 'block';
    bar.style.width = Math.max(0, _l3Wight.hp / _l3Wight.maxHp * 100) + '%';
  } else {
    el.style.display = 'none';
  }
}

function updateL3(dt) {
  if (CURRENT_LEVEL !== 3) return;
  const px = player.position.x, pz = player.position.z;

  // ── Pressure plate: detect jump landings ──────────────────────────────────
  if (!_l3JumpPlatActivated) {
    const nearPlate = Math.hypot(px, pz + 28) < 2.2;
    if (nearPlate && _l3PlateLastY > 0.5 && playerY < 0.1) {
      _l3JumpPlatCount++;
      if (window._l3PlateGlow) window._l3PlateGlow.intensity = 0.5 + _l3JumpPlatCount * 2.0;
      // Visual: briefly press the plate down
      if (window._l3PlateMesh) { window._l3PlateMesh.position.y = 0.02; setTimeout(() => { if(window._l3PlateMesh) window._l3PlateMesh.position.y = 0.05; }, 200); }
      if (_l3JumpPlatCount >= 2) {
        _l3JumpPlatActivated = true;
        if (window._l3PlateGlow) { window._l3PlateGlow.intensity = 5.0; window._l3PlateGlow.color.set(0xffee44); }
        const pa = document.createElement('div');
        pa.style.cssText = 'position:fixed;top:38%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:22px;color:#ffee44;text-shadow:0 0 14px #ffaa00;pointer-events:none;z-index:9999;letter-spacing:2px';
        pa.textContent = '⚡ The ancient stone awakens...'; document.body.appendChild(pa); setTimeout(() => pa.remove(), 2800);
      } else {
        const pa = document.createElement('div');
        pa.style.cssText = 'position:fixed;top:42%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:16px;color:#cc9944;text-shadow:0 0 8px #886600;pointer-events:none;z-index:9999';
        pa.textContent = '🪨 One more...'; document.body.appendChild(pa); setTimeout(() => pa.remove(), 1500);
      }
    }
    _l3PlateLastY = playerY;
  }

  // Outside enemy respawn (bandits + reptilians)
  _l3BanditSpawnTimer -= dt;
  const outsideCount = _l3Enemies.filter(e => e.type === 'bandit3' || e.type === 'reptilian').length;
  if (_l3BanditSpawnTimer <= 0 && outsideCount < 8) {
    _l3BanditSpawnTimer = 8 + Math.random() * 6;
    Math.random() < 0.5 ? _l3SpawnBandit() : _l3SpawnReptilian();
  }

  // Cave enemy respawn (scorpions + mummies) — only when player is inside
  if (pz < 8) {
    _l3CaveEnemySpawnTimer -= dt;
    const caveCount = _l3Enemies.filter(e => e.type === 'scorpion3' || e.type === 'mummy').length;
    if (_l3CaveEnemySpawnTimer <= 0 && caveCount < 6) {
      _l3CaveEnemySpawnTimer = 12 + Math.random() * 8;
      if (pz < -65) _l3SpawnMummy(); else _l3SpawnScorpion();
    }
  }

  // Enemy AI
  for (let i = _l3Enemies.length - 1; i >= 0; i--) {
    const e = _l3Enemies[i];
    if (!e.mesh) continue;
    const ex = e.mesh.position.x, ez = e.mesh.position.z;
    const dx = px - ex, dz = pz - ez;
    const dist = Math.hypot(dx, dz);
    if (dist > 32) continue;
    e.mesh.rotation.y = Math.atan2(-dx, -dz);

    if (e.type === 'bandit3') {
      if (dist > 7) { e.mesh.position.x += (dx/dist)*3.5*dt; e.mesh.position.z += (dz/dist)*3.5*dt; }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 22) {
        e.shootTimer = 3 + Math.random() * 2;
        const bm = new THREE.Mesh(new THREE.SphereGeometry(0.12,5,5), new THREE.MeshBasicMaterial({color:0xffaa00}));
        bm.position.set(ex + dx/dist*1.2, 0.9, ez + dz/dist*1.2);
        scene.add(bm);
        _l3Bullets.push({ mesh:bm, vx:dx/dist*9, vz:dz/dist*9, life:4 });
      }
    } else if (e.type === 'reptilian') {
      e.mesh.rotation.y = Math.atan2(dx, dz); // model faces +Z so flip sign vs default
      if (dist > 1.2) { e.mesh.position.x += (dx/dist)*4*dt; e.mesh.position.z += (dz/dist)*4*dt; }
      if (dist < 1.5 && playerState.iframes <= 0 && !_godMode) damagePlayer(15);
    } else if (e.type === 'scorpion3') {
      if (dist > 1.0) { e.mesh.position.x += (dx/dist)*3*dt; e.mesh.position.z += (dz/dist)*3*dt; }
      if (dist < 1.4 && playerState.iframes <= 0 && !_godMode) damagePlayer(20);
    } else if (e.type === 'mummy') {
      if (dist > 1.2) { e.mesh.position.x += (dx/dist)*2*dt; e.mesh.position.z += (dz/dist)*2*dt; }
      if (dist < 1.6 && playerState.iframes <= 0 && !_godMode) damagePlayer(25);
    }
  }

  // L3 bandit bullets
  for (let i = _l3Bullets.length - 1; i >= 0; i--) {
    const b = _l3Bullets[i];
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.z += b.vz * dt;
    b.life -= dt;
    const bdx = b.mesh.position.x - px, bdz = b.mesh.position.z - pz;
    if (bdx*bdx + bdz*bdz < 0.5 && playerState.iframes <= 0 && !_godMode) {
      damagePlayer(18); scene.remove(b.mesh); _l3Bullets.splice(i, 1);
    } else if (b.life <= 0) { scene.remove(b.mesh); _l3Bullets.splice(i, 1); }
  }

  // Wight trigger — first time player enters the circular boss arena
  if (!_l3WightTriggered && pz < -121) {
    _l3WightTriggered = true;
    const wm = buildWight(); wm.position.set(0, 0, -135); scene.add(wm);
    _l3Wight = { mesh:wm, hp:1200, maxHp:1200, speed:3.5, shootTimer:2.5, puddleTimer:6 };
    _updateWightHUD();
  }

  // Wight AI
  if (_l3Wight && !playerState.dead) {
    const wdx = px - _l3Wight.mesh.position.x;
    const wdz = pz - _l3Wight.mesh.position.z;
    const wdist = Math.hypot(wdx, wdz);
    _l3Wight.mesh.rotation.y = Math.atan2(-wdx, -wdz);
    if (wdist > 3) { _l3Wight.mesh.position.x += (wdx/wdist)*_l3Wight.speed*dt; _l3Wight.mesh.position.z += (wdz/wdist)*_l3Wight.speed*dt; }
    if (wdist < 2 && playerState.iframes <= 0 && !_godMode) damagePlayer(35);

    // Skull projectiles
    _l3Wight.shootTimer -= dt;
    if (_l3Wight.shootTimer <= 0) {
      _l3Wight.shootTimer = 2 + Math.random() * 1.5;
      const sg = new THREE.Group();
      sg.add(new THREE.Mesh(new THREE.SphereGeometry(0.18,6,5), new THREE.MeshStandardMaterial({color:0x222222,emissive:0x550088,emissiveIntensity:0.9})));
      [-0.07,0.07].forEach(ox => { const h=new THREE.Mesh(new THREE.SphereGeometry(0.06,4,4),new THREE.MeshBasicMaterial({color:0xaa00ff})); h.position.set(ox,0.04,0.15); sg.add(h); });
      sg.position.set(_l3Wight.mesh.position.x, 1.2, _l3Wight.mesh.position.z);
      scene.add(sg);
      const sd = Math.hypot(wdx, wdz) || 1;
      _l3WightBullets.push({ mesh:sg, vx:wdx/sd*7, vz:wdz/sd*7, life:5 });
    }

    // Death puddles
    _l3Wight.puddleTimer -= dt;
    if (_l3Wight.puddleTimer <= 0) {
      _l3Wight.puddleTimer = 5 + Math.random() * 3;
      const pm = new THREE.Mesh(new THREE.CircleGeometry(1.5,10), new THREE.MeshStandardMaterial({color:0x000000,emissive:0x330044,emissiveIntensity:0.7,transparent:true,opacity:0.85}));
      pm.rotation.x = -Math.PI/2;
      const ppx = _l3Wight.mesh.position.x + (Math.random()-0.5)*10;
      const ppz = _l3Wight.mesh.position.z + (Math.random()-0.5)*10;
      pm.position.set(ppx, 0.01, ppz); scene.add(pm);
      const puddleEntry = { mesh:pm, x:ppx, z:ppz, r:1.5 };
      _l3DeathPuddles.push(puddleEntry);
      setTimeout(() => { scene.remove(pm); const idx=_l3DeathPuddles.indexOf(puddleEntry); if(idx>=0) _l3DeathPuddles.splice(idx,1); }, 20000);
    }

    _updateWightHUD();
  }

  // Wight skull bullets
  for (let i = _l3WightBullets.length - 1; i >= 0; i--) {
    const b = _l3WightBullets[i];
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.z += b.vz * dt;
    b.mesh.rotation.y += dt * 3;
    b.life -= dt;
    const bdx = b.mesh.position.x - px, bdz = b.mesh.position.z - pz;
    if (bdx*bdx + bdz*bdz < 0.65 && playerState.iframes <= 0 && !_godMode) {
      damagePlayer(40); scene.remove(b.mesh); _l3WightBullets.splice(i, 1);
    } else if (b.life <= 0) { scene.remove(b.mesh); _l3WightBullets.splice(i, 1); }
  }

  // Death puddle contact (>0.5s → 50% HP poison over 10s)
  let inPuddle = false;
  for (const p of _l3DeathPuddles) {
    if (Math.hypot(px - p.x, pz - p.z) < p.r) { inPuddle = true; break; }
  }
  if (inPuddle) {
    _l3PuddleContactTime += dt;
    if (_l3PuddleContactTime > 0.5 && !_l3PoisonActive) {
      _l3PoisonActive = true; _l3PoisonTimer = 10;
      const pd = document.createElement('div');
      pd.id = '_l3PoisonHUD';
      pd.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:28px;color:#44ff88;text-shadow:0 0 16px #00ff66;pointer-events:none;z-index:9999;letter-spacing:3px';
      pd.textContent = '☠ POISONED'; document.body.appendChild(pd);
    }
  } else {
    _l3PuddleContactTime = 0;
  }
  if (_l3PoisonActive) {
    _l3PoisonTimer -= dt;
    if (!_godMode) { playerState.hp = Math.max(1, playerState.hp - (playerState.maxHp * 0.5 / 10) * dt); updateHUD(); }
    if (_l3PoisonTimer <= 0) {
      _l3PoisonActive = false;
      const phud = document.getElementById('_l3PoisonHUD'); if (phud) phud.remove();
    }
  }

  // ── Fire jets on bridge ───────────────────────────────────────────────────
  for (const jet of _l3FireJets) {
    jet.timer -= dt;
    if (jet.timer <= 0) {
      jet.active = !jet.active;
      jet.timer = jet.active ? 1.1 : jet.cooldown;
      if (jet.active) {
        const bm = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.28, 0.28), new THREE.MeshBasicMaterial({color:0xff5500,transparent:true,opacity:0.88}));
        bm.position.set(0, 1.1, jet.z); scene.add(bm); jet.beamMesh = bm;
        jet.beamLight = new THREE.PointLight(0xff4400, 4.0, 9); jet.beamLight.position.set(0, 1.1, jet.z); scene.add(jet.beamLight);
      } else {
        if (jet.beamMesh) { scene.remove(jet.beamMesh); jet.beamMesh = null; }
        if (jet.beamLight) { scene.remove(jet.beamLight); jet.beamLight = null; }
      }
    }
    if (jet.active && Math.abs(pz - jet.z) < 1.0 && Math.abs(px) < 3.5 && playerState.iframes <= 0 && !_godMode)
      damagePlayer(28);
  }

  // ── Arrow traps on bridge ─────────────────────────────────────────────────
  for (const trap of _l3ArrowTraps) {
    trap.timer -= dt;
    if (trap.timer <= 0) {
      trap.timer = trap.cooldown;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.65,4), new THREE.MeshBasicMaterial({color:0x886644}));
      shaft.rotation.z = Math.PI/2; shaft.position.set(trap.side*3.2, 0.9, trap.z); scene.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07,0.22,4), new THREE.MeshBasicMaterial({color:0xbbbbbb}));
      tip.rotation.z = trap.side<0 ? -Math.PI/2 : Math.PI/2; tip.position.x = -trap.side*0.44; shaft.add(tip);
      _l3ActiveArrows.push({ mesh: shaft, vx: -trap.side*18, life: 0.5 });
    }
  }
  for (let i = _l3ActiveArrows.length-1; i >= 0; i--) {
    const a = _l3ActiveArrows[i];
    a.mesh.position.x += a.vx*dt; a.life -= dt;
    const adx = a.mesh.position.x-px, adz = a.mesh.position.z-pz;
    if (adx*adx+adz*adz < 0.45 && playerState.iframes <= 0 && !_godMode) {
      damagePlayer(20); scene.remove(a.mesh); _l3ActiveArrows.splice(i,1);
    } else if (a.life <= 0) { scene.remove(a.mesh); _l3ActiveArrows.splice(i,1); }
  }

  // ── Loose bridge tiles ─────────────────────────────────────────────────────
  for (let i = _l3LooseTiles.length-1; i >= 0; i--) {
    const tile = _l3LooseTiles[i];
    if (!tile.triggered && Math.abs(px-tile.x) < 2.9 && Math.abs(pz-tile.z) < 4.0 && playerY < 0.3)
      { tile.triggered = true; tile.timer = 1.5; }
    if (tile.triggered) {
      tile.timer -= dt;
      tile.mesh.position.x = tile.x + (Math.random()-0.5)*0.07*(tile.timer < 0.5 ? 4 : 1);
      if (tile.timer <= 0) {
        const onTile = Math.abs(pz-tile.z) < 4.5;
        scene.remove(tile.mesh); _l3LooseTiles.splice(i,1);
        if (onTile && !playerState.dead) {
          player.position.set(0, 0, -55); playerY = 0; playerVY = 0;
          const fl = document.createElement('div'); fl.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);pointer-events:none;z-index:9998'; document.body.appendChild(fl); setTimeout(()=>fl.remove(),380);
          if (!_godMode) damagePlayer(12);
          const msg = document.createElement('div'); msg.style.cssText='position:fixed;top:40%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:22px;color:#ff8844;text-shadow:0 0 10px #ff4400;pointer-events:none;z-index:9999';
          msg.textContent='💀 The floor gives way!'; document.body.appendChild(msg); setTimeout(()=>msg.remove(),1800);
        }
      }
    }
  }

  // ── Boss gate: slam shut when player enters the arena ─────────────────────
  if (!_l3BossGateClosed && _l3BossGate && pz < -119) {
    _l3BossGateClosed = true;
    const gInterval = setInterval(() => {
      _l3BossGate.position.y = Math.max(3, _l3BossGate.position.y-0.8);
      if (_l3BossGate.position.y <= 3) { mountainColliders.push({ x:0, z:-118, r:8 }); clearInterval(gInterval); }
    }, 16);
  }

  // ── Interact prompts ──────────────────────────────────────────────────────
  _l3InteractPrompt = '';
  if (Math.hypot(px+12, pz+3) < 3.5) _l3InteractPrompt = 'E — Read ancient inscription';
  if (!_l3InteractPrompt) {
    for (const t of _l3Torches) {
      if (!t.lit && Math.hypot(px-t.group.position.x, pz-t.group.position.z) < 2.5) { _l3InteractPrompt = `E — Light the ${t.name} torch`; break; }
    }
  }
  if (!_l3InteractPrompt && _l3Lamp && !_l3LampPickedUp && !_l3Wight && Math.hypot(px-_l3Lamp.x, pz-_l3Lamp.z) < 3.5)
    _l3InteractPrompt = 'E — Pick up the Magic Lamp';
  // _interactPrompt element is created later; reach it via window to avoid TDZ
  const _ipEl = window._interactPromptEl;
  if (_ipEl) {
    _ipEl.style.display = _l3InteractPrompt ? 'block' : 'none';
    if (_l3InteractPrompt) _ipEl.textContent = _l3InteractPrompt;
  }
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

function _makeSunglasses(eyeY, eyeZ, eyeX) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.9 });
  const lensMat  = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xaa7700, emissiveIntensity: 0.4, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const sg = new THREE.Group();
  [-eyeX, eyeX].forEach(x => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 6, 14), frameMat);
    ring.position.set(x, eyeY, eyeZ); sg.add(ring);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), lensMat);
    fill.position.set(x, eyeY, eyeZ + 0.001); sg.add(fill);
  });
  const bridgeW = Math.max(0.01, eyeX * 2 - 0.18);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(bridgeW, 0.014, 0.014), frameMat);
  bridge.position.set(0, eyeY, eyeZ); sg.add(bridge);
  return sg;
}

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

  if (_hasAntiHeatSunglasses) g.add(_makeSunglasses(1.44, 0.38, 0.12));
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

  if (_hasAntiHeatSunglasses) g.add(_makeSunglasses(1.46, 0.40, 0.14));
  return g;
}

function buildHumanPlayer() {
  const g = new THREE.Group();
  g.rotation.y = Math.PI;
  const skin    = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
  const shirt   = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
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

  // Penguin logo on chest
  const logoWhite  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const logoOrange = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.8 });
  const logoBlack  = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.8 });
  // Body
  const pb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), logoBlack);
  pb.scale.set(1, 1.3, 0.5); pb.position.set(-0.1, 1.22, -0.175); g.add(pb);
  // Belly
  const pby = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), logoWhite);
  pby.scale.set(1, 1.2, 0.6); pby.position.set(-0.1, 1.20, -0.183); g.add(pby);
  // Beak
  const pbk = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 6), logoOrange);
  pbk.rotation.x = Math.PI / 2; pbk.position.set(-0.1, 1.305, -0.182); g.add(pbk);

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

  // Rifle — barrel + stock inside a pivot group so we can rotate it
  const gunPivot = new THREE.Group();
  gunPivot.position.set(0.38, 1.35, 0);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), gunMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.48);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.3), woodMat);
  stock.position.set(0, -0.13, -0.06);
  gunPivot.add(barrel); gunPivot.add(stock);
  g.add(gunPivot);
  g.userData.gunPivot = gunPivot;

  if (_hasAntiHeatSunglasses) g.add(_makeSunglasses(1.84, -0.25, 0.09));
  return g;
}

function buildBeachPirate() {
  const g = new THREE.Group();
  g.rotation.y = Math.PI;
  const skin    = new THREE.MeshStandardMaterial({ color: 0xd4a070, roughness: 0.7 });
  const coat    = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.85 }); // dark red coat
  const pants   = new THREE.MeshStandardMaterial({ color: 0x3b2a18, roughness: 0.9 });
  const black   = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const hatMat  = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 });
  const silver  = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.3, metalness: 0.9 });
  const brass   = new THREE.MeshStandardMaterial({ color: 0xcc8800, roughness: 0.4, metalness: 0.8 });
  const wood    = new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.9 });

  // Legs
  [-0.15, 0.15].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.7, 8), pants);
    leg.position.set(x, 0.55, 0); g.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), black);
    boot.position.set(x, 0.17, -0.04); g.add(boot);
    // Boot cuff
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.11, 0.06, 8), silver);
    cuff.position.set(x, 0.27, 0); g.add(cuff);
  });

  // Torso
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.56, 0.34), coat);
  chest.position.y = 1.12; g.add(chest);
  // Coat lapels (cream stripe)
  const lapelMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.8 });
  const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.05), lapelMat);
  lapel.position.set(0, 1.15, -0.175); g.add(lapel);
  // Brass buttons
  [1.32, 1.12, 0.92].forEach(y => {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), brass);
    btn.position.set(0, y, -0.175); g.add(btn);
  });

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.14, 8), skin);
  neck.position.y = 1.52; g.add(neck);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin);
  head.scale.set(1.0, 1.1, 1.0); head.position.y = 1.78; g.add(head);

  // Stubble / beard (dark patch on lower face)
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({color:0x331a00,roughness:0.9}));
  beard.scale.set(1.1, 0.6, 0.55); beard.position.set(0, 1.68, -0.18); g.add(beard);

  // Eyes
  [-0.08, 0.08].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), black);
    eye.position.set(x, 1.8, -0.2); g.add(eye);
  });

  // Pirate hat — tricorn style
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 10), hatMat);
  brim.position.y = 1.96; g.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.26, 8), hatMat);
  crown.position.y = 2.12; g.add(crown);
  // Skull & crossbones badge
  const skullBadge = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), silver);
  skullBadge.position.set(0, 2.05, -0.28); g.add(skullBadge);

  // Left arm — raised, holding flintlock pistol
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.62, 8), coat);
  armL.rotation.z = -0.5; armL.rotation.x = 0.3; armL.position.set(-0.44, 1.22, -0.08); g.add(armL);

  // Right arm — angled out holding sword
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.6, 8), coat);
  armR.rotation.z = 0.7; armR.rotation.x = -0.4; armR.position.set(0.44, 1.28, -0.1); g.add(armR);

  // Sword — blade + guard + grip in right hand
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.02), silver);
  blade.position.set(0.72, 1.2, -0.12); blade.rotation.z = 0.8; g.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), brass);
  guard.position.set(0.57, 0.97, -0.1); guard.rotation.z = 0.8; g.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.2, 6), wood);
  grip.rotation.z = 0.8; grip.position.set(0.47, 0.85, -0.08); g.add(grip);

  // Flintlock pistol in left hand
  const flintMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.8 });
  const flintWood = new THREE.MeshStandardMaterial({ color: 0x5a2a0a, roughness: 0.9 });
  const flintBrass = new THREE.MeshStandardMaterial({ color: 0xcc8800, roughness: 0.4, metalness: 0.7 });
  // Barrel — short and wide
  const flBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 7), flintMat);
  flBarrel.rotation.x = Math.PI / 2; flBarrel.rotation.z = -0.5;
  flBarrel.position.set(-0.72, 1.28, -0.22); g.add(flBarrel);
  // Stock (wooden grip)
  const flStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.1), flintWood);
  flStock.rotation.z = -0.5; flStock.position.set(-0.6, 1.06, -0.12); g.add(flStock);
  // Trigger guard
  const flGuard = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 8, Math.PI), flintBrass);
  flGuard.rotation.x = Math.PI / 2; flGuard.position.set(-0.62, 1.12, -0.12); g.add(flGuard);
  // Flintlock hammer
  const flHammer = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), flintMat);
  flHammer.rotation.z = 0.6; flHammer.position.set(-0.68, 1.25, -0.12); g.add(flHammer);
  // Muzzle flash accent (brass ring)
  const flMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.03, 7), flintBrass);
  flMuzzle.rotation.x = Math.PI / 2; flMuzzle.rotation.z = -0.5;
  flMuzzle.position.set(-0.82, 1.32, -0.28); g.add(flMuzzle);

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
    eye.position.set(x, 1.36, 0.30); eye.scale.set(1, 1.2, 0.7);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), black);
    pupil.position.set(x, 1.36, 0.35);
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

  // Hat brim — flat disc
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 16), dpurple);
  brim.position.set(0, 1.74, 0);
  g.add(brim);

  // Hat cone — tall pointed
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 16), dpurple);
  hat.position.set(0, 2.35, 0);
  g.add(hat);

  // Cat ears — added after hat so they render on top, lpurple outer + pink inner
  [-0.38, 0.38].forEach(x => {
    const tilt = x > 0 ? -0.55 : 0.55;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.29, 6), lpurple);
    ear.position.set(x, 2.06, 0.0);
    ear.rotation.z = tilt;
    g.add(ear);
    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.175, 6), pink);
    innerEar.position.set(x * 1.01, 2.07, 0.01);
    innerEar.rotation.z = tilt;
    g.add(innerEar);
  });

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

  if (_hasAntiHeatSunglasses) g.add(_makeSunglasses(1.36, 0.40, 0.16));
  return g;
}

// ── Level 3 Enemy Builders ────────────────────────────────────────────────────
function buildReptilian() {
  const g = new THREE.Group();
  const scale = new THREE.MeshStandardMaterial({ color: 0x3a8040, roughness: 0.8 });
  const belly = new THREE.MeshStandardMaterial({ color: 0x88cc66, roughness: 0.9 });
  const eye   = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xaa5500, roughness: 0.3 });
  const body  = new THREE.Mesh(new THREE.SphereGeometry(0.42,8,6), scale); body.scale.set(1.1,0.9,1.4); body.position.y=0.42; g.add(body);
  const head  = new THREE.Mesh(new THREE.SphereGeometry(0.28,8,6), scale); head.scale.set(1,0.8,1.5); head.position.set(0,0.55,0.58); g.add(head);
  const bel   = new THREE.Mesh(new THREE.SphereGeometry(0.28,6,5), belly); bel.scale.set(0.9,0.7,1.0); bel.position.set(0,0.38,0.3); g.add(bel);
  [-0.1,0.1].forEach(x => { const ey=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),eye); ey.position.set(x,0.6,0.82); g.add(ey); });
  // Tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.18,1.0,6), scale); tail.rotation.x=0.5; tail.position.set(0,0.35,-0.75); g.add(tail);
  // Legs
  [[-0.4,0.2,0.3],[0.4,0.2,0.3],[-0.35,0.15,-0.25],[0.35,0.15,-0.25]].forEach(([lx,ly,lz]) => {
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.05,0.42,6),scale); leg.position.set(lx,ly,lz); g.add(leg);
  });
  return g;
}

function buildScorpion3() {
  const g = new THREE.Group();
  const chitin = new THREE.MeshStandardMaterial({ color: 0xcc6622, roughness: 0.8 });
  const dark   = new THREE.MeshStandardMaterial({ color: 0x882200, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38,8,5), chitin); body.scale.set(1.2,0.7,1.5); body.position.y=0.28; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22,7,5), chitin); head.position.set(0,0.3,0.52); g.add(head);
  // Claws
  [-1,1].forEach(s => {
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.5,6),chitin); arm.rotation.z=s*0.9; arm.position.set(s*0.52,0.3,0.3); g.add(arm);
    const claw=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,5),dark); claw.scale.set(1.3,0.7,1.0); claw.position.set(s*0.82,0.3,0.55); g.add(claw);
  });
  // Legs
  [-1,1].forEach(s => { for(let i=0;i<3;i++) {
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.5,4),chitin); leg.rotation.z=s*0.7; leg.position.set(s*0.45,0.1,0.1-i*0.22); g.add(leg);
  }});
  // Tail/stinger
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.1,0.7,6),chitin); tail.rotation.x=-1.1; tail.position.set(0,0.6,-0.6); g.add(tail);
  const stinger=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.28,6),dark); stinger.rotation.x=0.6; stinger.position.set(0,1.0,-0.85); g.add(stinger);
  return g;
}

function buildMummy() {
  const g = new THREE.Group();
  const wrap = new THREE.MeshStandardMaterial({ color: 0xd4c890, roughness: 0.95 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x8b7540, roughness: 0.9 });
  const eye   = new THREE.MeshStandardMaterial({ color: 0x22ff44, emissive: 0x00aa22, emissiveIntensity: 0.8, roughness: 0.2 });
  // Body wrapped in bandages
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.4,1.0,8), wrap); body.position.y=0.55; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6), wrap); head.position.y=1.42; g.add(head);
  // Bandage strips (thin boxes crossing body)
  for(let i=0;i<4;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.05,0.72),dark);b.position.y=0.3+i*0.2;b.rotation.y=i*0.4;g.add(b);}
  // Glowing eyes
  [-0.1,0.1].forEach(x=>{const ey=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),eye);ey.position.set(x,1.46,0.27);g.add(ey);});
  // Arms outstretched
  [-1,1].forEach(s=>{const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.7,6),wrap);arm.rotation.z=s*1.1;arm.position.set(s*0.62,0.85,0);g.add(arm);});
  // Legs
  [-0.18,0.18].forEach(x=>{const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.09,0.52,6),wrap);leg.position.set(x,0.26,0);g.add(leg);});
  return g;
}

function buildWight() {
  const g = new THREE.Group();
  const bone   = new THREE.MeshStandardMaterial({ color: 0xccccaa, emissive: 0x444422, emissiveIntensity: 0.3, roughness: 0.9 });
  const robe   = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.95 });
  const eye    = new THREE.MeshStandardMaterial({ color: 0x4400ff, emissive: 0x2200cc, emissiveIntensity: 1.2, roughness: 0.1 });
  const crown  = new THREE.MeshStandardMaterial({ color: 0x885500, emissive: 0x441100, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.7 });
  // Robe body (tall cylinder)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.65,1.6,8), robe); body.position.y=0.85; g.add(body);
  // Skeletal rib cage (thin box frame)
  for(let i=0;i<3;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.05,0.5),bone);rib.position.y=0.8+i*0.22;g.add(rib);}
  // Head — skull
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38,8,6), bone); head.scale.set(1,1.1,0.9); head.position.y=1.9; g.add(head);
  // Jaw
  const jaw  = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.14,0.3), bone); jaw.position.set(0,1.62,0.22); g.add(jaw);
  // Crown
  const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.18,8), crown); crownBase.position.y=2.2; g.add(crownBase);
  [0,1,2,3,4,5,6,7].forEach(i=>{const spike=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.28,5),crown);const a=(i/8)*Math.PI*2;spike.position.set(Math.cos(a)*0.38,2.42,Math.sin(a)*0.38);g.add(spike);});
  // Glowing eyes
  [-0.14,0.14].forEach(x=>{const ey=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,6),eye);ey.position.set(x,1.96,0.3);g.add(ey);});
  // Arms — bony
  [-1,1].forEach(s=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.9,6),bone); arm.rotation.z=s*0.8; arm.position.set(s*0.72,1.2,0); g.add(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,5),bone); hand.position.set(s*1.12,0.85,0); g.add(hand);
  });
  return g;
}

function buildGenie() {
  const g = new THREE.Group();
  const skin  = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2255bb, emissiveIntensity: 0.6, roughness: 0.5 });
  const turban= new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xaa8800, emissiveIntensity: 0.4, roughness: 0.6 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2244cc, transparent: true, opacity: 0.85, roughness: 0.4 });
  // Wispy tail (tapering cone)
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.5,1.8,8), cloth); tail.rotation.x=Math.PI; tail.position.y=0.5; g.add(tail);
  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45,10,8), skin); body.scale.set(1,1.2,1); body.position.y=1.55; g.add(body);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35,10,8), skin); head.position.y=2.45; g.add(head);
  // Turban
  const tb = new THREE.Mesh(new THREE.SphereGeometry(0.38,8,5,0,Math.PI*2,0,Math.PI*0.55), turban); tb.position.y=2.55; g.add(tb);
  const tbJ = new THREE.Mesh(new THREE.SphereGeometry(0.12,6,5), turban); tbJ.position.set(0,2.78,0.34); g.add(tbJ);
  // Eyes
  [-0.12,0.12].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshBasicMaterial({color:0xffffff}));e.position.set(x,2.5,0.3);g.add(e);});
  // Arms
  [-1,1].forEach(s=>{const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.09,0.9,8),skin);arm.rotation.z=s*1.0;arm.position.set(s*0.72,1.6,0);g.add(arm);});
  // Glow
  const gl = new THREE.PointLight(0x4488ff, 2.5, 8); gl.position.y=1.8; g.add(gl);
  return g;
}

function buildShark() {
  const sg = new THREE.Group();
  const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x2d5566, roughness: 0.55, metalness: 0.1 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xcce8f0, roughness: 0.5 });
  const finMat   = new THREE.MeshStandardMaterial({ color: 0x1e4455, roughness: 0.6 });
  const eyeMat   = new THREE.MeshBasicMaterial({ color: 0x000000 });

  // Torpedo body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 7), bodyMat);
  body.scale.set(3.0, 0.85, 1.0);
  sg.add(body);

  // Snout
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 6), bodyMat);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.82, -0.04, 0);
  sg.add(snout);

  // Belly — lighter underside
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 5), bellyMat);
  belly.scale.set(2.6, 0.38, 0.85);
  belly.position.set(0.05, -0.1, 0);
  sg.add(belly);

  // Dorsal fin — tall and prominent
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.06), finMat);
  dorsal.position.set(0.1, 0.38, 0);
  dorsal.rotation.z = 0.12;
  sg.add(dorsal);

  // Tail — forked upper and lower lobe
  const tailUp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.07), finMat);
  tailUp.position.set(-0.8, 0.18, 0);
  tailUp.rotation.z = -0.5;
  sg.add(tailUp);
  const tailDn = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), finMat);
  tailDn.position.set(-0.8, -0.08, 0);
  tailDn.rotation.z = 0.4;
  sg.add(tailDn);

  // Pectoral fins — swept back on each side
  const pecGeo = new THREE.BoxGeometry(0.52, 0.05, 0.26);
  const lFin = new THREE.Mesh(pecGeo, finMat);
  lFin.position.set(0.18, -0.1, 0.32);
  lFin.rotation.z = -0.25; lFin.rotation.y = -0.3;
  sg.add(lFin);
  const rFin = new THREE.Mesh(pecGeo, finMat);
  rFin.position.set(0.18, -0.1, -0.32);
  rFin.rotation.z = -0.25; rFin.rotation.y = 0.3;
  sg.add(rFin);

  // Eyes
  const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  lEye.position.set(0.6, 0.08, 0.19);
  sg.add(lEye);
  const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  rEye.position.set(0.6, 0.08, -0.19);
  sg.add(rEye);

  return sg;
}

// ── Level 2 creature models + data ───────────────────────────────────────────

// Ship interaction UI
const _shipPopup = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(5,10,25,0.95);border:2px solid #5533aa;border-radius:10px;padding:22px 32px;font-family:monospace;color:#ccaaff;font-size:15px;max-width:420px;text-align:center;z-index:9999;line-height:1.7';
  el.innerHTML = '<div id="_shipClueText" style="margin-bottom:14px"></div><div style="font-size:11px;color:#7755aa">ESC to leave ship</div>';
  document.body.appendChild(el);
  return el;
})();
const _bottlePopup = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(5,20,10,0.95);border:2px solid #44aa55;border-radius:10px;padding:22px 32px;font-family:monospace;color:#aaffbb;font-size:15px;max-width:380px;text-align:center;z-index:9999;line-height:1.7';
  el.innerHTML = '<div style="font-size:18px;margin-bottom:10px">📜 Message in a Bottle</div><div id="_bottleText" style="margin-bottom:14px;font-style:italic"></div><div style="font-size:11px;color:#559966">ESC to close</div>';
  document.body.appendChild(el);
  return el;
})();
const _interactPrompt = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;bottom:130px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:14px;color:#ccaaff;text-shadow:0 0 8px #8855ff;pointer-events:none;z-index:9999;letter-spacing:2px';
  document.body.appendChild(el);
  window._interactPromptEl = el; // exposed for updateL3 lazy access
  return el;
})();
let _shipPopupOpen = false, _bottlePopupOpen = false;
const _dragHUD = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;top:38%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:18px;color:#ff4422;text-shadow:0 0 12px #ff2200;pointer-events:none;z-index:9999;text-align:center;letter-spacing:2px';
  el.textContent = '🦈 DRAGGING! SPAM JUMP TO ESCAPE';
  document.body.appendChild(el);
  return el;
})();

function buildOrca() {
  const g = new THREE.Group();
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8f0f8, roughness: 0.5 });

  // Body — larger torpedo
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 7), blackMat);
  body.scale.set(3.6, 1.0, 1.2);
  g.add(body);

  // Snout
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.55, 7), blackMat);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(1.2, -0.05, 0);
  g.add(snout);

  // White belly
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 5), whiteMat);
  belly.scale.set(3.0, 0.42, 1.0);
  belly.position.set(0.1, -0.18, 0);
  g.add(belly);

  // White eye patches
  [-1, 1].forEach(side => {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), whiteMat);
    patch.scale.set(0.7, 0.55, 0.3);
    patch.position.set(0.9, 0.22, side * 0.36);
    g.add(patch);
  });

  // Tall straight dorsal fin
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.07), blackMat);
  dorsal.position.set(0.0, 0.58, 0);
  g.add(dorsal);

  // Forked tail
  const tailUp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.09, 0.09), blackMat);
  tailUp.position.set(-1.3, 0.24, 0); tailUp.rotation.z = -0.45;
  g.add(tailUp);
  const tailDn = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), blackMat);
  tailDn.position.set(-1.3, -0.1, 0); tailDn.rotation.z = 0.38;
  g.add(tailDn);

  // Pectoral fins
  const pecGeo = new THREE.BoxGeometry(0.7, 0.07, 0.35);
  [-1, 1].forEach(side => {
    const fin = new THREE.Mesh(pecGeo, blackMat);
    fin.position.set(0.2, -0.15, side * 0.48);
    fin.rotation.z = -0.2; fin.rotation.y = side * -0.25;
    g.add(fin);
  });

  return g;
}

function buildCrab() {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.7 });
  const legMat   = new THREE.MeshStandardMaterial({ color: 0xaa3311, roughness: 0.8 });

  // Shell body
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), shellMat);
  shell.scale.set(1.5, 0.45, 1.1);
  g.add(shell);

  // 4 legs per side
  [-1, 1].forEach(side => {
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), legMat);
      leg.position.set((i - 1.5) * 0.12, -0.06, side * 0.22);
      leg.rotation.z = side * 0.5;
      leg.rotation.y = (i - 1.5) * 0.2;
      g.add(leg);
    }
  });

  // Claws at front
  [-1, 1].forEach(side => {
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), shellMat);
    claw.scale.set(1.3, 0.8, 0.7);
    claw.position.set(0.3, 0.04, side * 0.26);
    g.add(claw);
  });

  // Eyes on stalks
  [-1, 1].forEach(side => {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 4), legMat);
    stalk.position.set(0.18, 0.12, side * 0.12);
    g.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(0.18, 0.19, side * 0.12);
    g.add(eye);
  });

  return g;
}

function buildBottle() {
  const g = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75 });
  const corkMat  = new THREE.MeshStandardMaterial({ color: 0xaa8855, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 8), glassMat);
  body.position.y = 0.28;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.18, 8), glassMat);
  neck.position.y = 0.62;
  g.add(neck);

  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 8), corkMat);
  cork.position.y = 0.77;
  g.add(cork);

  // Scroll inside
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6),
    new THREE.MeshBasicMaterial({ color: 0xddcc99 }));
  scroll.position.y = 0.3;
  g.add(scroll);

  const glow = new THREE.PointLight(0x44ff66, 1.2, 4);
  glow.position.y = 0.4;
  g.add(glow);

  g.rotation.z = 0.35;
  return g;
}

function buildGhostPirate() {
  const g = new THREE.Group();
  const ghostMat = new THREE.MeshStandardMaterial({ color: 0xaaccee, emissive: 0x3366aa, emissiveIntensity: 0.7, transparent: true, opacity: 0.78, roughness: 0.6 });
  const hatMat   = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 });
  const swordMat = new THREE.MeshStandardMaterial({ color: 0xccddee, emissive: 0x4488aa, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.8 });
  // Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,1.1,8), ghostMat); body.position.y=0.6; g.add(body);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38,8,7), ghostMat); head.position.y=1.45; g.add(head);
  // Pirate hat brim + crown
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,0.08,10), hatMat); brim.position.y=1.76; g.add(brim);
  const crown= new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.38,0.52,8), hatMat); crown.position.y=2.05; g.add(crown);
  // Arms
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.72,6), ghostMat); armL.position.set(-0.55,0.9,0); armL.rotation.z=0.7; g.add(armL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.72,6), ghostMat); armR.position.set( 0.55,0.9,0); armR.rotation.z=-0.7; g.add(armR);
  // Sword on right arm — pommel, grip, crossguard, tapered blade
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.08,6,5), swordMat); pommel.position.set(0.95,0.28,0); g.add(pommel);
  const grip   = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.34,6), swordMat); grip.position.set(0.95,0.48,0); g.add(grip);
  const guard  = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.07,0.09), swordMat); guard.position.set(0.95,0.67,0); g.add(guard);
  const blade  = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.058,1.15,4), swordMat); blade.position.set(0.95,1.26,0); g.add(blade);
  // Eye glow
  [[-0.12,1.48],[0.12,1.48]].forEach(([ex,ey]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06,5,5), new THREE.MeshBasicMaterial({color:0xff2200}));
    eye.position.set(ex,ey,0.35); g.add(eye);
  });
  return g;
}

function _updateGhostPirateHUD() {
  const el  = document.getElementById('ghostPirateHUD');
  const bar = document.getElementById('ghostPirateBarInner');
  if (!el) return;
  const nearEnough = _ghostPirate && Math.hypot(
    player.position.x - _ghostPirate.mesh.position.x,
    player.position.z - _ghostPirate.mesh.position.z
  ) <= 40;
  if (nearEnough) {
    el.style.display  = 'block';
    bar.style.width   = Math.max(0, _ghostPirate.hp / _ghostPirate.maxHp * 100) + '%';
  } else {
    el.style.display  = 'none';
  }
}

function spawnGhostPirate() {
  const mesh = buildGhostPirate();
  mesh.position.set(-64, 0, 50);
  scene.add(mesh);
  _ghostPirate = { mesh, hp: 750, maxHp: 750, speed: 5,
    shootTimer: 3.0, bombTimer: 7.0, swordTimer: 0,
    chasing: false };
  // Don't call _updateGhostPirateHUD here — player isn't defined yet at load time (TDZ)
}

function updateGhostPirate(dt) {
  const px = player.position.x, pz = player.position.z;

  // Rusty key pickup — works even after ghost pirate is dead
  if (_rustyKeyMesh && !_hasRustyKey) {
    if (Math.hypot(px - _rustyKeyMesh.position.x, pz - _rustyKeyMesh.position.z) < 1.8) {
      scene.remove(_rustyKeyMesh); _rustyKeyMesh = null;
      _hasRustyKey = true;
      const _ke = document.createElement('div');
      _ke.style.cssText = 'position:fixed;top:38%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:24px;color:#ffd700;text-shadow:0 0 12px #ffaa00;pointer-events:none;z-index:9999';
      _ke.textContent = '🗝 Rusty Key obtained!';
      document.body.appendChild(_ke); setTimeout(() => _ke.remove(), 2500);
    }
  }

  if (!_ghostPirate || playerState.dead) return;
  const gp = _ghostPirate;
  const dx = px - gp.mesh.position.x, dz = pz - gp.mesh.position.z;
  const dist = Math.hypot(dx, dz);

  gp.chasing = dist < 15;
  if (gp.chasing && dist > 1.4) {
    const spd = gp.speed;
    gp.mesh.position.x += (dx/dist)*spd*dt;
    gp.mesh.position.z += (dz/dist)*spd*dt;
    gp.mesh.rotation.y = Math.atan2(-dx, -dz);
  }

  // Ghost bob
  gp.mesh.position.y = Math.sin(Date.now()/500)*0.12;

  // Sword melee
  if (gp.swordTimer > 0) gp.swordTimer -= dt;
  if (dist < 1.6 && gp.swordTimer <= 0 && playerState.iframes <= 0) {
    damagePlayer(18);
    gp.swordTimer = 0.9;
  }

  // Bullet shoot
  if (gp.chasing) {
    gp.shootTimer -= dt;
    if (gp.shootTimer <= 0) {
      gp.shootTimer = 0.8 + Math.random() * 0.33;
      if (dist > 0.1) {
        const speed = 9;
        const bMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x44ffcc })
        );
        bMesh.position.set(gp.mesh.position.x + dx/dist*1.2, 0.7, gp.mesh.position.z + dz/dist*1.2);
        scene.add(bMesh);
        _ghostBullets.push({ mesh: bMesh, vx: dx/dist*speed, vz: dz/dist*speed, life: 5 });
      }
    }
    // Bomb throw
    gp.bombTimer -= dt;
    if (gp.bombTimer <= 0) {
      gp.bombTimer = 8 + Math.random()*4;
      // Aim slightly ahead of player
      dropBomb(px + (Math.random()-0.5)*3, pz + (Math.random()-0.5)*3, 5);
    }
  }

  // Update bullets
  for (let i = _ghostBullets.length - 1; i >= 0; i--) {
    const b = _ghostBullets[i];
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.z += b.vz * dt;
    b.life -= dt;
    const bdx = b.mesh.position.x - px, bdz = b.mesh.position.z - pz;
    if (bdx*bdx + bdz*bdz < 0.5 && playerState.iframes <= 0) {
      damagePlayer(20);
      scene.remove(b.mesh); _ghostBullets.splice(i, 1);
    } else if (b.life <= 0) {
      scene.remove(b.mesh); _ghostBullets.splice(i, 1);
    }
  }

  // Pulse chest glow
  if (window._l2ChestGlow) {
    window._l2ChestGlow.intensity = 0.7 + Math.sin(Date.now()/600)*0.4;
  }
}

function buildBeachL2() {
  const sandMat  = new THREE.MeshStandardMaterial({ color: 0xd4b06a, roughness: 0.95 });
  const waterLineMat = new THREE.MeshStandardMaterial({ color: 0x4499bb, transparent: true, opacity: 0.45, roughness: 0.1 });

  // Main sand plane — wide and deep
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(140, 55), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, -88);
  scene.add(sand);
  _l2IcePlatforms.push({ x:  0,  z: -88, r: 70 });
  _l2IcePlatforms.push({ x: -50, z: -88, r: 30 });
  _l2IcePlatforms.push({ x:  50, z: -88, r: 30 });

  // Shallow water edge
  const shallows = new THREE.Mesh(new THREE.PlaneGeometry(140, 12), waterLineMat);
  shallows.rotation.x = -Math.PI / 2;
  shallows.position.set(0, 0.02, -63);
  scene.add(shallows);

  // Sand dunes
  for (let i = 0; i < 18; i++) {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(1.8 + Math.random() * 1.2, 8, 5), sandMat);
    dune.scale.y = 0.28;
    dune.position.set((Math.random() - 0.5) * 120, 0.18, -72 - Math.random() * 30);
    scene.add(dune);
  }

  // Pirates — active, face player and shoot
  const _piratePoses = [
    [-30,-80],[-10,-85],[24,-78],[44,-90],[-50,-86],
    [15,-92],[-38,-75],[55,-82],[-18,-100],[36,-95],
    [-60,-78],[0,-88],[32,-72],[-24,-94],[48,-84],
    [-42,-97],[20,-102],[-8,-76],[60,-90],[-52,-105],
  ];
  _piratePoses.forEach(([bpx, bpz]) => {
    const p = buildBeachPirate();
    p.scale.setScalar(0.9);
    p.position.set(bpx, 0, bpz);
    p.rotation.y = Math.random() * Math.PI * 2;
    scene.add(p);
    _l2BeachPirates.push({ mesh: p, hp: 80, maxHp: 80, shootTimer: 2 + Math.random() * 2 });
  });

  // Bottle
  const bot = buildBottle();
  bot.position.set(8, 0, -67);
  scene.add(bot);
  _l2Bottle = { mesh: bot, x: 8, z: -67 };

  // Crabs
  for (let i = 0; i < 20; i++) {
    const c = buildCrab();
    const cx = (Math.random() - 0.5) * 110;
    const cz = -66 - Math.random() * 42;
    c.position.set(cx, 0.05, cz);
    c.scale.setScalar(0.7 + Math.random() * 0.5);
    scene.add(c);
    _l2Crabs.push({ mesh: c, angle: Math.random() * Math.PI * 2, timer: Math.random() * 3, speed: 0.6 + Math.random() * 0.5 });
  }
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
const selectedSkin = _levelSave?.skin ?? localStorage.getItem('playerSkin') ?? 'normal';
let activeSkin = _levelSave?.activeSkinVal ?? selectedSkin;

// Placeholder mesh shown until FBX loads
const penguinMesh = new THREE.Group();
penguinMesh.rotation.y = Math.PI;
player.add(penguinMesh);

const builtModel = selectedSkin === 'evil' ? buildEvilPenguin() : selectedSkin === 'wizard' ? buildWizardCat() : selectedSkin === 'human' ? buildHumanPlayer() : buildPenguin();
penguinMesh.add(builtModel);
let _humanGunPivot = builtModel.userData.gunPivot ?? null;
let _gunHoldTimer = 0;
player.position.set(35, 0, 25);
scene.add(player);

// Restore progress from Level 1 if entering Level 2
const _baseHp = EASY ? 120 : 100;
const playerState = {
  hp:               _levelSave?.hp              ?? _baseHp,
  maxHp:            _levelSave?.maxHp           ?? _baseHp,
  iframes: 0, dead: false,
  shaggyCharges:    _levelSave?.shaggyCharges    ?? 0,
  shaggyMaxCharges: _levelSave?.shaggyMaxCharges ?? 0,
  shaggyRechargeTimer: 0,
};

// ── Player Stats (tome upgrades) ──────────────────────────────────────────────

const playerStats = Object.assign({
  damage: EASY ? 1.2 : 1.0, critChance: 0, attackRate: 1.0, weaponCooldown: 1.0, magicDmgMult: EASY ? 1.2 : 1.0,
  projCount: 1, projExtraChance: 0, projSize: 1.0, projSpeed: 1.0,
  maxShield: 0, shield: 0, shieldRecharge: 0, shieldDmgTimer: 0,
  evasion: 0, lifesteal: 0, bloodHeal: 0, moveSpeed: EASY ? 1.26 : 1.05, pickupRadius: 0.7,
  knockback: 0, cursed: 0, boomerang: false, iframeDuration: 1.0, shaggyStacks: 0, gustOfWind: 0,
}, _levelSave?.stats ?? {});

const tomeStacks = Object.assign({}, _levelSave?.tomeStacks ?? {});

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
  { id:'damage',     name:'Damage Tome',           emoji:'⚔️',  color:'#ff6644', desc:'+5% damage (all weapons)',       apply: s => { s.damage     *= 1.05; } },
  { id:'snowball_dmg', name: selectedSkin === 'human' ? 'Bullet Tome' : 'Snowball Tome', emoji: selectedSkin === 'human' ? '🔫' : '🌨️', color:'#cceeff', desc: selectedSkin === 'human' ? '+20% bullet damage' : '+20% snowball damage', apply: s => { s.snowballDmgMult = (s.snowballDmgMult||1) * 1.2; } },
  { id:'magic_dmg',   name:'Magic Tome',             emoji:'✨',  color:'#cc88ff', desc:'+10% magic damage (staff, aura, orb, gust, shaggy)', apply: s => { s.magicDmgMult = (s.magicDmgMult||1) * 1.1; } },
  { id:'precision',  name:'Precision Tome',        emoji:'🎯',  color:'#ffaa22', desc:'+5% critical hit chance',   apply: s => { s.critChance  = Math.min(0.9, s.critChance+0.05); } },
  { id:'cooldown',   name:'Cooldown Tome',         emoji:'⚡',  color:'#ffdd44', desc:'-8% spell cooldown (staff, aura, homhom)', apply: s => { s.weaponCooldown *= 0.92; } },
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
  { id:'shield',     name:'Shield Tome',           emoji:'🛡️', color:'#44aaff', desc:'First: +1 shield. Extra stacks: +0.3s iframes on shield hit', apply: s => { if (!(tomeStacks['shield'] > 0)) { s.maxShield = Math.max(s.maxShield, 1); s.shield = Math.max(s.shield, 1); } else { s.shieldIframes = (s.shieldIframes ?? 1.2) + 0.3; } updateHUD(); } },
  { id:'evasion',    name:'Evasion Tome',          emoji:'🌀',  color:'#44ffaa', desc:'+10% dodge chance',         apply: s => { s.evasion    = Math.min(0.7, s.evasion+0.1); } },
  { id:'bloody',     name:'Bloody Tome',           emoji:'🩸',  color:'#ff4466', desc:'+2% chance to heal 1 HP on hit',     apply: s => { s.bloodHeal = Math.min(1, s.bloodHeal + 0.02); } },
  { id:'hp',         name:'HP Tome',               emoji:'💙',  color:'#2266ff', desc:'+25 max HP',                apply: s => { playerState.maxHp+=25; playerState.hp+=25; updateHUD(); } },
  { id:'phrico',     name:'Phrico Rico',            emoji:'🌪️', color:'#aaff44', desc:'+1% movement speed. "You obtained ADHD!"',   apply: s => { s.moveSpeed *= 1.01;  showAdhdMsg(); } },
  { id:'attraction', name:'Attraction Tome',       emoji:'🧲',  color:'#ffaa44', desc:'+1 pickup radius',          apply: s => { s.pickupRadius += 1; } },
  { id:'knockback',  name:'Knockback Tome',        emoji:'💥',  color:'#ff8844', desc:'+0.75 knockback on hit',    apply: s => { s.knockback  += 0.75; } },
  { id:'cursed',     name:'Cursed Tome',           emoji:'💀',  color:'#884400', desc:'+25% spawn rate, +30% enemy HP', apply:s => { s.cursed += 1; } },
  { id:'chaos',      name:'Chaos Tome',            emoji:'🎲',  color:'#ff44ff', desc:'Random tome effect!',        apply: (s, chaos) => chaos() },
  { id:'hasper',     name:'Deveh',        emoji:'🪃',  color:'#ffaa88', desc:'Boomerang snowball — 60% dmg out, 40% on return. +0.3× per stack. Next shot waits for return.', apply: s => { s.boomerang = true; } },
  { id:'shaggy',    name:'Shaggy',                emoji:'🦬', color:'#cc9966', desc:'Absorb 1 hit (iframes scale with stacks, cap 0.5s). Refresh after 130s (-10s/stack, cap 50s). Each pick: +0.2 damage.', apply: s => {
    s.shaggyStacks = Math.max(1, s.shaggyStacks + 1);
    s.damage += 0.2;
    if (playerState.shaggyMaxCharges === 0) {
      playerState.shaggyMaxCharges = 1;
      playerState.shaggyCharges = 1;
    }
    playerState.shaggyRechargeTimer = 0;
    ensureShaggyRing();
  }},
  { id:'gust_of_wind', name:'Gust of Wind', emoji:'💨', color:'#88ffcc', desc:'Perfect jumps drop a gust on landing — deals 10 dmg in 2-unit radius after 0.3s.', apply: s => { s.gustOfWind += 1; } },
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

const equippedWeapons = new Set(_levelSave?.weapons ?? []);   // supports multiple weapons at once
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
  const stacks = (weaponStacks['gandalf_staff'] || 1) + Math.max(0, playerStats.projCount - 1);
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
    const _gDmg = STAFF_DAMAGE * (playerStats.magicDmgMult||1);
    target.hp -= _gDmg;
    showDmgNumber(target.mesh.position.x, target.mesh.position.z, _gDmg, false);
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
  // bloodHeal does not apply to magic damage weapons
}

// Aura Farmer persistent ring — outer edge indicator, scales with projSize
const auraRingMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
let   auraRingMesh = null;
let   auraRingLastSize = -1;

function getAuraRadius() { const aStacks = weaponStacks['aura_farmer'] || 1; return 3 * playerStats.projSize * (1 + (aStacks - 1) * 0.002); }

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
    const _auraDmg = SNOWBALL_DAMAGE * (playerStats.magicDmgMult||1);
    e.hp -= _auraDmg;
    showDmgNumber(e.mesh.position.x, e.mesh.position.z, _auraDmg, false);
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
  // bloodHeal does not apply to magic damage weapons
}

function tickWeapons(dt) {
  if (!equippedWeapons.size || choosingTome || playerState.dead || movementLockout === Infinity) return;
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
          e.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * (isCrit ? 2 : 1);
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
    id: 'pebbles', name: 'Pebbles', emoji: '🪨', color: '#aaaaaa',
    desc: 'Increase difficulty: +8% spawn rate, +10% enemy HP. (Permanent)',
    instant: true,
    apply: () => { _pebblesActive = true; }
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
  const base   = cumulativeXpForLevel(playerLevel);
  const needed = xpToNext(playerLevel);
  const progress = playerXP - base;
  xpLabelEl.textContent = `LVL ${playerLevel} — XP ${progress} / ${needed}`;
  xpBarInner.style.width = (progress / needed * 100) + '%';
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
let bossTimer = 0; // counts down from 180 once boss spawns
const bossTimerEl = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;top:100px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:16px;color:#ff4444;text-shadow:0 0 10px #ff0000;pointer-events:none;z-index:500;letter-spacing:2px';
  document.body.appendChild(el);
  return el;
})();
const bossArrowEl  = document.getElementById('bossArrow');
const bossProjectileGeo = new THREE.SphereGeometry(0.3, 8, 8);
const bossProjectileMat = new THREE.MeshStandardMaterial({ color: 0xff2255, emissive: 0xff0033, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });

function spawnBoss(x, z) {
  if (x === undefined) {
    let tries = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 40 + Math.random() * 40;
      x = Math.cos(angle) * dist;
      z = Math.sin(angle) * dist;
      tries++;
    } while (tries < 20 && mountainColliders.some(m => Math.hypot(x - m.x, z - m.z) < m.r + 4));
  }
  if (boss) return;
  const mesh = buildKrill();
  mesh.position.set(x, 0, z);
  mesh.scale.setScalar(2.5);
  scene.add(mesh);
  boss = { mesh, hp: 500, maxHp: 500, shootTimer: 2.0, age: 0, teleportThresholds: [0.66, 0.33] };
  bossHUDEl.style.display = 'block';
  bossTimer = 180;
  bossTimerEl.style.display = 'block';
}

function updateBoss(dt) {
  if (!boss) return;

  const px = player.position.x, pz = player.position.z;
  const dx = px - boss.mesh.position.x;
  const dz = pz - boss.mesh.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  boss.age += dt;
  bossBarInner.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';

  // 3-min enrage timer
  bossTimer -= dt;
  const bossSecsLeft = Math.max(0, Math.ceil(bossTimer));
  const bossMin = Math.floor(bossSecsLeft / 60);
  const bossSec = String(bossSecsLeft % 60).padStart(2, '0');
  bossTimerEl.textContent = `⏱ KRILLY ENRAGES ${bossMin}:${bossSec}`;
  bossTimerEl.style.color = bossTimer < 30 ? '#ff2200' : bossTimer < 60 ? '#ff8800' : '#ff4444';
  if (bossTimer <= 0 && !playerState.dead) { killPlayer(); }

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
    bossTimerEl.style.display = 'none';
    triggerLevel1End();
  }
}

function triggerLevel1End() {
  const defeated = document.getElementById('krillyDefeated');
  const dialogue = document.getElementById('spooksDialogue');

  // Force close all popups
  try { _bottlePopup.style.display='none'; _shipPopup.style.display='none'; _bottlePopupOpen=false; _shipPopupOpen=false; } catch(e2){}
  if (typeof powerUpScreen !== 'undefined') powerUpScreen.style.display = 'none';
  choosingPowerUp = false;

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

  // XP magnetize: pull orbs within 20 units toward player, remove the rest
  const _bossX = player.position.x, _bossZ = player.position.z;
  for (let i = xpOrbs.length - 1; i >= 0; i--) {
    const orb = xpOrbs[i];
    if (Math.hypot(orb.group.position.x - _bossX, orb.group.position.z - _bossZ) <= 20) {
      orb.magnetize = true; // flag: fly toward player during dialogue
    } else {
      disposeMesh(orb.group); scene.remove(orb.group); xpOrbs.splice(i, 1);
    }
  }

  // Drop piece of krill at boss death position (picked up after dialogue)
  const _krillDrop = (() => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff5500, emissiveIntensity: 0.8, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat); body.scale.set(1.8, 0.6, 0.9); g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), mat); tail.position.set(-0.55, 0, 0); tail.rotation.z = -Math.PI/2; g.add(tail);
    const glow = new THREE.PointLight(0xff6600, 1.0, 5); g.add(glow);
    g.position.set(_bossX, 0.5, _bossZ);
    scene.add(g);
    return g;
  })();
  window._krillDropMesh = _krillDrop;
  window._krillDropPickable = false; // enabled after dialogue ends

  // Show "Krilly Defeated" for 3 seconds
  defeated.style.display = 'block';
  setTimeout(() => {
    defeated.style.display = 'none';

    // Show dialogue messages sequentially, 3 sec each
    const lines = [
      'Hello myauw fellow traveler',
      'Thanks for killing Krilly *purr*',
      'You pleasantly suprised me',
      '....pssst',
      'I\'ve found a portal somewhere near the water',
      'No clue where it leads, maybe you should check it out',
      'Good luck traveler!',
    ];
    const textEl = document.getElementById('spooksDialogueText');
    let idx = 0;
    function showNextLine() {
      if (idx >= lines.length) { dialogue.style.display = 'none'; movementLockout = 0; window._krillDropPickable = true; saveProgressAndUnlockPortal(); return; }
      textEl.textContent = lines[idx++];
      dialogue.style.display = 'block';
      setTimeout(showNextLine, 4000);
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
  enemies.push({ mesh, type: 'seal', hp: Math.round((elite ? 80 : 20) * hpScale), elite });
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
let _pebblesActive = false; // pebbles powerup active
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
    mesh.scale.setScalar(0.9); // 40% smaller than before
    mesh.position.set(sx, 0, sz);
    scene.add(mesh);
    enemies.push({ mesh, type: 'belgica', hp: 8 });
  }
}

function updateEnemies(dt) {
  gameTime += dt;
  if (CURRENT_LEVEL === 1) {
    if (gameTime >= 300 && !boss && !bossDefeated && !playerState.dead) { spawnBoss(); }
    const remaining = Math.max(0, 300 - gameTime);
    const secs = Math.floor(remaining % 60);
    if (timerHUDEl && secs !== _lastTimerSec) {
      _lastTimerSec = secs;
      if (gameTime >= 4) timerHUDEl.style.display = 'block';
      timerHUDEl.textContent = `⏱ ${Math.floor(remaining / 60)}:${String(secs).padStart(2,'0')}`;
    }
  }

  // Pressure ramps gradually over 5 min (k=150), floors at 0.1; cursed stacks each add 25% spawn rate
  // ── SR1 Spawnrate Baseline ────────────────────────────────────────────────
  // Tune SPAWN_RAMP_SPEED: lower = faster ramp to max density.
  // SR1 values: sealSpawn base 0.9-1.4s, skuaSpawn base 1.75-2.75s, SPAWN_RAMP_SPEED=150
  const SPAWN_RAMP_SPEED = 150;   // SR1: change this single value to speed up / slow down ramp
  const _pebblesBonus = _pebblesActive ? 0.92 : 1.0; // pebbles: +8% spawn rate
  const pressure = Math.max(0.1, Math.exp(-gameTime / SPAWN_RAMP_SPEED)) * Math.pow(0.75, playerStats.cursed) * _pebblesBonus;
  sealSpawnTimer -= dt;
  skuaSpawnTimer -= dt;
  const hpScale = (gameTime >= 60 ? 1.1 + (gameTime - 60) / 600 : 1) * Math.pow(1.3, playerStats.cursed) * (_pebblesActive ? 1.1 : 1.0);
  const _l2SpawnMult = CURRENT_LEVEL === 2 ? 4.0 : 1.0; // L2: 25% spawn rate (4× longer timers)
  if (CURRENT_LEVEL !== 3 && !bossDefeated && !_spawnsDisabled && sealSpawnTimer <= 0) { spawnSeal(hpScale); sealSpawnTimer = (0.9 + Math.random() * 0.5) * pressure * _l2SpawnMult; }
  if (CURRENT_LEVEL !== 3 && !bossDefeated && !_spawnsDisabled && skuaSpawnTimer <= 0) { spawnSkua(hpScale); skuaSpawnTimer = (1.75 + Math.random() * 1) * pressure * _l2SpawnMult; }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = player.position.x - e.mesh.position.x;
    const dz = player.position.z - e.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (e.type === 'seal') {
      if (dist > 0.1) {
        // Mountain avoidance — push enemies out of mountain colliders
        for (const col of mountainColliders) {
          const mdx = e.mesh.position.x - col.x, mdz = e.mesh.position.z - col.z;
          const md = Math.hypot(mdx, mdz);
          if (md < col.r + 0.8 && md > 0.01) {
            e.mesh.position.x = col.x + (mdx/md)*(col.r+0.8);
            e.mesh.position.z = col.z + (mdz/md)*(col.r+0.8);
          }
        }
        // Seal-seal separation — run every other frame to halve O(n²) cost
        if ((i + sepFrame) % 2 === 0) {
          let sepX = 0, sepZ = 0;
          for (let k = 0; k < enemies.length; k++) {
            if (k === i || enemies[k].type !== 'seal') continue;
            const ox = e.mesh.position.x - enemies[k].mesh.position.x;
            const oz = e.mesh.position.z - enemies[k].mesh.position.z;
            if (Math.abs(ox) > 3 || Math.abs(oz) > 3) continue; // cheap early-out
            const od = Math.hypot(ox, oz);
            const minDist = e.elite ? 1.5 : 0.9;
            if (od < minDist && od > 0.01) { sepX += (ox / od) * (minDist - od); sepZ += (oz / od) * (minDist - od); }
          }
          // Strip the component pointing toward player so separation never pushes forward
          if (dist > 0.01) {
            const tpx = dx / dist, tpz = dz / dist;
            const dot = sepX * tpx + sepZ * tpz;
            sepX -= dot * tpx; sepZ -= dot * tpz;
          }
          e.mesh.position.x += sepX * 0.05;
          e.mesh.position.z += sepZ * 0.05;
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

        if (dist < 25) e.dropTimer -= dt; // only countdown when skua is close enough to see
        if (e.dropTimer <= 0) {
          const fallTime = e.mesh.position.y / 10;
          const leadTime = fallTime + 1.0;
          const leadX = player.position.x + playerVel.x * leadTime + (Math.random() - 0.5) * 0.75;
          const leadZ = player.position.z + playerVel.z * leadTime + (Math.random() - 0.5) * 0.75;
          const _tooClose = bombs.some(b => b.landed && Math.hypot(b.tx - leadX, b.tz - leadZ) < 2.5);
          if (!_tooClose) dropBomb(leadX, leadZ, e.mesh.position.y);
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

  // Swarm timer — L1 only (belgica doesn't spawn in L2/L3)
  if (CURRENT_LEVEL === 1) {
    swarmTimer -= dt;
    if (swarmTimer <= 0) {
      spawnSwarmWave();
      swarmTimer = 90;
    }
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
        const _nomDmg = SNOWBALL_DAMAGE * (playerStats.magicDmgMult||1) * 3 * Math.pow(1.25, (orb.stacks || 1) - 1);
        e.hp -= _nomDmg;
        showDmgNumber(e.mesh.position.x, e.mesh.position.z, _nomDmg, false);
        spawnImpact(orb.mesh.position.x, orb.mesh.position.y, orb.mesh.position.z, false);
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
const ATTACK_RANGE = 17; // units — only fire if an enemy is within this distance
const SNOWBALL_SPEED = 23.4;
const STAFF_DAMAGE   = 10; // lightning — magic damage, no crits
const SNOWBALL_DAMAGE = 10;

function findNearestEnemy() {
  // Always prioritise Krilly when in range
  if (boss) {
    const bdx = boss.mesh.position.x - player.position.x;
    const bdz = boss.mesh.position.z - player.position.z;
    if (bdx*bdx + bdz*bdz <= 400) return boss;
  }
  let nearest = null, bestDist = ATTACK_RANGE * ATTACK_RANGE;
  for (const e of enemies) {
    const dx = e.mesh.position.x - player.position.x;
    const dz = e.mesh.position.z - player.position.z;
    const d = dx*dx + dz*dz;
    if (d < bestDist) { bestDist = d; nearest = e; }
  }
  // Level 2 enemies (sharks/orcas excluded — hazards, not targets)
  if (CURRENT_LEVEL === 2) {
    const l2Targets = [];
    if (_ghostPirate) l2Targets.push(_ghostPirate);
    for (const bp of _l2BeachPirates) l2Targets.push(bp);
    for (const t of l2Targets) {
      const dx = t.mesh.position.x - player.position.x;
      const dz = t.mesh.position.z - player.position.z;
      const d = dx*dx + dz*dz;
      if (d < bestDist) { bestDist = d; nearest = t; }
    }
  }
  // Level 3 enemies
  if (CURRENT_LEVEL === 3) {
    if (_l3Wight) {
      const dx = _l3Wight.mesh.position.x - player.position.x;
      const dz = _l3Wight.mesh.position.z - player.position.z;
      const d = dx*dx + dz*dz;
      if (d < bestDist) { bestDist = d; nearest = _l3Wight; }
    }
    for (const le of _l3Enemies) {
      const dx = le.mesh.position.x - player.position.x;
      const dz = le.mesh.position.z - player.position.z;
      const d = dx*dx + dz*dz;
      if (d < bestDist) { bestDist = d; nearest = le; }
    }
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
  const isWizard = activeSkin === 'wizard';
  const isHuman  = activeSkin === 'human';
  let mesh;
  if (isHuman && _humanGunPivot) {
    _humanGunPivot.rotation.y = Math.atan2(tx, tz) - player.rotation.y;
    _gunHoldTimer = 0.2;
  }
  if (isHuman) {
    mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 * playerStats.projSize, 0.06 * playerStats.projSize, 0.28 * playerStats.projSize, 6),
      new THREE.MeshStandardMaterial({ color: 0x999999, emissive: 0xffaa00, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.9 })
    );
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  } else {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 8, 8),
      new THREE.MeshStandardMaterial({
        color:             isWizard ? 0xcc44ff : 0xeef8ff,
        emissive:          isWizard ? 0x9900ff : 0x88ccff,
        emissiveIntensity: isWizard ? 1.2 : 0.6,
        roughness: 0.3
      })
    );
  }
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

function hitEnemy(j, impactX, impactY, impactZ, dmgMult = 1, skipKnockback = false) {
  const e = enemies[j];
  // Belgica has 50% dodge chance
  if (e.type === 'belgica' && Math.random() < 0.5) return false;
  const isCrit = Math.random() < playerStats.critChance;
  const _dmg = SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * dmgMult * (isCrit ? 2 : 1);
  e.hp -= _dmg;
  showDmgNumber(e.mesh.position.x, e.mesh.position.z, _dmg, isCrit);
  spawnImpact(impactX, impactY, impactZ, isCrit);
  if (playerStats.knockback > 0 && e.mesh && !skipKnockback) {
    const kx = impactX - e.mesh.position.x, kz = impactZ - e.mesh.position.z;
    const kd = Math.sqrt(kx*kx + kz*kz) || 1;
    e.mesh.position.x -= (kx / kd) * playerStats.knockback;
    e.mesh.position.z -= (kz / kd) * playerStats.knockback;
  }
  if (playerStats.lifesteal > 0 && playerStats.shieldDmgTimer <= 0 && Math.random() < playerStats.lifesteal && playerStats.shield < playerStats.maxShield) {
    playerStats.shield = Math.min(playerStats.maxShield, playerStats.shield + 1);
    updateHUD();
  }
  if (playerStats.bloodHeal > 0 && Math.random() < playerStats.bloodHeal && playerState.hp < playerState.maxHp) {
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + 1);
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
          const legKey = s.returning ? 'ret' : 'out';
          const legSet = s.hitSet[legKey];
          if (!legSet.has(e)) {
            const isFirstHit = legSet.size === 0;
            legSet.add(e);
            const _bm = (1 + 0.3 * ((weaponStacks['hasper'] || 1) - 1)) * (s.returning ? 0.4 : 0.6);
            // Knockback only on first outgoing hit — never on return (would pull enemies toward player)
            const skipKb = s.returning || !isFirstHit;
            hitEnemy(j, s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, _bm, skipKb);
          }
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
        const _bossBoomMult = s.boomerang ? (1 + 0.3 * ((weaponStacks['hasper'] || 1) - 1)) * (s.returning ? 0.4 : 0.6) : 1;
        boss.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * _bossBoomMult * (isCrit ? 2 : 1);
        spawnImpact(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, isCrit);
        // Teleport at 75/50/25% thresholds
        const hpPct = boss.hp / boss.maxHp;
        for (let ti = boss.teleportThresholds.length - 1; ti >= 0; ti--) {
          if (hpPct <= boss.teleportThresholds[ti]) {
            boss.teleportThresholds.splice(ti, 1);
            let tx, tz, _tt = 0;
            do { tx = (Math.random()-0.5)*140; tz = (Math.random()-0.5)*140; _tt++; }
            while (_tt < 20 && mountainColliders.some(m => Math.hypot(tx-m.x,tz-m.z) < m.r+4));
            boss.mesh.position.set(tx, 0, tz);
            spawnGust(boss.mesh.position.x, boss.mesh.position.z);
            break;
          }
        }
        if (!s.boomerang) hit = true;
      }
    }

    // Check hit against L2 sharks and orcas
    if (!hit && CURRENT_LEVEL === 2) {
      const hitRadius = 1.5 * playerStats.projSize;
      for (let si = _l2Sharks.length - 1; si >= 0; si--) {
        const sh = _l2Sharks[si];
        if (Math.hypot(s.mesh.position.x - sh.mesh.position.x, s.mesh.position.z - sh.mesh.position.z) < hitRadius) {
          const isCrit = Math.random() < playerStats.critChance;
          sh.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * (isCrit ? 2 : 1);
          spawnImpact(s.mesh.position.x, 0.5, s.mesh.position.z, isCrit);
          if (sh.hp <= 0) { scene.remove(sh.mesh); _l2Sharks.splice(si, 1); killCount++; spawnXpOrb(sh.mesh.position.x, sh.mesh.position.z, 3); updateHUD(); }
          if (!s.boomerang) hit = true;
          break;
        }
      }
      if (!hit) {
        const orcaRadius = 2.2 * playerStats.projSize;
        for (let oi = _l2Orcas.length - 1; oi >= 0; oi--) {
          const o = _l2Orcas[oi];
          if (Math.hypot(s.mesh.position.x - o.mesh.position.x, s.mesh.position.z - o.mesh.position.z) < orcaRadius) {
            const isCrit = Math.random() < playerStats.critChance;
            o.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * (isCrit ? 2 : 1);
            spawnImpact(s.mesh.position.x, 0.5, s.mesh.position.z, isCrit);
            if (o.hp <= 0) { scene.remove(o.mesh); _l2Orcas.splice(oi, 1); killCount++; spawnXpOrb(o.mesh.position.x, o.mesh.position.z, 6); updateHUD(); }
            if (!s.boomerang) hit = true;
            break;
          }
        }
      }
    }

    // Ghost pirate hit — always check regardless of other hits
    if (CURRENT_LEVEL === 2 && _ghostPirate) {
      if (Math.hypot(s.mesh.position.x - _ghostPirate.mesh.position.x, s.mesh.position.z - _ghostPirate.mesh.position.z) < 1.8 * playerStats.projSize) {
        const isCrit = Math.random() < playerStats.critChance;
        _ghostPirate.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * (isCrit ? 2 : 1);
        spawnImpact(s.mesh.position.x, 0.8, s.mesh.position.z, isCrit);
        _updateGhostPirateHUD();
        if (_ghostPirate.hp <= 0) {
          // Death — drop rusty key
          const keyMesh = new THREE.Group();
          const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.6,8), new THREE.MeshStandardMaterial({color:0xaa7700,emissive:0x664400,emissiveIntensity:0.6,roughness:0.4,metalness:0.7}));
          keyShaft.rotation.z = Math.PI/2; keyMesh.add(keyShaft);
          const keyHead = new THREE.Mesh(new THREE.TorusGeometry(0.14,0.04,6,10), new THREE.MeshStandardMaterial({color:0xffcc00,emissive:0xaa8800,emissiveIntensity:0.8}));
          keyHead.position.x = 0.38; keyMesh.add(keyHead);
          const keyGlow = new THREE.PointLight(0xffcc00, 1.2, 5);
          keyMesh.add(keyGlow);
          keyMesh.position.set(_ghostPirate.mesh.position.x, 0.5, _ghostPirate.mesh.position.z);
          scene.add(keyMesh);
          _rustyKeyMesh = keyMesh;
          scene.remove(_ghostPirate.mesh);
          _ghostBullets.forEach(b => scene.remove(b.mesh));
          _ghostBullets.length = 0;
          killCount++; spawnXpOrb(_ghostPirate.mesh.position.x, _ghostPirate.mesh.position.z, 10); updateHUD();
          _ghostPirate = null; _updateGhostPirateHUD(); // hide bar immediately
          // Show death riddle pointing to the chest
          const _riddle = document.createElement('div');
          _riddle.style.cssText = 'position:fixed;top:28%;left:50%;transform:translateX(-50%);background:rgba(5,0,20,0.92);border:2px solid #6688aa;border-radius:12px;padding:18px 32px;font-family:monospace;font-size:16px;color:#aaccee;text-shadow:0 0 10px #4488bb;pointer-events:none;z-index:9999;text-align:center;max-width:500px;line-height:1.6';
          _riddle.innerHTML = '<span style="color:#88aacc;font-size:12px;letter-spacing:3px;display:block;margin-bottom:8px">👻 GHOST PIRATE\'S LAST WORDS</span>Ha... ha ha... you bested me, bird...<br>The chest awaits on the cold northern shore...<br><em style="color:#88ccee">Head north along the western shore...</em><br>Where the dark sand grows quiet and still...<br>My key will show you the way... <span style="color:#aaddff">find it...</span><br><span style="font-size:12px;color:#668899;margin-top:6px;display:block">(Press E near the key to pick it up)</span><br><span style="font-size:11px;color:#445566;margin-top:10px;display:block;letter-spacing:2px;animation:pulse 1s infinite">PRESS ANY KEY TO CONTINUE</span>';
          document.body.appendChild(_riddle);
          // Pause the whole game loop; block general keydown→resumeGame
          waitingToResume = true; playerState.iframes = 999; _popupPaused = true;
          // 1-second delay so player can't accidentally skip it
          setTimeout(() => {
            const _riddleKey = () => {
              window.removeEventListener('keydown', _riddleKey);
              _riddle.remove();
              _popupPaused = false;
              resumeGame();
            };
            window.addEventListener('keydown', _riddleKey);
          }, 1000);
        }
        if (!s.boomerang) hit = true;
      }
    }

    // Beach pirate hit
    if (!hit && CURRENT_LEVEL === 2) {
      for (let bi = _l2BeachPirates.length - 1; bi >= 0; bi--) {
        const bp = _l2BeachPirates[bi];
        if (Math.hypot(s.mesh.position.x - bp.mesh.position.x, s.mesh.position.z - bp.mesh.position.z) < 1.2 * playerStats.projSize) {
          const isCrit = Math.random() < playerStats.critChance;
          bp.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * (isCrit ? 2 : 1);
          spawnImpact(s.mesh.position.x, 0.5, s.mesh.position.z, isCrit);
          if (bp.hp <= 0) {
            scene.remove(bp.mesh);
            _l2BeachPirates.splice(bi, 1);
            killCount++; spawnXpOrb(bp.mesh.position.x, bp.mesh.position.z, 2); updateHUD();
          }
          if (!s.boomerang) hit = true;
          break;
        }
      }
    }

    // L3: Wight hit
    if (CURRENT_LEVEL === 3 && _l3Wight) {
      if (Math.hypot(s.mesh.position.x - _l3Wight.mesh.position.x, s.mesh.position.z - _l3Wight.mesh.position.z) < 2.0 * playerStats.projSize) {
        const isCrit = Math.random() < playerStats.critChance;
        _l3Wight.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * (isCrit ? 2 : 1);
        spawnImpact(s.mesh.position.x, 1.0, s.mesh.position.z, isCrit);
        _updateWightHUD();
        if (_l3Wight.hp <= 0) {
          scene.remove(_l3Wight.mesh);
          _l3WightBullets.forEach(b => scene.remove(b.mesh)); _l3WightBullets.length = 0;
          killCount++; spawnXpOrb(_l3Wight.mesh.position.x, _l3Wight.mesh.position.z, EASY ? 150 : 15); updateHUD();
          _l3Wight = null; _updateWightHUD();
          // Show lamp appear message
          const wd = document.createElement('div');
          wd.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);background:rgba(15,10,0,0.92);border:2px solid #cc9900;border-radius:12px;padding:18px 32px;font-family:monospace;font-size:18px;color:#ffd700;text-shadow:0 0 14px #ffaa00;pointer-events:none;z-index:9999;text-align:center;max-width:440px;line-height:1.7';
          wd.innerHTML = '💀 <strong>The Wight has fallen!</strong><br><span style="font-size:14px;color:#ffeeaa">The magic lamp glows before you...</span><br><span style="font-size:13px;color:#ccaa66;font-style:italic">Approach the lamp and press E to claim it.</span>';
          document.body.appendChild(wd); setTimeout(() => wd.remove(), 6000);
        }
        if (!s.boomerang) hit = true;
      }
    }

    // L3: regular enemy hit
    if (!hit && CURRENT_LEVEL === 3) {
      for (let li = _l3Enemies.length - 1; li >= 0; li--) {
        const le = _l3Enemies[li];
        if (Math.hypot(s.mesh.position.x - le.mesh.position.x, s.mesh.position.z - le.mesh.position.z) < 1.4 * playerStats.projSize) {
          const isCrit = Math.random() < playerStats.critChance;
          le.hp -= SNOWBALL_DAMAGE * playerStats.damage * (playerStats.snowballDmgMult||1) * (isCrit ? 2 : 1);
          spawnImpact(s.mesh.position.x, 0.6, s.mesh.position.z, isCrit);
          if (le.hp <= 0) {
            scene.remove(le.mesh); _l3Enemies.splice(li, 1);
            killCount++; spawnXpOrb(le.mesh.position.x, le.mesh.position.z, EASY ? 30 : 3); updateHUD();
          }
          if (!s.boomerang) hit = true;
          break;
        }
      }
    }

    // Boomerang: only removed when it returns to player (handled above) or times out
    if (s.boomerang) {
      s.age = (s.age || 0) + dt;
      if (s.age > 6) { boomerangInFlight = false; disposeMesh(s.mesh); scene.remove(s.mesh); snowballs.splice(i, 1); }
      continue; // skip normal removal
    }

    // Normal snowball: remove on hit or out of range
    if (hit || s.mesh.position.distanceTo(player.position) > 22) {
      disposeMesh(s.mesh); scene.remove(s.mesh);
      snowballs.splice(i, 1);
    }
  }
}

function showDmgNumber(worldX, worldZ, amount, isCrit) {
  if (!window.showDmgNumbers) return;
  const el = document.createElement('div');
  el.textContent = Math.round(amount);
  el.style.cssText = `position:fixed;font-family:monospace;font-weight:bold;pointer-events:none;z-index:9999;
    font-size:${isCrit ? 18 : 13}px;color:#ffdd44;
    text-shadow:0 0 6px #ffaa00;transition:transform 0.6s,opacity 0.6s`;
  document.body.appendChild(el);
  // project world pos to screen
  const v = new THREE.Vector3(worldX, 1.2, worldZ);
  v.project(camera);
  el.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px';
  el.style.top  = ((-v.y + 1) / 2 * window.innerHeight) + 'px';
  requestAnimationFrame(() => {
    el.style.transform = `translateY(-30px)`;
    el.style.opacity = '0';
  });
  setTimeout(() => el.remove(), 650);
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
  const _inFlightCap = Math.min(3, Math.max(1, Math.floor(4 - gameTime / 120)));
  if (bombs.filter(b => !b.landed).length >= _inFlightCap) return; // cap in-flight bombs
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

function spawnGust(x, z, showGust = false, powered = false, delay = 0) {
  if (!showGust) return;
  const mat = _gustMat.clone();
  mat.color.setHex(powered ? 0x44ff44 : 0xffffff);
  const mesh = new THREE.Mesh(_gustGeo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.05, z);
  scene.add(mesh);
  _gustFX.push({ mesh, timer: 0.4, duration: 0.4, delay,
                 dmgPending: powered ? 0.3 : -1, ox: x, oz: z });
}

function updateGusts(dt) {
  for (let i = _gustFX.length - 1; i >= 0; i--) {
    const g = _gustFX[i];
    g.delay -= dt;
    if (g.delay > 0) continue;
    // Damage trigger after 0.3s
    if (g.dmgPending > 0) {
      g.dmgPending -= dt;
      if (g.dmgPending <= 0) {
        g.dmgPending = -1;
        const GUST_DMG = 10 * (playerStats.magicDmgMult||1);
        const GUST_R2  = 4; // radius² = 2²
        for (const e of enemies) {
          const dx = e.mesh.position.x - g.ox, dz = e.mesh.position.z - g.oz;
          if (dx*dx + dz*dz <= GUST_R2) {
            e.hp -= GUST_DMG;
            showDmgNumber(e.mesh.position.x, e.mesh.position.z, GUST_DMG, false);
          }
        }
      }
    }
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
let _perfectStreak   = 0;     // consecutive perfect landings (0–5), drives speed boost
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

// Generate cracks across the full map on a jittered grid (level 1 only)
if (CURRENT_LEVEL !== 2) (function placeCracks() {
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

// Build thin ice tiles on a grid inside the SW zone (level 1 only)
if (CURRENT_LEVEL !== 2) (function placeThinIce() {
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
    stormSlow   = 0.90;
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
      </tr>
      ${scores.map((s, i) => `
        <tr style="background:${i===0?'rgba(255,220,50,0.07)':''}">
          <td style="padding:4px 10px;opacity:0.5">${i+1}</td>
          <td style="padding:4px 10px;color:${i===0?'#ffee44':'#aee8ff'};font-weight:${i===0?'bold':'normal'}">${s.name}</td>
          <td style="padding:4px 10px;color:#ff8888">☠ ${s.kills}</td>
          <td style="padding:4px 10px;color:#ffcc44">${s.level}</td>
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
  if (window.bgm) { window.bgm.pause(); window.bgm.currentTime = 0; }
  const _nootSfx = new Audio('sounds/Pingu%20-%20Noot%20Noot%20Sound%20Effect.mp3');
  _nootSfx.volume = parseFloat(localStorage.getItem('bgmVolume') ?? '0.1');
  _nootSfx.play().catch(() => {});
  deathScreen.innerHTML = `
    <div style="font-size:46px;font-weight:bold;letter-spacing:6px;text-shadow:0 0 30px #00aaff">YOU FROZE</div>
    <div style="font-size:15px;opacity:0.5">☠ ${killCount} kills &nbsp;|&nbsp; Level ${playerLevel}${EASY ? ' &nbsp;|&nbsp; <span style="color:#ffdd44;opacity:1">⚡ Easy Mode</span>' : ''}</div>
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
    <div style="display:flex;justify-content:center;gap:8px;margin-bottom:4px">
      <button id="retryBtn"
        style="background:transparent;border:2px solid #44aaff55;color:#aee8ff;
               font-family:monospace;font-size:12px;padding:4px 18px;cursor:pointer;border-radius:4px;letter-spacing:2px">RETRY</button>
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
    <div style="display:flex;gap:12px;margin-top:8px">
      <button id="howToBtn"
        style="background:transparent;border:2px solid #44aaff33;color:#aee8ff88;
               font-family:monospace;font-size:13px;padding:10px 18px;cursor:pointer;letter-spacing:2px">HOW TO PLAY</button>
    </div>
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
    const submittedName = EASY ? input.value.trim() + ' ⚡' : input.value;
    const isNewHigh = await submitOnlineScore(submittedName, killCount, playerLevel);
    submit.textContent = isNewHigh ? (EASY ? '✓ NEW HIGH SCORE (EASY)' : '✓ NEW HIGH SCORE') : '✓ SUBMITTED';
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
  document.getElementById('retryBtn').addEventListener('click', () => { sessionStorage.removeItem('levelProgress'); sessionStorage.setItem('bgmAutoStart','1'); sessionStorage.setItem('skipIntro','1'); location.href = 'index.html?v=' + Date.now(); });
  document.getElementById('howToBtn').addEventListener('click', () => {
    const el = document.getElementById('introScreen');
    if (el) { el.style.display = 'flex'; }
  });
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const el = document.getElementById('scoreboardEl');
    if (el) el.innerHTML = '<div style="opacity:0.4;font-size:13px">Refreshing...</div>';
    fetchLeaderboard().then(scores => {
      if (el) el.innerHTML = renderScoreboard(scores);
    });
  });
}

// ── On-Screen Keyboard (controller name entry) ────────────────────────────────
const OSK_KEYS = [
  ['A','B','C','D','E','F','G'],
  ['H','I','J','K','L','M','N'],
  ['O','P','Q','R','S','T','U'],
  ['V','W','X','Y','Z','0','1'],
  ['2','3','4','5','6','7','8'],
  ['9',' ','⌫','✓','','',''],
];
let oskOpen = false, oskRow = 0, oskCol = 0;

const oskOverlay = document.createElement('div');
oskOverlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,8,24,0.92);z-index:20000;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;gap:10px';
document.body.appendChild(oskOverlay);

function renderOSK() {
  const input = document.getElementById('nameInput');
  const cur = input ? input.value : '';
  let html = `<div style="font-size:13px;color:#44aaff;letter-spacing:2px;margin-bottom:6px">ENTER NAME</div>`;
  html += `<div style="font-size:22px;color:#aee8ff;background:rgba(0,20,50,0.8);border:1px solid #44aaff;padding:8px 20px;border-radius:4px;min-width:200px;text-align:center;margin-bottom:10px">${cur || '&nbsp;'}</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:6px">`;
  OSK_KEYS.forEach((row, r) => {
    html += `<div style="display:flex;gap:6px">`;
    row.forEach((k, c) => {
      if (!k) { html += `<div style="width:44px"></div>`; return; }
      const sel = r === oskRow && c === oskCol;
      const w = (k === '⌫' || k === '✓') ? '52px' : k === ' ' ? '52px' : '44px';
      html += `<div style="width:${w};height:44px;display:flex;align-items:center;justify-content:center;
        background:${sel ? '#1a4a8a' : 'rgba(0,20,50,0.7)'};
        border:2px solid ${sel ? '#44aaff' : '#1a3a5a'};
        border-radius:6px;font-size:${k==='⌫'||k==='✓'?'18px':'15px'};color:#aee8ff;cursor:pointer"
        onclick="oskTap(${r},${c})">${k === ' ' ? 'SPC' : k}</div>`;
    });
    html += `</div>`;
  });
  html += `</div><div style="font-size:11px;color:#336688;margin-top:10px">D-pad navigate · A select · B backspace · Start confirm</div>`;
  oskOverlay.innerHTML = html;
}

function oskTap(r, c) { oskRow = r; oskCol = c; oskConfirm(); }

function oskConfirm() {
  const k = OSK_KEYS[oskRow][oskCol];
  const input = document.getElementById('nameInput');
  if (!input) return;
  if (k === '✓') { closeOSK(); return; }
  if (k === '⌫') { input.value = input.value.slice(0, -1); }
  else if (input.value.length < 16) { input.value += k; }
  renderOSK();
}

function showOSK() {
  oskOpen = true; oskRow = 0; oskCol = 0;
  oskOverlay.style.display = 'flex';
  renderOSK();
}

function closeOSK() {
  oskOpen = false;
  oskOverlay.style.display = 'none';
}

window.addEventListener('keydown', e => {
  const typingName = document.activeElement && document.activeElement.id === 'nameInput';
  if ((e.code === 'Space' || e.key === 'r') && playerState.dead && !typingName) { sessionStorage.removeItem('levelProgress'); location.href = 'index.html?v=' + Date.now(); }
});

function triggerShaggy() {
  playerState.shaggyCharges--;
  playerState.shaggyRechargeTimer = 0;
  playerState.iframes = Math.min(0.5, 0.1 + playerState.shaggyMaxCharges * 0.1);
  if (playerStats.shaggyStacks > 0) {
    const nearest = findNearestEnemy();
    if (nearest) {
      const _shagDmg = playerStats.shaggyStacks * (playerStats.magicDmgMult||1);
      nearest.hp -= _shagDmg;
      showDmgNumber(nearest.mesh.position.x, nearest.mesh.position.z, _shagDmg, false);
    }
  }
}

function damagePlayer(amount) {
  if (_godMode) return;
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
    playerState.iframes = playerStats.shieldIframes ?? 1.2;
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
  if (playerState.dead || _godMode) return;
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
  flex-direction:column; align-items:center; justify-content:flex-start; padding-top:40px;
  font-family:monospace; color:#aee8ff;
  pointer-events:none;
`;
tomeScreen.innerHTML = `
  <div style="pointer-events:auto;display:flex;flex-direction:column;align-items:center">
    <div style="font-size:22px;font-weight:bold;letter-spacing:4px;text-shadow:0 0 20px #44aaff;margin-bottom:6px">CHOOSE AN UPGRADE</div>
    <div style="font-size:11px;opacity:0.5;margin-bottom:16px">Pick one tome to carry forward</div>
    <div id="tomeCards" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;max-width:560px"></div>
    <div style="margin-top:14px;font-size:11px;opacity:0.4;letter-spacing:2px">A / D to navigate &nbsp;|&nbsp; P to confirm</div>
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

let pendingTomes = _levelSave?.pendingTomes ?? 0;

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
      cursor:pointer; border:1px solid ${tome.color}33; padding:14px 12px;
      width:130px; background:rgba(0,16,36,0.9); border-radius:8px;
      text-align:center; transition:border-color 0.12s, transform 0.12s, box-shadow 0.12s;
      box-shadow:0 0 12px ${tome.color}11;
    `;
    card.innerHTML = `
      ${tome.isWeapon ? `<div style="font-size:9px;letter-spacing:2px;color:${tome.color};opacity:0.7;margin-bottom:4px">⚔ WEAPON</div>` : ''}
      <div style="font-size:26px;margin-bottom:6px">${tome.emoji}</div>
      <div style="font-size:12px;font-weight:bold;color:${tome.color};margin-bottom:6px">${tome.name}</div>
      <div style="font-size:10px;opacity:0.75;line-height:1.4">${tome.desc}</div>
      ${!tome.isWeapon && stacks > 0 ? `<div style="font-size:10px;opacity:0.45;margin-top:6px">Stack: ${stacks}</div>` : ''}
      ${tome.isWeapon && equippedWeapons.has(tome.id) ? `<div style="font-size:10px;opacity:0.55;margin-top:6px;color:${tome.color}">✓ ${
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
let _popupPaused    = false; // blocks general keydown→resumeGame during riddle/chest popups

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

// Any tap or key resumes (but not while debug menu is open)
document.addEventListener('touchstart', () => { if (!_debugOpen) resumeGame(); }, { passive: true });

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
    if (goLeft  && !prevTomeLeft)  { selectedTomeIdx = Math.max(0, selectedTomeIdx - 1); updateTomeHighlight(); tomeInputDelay = 0.18; }
    if (goRight && !prevTomeRight) { selectedTomeIdx = Math.min(currentTomeChoices.length - 1, selectedTomeIdx + 1); updateTomeHighlight(); tomeInputDelay = 0.18; }
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
  mapItems.push({ group, orb, bobOffset: Math.random() * Math.PI * 2, magnetize: false, spawnDelay: 0.6 });
}

function updateItems(dt) {
  // Elite-drop items (purple orbs) still work
  if (choosingTome) return;
  const t = frameTime;
  const _attractR = playerStats.pickupRadius + 0.8;
  const px = player.position.x, pz = player.position.z;
  for (let i = mapItems.length - 1; i >= 0; i--) {
    const item = mapItems[i];
    item.orb.rotation.y += dt * 1.5;
    const dx = px - item.group.position.x;
    const dz = pz - item.group.position.z;
    const d2 = dx*dx + dz*dz;
    if (item.spawnDelay > 0) { item.spawnDelay -= dt; }
    else if (!item.magnetize && d2 < _attractR * _attractR) item.magnetize = true;
    if (item.magnetize) {
      const md = Math.sqrt(d2);
      if (md > 0.01) {
        const spd = 8 + (1 - Math.min(1, md / _attractR)) * 14;
        item.group.position.x += (dx / md) * spd * dt;
        item.group.position.z += (dz / md) * spd * dt;
      }
    }
    const collectR = item.magnetize ? _attractR * 0.25 : playerStats.pickupRadius;
    if (Math.sqrt(d2) < collectR) {
      scene.remove(item.group);
      mapItems.splice(i, 1);
      queueTome();
      break;
    }
    item.group.position.y = 1.0 + Math.sin(t * 2 + item.bobOffset) * 0.25;
  }
}

// ── XP System ─────────────────────────────────────────────────────────────────

let playerLevel = _levelSave?.level ?? 1;
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

function cumulativeXpForLevel(level) {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
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
  // In L2+ orbs auto-magnetize since the player can't chase them into hostile water
  xpOrbs.push({ group, orb, amount, bobOffset: Math.random() * Math.PI * 2, spawnDelay: 0.6, magnetize: CURRENT_LEVEL > 1 });
}

function gainXP(amount) {
  playerXP += amount;
  let leveled = false;
  while (playerXP >= cumulativeXpForLevel(playerLevel + 1)) {
    playerLevel++;
    leveled = true;
    queueTome();
  }
  if (leveled) updateXPBar();
  updateXPBar();
}

function updateXpOrbs(dt) {
  if (choosingTome) return;
  const t = frameTime;
  // Krill drop pickup
  if (window._krillDropPickable && window._krillDropMesh) {
    const kd = window._krillDropMesh;
    kd.position.y = 0.5 + Math.sin(t * 2) * 0.1;
    kd.children.forEach(c => { if (c.isObject3D && !c.isLight) c.rotation.y += dt * 1.5; });
    if (Math.hypot(player.position.x - kd.position.x, player.position.z - kd.position.z) < 1.5) {
      scene.remove(kd); window._krillDropMesh = null; window._krillDropPickable = false;
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:36%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:22px;color:#ff8844;text-shadow:0 0 12px #ff5500;pointer-events:none;z-index:9999;text-align:center';
      el.textContent = '🦐 Piece of Krill obtained!';
      document.body.appendChild(el); setTimeout(() => el.remove(), 2500);
    }
  }
  const _attractR = playerStats.pickupRadius + 0.8;
  for (let i = xpOrbs.length - 1; i >= 0; i--) {
    const orb = xpOrbs[i];
    const dx = player.position.x - orb.group.position.x;
    const dz = player.position.z - orb.group.position.z;
    const _d2 = dx*dx + dz*dz;
    if (orb.spawnDelay > 0) { orb.spawnDelay -= dt; }
    else if (!orb.magnetize && _d2 < _attractR * _attractR) orb.magnetize = true;
    if (orb.magnetize) {
      const md = Math.sqrt(_d2) || 1;
      const spd = 8 + (1 - Math.min(1, md / _attractR)) * 14; // faster as it gets closer
      orb.group.position.x += (dx/md) * spd * dt;
      orb.group.position.z += (dz/md) * spd * dt;
      orb.group.position.y = 0.5 + Math.sin(t * 6 + orb.bobOffset) * 0.2;
      orb.orb.rotation.y += dt * 5;
    } else {
      orb.group.position.y = 0.5 + Math.sin(t * 3 + orb.bobOffset) * 0.15;
      orb.orb.rotation.y += dt * 2;
    }
    const pr = orb.magnetize ? _attractR * 0.25 : _attractR;
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
        playerState.hp = Math.min(playerState.maxHp, playerState.hp + 25);
        updateHUD();
        showFishFlash('+25 HP 🐟', '#44ffaa');
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

if (CURRENT_LEVEL !== 2) spawnHumans();
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

if (EASY) {
  const easyBadge = document.createElement('div');
  easyBadge.style.cssText = `
    position:fixed; bottom:200px; left:40px; z-index:251;
    font-family:monospace; font-size:22px; font-weight:bold;
    color:#ffdd44; text-shadow:0 0 8px #ffaa00;
    background:rgba(40,20,0,0.6); border:1px solid #ffaa0055;
    border-radius:10px; padding:6px 16px; pointer-events:none;
    letter-spacing:2px;
  `;
  easyBadge.textContent = '⚡ EASY MODE — testing';
  document.body.appendChild(easyBadge);
}

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

// JUMP button — bottom row, centered (larger for easier tap target)
const jumpBtn = makeActionBtn('JUMP', '#aee8ff', rightPad);
jumpBtn.style.width = '110px';
jumpBtn.style.height = '110px';


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
const keyCodes = {}; // tracks physical key codes, unaffected by modifier keys
window.addEventListener('keydown', e => {
  keyCodes[e.code] = true;
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'o') openPendingTome();
  if (e.key.toLowerCase() === 'e' && CURRENT_LEVEL === 2) {
    const px = player.position.x, pz = player.position.z;
    if (_bottlePopupOpen || _shipPopupOpen) { _bottlePopup.style.display='none'; _shipPopup.style.display='none'; _bottlePopupOpen=false; _shipPopupOpen=false; }
    else if (_l2Bottle && Math.hypot(px-_l2Bottle.x,pz-_l2Bottle.z)<3.5) {
      document.getElementById('_bottleText').textContent = 'Brave traveller — a key lies hidden in these waters. Find it, and the ancient chest aboard the wreck shall open. The cold depths hide what the warm world forgot.';
      _bottlePopup.style.display='block'; _bottlePopupOpen=true;
    } else if (!_chestOpened && Math.hypot(px+63,pz+100)<3.5) {
      if (_hasRustyKey) {
        _chestOpened = true;
        if (window._l2ChestGroup) {
          const lid = window._l2ChestGroup.children[1];
          if (lid) lid.rotation.x = -Math.PI/2;
          if (window._l2ChestGlow) window._l2ChestGlow.color.set(0xffee88);
        }
        // Grant Anti-Heat Sunglasses and rebuild skin with glasses
        _hasAntiHeatSunglasses = true;
        penguinMesh.clear();
        const _newModel = activeSkin === 'evil' ? buildEvilPenguin() : activeSkin === 'wizard' ? buildWizardCat() : activeSkin === 'human' ? buildHumanPlayer() : buildPenguin();
        penguinMesh.add(_newModel);
        _humanGunPivot = _newModel.userData.gunPivot ?? null;
        // Show reward popup with portal note — pause game until dismissed
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:32%;left:50%;transform:translateX(-50%);background:rgba(10,5,0,0.92);border:2px solid #ffcc44;border-radius:12px;padding:18px 32px;font-family:monospace;font-size:18px;color:#ffd700;text-shadow:0 0 14px #ffaa00;pointer-events:none;z-index:9999;text-align:center;max-width:480px;line-height:1.7';
        el.innerHTML = '🕶️ <strong>Anti-Heat Sunglasses</strong> obtained!<br><span style="font-size:14px;color:#ffeeaa">These will protect you from extreme desert heat.</span><br><hr style="border-color:#886600;margin:8px 0"><span style="font-size:13px;color:#ccaa66;font-style:italic">"A tattered note falls from the chest:<br><em>\'Cross the entire beach to the east — a burning portal awaits.<br>Strange and warm, unlike anything on these frozen seas.\'</em>"</span><br><span style="font-size:11px;color:#886600;margin-top:10px;display:block;letter-spacing:2px;animation:pulse 1s infinite">PRESS ANY KEY TO CONTINUE</span>';
        document.body.appendChild(el);
        waitingToResume = true; playerState.iframes = 999; _popupPaused = true;
        setTimeout(() => {
          const _chestKey = () => {
            window.removeEventListener('keydown', _chestKey);
            el.remove();
            _popupPaused = false;
            resumeGame();
          };
          window.addEventListener('keydown', _chestKey);
        }, 1000);
      } else {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:38%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:18px;color:#ff8844;text-shadow:0 0 8px #ff4400;pointer-events:none;z-index:9999';
        el.textContent = '🔒 This chest is locked. You need a rusty key.';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2000);
      }
    } else if (_desertPortalGroup && Math.hypot(px-47,pz+85)<2.5) {
      if (_hasAntiHeatSunglasses) {
        // Save L2 progress before going to desert
        const _ds = { hp: playerState.hp, maxHp: playerState.maxHp, stats: {...playerStats}, tomeStacks: {...tomeStacks}, weapons: [...equippedWeapons], level: playerLevel, pendingTomes, skin: localStorage.getItem('playerSkin')||'normal', activeSkinVal: activeSkin, sunglasses: true };
        sessionStorage.setItem('levelProgress', JSON.stringify(_ds));
        sessionStorage.setItem('bgmAutoStart','1');
        window.location.href = 'level3.html';
      } else {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:38%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:18px;color:#ff8844;text-shadow:0 0 10px #ff6600;pointer-events:none;z-index:9999;text-align:center';
        el.textContent = '🔥 The desert heat is too intense! You need Anti-Heat Sunglasses.';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2500);
      }
    } else {
      for (const ship of _l2Ships) {
        if (Math.hypot(px-ship.position.x,pz-ship.position.z)<5.5) {
          document.getElementById('_shipClueText').textContent = ship.userData.clue;
          _shipPopup.style.display='block'; _shipPopupOpen=true; break;
        }
      }
    }
  }
  if (e.key.toLowerCase() === 'e' && CURRENT_LEVEL === 3) {
    const px = player.position.x, pz = player.position.z;

    // ── Read riddle stone ────────────────────────────────────────────────────
    if (Math.hypot(px+12, pz+3) < 3.5) {
      const rd = document.createElement('div');
      rd.style.cssText = 'position:fixed;top:22%;left:50%;transform:translateX(-50%);background:rgba(10,5,0,0.93);border:2px solid #aa8844;border-radius:12px;padding:20px 34px;font-family:monospace;font-size:15px;color:#e8d4aa;text-shadow:0 0 8px #aa7700;pointer-events:none;z-index:9999;text-align:center;max-width:480px;line-height:1.9';
      rd.innerHTML = '<span style="color:#cc9944;font-size:12px;letter-spacing:3px;display:block;margin-bottom:10px">👁 ANCIENT INSCRIPTION</span><em>Where moonlight fades, the cycle turns to first light\'s breath,<br>then climbs to noon\'s harsh crown,<br>until day surrenders where it last glows.</em><br><br><span style="color:#886644;font-size:13px">But the <strong style="color:#ffcc44">eye of the stone</strong> must blink twice<br>before the fires will answer.</span><br><br><span style="font-size:11px;color:#665533;letter-spacing:2px;animation:pulse 1s infinite">PRESS ANY KEY TO CONTINUE</span>';
      document.body.appendChild(rd);
      waitingToResume = true; playerState.iframes = 999; _popupPaused = true;
      setTimeout(() => {
        const dismiss = () => { window.removeEventListener('keydown', dismiss); rd.remove(); _popupPaused = false; resumeGame(); };
        window.addEventListener('keydown', dismiss);
      }, 600);
      return;
    }

    // ── Light a puzzle torch ─────────────────────────────────────────────────
    for (let ti = 0; ti < _l3Torches.length; ti++) {
      const t = _l3Torches[ti];
      if (!t.lit && Math.hypot(px-t.group.position.x, pz-t.group.position.z) < 2.5) {
        if (!_l3JumpPlatActivated) {
          const hint = document.createElement('div'); hint.style.cssText='position:fixed;top:40%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:18px;color:#aa8844;text-shadow:0 0 8px #664400;pointer-events:none;z-index:9999';
          hint.textContent='🪨 The ancient stone must awaken first...'; document.body.appendChild(hint); setTimeout(()=>hint.remove(),2200);
        } else if (_l3TorchOrder[_l3TorchProgress] === ti) {
          t.lit = true; t.light.intensity = 2.5; t.flame.material.color.setHex(t.litCol);
          _l3TorchProgress++;
          const msg = document.createElement('div'); msg.style.cssText='position:fixed;top:40%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:20px;color:#ffaa44;text-shadow:0 0 12px #ff6600;pointer-events:none;z-index:9999';
          msg.textContent=`🔥 ${t.name} torch lit! (${_l3TorchProgress}/4)`; document.body.appendChild(msg); setTimeout(()=>msg.remove(),1800);
          if (_l3TorchProgress === 4) {
            _l3PuzzleSolved = true;
            const gInterval = setInterval(() => {
              _l3PuzzleGate.position.y -= 0.22;
              if (_l3PuzzleGate.position.y <= -9) { scene.remove(_l3PuzzleGate); mountainColliders.splice(_l3PuzzleGateColIdx, 23); clearInterval(gInterval); }
            }, 16);
            const gMsg = document.createElement('div'); gMsg.style.cssText='position:fixed;top:32%;left:50%;transform:translateX(-50%);background:rgba(10,5,0,0.92);border:2px solid #ffaa44;border-radius:12px;padding:18px 32px;font-family:monospace;font-size:20px;color:#ffd700;text-shadow:0 0 14px #ff8800;pointer-events:none;z-index:9999;text-align:center;max-width:440px;line-height:1.7';
            gMsg.innerHTML='🗝️ <strong>All torches lit!</strong><br><span style="font-size:14px;color:#ffeeaa">The ancient gate sinks into the earth...</span><br><span style="font-size:13px;color:#cc8844;font-style:italic">A long bridge stretches into the darkness. Beware.</span>';
            document.body.appendChild(gMsg); setTimeout(()=>gMsg.remove(),4500);
          }
        } else {
          _l3TorchProgress = 0;
          _l3Torches.forEach(tt => { tt.lit=false; tt.light.intensity=0; tt.flame.material.color.setHex(tt.unlitCol); });
          const err = document.createElement('div'); err.style.cssText='position:fixed;top:40%;left:50%;transform:translateX(-50%);font-family:monospace;font-size:20px;color:#ff6644;text-shadow:0 0 10px #ff2200;pointer-events:none;z-index:9999';
          err.textContent='💨 The flames gutter out... wrong order.'; document.body.appendChild(err); setTimeout(()=>err.remove(),2200);
        }
        break;
      }
    }

    // ── Pick up magic lamp ───────────────────────────────────────────────────
    if (_l3Lamp && !_l3LampPickedUp && !_l3Wight && Math.hypot(px-_l3Lamp.x, pz-_l3Lamp.z) < 3.5) {
      _l3LampPickedUp = true;
      scene.remove(_l3Lamp.group);
      if (!_l3GenieSpawned) {
        _l3GenieSpawned = true;
        const gm = buildGenie(); gm.position.set(0, 0, -142); scene.add(gm);
        let gt = 0;
        const _genieAnim = (dt2) => { gt += dt2; gm.position.y += 0.5*dt2; gm.rotation.y += dt2; if (gt > 5) scene.remove(gm); };
        const _gInterval = setInterval(() => { _genieAnim(0.016); if (gt > 5) clearInterval(_gInterval); }, 16);
      }
      const vd = document.createElement('div');
      vd.style.cssText = 'position:fixed;top:28%;left:50%;transform:translateX(-50%);background:rgba(10,5,30,0.95);border:2px solid #4488ff;border-radius:14px;padding:22px 36px;font-family:monospace;font-size:20px;color:#aaccff;text-shadow:0 0 16px #4488ff;pointer-events:none;z-index:9999;text-align:center;max-width:500px;line-height:1.8';
      vd.innerHTML = '✨ <strong style="color:#ffd700">Magic Lamp obtained!</strong><br><span style="font-size:15px;color:#88aaff">A swirl of blue smoke fills the room...</span><br><span style="font-size:15px;color:#aaddff;font-style:italic">The genie materialises before you!</span><br><br><span style="font-size:13px;color:#88aacc">"You have freed me, little penguin!<br>Your wish shall be granted... but not today."</span>';
      document.body.appendChild(vd); setTimeout(() => vd.remove(), 9000);
    }
  }
  if (e.key === 'Escape') { _bottlePopup.style.display='none'; _shipPopup.style.display='none'; _bottlePopupOpen=false; _shipPopupOpen=false; }
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
    activeSkin = 'wizard';
  }
  // Ctrl+Shift+6+7 → debug menu (use keyCodes — Shift changes e.key value)
  if (e.ctrlKey && e.shiftKey && keyCodes['Digit6'] && keyCodes['Digit7'] && (e.code === 'Digit6' || e.code === 'Digit7')) { e.preventDefault(); toggleDebugMenu(); }
  const typing = document.activeElement?.id === 'nameInput';
  if (!typing && !_debugOpen && !_popupPaused) resumeGame();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; keyCodes[e.code] = false; });

// ── Debug Menu ────────────────────────────────────────────────────────────────

let _debugOpen = false;
const _debugOverlay = (() => {
  const el = document.createElement('div');
  el.id = 'debugMenu';
  el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:99999;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 0';
  el.innerHTML = `
    <div style="background:#0a0f1e;border:2px solid #44aaff;border-radius:12px;padding:24px 32px;font-family:monospace;color:#aee8ff;min-width:340px;max-width:480px;width:90vw">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font-size:18px;letter-spacing:3px;color:#44aaff">⚙ DEBUG MENU</div>
        <button id="_dbgClose" style="background:#1a0010;border:1px solid #ff4466;color:#ff8899;font-family:monospace;font-size:13px;padding:5px 14px;cursor:pointer;border-radius:6px;letter-spacing:1px">✕ CLOSE</button>
      </div>
      <div id="_dbgList" style="display:flex;flex-direction:column;gap:10px"></div>
      <div style="margin-top:14px;font-size:11px;color:#446688;text-align:center">Ctrl+Shift+6+7 or ESC to close</div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeDebugMenu(); });
  return el;
})();

// ── Debug Tome Picker (submenu) ───────────────────────────────────────────────
const _tomePicker = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:100000;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 0';
  el.innerHTML = `
    <div style="background:#0a0f1e;border:2px solid #aa66ff;border-radius:12px;padding:24px 32px;font-family:monospace;color:#aee8ff;max-width:680px;width:90vw">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:16px;letter-spacing:3px;color:#aa66ff">📖 LEVEL TOMES</div>
        <button id="_tpClose" style="background:#1a0010;border:1px solid #ff4466;color:#ff8899;font-family:monospace;font-size:13px;padding:5px 14px;cursor:pointer;border-radius:6px;letter-spacing:1px">✕ BACK</button>
      </div>
      <div style="font-size:11px;color:#664488;margin-bottom:14px">Each pick grants +1 level. Window stays open for multiple picks.</div>
      <div id="_tpGrid" style="display:flex;flex-wrap:wrap;gap:8px"></div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeTomePicker(); });
  return el;
})();

function openTomePicker() {
  const grid = document.getElementById('_tpGrid');
  grid.innerHTML = '';
  [...TOME_DEFS, ...WEAPON_DEFS].forEach(tome => {
    const btn = document.createElement('button');
    const render = () => {
      const s = tomeStacks[tome.id] || weaponStacks[tome.id] || 0;
      btn.textContent = `${tome.emoji} ${tome.name}${s > 0 ? ` ×${s}` : ''}`;
    };
    render();
    btn.style.cssText = `background:#0d1a30;border:1px solid ${tome.color}55;color:${tome.color};font-family:monospace;font-size:12px;padding:6px 12px;cursor:pointer;border-radius:6px;transition:background 0.1s`;
    btn.onmouseenter = () => btn.style.background = '#1a2a40';
    btn.onmouseleave = () => btn.style.background = '#0d1a30';
    btn.onclick = () => {
      if (tome.isWeapon) {
        applyWeapon(tome.id);
      } else {
        tome.apply(playerStats, () => {});
        tomeStacks[tome.id] = (tomeStacks[tome.id] || 0) + 1;
      }
      playerLevel++;
      updateXPBar();
      render();
    };
    grid.appendChild(btn);
  });
  document.getElementById('_tpClose').onclick = closeTomePicker;
  _tomePicker.style.display = 'flex';
}

function closeTomePicker() {
  _tomePicker.style.display = 'none';
}

let _godMode = false;
let _spawnsDisabled = false;
const _godLight = new THREE.PointLight(0xffd700, 0, 6);
_godLight.position.set(0, 1, 0);
player.add(_godLight);
const _godRingMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1.5, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.8 });
const _godRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 8, 32), _godRingMat);
_godRing.rotation.x = Math.PI / 2;
_godRing.position.y = 0.1;
_godRing.visible = false;
player.add(_godRing);

function setGodModeVisual(on) {
  _godLight.intensity = on ? 3.5 : 0;
  _godRing.visible = on;
}
const _debugActions = [
  { label: '💀  Kill Boss',            fn: () => { if (boss) { boss.hp = 1; } } },
  { label: '⚡  Instant Level Up',     fn: () => { queueTome(); openPendingTome(); } },
  { label: '🛡  Add Power-Up Charge',  fn: () => { playerState.shaggyCharges = Math.max(1, (playerState.shaggyCharges||0)+1); updateHUD(); } },
  { label: '⏩  Skip to Boss (4:55)',   fn: () => { gameTime = 295; } },
  { label: '❤️  Full Heal',            fn: () => { playerState.hp = playerState.maxHp; updateHUD(); } },
  { label: '☠  Kill All Enemies',      fn: () => { enemies.forEach(e => e.hp = 0); } },
  { label: () => _spawnsDisabled ? '🚫  Spawns  [OFF]' : '🚫  Spawns  [ON]', fn: () => { _spawnsDisabled = !_spawnsDisabled; enemies.forEach(e => e.hp = 0); }, noClose: true },
  { label: '🌀  Spawn Boss Now',        fn: () => { if (!boss) spawnBoss(player.position.x + 15, player.position.z); } },
  { label: '🐱  Trigger Level 1 End',  fn: () => { triggerLevel1End(); } },
  { label: () => _godMode ? '🛡  God Mode  [ON]' : '🛡  God Mode  [OFF]', fn: () => { _godMode = !_godMode; setGodModeVisual(_godMode); }, noClose: true },
  { label: '🌊  Go to Level 2',           fn: () => { saveProgressAndUnlockPortal(); sessionStorage.setItem('bgmAutoStart','1'); setTimeout(() => { window.location.href = 'level2.html'; }, 100); } },
  { label: '🏜  Go to Level 3',           fn: () => { const _ds={hp:playerState.hp,maxHp:playerState.maxHp,stats:{...playerStats},tomeStacks:{...tomeStacks},weapons:[...equippedWeapons],level:playerLevel,pendingTomes,skin:localStorage.getItem('playerSkin')||'normal',activeSkinVal:activeSkin,sunglasses:true}; sessionStorage.setItem('levelProgress',JSON.stringify(_ds)); sessionStorage.setItem('bgmAutoStart','1'); window.location.href='level3.html'; } },
];

function buildDebugList() {
  const list = document.getElementById('_dbgList');
  list.innerHTML = '';
  _debugActions.forEach((a) => {
    const btn = document.createElement('button');
    const getLabel = () => typeof a.label === 'function' ? a.label() : a.label;
    btn.textContent = getLabel();
    btn.style.cssText = 'background:#0d1a30;border:1px solid #1a4a6a;color:#aee8ff;font-family:monospace;font-size:14px;padding:9px 16px;cursor:pointer;border-radius:6px;text-align:left;transition:background 0.1s';
    btn.onmouseenter = () => btn.style.background = '#1a3a5a';
    btn.onmouseleave = () => btn.style.background = '#0d1a30';
    btn.onclick = () => { a.fn(); if (a.noClose) { btn.textContent = getLabel(); } else { closeDebugMenu(); } };
    list.appendChild(btn);
  });

  // Single "Level Tomes" button — opens submenu
  const tomeBtn = document.createElement('button');
  tomeBtn.textContent = '📖  Level Tomes';
  tomeBtn.style.cssText = 'background:#0d1a30;border:1px solid #aa66ff55;color:#cc99ff;font-family:monospace;font-size:14px;padding:9px 16px;cursor:pointer;border-radius:6px;text-align:left;transition:background 0.1s';
  tomeBtn.onmouseenter = () => tomeBtn.style.background = '#1a1040';
  tomeBtn.onmouseleave = () => tomeBtn.style.background = '#0d1a30';
  tomeBtn.onclick = () => openTomePicker();
  list.appendChild(tomeBtn);

  document.getElementById('_dbgClose').onclick = closeDebugMenu;
}

function toggleDebugMenu() { _debugOpen ? closeDebugMenu() : openDebugMenu(); }
function openDebugMenu()  { buildDebugList(); _debugOverlay.style.display = 'flex'; _debugOpen = true; if (!playerState.dead) { waitingToResume = true; playerState.iframes = 999; } }
function closeDebugMenu() { _debugOverlay.style.display = 'none'; _debugOpen = false; if (waitingToResume) { waitingToResume = false; playerState.iframes = 0; movementLockout = 0.3; } }

// ── Level Progress Save / Portal Transition ───────────────────────────────────

let portalUnlocked = false;

function saveProgressAndUnlockPortal() {
  const save = {
    hp: playerState.hp, maxHp: playerState.maxHp,
    shaggyCharges: playerState.shaggyCharges, shaggyMaxCharges: playerState.shaggyMaxCharges,
    stats: { ...playerStats },
    tomeStacks: { ...tomeStacks },
    weapons: [...equippedWeapons],
    level: playerLevel,
    pendingTomes,
    skin: localStorage.getItem('playerSkin') || 'normal',
    activeSkinVal: selectedSkin,
  };
  sessionStorage.setItem('levelProgress', JSON.stringify(save));
  portalUnlocked = true;

  // Show hint
  const hint = document.createElement('div');
  hint.id = 'portalHint';
  hint.style.cssText = 'position:fixed;bottom:140px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:16px;color:#cc88ff;text-shadow:0 0 10px #8844ff;pointer-events:none;z-index:9999;text-align:center;animation:pulse 1.2s ease-in-out infinite';
  hint.textContent = '⬆ Enter the portal to continue to Level 2';
  document.body.appendChild(hint);
}

let _portalStandTimer  = 0;
let _portalEffectActive = false;
let _portalTransitioning = false;

// Ghost silhouettes + black matter particles — built once, hidden until effect
const _ghostMat   = new THREE.MeshStandardMaterial({ color: 0x110022, emissive: 0x440066, emissiveIntensity: 1.2, transparent: true, opacity: 0, roughness: 0.8 });
const _matterMat  = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x220033, emissiveIntensity: 1.0, transparent: true, opacity: 0 });
const _portalAuraMat = new THREE.MeshStandardMaterial({ color: 0x8800ff, emissive: 0xaa00ff, emissiveIntensity: 2.0, transparent: true, opacity: 0, roughness: 0.1 });

// 3 orbiting purple rings around player
const _auraRings = [1.0, 1.5, 2.0].map((r, i) => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 32), _portalAuraMat.clone());
  ring.rotation.x = (i / 3) * Math.PI;
  ring.visible = false;
  player.add(ring);
  return ring;
});

// Ghost people — thin dark humanoid shapes around the scene
const _ghosts = [];
for (let i = 0; i < 14; i++) {
  const g = new THREE.Group();
  const gm = _ghostMat.clone();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), gm);
  head.position.y = 1.85;
  g.add(head);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6), gm);
  body.position.y = 1.0;
  g.add(body);
  const angle = (i / 14) * Math.PI * 2;
  const radius = 15 + Math.random() * 25;
  g.position.set(
    player.position.x + Math.cos(angle) * radius,
    0,
    player.position.z + Math.sin(angle) * radius
  );
  g.userData.angle = angle;
  g.userData.radius = radius;
  g.userData.mat = gm;
  g.visible = false;
  scene.add(g);
  _ghosts.push(g);
}

// Black matter swirl — ring of dark orbs orbiting scene center
const _matterOrbs = [];
for (let i = 0; i < 24; i++) {
  const mm = _matterMat.clone();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.22, 6, 6), mm);
  const a = (i / 24) * Math.PI * 2;
  orb.userData.angle  = a;
  orb.userData.radius = 8 + Math.random() * 6;
  orb.userData.yOff   = (Math.random() - 0.5) * 4;
  orb.userData.speed  = 0.8 + Math.random() * 0.6;
  orb.userData.mat    = mm;
  orb.visible = false;
  scene.add(orb);
  _matterOrbs.push(orb);
}

// Extra purple flood lights that activate during effect
const _floodLights = [-1, 0, 1].map(i => {
  const l = new THREE.PointLight(0x8800ff, 0, 60);
  l.position.set(i * 20, 8, i * 15);
  scene.add(l);
  return l;
});

function _setEffectOpacity(t) {
  // t = 0..1 — effect is immediately visible at t=0 and grows larger + brighter over 2s
  const base = 0.35;                       // minimum visibility from frame 1
  const full = Math.min(1, t);
  const opacity = base + (1 - base) * full; // 0.35 → 1.0

  // Rings: visible immediately, scale up over time
  _auraRings.forEach((r, i) => {
    r.visible = true;
    r.material.opacity = opacity * 0.88;
    const s = 1.0 + full * (0.6 + i * 0.2); // grow 60–100% larger
    r.scale.setScalar(s);
  });

  // Ghosts: appear quickly, fade in fully over 2s
  _ghosts.forEach(g => {
    g.visible = true;
    g.userData.mat.opacity = opacity * 0.6;
    const s = 0.8 + full * 0.5;
    g.scale.setScalar(s);
  });

  // Black matter: start small and grow
  _matterOrbs.forEach(o => {
    o.visible = true;
    o.userData.mat.opacity = opacity * 0.8;
    const s = 0.5 + full * 1.2; // grows from 0.5x to 1.7x
    o.scale.setScalar(s);
  });

  // Flood lights: immediate dim glow → blinding by end
  _floodLights.forEach((l, i) => { l.intensity = (1 + full * 5) * (1 + i * 0.8); });

  // Fog: shifts purple from the start
  scene.fog.color.setRGB(0.05 + full * 0.22, 0, 0.08 + full * 0.3);
}

function _clearEffect() {
  _auraRings.forEach(r => { r.visible = false; });
  _ghosts.forEach(g => { g.visible = false; });
  _matterOrbs.forEach(o => { o.visible = false; });
  _floodLights.forEach(l => { l.intensity = 0; });
  scene.fog.color.setHex(0x050d1a);
}

function checkPortalEntry(dt) {
  if (playerState.dead || _portalTransitioning) return;
  const dx = player.position.x - portalGroup.position.x;
  const dz = player.position.z - portalGroup.position.z;
  const inside = Math.hypot(dx, dz) < 2.2;

  if (!inside) {
    if (_portalEffectActive) { _clearEffect(); _portalEffectActive = false; }
    _portalStandTimer = Math.max(0, _portalStandTimer - dt * 2);
    return;
  }

  // Effect always plays when inside — no unlock required
  _portalStandTimer += dt;
  _portalEffectActive = true;
  playerState.iframes = Math.max(playerState.iframes, 0.2); // invulnerable during 2s portal wait
  const t = Math.min(1, _portalStandTimer / 2.0);
  _setEffectOpacity(t);

  const now = Date.now();

  // Spin aura rings
  _auraRings.forEach((r, i) => {
    r.rotation.x += 0.03 * (i % 2 === 0 ? 1 : -1);
    r.rotation.z += 0.02 * (i + 1);
  });

  // Swirl ghosts inward
  _ghosts.forEach(g => {
    g.userData.angle += 0.008;
    const r = g.userData.radius * (1 - t * 0.4);
    g.position.set(
      portalGroup.position.x + Math.cos(g.userData.angle) * r,
      Math.sin(now / 800 + g.userData.angle) * 0.3,
      portalGroup.position.z + Math.sin(g.userData.angle) * r
    );
    g.rotation.y = -g.userData.angle;
  });

  // Swirl black matter around player
  _matterOrbs.forEach(o => {
    o.userData.angle += o.userData.speed * dt;
    o.position.set(
      player.position.x + Math.cos(o.userData.angle) * o.userData.radius,
      player.position.y + 1.5 + o.userData.yOff + Math.sin(now / 500 + o.userData.angle) * 0.5,
      player.position.z + Math.sin(o.userData.angle) * o.userData.radius
    );
  });

  // Transition only if unlocked (boss defeated)
  if (portalUnlocked && _portalStandTimer >= 2.0 && !_portalTransitioning) {
    _portalTransitioning = true;
    movementLockout = Infinity;
    setTimeout(() => {
      sessionStorage.setItem('bgmAutoStart', '1');
      window.location.href = 'level2.html';
    }, 800);
  }
}

window.addEventListener('keydown', e => {
  if (_debugOpen && e.key === 'Escape') { closeDebugMenu(); e.preventDefault(); }
}, true);

// ── Game Loop ─────────────────────────────────────────────────────────────────

const SPEED      = 8.4;
const CAM_OFFSET = new THREE.Vector3(0, 14, 13);

let lastTime = performance.now();

let movementLockout = 0;
let frameTime = 0; // cached Date.now()/1000 per frame — avoids repeated calls in update loops

function update(dt) {
  frameTime = Date.now() / 1000;
  updateTomeInput(dt);
  if (_humanGunPivot) {
    _gunHoldTimer = Math.max(0, _gunHoldTimer - dt);
    if (_gunHoldTimer === 0) _humanGunPivot.rotation.y += (0 - _humanGunPivot.rotation.y) * Math.min(1, dt * 10);
  }
  if (playerState.dead || choosingTome || choosingPowerUp || waitingToResume) return;
  tickPowerUps(dt);
  playerState.iframes   = Math.max(0, playerState.iframes - dt);
  if (playerState.shaggyMaxCharges > 0 && playerState.shaggyCharges < playerState.shaggyMaxCharges) {
    playerState.shaggyRechargeTimer += dt;
    const _shaggyCD = Math.max(50, 130 - (playerState.shaggyMaxCharges - 1) * 10);
    if (playerState.shaggyRechargeTimer >= _shaggyCD) {
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
    if (CURRENT_LEVEL === 2) player.position.z += playerVel.z * dt;
    else player.position.z = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.z + playerVel.z * dt));
  } else {
    let dx = (movementLockout > 0 || _sharkDragging) ? 0 : touchInput.dx;
    let dz = (movementLockout > 0 || _sharkDragging) ? 0 : touchInput.dz;
    if (movementLockout <= 0 && !_sharkDragging) {
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
      const airMult  = playerY > 0 ? 1 + _perfectStreak * 0.005 : 1.0;
      const effSpeed = SPEED * stormSlow * playerStats.moveSpeed * stunMult * airMult * (onSnow ? 0.7 : onWater ? 1.2 : 1.0);
      document.getElementById('ui').style.color = onWater ? '#44ffcc' : '#aee8ff';
      player.position.x = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.x + dx * effSpeed * dt));
      if (CURRENT_LEVEL === 2) player.position.z += dz * effSpeed * dt;
      else player.position.z = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.z + dz * effSpeed * dt));
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

  // Shipwreck OBB collision — push player out of hull (L2 only)
  if (CURRENT_LEVEL === 2) {
    for (const ship of _l2Ships) {
      const dx = player.position.x - ship.position.x;
      const dz = player.position.z - ship.position.z;
      const ry = -ship.rotation.y;
      // Rotate offset into ship-local space
      const lx =  dx * Math.cos(ry) - dz * Math.sin(ry);
      const lz =  dx * Math.sin(ry) + dz * Math.cos(ry);
      const hx = 5.0, hz = 2.5;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
        // Push out along shortest axis
        const ox = hx - Math.abs(lx), oz = hz - Math.abs(lz);
        let pushLx = 0, pushLz = 0;
        if (ox < oz) pushLx = (lx < 0 ? -ox : ox);
        else         pushLz = (lz < 0 ? -oz : oz);
        // Rotate push back to world space
        player.position.x = ship.position.x + (lx + pushLx) * Math.cos(-ry) - (lz + pushLz) * Math.sin(-ry);
        player.position.z = ship.position.z + (lx + pushLx) * Math.sin(-ry) + (lz + pushLz) * Math.cos(-ry);
      }
    }
  }

  // Jump (P)
  const wantsJump = keys['p'] || touchInput.jump;
  const justPressed = wantsJump && !jumpPressed;
  if (justPressed && _sharkDragging) _dragBreakCount++;
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
        _perfectStreak = Math.min(_perfectStreak + 1, 5);
        _jumpBuffer = 0;
        _perfectCooldown = 0.6; // must wait 0.6s before next perfect jump
        spawnGust(player.position.x, player.position.z, true, playerStats.gustOfWind > 0 && _perfectStreak >= 3);
        // Behind gust: fires on 3rd perfect jump and every one after in succession (requires stacks)
        if (playerStats.gustOfWind > 0 && _perfectStreak >= 3) {
          const velLen = Math.sqrt(playerVel.x*playerVel.x + playerVel.z*playerVel.z) || 1;
          spawnGust(player.position.x - (playerVel.x/velLen)*2, player.position.z - (playerVel.z/velLen)*2,
                    true, true, 0.1);
        }
      } else {
        _perfectStreak = 0;
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
  const _hasL2Targets = CURRENT_LEVEL === 2 && (_ghostPirate || _l2Sharks.length > 0 || _l2Orcas.length > 0 || _l2BeachPirates.length > 0);
  const _hasL3Targets = CURRENT_LEVEL === 3 && (_l3Wight || _l3Enemies.length > 0);
  if ((enemies.length > 0 || boss || _hasL2Targets || _hasL3Targets) && !boomerangInFlight && movementLockout !== Infinity) {
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
  if (CURRENT_LEVEL === 1) {
    updateOrcas(dt);
    updateHumans(dt);
    updateItems(dt);
    updateThinIce(dt);
    updateStorm(dt);
    updateBoss(dt);
  }
  updateFish(dt);  // fish pickups active on all levels
  sepFrame ^= 1;
  updateEnemies(dt);
  updateXpOrbs(dt);
  updateL2Enemies(dt);
  if (CURRENT_LEVEL === 2) updateGhostPirate(dt);
  if (CURRENT_LEVEL === 3) updateL3(dt);
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
  if (pressed(3) && playerState.dead) showOSK();

  // D-pad left/right + left stick — navigate tome and power-up choices
  const goingLeft  = btn(14) || ax < -DEAD_ZONE;
  const goingRight = btn(15) || ax >  DEAD_ZONE;
  if (pressed(14) || (goingLeft  && !_gpPrev._stickLeft))  { keys['a'] = true;  _gpPrev._stickLeft  = true; }
  if (pressed(15) || (goingRight && !_gpPrev._stickRight)) { keys['d'] = true;  _gpPrev._stickRight = true; }
  if (!goingLeft)  { delete keys['a']; _gpPrev._stickLeft  = false; }
  if (!goingRight) { delete keys['d']; _gpPrev._stickRight = false; }

  // On-screen keyboard navigation
  if (oskOpen) {
    if (pressed(12)) { oskRow = Math.max(0, oskRow - 1); renderOSK(); }
    if (pressed(13)) { oskRow = Math.min(OSK_KEYS.length-1, oskRow+1); renderOSK(); }
    if (pressed(14)) { oskCol = Math.max(0, oskCol - 1); renderOSK(); }
    if (pressed(15)) { const rowLen = OSK_KEYS[oskRow].filter(k=>k).length; oskCol = Math.min(rowLen-1, oskCol+1); renderOSK(); }
    if (pressed(0))  oskConfirm();
    if (pressed(1))  { const input = document.getElementById('nameInput'); if(input) input.value=input.value.slice(0,-1); renderOSK(); }
    if (pressed(9))  closeOSK();
    gp.buttons.forEach((b, i) => { _gpPrev[i] = b.pressed; }); // must update before return
    return;
  }

  // Intro screen — D-pad navigates skins, any face/start button dismisses
  if (document.getElementById('introScreen')?.style.display !== 'none') {
    if (pressed(14)) window.introNav?.(-1);
    if (pressed(15)) window.introNav?.(1);
    if (pressed(0) || pressed(1) || pressed(2) || pressed(3) || pressed(9)) {
      const intro = document.getElementById('introScreen');
      if (intro) intro.style.display = 'none';
      if (window.startBGM) window.startBGM(); else window.bgm?.play().catch(() => {});
    }
    gp.buttons.forEach((b, i) => { _gpPrev[i] = b.pressed; });
    return;
  }

  // Any button — resume after tome pick
  if (waitingToResume && !_debugOpen && gp.buttons.some(b => b.pressed)) resumeGame();

  // Start / Options / Plus — retry when dead (always back to level 1)
  if (pressed(9) && playerState.dead) {
    sessionStorage.removeItem('levelProgress');
    sessionStorage.setItem('bgmAutoStart','1');
    location.href = 'index.html?v=' + Date.now();
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
  const _pt = Date.now();
  portalShimmer.rotation.z  += 0.014;
  portalShimmer2.rotation.z -= 0.022;
  portalLight.intensity  = 3.5 + 1.2 * Math.sin(_pt / 180) + 0.5 * Math.sin(_pt / 70);
  portalLight2.intensity = 1.2 + 0.5 * Math.sin(_pt / 250);
  if (_desertPortalShimmer1) {
    _desertPortalShimmer1.rotation.z += 0.011;
    _desertPortalShimmer2.rotation.z -= 0.017;
    _desertPortalLight.intensity = 3.0 + 0.9 * Math.sin(_pt / 200) + 0.4 * Math.sin(_pt / 80);
    _desertPortalDebris.forEach(d => {
      d.userData.angle += d.userData.speed * 0.016;
      d.position.set(
        Math.cos(d.userData.angle) * d.userData.radius,
        2.5 + d.userData.yOff + Math.sin(d.userData.angle * 1.3) * 0.3,
        Math.sin(d.userData.angle) * d.userData.radius * 0.25
      );
      d.rotation.z += 0.03;
    });
  }
  portalDebris.forEach(d => {
    d.userData.angle += d.userData.speed * 0.016;
    d.position.set(
      Math.cos(d.userData.angle) * d.userData.radius,
      2.5 + d.userData.yOff + Math.sin(d.userData.angle * 1.3) * 0.3,
      Math.sin(d.userData.angle) * d.userData.radius * 0.25
    );
    d.rotation.z += 0.04;
  });
  if (_godMode) { _godRing.rotation.z += 0.04; _godRingMat.opacity = 0.4 + 0.2 * Math.sin(Date.now() / 300); }
  checkPortalEntry(dt);
  renderer.render(scene, camera);
}
// Spawn one XP diamond near the player start position
{ const _a = Math.random() * Math.PI * 2, _r = 5 + Math.random() * 15;
  spawnXpOrb(player.position.x + Math.cos(_a) * _r, player.position.z + Math.sin(_a) * _r, 1); }

loop();

// Keep game logic ticking when alt-tabbed so player still takes damage
let _bgTick = null;
let _bgLast = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    _bgLast = performance.now();
    _bgTick = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - _bgLast) / 1000, 0.05);
      _bgLast = now;
      update(dt);
    }, 50);
  } else {
    if (_bgTick) { clearInterval(_bgTick); _bgTick = null; }
    lastTime = performance.now(); // prevent big dt spike on tab return
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  adaptFOV();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
