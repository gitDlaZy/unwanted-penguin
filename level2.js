'use strict';
// ── Level 2: The Sunken Sea ───────────────────────────────────────────────────

// ── Restore saved progress ────────────────────────────────────────────────────
const _save = JSON.parse(sessionStorage.getItem('levelProgress') || 'null');

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene    = new THREE.Scene();
scene.fog      = new THREE.FogExp2(0x020c18, 0.022);
scene.background = new THREE.Color(0x020c18);

const camera   = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Lighting ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x112244, 0.7));
const sun = new THREE.DirectionalLight(0x8899cc, 0.8);
sun.position.set(30, 60, 20);
sun.castShadow = true;
scene.add(sun);
const underLight = new THREE.PointLight(0x0066aa, 1.2, 80);
underLight.position.set(0, -2, 0);
scene.add(underLight);

// ── Water plane (entire floor) ────────────────────────────────────────────────
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x0a3a6a, emissive: 0x001a44, emissiveIntensity: 0.5,
  roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.88,
});
const waterFloor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), waterMat);
waterFloor.rotation.x = -Math.PI / 2;
waterFloor.position.y = 0.0;
scene.add(waterFloor);

// Deep water glow patches
for (let i = 0; i < 12; i++) {
  const gl = new THREE.PointLight(0x0044aa, 0.6 + Math.random() * 0.5, 18);
  gl.position.set((Math.random()-0.5)*160, -1, (Math.random()-0.5)*160);
  scene.add(gl);
}

// ── Ice Platforms ─────────────────────────────────────────────────────────────
const iceMat      = new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x226688, emissiveIntensity: 0.15, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 });
const icePlatforms = []; // { x, z, r } — safe zones

const ICE_SPOTS = [
  // Central cluster
  { x:  0,  z:  0,  r: 5.0 }, // spawn island
  { x: 12,  z:  3,  r: 2.8 },
  { x: -11, z:  7,  r: 2.2 },
  { x:  5,  z: 14,  r: 3.0 },
  { x: -6,  z:-12,  r: 2.5 },
  // Mid ring
  { x: 22,  z: 10,  r: 2.0 },
  { x: 18,  z:-14,  r: 1.8 },
  { x:-18,  z: 16,  r: 2.2 },
  { x:-20,  z: -8,  r: 1.6 },
  { x:  8,  z:-22,  r: 2.0 },
  { x: -8,  z: 25,  r: 1.8 },
  { x: 30,  z: -4,  r: 1.5 },
  { x:-28,  z:  2,  r: 1.6 },
  { x: 14,  z: 28,  r: 2.0 },
  { x:-14,  z:-24,  r: 1.5 },
  // Stepping stones between shipwrecks
  { x: 35,  z: 20,  r: 1.4 },
  { x: 40,  z: 12,  r: 1.3 },
  { x: 44,  z:  2,  r: 1.5 },
  { x:-32,  z: 28,  r: 1.4 },
  { x:-38,  z: 18,  r: 1.3 },
  { x:-40,  z:  6,  r: 1.2 },
  { x: 28,  z:-28,  r: 1.4 },
  { x: 36,  z:-20,  r: 1.3 },
  { x:-22,  z:-32,  r: 1.5 },
  { x:-30,  z:-22,  r: 1.3 },
  // Outer lone platforms
  { x: 50,  z:  8,  r: 2.5 }, // near shipwreck A
  { x:-46,  z: 22,  r: 2.0 }, // near shipwreck B
  { x: 32,  z:-38,  r: 2.0 }, // near shipwreck C
  { x:-28,  z:-42,  r: 2.2 }, // near shipwreck D
  { x:  2,  z: 44,  r: 1.8 },
];

ICE_SPOTS.forEach(s => {
  const geo  = new THREE.CylinderGeometry(s.r, s.r * 0.9, 0.22, 10);
  const mesh = new THREE.Mesh(geo, iceMat);
  mesh.position.set(s.x, 0.11, s.z);
  mesh.castShadow = true;
  scene.add(mesh);
  icePlatforms.push({ x: s.x, z: s.z, r: s.r });
});

function onIce(x, z) {
  return icePlatforms.some(p => Math.hypot(x - p.x, z - p.z) < p.r - 0.3);
}

// ── Helper: build box ─────────────────────────────────────────────────────────
function box(w, h, d, mat, px, py, pz, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(px, py, pz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// ── Shipwrecks ────────────────────────────────────────────────────────────────
const _woodMat    = new THREE.MeshStandardMaterial({ color: 0x4a2e12, roughness: 0.95 });
const _darkWoodMat= new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.9 });
const _sailMat    = new THREE.MeshStandardMaterial({ color: 0xd4c9a0, roughness: 1.0, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
const _ropeMat    = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1.0 });
const _ironMat    = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.5 });
const _chestMat   = new THREE.MeshStandardMaterial({ color: 0x6a3a10, roughness: 0.8 });
const _goldMat    = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa8800, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.8 });
const _barrelMat  = new THREE.MeshStandardMaterial({ color: 0x5a3010, roughness: 0.9 });
const _flagMat    = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, side: THREE.DoubleSide });
const _skullMat   = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.8 });

function buildShipwreck(gx, gz, rotY, tiltZ, clue) {
  const g = new THREE.Group();
  g.position.set(gx, 0, gz);
  g.rotation.y = rotY;

  // Hull — large flat deck acts as a safe platform
  box(10, 0.8, 5,  _woodMat,    0, 0.4, 0, g);        // main deck
  box(10, 2.2, 0.4,_darkWoodMat,0, 1.5, 2.5, g);      // port wall
  box(10, 2.2, 0.4,_darkWoodMat,0, 1.5,-2.5, g);      // starboard wall
  box(0.4, 2.2, 5, _darkWoodMat, 5, 1.5, 0, g);       // bow wall
  box(0.4, 2.2, 5, _darkWoodMat,-5, 1.5, 0, g);       // stern wall

  // Broken planks — scattered at stern
  [-4.5,-3.5,-2.5].forEach((x, i) => {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 5.5), _woodMat);
    plank.position.set(x, 0.85, 0);
    plank.rotation.z = (i - 1) * 0.18;
    g.add(plank);
  });

  // Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), _darkWoodMat);
  mast.position.set(1.5, 3.8, 0);
  mast.rotation.z = tiltZ;
  g.add(mast);

  // Torn sail
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.2), _sailMat);
  sail.position.set(0, 5.8, 0.6);
  sail.rotation.y = 0.3;
  g.add(sail);

  // Rope lines from mast
  const ropeGeo = new THREE.CylinderGeometry(0.03, 0.03, 4, 4);
  [[-0.6, 0.4], [0.6, -0.3]].forEach(([rx, rz]) => {
    const rope = new THREE.Mesh(ropeGeo, _ropeMat);
    rope.position.set(rx, 4.5, rz);
    rope.rotation.z = 0.5;
    g.add(rope);
  });

  // Jolly Roger flag at top
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4), _ironMat);
  flagPole.position.set(1.5, 7.2 + tiltZ * -3, 0);
  flagPole.rotation.z = tiltZ;
  g.add(flagPole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), _flagMat);
  flag.position.set(1.95, 7.7 + tiltZ * -3, 0);
  flag.rotation.z = tiltZ;
  g.add(flag);
  // Skull on flag
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), _skullMat);
  skull.position.set(1.9, 7.72 + tiltZ * -3, 0.04);
  g.add(skull);

  // Treasure chest
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.42), _chestMat);
  chest.position.set(-1.5, 1.28, 0.8);
  g.add(chest);
  const chestLid = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.42), _chestMat);
  chestLid.position.set(-1.5, 1.6, 0.8);
  chestLid.rotation.x = -0.5;
  g.add(chestLid);
  // Gold coins spilling out
  for (let i = 0; i < 5; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), _goldMat);
    coin.position.set(-1.5 + (Math.random()-0.5)*0.5, 0.86, 0.8 + (Math.random()-0.5)*0.4);
    g.add(coin);
  }

  // Barrels
  [[1.0, 0.6], [-0.5, -0.8], [2.0, -0.5]].forEach(([bx, bz]) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.48, 8), _barrelMat);
    barrel.position.set(bx, 1.08, bz);
    g.add(barrel);
  });

  // Anchor chain hanging off bow
  for (let i = 0; i < 5; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 4, 8), _ironMat);
    link.position.set(5.1, 0.4 - i * 0.28, 0);
    link.rotation.x = i % 2 === 0 ? 0 : Math.PI / 2;
    g.add(link);
  }

  // Pirate clue sign
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4), _darkWoodMat);
  signPost.position.set(-3.0, 1.35, -1.0);
  g.add(signPost);
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.06), _woodMat);
  signBoard.position.set(-3.0, 1.95, -1.0);
  g.add(signBoard);

  // Store clue text for sign interaction
  g.userData.clue = clue;
  g.userData.cluePos = new THREE.Vector3(gx, 0, gz);

  scene.add(g);
  icePlatforms.push({ x: gx, z: gz, r: 6.5 }); // deck is safe from sharks/jellyfish
  return g;
}

const shipwrecks = [
  buildShipwreck( 50,  8,  0.3,  0.12, "X marks the spot — three paces from the mast, one from the chest."),
  buildShipwreck(-46, 22, -0.5, -0.18, "They came from the north. We never saw the storm coming."),
  buildShipwreck( 32,-38,  1.1,  0.22, "The portal was here long before us. Do NOT enter alone."),
  buildShipwreck(-28,-42, -1.8, -0.15, "Captain's log — Day 47: The water whispers at night. We are not the first."),
];

// ── Clue Proximity HUD ────────────────────────────────────────────────────────
const clueEl = document.createElement('div');
clueEl.style.cssText = 'display:none;position:fixed;bottom:50px;left:50%;transform:translateX(-50%);background:rgba(10,5,0,0.88);border:2px solid #aa8833;border-radius:10px;padding:14px 28px;font-family:monospace;font-size:15px;color:#f0d080;text-shadow:0 0 6px #aa7700;pointer-events:none;z-index:9999;text-align:center;max-width:460px';
clueEl.innerHTML = '<span style="color:#aa7733;font-size:11px;letter-spacing:2px;display:block;margin-bottom:5px">📜 PIRATE LOG</span><span id="clueText"></span>';
document.body.appendChild(clueEl);

// ── Jellyfish ─────────────────────────────────────────────────────────────────
const jellyfish = [];
const _jellyBodyMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.55, roughness: 0.1 });
const _jellyTentMat = new THREE.MeshStandardMaterial({ color: 0xaabbff, emissive: 0x3355ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 });

function buildJellyfish(x, z) {
  const g = new THREE.Group();
  // Bell
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), _jellyBodyMat);
  bell.scale.y = 0.65;
  g.add(bell);
  // Tentacles
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.5 + Math.random() * 0.4, 4), _jellyTentMat);
    tent.position.set(Math.cos(a) * 0.15, -0.35, Math.sin(a) * 0.15);
    tent.rotation.x = 0.2 + Math.random() * 0.2;
    g.add(tent);
  }
  g.position.set(x, 0.3, z);
  scene.add(g);
  jellyfish.push({ mesh: g, x, z, angle: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.2 });
}

// Spawn jellyfish in open water (not on ice)
for (let i = 0; i < 28; i++) {
  let jx, jz, tries = 0;
  do {
    jx = (Math.random() - 0.5) * 140;
    jz = (Math.random() - 0.5) * 140;
    tries++;
  } while (onIce(jx, jz) && tries < 20);
  buildJellyfish(jx, jz);
}

let jellySlowTimer = 0;

// ── Sharks ────────────────────────────────────────────────────────────────────
const sharks = [];
const _sharkBodyMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.7 });
const _sharkBellyMat= new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.8 });
const _sharkFinMat  = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.75 });

function buildShark(x, z) {
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.08, 1.6, 6), _sharkBodyMat);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  // Belly strip
  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.28), _sharkBellyMat);
  belly.position.y = -0.1;
  g.add(belly);
  // Dorsal fin (visible above water)
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 4), _sharkFinMat);
  fin.position.set(0, 0.32, 0);
  fin.rotation.z = 0.15;
  g.add(fin);
  // Tail fin
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 4), _sharkFinMat);
  tail.position.set(-0.85, 0.12, 0);
  tail.rotation.z = Math.PI / 2;
  g.add(tail);

  g.position.set(x, 0.12, z);
  scene.add(g);

  // Patrol between two random shipwrecks
  const sw1 = shipwrecks[Math.floor(Math.random() * shipwrecks.length)];
  const sw2 = shipwrecks[Math.floor(Math.random() * shipwrecks.length)];
  sharks.push({
    mesh: g,
    patrolA: new THREE.Vector3(sw1.position.x + (Math.random()-0.5)*12, 0.12, sw1.position.z + (Math.random()-0.5)*12),
    patrolB: new THREE.Vector3(sw2.position.x + (Math.random()-0.5)*12, 0.12, sw2.position.z + (Math.random()-0.5)*12),
    target: 0, // 0=A, 1=B
    chasing: false,
    speed: 5.5 + Math.random() * 2,
  });
}

for (let i = 0; i < 5; i++) buildShark((Math.random()-0.5)*80, (Math.random()-0.5)*80);

// ── Player ────────────────────────────────────────────────────────────────────
const player     = new THREE.Group();
const penguinMesh= new THREE.Group();
penguinMesh.rotation.y = Math.PI;
player.add(penguinMesh);
player.position.set(0, 0, 0);
scene.add(player);

// Restore skin from save
const _activeSkin = _save?.activeSkinVal || localStorage.getItem('playerSkin') || 'normal';

function buildPenguinL2() {
  const black  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const white  = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.7 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), black);
  body.scale.set(1, 1.3, 1); body.position.y = 0.65;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), white);
  belly.scale.set(1, 1.2, 0.55); belly.position.set(0, 0.63, 0.3);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), black);
  head.position.y = 1.38;
  g.add(head);
  [-0.12, 0.12].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), white);
    eye.position.set(x, 1.42, 0.28);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.033, 6, 6), black);
    pupil.position.set(x * 1.05, 1.42, 0.34);
    g.add(pupil);
  });
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 5), orange);
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.36, 0.44);
  g.add(beak);
  const feet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.28), orange);
  feet.position.set(0, 0.04, 0.08);
  g.add(feet);
  return g;
}
penguinMesh.add(buildPenguinL2());

// ── Player State (restored from save) ─────────────────────────────────────────
const playerState = {
  hp:              _save?.hp       ?? 100,
  maxHp:           _save?.maxHp    ?? 100,
  iframes:         0,
  dead:            false,
  shaggyCharges:   _save?.shaggyCharges    ?? 0,
  shaggyMaxCharges:_save?.shaggyMaxCharges ?? 0,
  shaggyRechargeTimer: 0,
};
const playerStats = Object.assign({
  damage: 1.0, critChance: 0, attackRate: 1.0, weaponCooldown: 1.0,
  projCount: 1, projExtraChance: 0, projSize: 1.0, projSpeed: 1.0,
  maxShield: 0, shield: 0, shieldRecharge: 0, shieldDmgTimer: 0,
  evasion: 0, lifesteal: 0, moveSpeed: 1.05, pickupRadius: 0.7,
  knockback: 0, cursed: 0, boomerang: false, iframeDuration: 1.0, shaggyStacks: 0,
}, _save?.stats ?? {});

let playerLevel  = _save?.level        ?? 1;
let pendingTomes = _save?.pendingTomes ?? 0;
const equippedWeapons = new Set(_save?.weapons ?? ['snowball']);
let killCount = 0;

// ── HUD ───────────────────────────────────────────────────────────────────────
const hpHUD      = document.createElement('div');
hpHUD.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:14px;color:#22ccff;text-shadow:0 0 6px #22ccff;pointer-events:none;text-align:center';
document.body.appendChild(hpHUD);

function updateHUD() {
  hpHUD.innerHTML = `❤ ${playerState.hp} / ${playerState.maxHp}` +
    (playerStats.shield > 0 ? ` &nbsp; 🛡 ${Math.ceil(playerStats.shield)}` : '') +
    `  &nbsp; Lv.${playerLevel}`;
  document.getElementById('killHUD').textContent = `☠ ${killCount}`;
}
updateHUD();

// ── God Mode (carried from debug) ─────────────────────────────────────────────
let _godMode = false;

function damagePlayer(amount) {
  if (_godMode || playerState.dead || playerState.iframes > 0) return;
  playerState.hp = Math.max(0, playerState.hp - amount);
  updateHUD();
  if (playerState.hp > 0) { playerState.iframes = 1.0; return; }
  playerState.dead = true;
  penguinMesh.visible = false;
  setTimeout(() => { window.location.href = 'index.html'; }, 2000);
}

// ── Camera ────────────────────────────────────────────────────────────────────
const CAM_OFFSET = new THREE.Vector3(0, 14, 13);
const SPEED = 7.9 * (playerStats.moveSpeed ?? 1.05);

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const keyCodes = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; keyCodes[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; keyCodes[e.code] = false; });

// ── Coord HUD ─────────────────────────────────────────────────────────────────
const coordEl = document.getElementById('coordHUD');
const fpsEl   = document.getElementById('fpsHUD');
let   lastFpsTime = performance.now(), fpsFrames = 0;

// ── Water splash effect ────────────────────────────────────────────────────────
let inWater = false;
const waterWadeLight = new THREE.PointLight(0x0066ff, 0, 5);
player.add(waterWadeLight);

// ── Shark alert ───────────────────────────────────────────────────────────────
const sharkAlertEl = document.createElement('div');
sharkAlertEl.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:monospace;font-size:28px;color:#ff3300;text-shadow:0 0 16px #ff0000;pointer-events:none;z-index:9999';
sharkAlertEl.textContent = '🦈 SHARK!';
document.body.appendChild(sharkAlertEl);

// ── Game loop ─────────────────────────────────────────────────────────────────
let lastTime = performance.now();
let movementLockout = 0;

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.05);
  lastTime  = now;

  // FPS
  fpsFrames++;
  if (now - lastFpsTime >= 1000) {
    fpsEl.textContent = fpsFrames + ' fps';
    fpsFrames = 0; lastFpsTime = now;
  }

  if (playerState.dead) { renderer.render(scene, camera); return; }

  // ── Player movement ─────────────────────────────────────────────────────────
  if (movementLockout <= 0) {
    let mx = 0, mz = 0;
    if (keys['w'] || keys['arrowup'])    mz -= 1;
    if (keys['s'] || keys['arrowdown'])  mz += 1;
    if (keys['a'] || keys['arrowleft'])  mx -= 1;
    if (keys['d'] || keys['arrowright']) mx += 1;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      player.position.x += mx * SPEED * dt;
      player.position.z += mz * SPEED * dt;
      player.rotation.y  = Math.atan2(-mx, -mz);
      penguinMesh.rotation.y = Math.atan2(mx, mz) + Math.PI;
    }
  } else { movementLockout -= dt; }

  // Coord HUD
  coordEl.textContent = `${Math.round(player.position.x)}, ${Math.round(player.position.z)}`;

  // ── Water detection ─────────────────────────────────────────────────────────
  inWater = !onIce(player.position.x, player.position.z);
  player.position.y = inWater ? -0.15 : 0;
  waterWadeLight.intensity = inWater ? 1.2 : 0;

  // Jellyfish slow when in water
  if (jellySlowTimer > 0) jellySlowTimer -= dt;

  // ── Jellyfish update ────────────────────────────────────────────────────────
  let sharkNear = false;
  jellyfish.forEach(j => {
    j.angle += j.speed * dt * 0.4;
    j.mesh.position.x = j.x + Math.cos(j.angle) * 2.5;
    j.mesh.position.z = j.z + Math.sin(j.angle) * 2.5;
    j.mesh.position.y = 0.25 + Math.sin(Date.now() / 800 + j.angle) * 0.18;
    j.mesh.rotation.y += 0.01;

    // Pulse bell
    const pulse = 0.9 + 0.12 * Math.sin(Date.now() / 400 + j.angle);
    j.mesh.children[0].scale.set(pulse, pulse * 0.65, pulse);

    // Damage player on touch
    if (inWater && jellySlowTimer <= 0) {
      const dx = player.position.x - j.mesh.position.x;
      const dz = player.position.z - j.mesh.position.z;
      if (Math.hypot(dx, dz) < 0.7) {
        damagePlayer(8);
        jellySlowTimer = 2.0; // 2s slow window (reuse as debounce)
      }
    }
  });

  // ── Shark update ────────────────────────────────────────────────────────────
  sharks.forEach(sh => {
    const pdx = player.position.x - sh.mesh.position.x;
    const pdz = player.position.z - sh.mesh.position.z;
    const pdist = Math.hypot(pdx, pdz);

    sh.chasing = inWater && pdist < 18;

    let tx, tz, spd;
    if (sh.chasing) {
      tx = player.position.x; tz = player.position.z;
      spd = sh.speed;
      if (pdist < 18) sharkNear = true;
    } else {
      const patrol = sh.target === 0 ? sh.patrolA : sh.patrolB;
      tx = patrol.x; tz = patrol.z; spd = 3.5;
      if (Math.hypot(sh.mesh.position.x - tx, sh.mesh.position.z - tz) < 2) sh.target ^= 1;
    }

    const sdx = tx - sh.mesh.position.x;
    const sdz = tz - sh.mesh.position.z;
    const sdist = Math.hypot(sdx, sdz);
    if (sdist > 0.5) {
      sh.mesh.position.x += (sdx / sdist) * spd * dt;
      sh.mesh.position.z += (sdz / sdist) * spd * dt;
      sh.mesh.rotation.y  = Math.atan2(-sdz, sdx) - Math.PI / 2;
    }
    sh.mesh.position.y = 0.12 + Math.sin(Date.now() / 600 + sh.mesh.position.x) * 0.04;

    // Bite
    if (sh.chasing && pdist < 1.2 && playerState.iframes <= 0 && !_godMode) {
      damagePlayer(35);
    }
  });

  sharkAlertEl.style.display = sharkNear ? 'block' : 'none';

  // Jellyfish slow visual
  if (jellySlowTimer > 0 && inWater) {
    // slight camera wobble as visual feedback
    camera.position.x += (Math.random() - 0.5) * 0.04;
  }

  // iframes tick
  playerState.iframes = Math.max(0, playerState.iframes - dt);

  // ── Clue proximity ──────────────────────────────────────────────────────────
  let nearClue = null;
  shipwrecks.forEach(sw => {
    const dx = player.position.x - sw.position.x;
    const dz = player.position.z - sw.position.z;
    if (Math.hypot(dx, dz) < 9) nearClue = sw.userData.clue;
  });
  if (nearClue) {
    document.getElementById('clueText').textContent = nearClue;
    clueEl.style.display = 'block';
  } else {
    clueEl.style.display = 'none';
  }

  // ── Camera follow ───────────────────────────────────────────────────────────
  const camTarget = player.position.clone().add(CAM_OFFSET);
  camera.position.lerp(camTarget, 0.12);
  camera.lookAt(player.position.x, 0.5, player.position.z);

  // ── Water shimmer ───────────────────────────────────────────────────────────
  waterMat.emissiveIntensity = 0.4 + 0.15 * Math.sin(Date.now() / 1200);

  renderer.render(scene, camera);
}
loop();
