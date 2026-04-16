// FrostBite — Ice arena, Penguin, Leopard Seals, Skuas

// ── Renderer ──────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050d1a);
scene.fog = new THREE.FogExp2(0x0a1a2e, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ── Lighting ──────────────────────────────────────────────────────────────────

scene.add(new THREE.AmbientLight(0x2255aa, 0.6));

const sun = new THREE.DirectionalLight(0xaaddff, 1.4);
sun.position.set(15, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
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

function buildMountain(cx, cz) {
  const rockMat  = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9 });
  const snowMat  = new THREE.MeshStandardMaterial({ color: 0xeef4ff, roughness: 1.0 });
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
    // Snow cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, h * 0.3, 8), snowMat);
    cap.position.set(x, h * 0.87, z);
    scene.add(cap);
  });
  // Rocky base boulders
  for (let i = 0; i < 12; i++) {
    const bx = cx + (Math.random() - 0.5) * 30;
    const bz = cz + (Math.random() - 0.5) * 30;
    const bs = Math.random() * 2 + 1;
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(bs, 0), rockMat);
    boulder.position.set(bx, bs * 0.5, bz);
    boulder.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(boulder);
  }
}
buildMountain(-72, -72);

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

const SNOW_COUNT = 600;
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

// ── Models ────────────────────────────────────────────────────────────────────

function buildPenguin() {
  const g = new THREE.Group();
  const black  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const white  = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), black);
  body.scale.set(1, 1.3, 1); body.position.y = 0.65; body.castShadow = true;
  g.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), white);
  belly.scale.set(1, 1.2, 0.55); belly.position.set(0, 0.63, 0.3);
  g.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), black);
  head.position.y = 1.38; head.castShadow = true;
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

function buildSeal() {
  const g = new THREE.Group();
  const darkGray = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8 });
  const lightGray = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.9 });
  const spotMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.9 });

  // Main body — long and low
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), darkGray);
  body.scale.set(2.2, 0.7, 0.9); body.position.y = 0.42; body.castShadow = true;
  g.add(body);

  // Belly
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), lightGray);
  belly.scale.set(1.8, 0.5, 0.6); belly.position.set(0, 0.38, 0.3);
  g.add(belly);

  // Spots on body
  [[-0.3, 0.6, 0.2], [0.2, 0.55, -0.25], [0.6, 0.65, 0.1], [-0.7, 0.6, -0.1]].forEach(([x,y,z]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), spotMat);
    s.scale.set(1.5, 0.3, 1.5); s.position.set(x, y, z);
    g.add(s);
  });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), darkGray);
  head.scale.set(1.1, 0.9, 1.0); head.position.set(1.4, 0.58, 0); head.castShadow = true;
  g.add(head);

  // Snout
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lightGray);
  snout.scale.set(1.0, 0.7, 0.8); snout.position.set(1.78, 0.52, 0);
  g.add(snout);

  // Eyes
  [-0.18, 0.18].forEach(z => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    eye.position.set(1.6, 0.68, z); g.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    glint.position.set(1.65, 0.7, z + 0.04); g.add(glint);
  });

  // Front flippers
  [-1, 1].forEach(side => {
    const flip = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), darkGray);
    flip.scale.set(0.8, 0.18, 1.6); flip.position.set(0.8, 0.15, side * 0.75);
    flip.rotation.y = side * 0.3; g.add(flip);
  });

  // Tail flippers
  [-1, 1].forEach(side => {
    const flip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), darkGray);
    flip.scale.set(0.6, 0.15, 1.4); flip.position.set(-1.3, 0.18, side * 0.5);
    flip.rotation.y = side * 0.5; g.add(flip);
  });

  return g;
}

function buildSkua() {
  const g = new THREE.Group();
  const brown = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
  const darkBrown = new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.9 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xccaa00, roughness: 0.7 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), brown);
  body.scale.set(1.4, 0.8, 1.0); body.position.y = 0; body.castShadow = true;
  g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), darkBrown);
  head.position.set(0.5, 0.15, 0); g.add(head);

  // Beak — hooked
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), yellow);
  beak.rotation.z = -Math.PI / 2; beak.position.set(0.82, 0.1, 0);
  g.add(beak);

  // Wings spread wide
  [-1, 1].forEach(side => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), brown);
    wing.scale.set(0.3, 0.1, 2.2); wing.position.set(0, 0, side * 1.2);
    wing.rotation.x = side * 0.15;
    g.add(wing);

    // Wing tip darker
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), darkBrown);
    tip.scale.set(0.25, 0.08, 0.8); tip.position.set(-0.1, -0.05, side * 2.2);
    g.add(tip);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 6), darkBrown);
  tail.rotation.z = Math.PI / 2; tail.position.set(-0.7, -0.05, 0);
  g.add(tail);

  return g;
}

// ── Player ────────────────────────────────────────────────────────────────────

// Wrapper group controls position/rotation; model inside is pre-rotated 180°
const player = new THREE.Group();
const penguinMesh = buildPenguin();
penguinMesh.rotation.y = Math.PI; // face forward correctly
player.add(penguinMesh);
scene.add(player);

const playerState = { hp: 1, maxHp: 1, iframes: 0, dead: false };

// ── Player Stats (tome upgrades) ──────────────────────────────────────────────

const playerStats = {
  damage:       1.0,   // multiplier
  critChance:   0,     // 0–1
  attackRate:   1.0,   // multiplier on cooldown (lower = faster)
  projCount:    1,     // snowballs per shot
  projExtraChance: 0, // fractional extra projectile chance
  projSize:     1.0,
  projSpeed:    1.0,
  maxShield:    0,
  shield:       0,
  shieldRecharge: 0,
  evasion:      0,     // 0–1 dodge chance
  lifesteal:    0,     // 0–1 chance to restore shield on hit
  moveSpeed:    1.0,
  pickupRadius: 0.7,
  knockback:    0,
  cursed:       0,
};

const tomeStacks = {};

const TOME_DEFS = [
  { id:'damage',     name:'Damage Tome',           emoji:'⚔️',  color:'#ff6644', desc:'+10% snowball damage',      apply: s => { s.damage     *= 1.1; } },
  { id:'precision',  name:'Precision Tome',        emoji:'🎯',  color:'#ffaa22', desc:'+5% critical hit chance',   apply: s => { s.critChance  = Math.min(0.9, s.critChance+0.05); } },
  { id:'cooldown',   name:'Cooldown Tome',         emoji:'⚡',  color:'#ffdd44', desc:'-6% attack cooldown',       apply: s => { s.attackRate *= 0.94; } },
  { id:'quantity',   name:'Quantity Tome',         emoji:'❄️',  color:'#aaddff', desc:'+1 snowball (50% less each stack)', apply: (s) => {
    const stacks = tomeStacks['quantity'] || 0;
    if (stacks === 0) { s.projCount += 1; }           // 1st: guaranteed +1 (1→2, +100%)
    else { s.projExtraChance = Math.min(1, (s.projExtraChance||0) + 0.5); } // 2nd+: +50% chance
  }},
  { id:'size',       name:'Size Tome',             emoji:'🔮',  color:'#cc88ff', desc:'+20% projectile size',      apply: s => { s.projSize   *= 1.2; } },
  { id:'projspeed',  name:'Speed Tome',            emoji:'💨',  color:'#88ffcc', desc:'+15% projectile speed',     apply: s => { s.projSpeed  *= 1.15; } },
  { id:'shield',     name:'Shield Tome',           emoji:'🛡️', color:'#44aaff', desc:'+1 shield charge',          apply: s => { s.maxShield += 1; s.shield = s.maxShield; updateHUD(); } },
  { id:'evasion',    name:'Evasion Tome',          emoji:'🌀',  color:'#44ffaa', desc:'+10% dodge chance',         apply: s => { s.evasion    = Math.min(0.7, s.evasion+0.1); } },
  { id:'bloody',     name:'Bloody Tome',           emoji:'🩸',  color:'#ff4466', desc:'+20% lifesteal on hit',     apply: s => { s.lifesteal  = Math.min(1, s.lifesteal+0.2); } },
  { id:'hp',         name:'HP Tome',               emoji:'💙',  color:'#2266ff', desc:'+1 max HP',                 apply: s => { s.maxShield += 1; s.shield = s.maxShield; playerState.maxHp+=1; playerState.hp+=1; updateHUD(); } },
  { id:'agility',    name:'Agility Tome',          emoji:'🏃',  color:'#aaff44', desc:'+7% movement speed',        apply: s => { s.moveSpeed  *= 1.07; } },
  { id:'attraction', name:'Attraction Tome',       emoji:'🧲',  color:'#ffaa44', desc:'+0.4 pickup radius',        apply: s => { s.pickupRadius += 0.4; } },
  { id:'knockback',  name:'Knockback Tome',        emoji:'💥',  color:'#ff8844', desc:'+1.5 knockback on hit',     apply: s => { s.knockback  += 1.5; } },
  { id:'cursed',     name:'Cursed Tome',           emoji:'💀',  color:'#884400', desc:'Enemies tougher, more drops',apply:s => { s.cursed += 1; } },
  { id:'chaos',      name:'Chaos Tome',            emoji:'🎲',  color:'#ff44ff', desc:'Random tome effect!',        apply: (s, chaos) => chaos() },
];

// ── HUD ───────────────────────────────────────────────────────────────────────

const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none';
document.body.appendChild(hud);

const hpLabel = document.createElement('div');
hpLabel.style.cssText = 'color:#aee8ff;font-family:monospace;font-size:13px;text-shadow:0 0 6px #44aaff';
hpLabel.textContent = 'HP';
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

// XP bar
const xpRow = document.createElement('div');
xpRow.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:4px';
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
hud.appendChild(xpRow);

function updateXPBar() {
  const needed = xpToNext(playerLevel);
  xpLabelEl.textContent = `LVL ${playerLevel} — XP ${playerXP} / ${needed}`;
  xpBarInner.style.width = (playerXP / needed * 100) + '%';
}

function updateHUD() {
  const pct = Math.max(0, playerState.hp / playerState.maxHp) * 100;
  hpBarInner.style.width = pct + '%';
  hpBarInner.style.background = pct > 50 ? '#22ccff' : pct > 25 ? '#ffaa00' : '#ff3300';
  if (playerStats.maxShield > 0) {
    shieldRow.style.display = 'flex';
    shieldBarInner.style.width = (playerStats.shield / playerStats.maxShield * 100) + '%';
  }
}

// ── Enemies ───────────────────────────────────────────────────────────────────

const enemies = [];

function buildPolarBear() {
  const g = new THREE.Group();
  const white  = new THREE.MeshStandardMaterial({ color: 0xf0f0e8, roughness: 0.9 });
  const cream  = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 });
  const black  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

  // Body — large round barrel
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), white);
  body.scale.set(1.6, 1.0, 1.1); body.position.set(0, 0.75, 0); body.castShadow = true;
  g.add(body);

  // Head — round, forward (+X)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 10), white);
  head.position.set(1.1, 0.95, 0); head.castShadow = true;
  g.add(head);

  // Snout — pushed forward
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), cream);
  snout.scale.set(0.9, 0.7, 0.8); snout.position.set(1.55, 0.82, 0);
  g.add(snout);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), black);
  nose.position.set(1.82, 0.88, 0);
  g.add(nose);

  // Eyes
  [-0.22, 0.22].forEach(z => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), black);
    eye.position.set(1.38, 1.08, z); g.add(eye);
  });

  // Ears — round on top of head
  [-0.3, 0.3].forEach(z => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), white);
    ear.position.set(0.95, 1.44, z); g.add(ear);
  });

  // 4 legs
  [[-0.55, 0.9], [-0.55, -0.5], [0.55, 0.9], [0.55, -0.5]].forEach(([x, offZ]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.7, 8), white);
    leg.position.set(x, 0.35, offZ * 0.55);
    leg.castShadow = true; g.add(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), cream);
    paw.scale.set(1.1, 0.5, 1.3); paw.position.set(x, 0.06, offZ * 0.6);
    g.add(paw);
  });

  // Short tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), white);
  tail.position.set(-1.1, 0.85, 0); g.add(tail);

  // Elite aura
  const aura = new THREE.PointLight(0xff8800, 2.5, 10);
  aura.position.y = 1.5; g.add(aura);

  return g;
}

function spawnSeal(hpScale = 1) {
  const angle = Math.random() * Math.PI * 2;
  const elite = Math.random() < 0.05;
  const mesh = elite ? buildPolarBear() : buildSeal();
  mesh.position.set(Math.cos(angle) * 88, 0, Math.sin(angle) * 88);
  scene.add(mesh);
  enemies.push({ mesh, type: 'seal', hp: Math.round((elite ? 120 : 45) * hpScale), elite });
}

function spawnSkua(hpScale = 1) {
  const angle = Math.random() * Math.PI * 2;
  const mesh = buildSkua();
  mesh.position.set(Math.cos(angle) * 140, 7, Math.sin(angle) * 140);
  const elite = Math.random() < 0.05;
  if (elite) makeElite(mesh);
  scene.add(mesh);
  enemies.push({ mesh, type: 'skua', hp: Math.round((elite ? 40 : 20) * hpScale), dropTimer: 3 + Math.random() * 3, state: 'approaching', elite });
}

let sealSpawnTimer = 4;
let skuaSpawnTimer = 4;
let gameTime = 0; // seconds elapsed

function updateEnemies(dt) {
  gameTime += dt;
  // Every 20s the spawn interval shrinks by ~15%, floored at 0.8s / 2s
  const pressure = Math.max(0.3, 1 - (gameTime + 24) / 120);
  sealSpawnTimer -= dt;
  skuaSpawnTimer -= dt;
  const hpScale = 1 + gameTime / 150; // enemies get tankier, slower ramp
  if (sealSpawnTimer <= 0) { spawnSeal(hpScale); sealSpawnTimer = (3.5 + Math.random() * 2) * pressure; }
  if (skuaSpawnTimer <= 0) { spawnSkua(hpScale); skuaSpawnTimer = (7 + Math.random() * 4) * pressure; }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = player.position.x - e.mesh.position.x;
    const dz = player.position.z - e.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (e.type === 'seal') {
      if (dist > 0.1) {
        // Seal-seal separation — push apart without slowing
        let sepX = 0, sepZ = 0;
        for (let k = 0; k < enemies.length; k++) {
          if (k === i || enemies[k].type !== 'seal') continue;
          const ox = e.mesh.position.x - enemies[k].mesh.position.x;
          const oz = e.mesh.position.z - enemies[k].mesh.position.z;
          const od = Math.hypot(ox, oz);
          const minDist = e.elite ? 2.5 : 1.6;
          if (od < minDist && od > 0.01) { sepX += (ox / od) * (minDist - od); sepZ += (oz / od) * (minDist - od); }
        }
        e.mesh.position.x += sepX * 0.3;
        e.mesh.position.z += sepZ * 0.3;

        e.mesh.position.x += (dx / dist) * 6.4 * dt;
        e.mesh.position.z += (dz / dist) * 6.4 * dt;
        // Model faces +X — use atan2(-dz, dx) for correct orientation
        e.mesh.rotation.y = Math.atan2(-dz, dx);
      }
      if (dist < 0.7 && playerY < 0.5 && playerState.iframes <= 0) {
        killPlayer();
      }
    }

    if (e.type === 'skua') {
      if (e.state === 'approaching') {
        // Fly in from outside until close to player
        if (dist > 6) {
          e.mesh.position.x += (dx / dist) * 1.5 * dt;
          e.mesh.position.z += (dz / dist) * 1.5 * dt;
        }
        e.mesh.position.y = 7 + Math.sin(Date.now() / 500 + i) * 0.4;
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
  }
}

// ── Bombs ─────────────────────────────────────────────────────────────────────

const bombs = [];
const explosionFX = [];

// ── Snowballs ─────────────────────────────────────────────────────────────────

const snowballs = [];
let attackTimer = 0;
const ATTACK_RATE = 0.8; // seconds between shots
const SNOWBALL_SPEED = 23.4;
const SNOWBALL_DAMAGE = 15;

function findNearestEnemy() {
  let nearest = null, bestDist = Infinity;
  for (const e of enemies) {
    const dx = e.mesh.position.x - player.position.x;
    const dz = e.mesh.position.z - player.position.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < bestDist) { bestDist = d; nearest = e; }
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
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xeef8ff, emissive: 0x88ccff, emissiveIntensity: 0.6, roughness: 0.3 })
  );
  mesh.position.copy(player.position);
  mesh.position.y = 1.0;
  scene.add(mesh);
  snowballs.push({ mesh, vel: dir.multiplyScalar(speed), target });
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

function updateSnowballs(dt) {
  for (let i = snowballs.length - 1; i >= 0; i--) {
    const s = snowballs[i];
    s.mesh.position.addScaledVector(s.vel, dt);

    // Check hit against all enemies
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const dx = s.mesh.position.x - e.mesh.position.x;
      const dz = s.mesh.position.z - e.mesh.position.z;
      if (Math.sqrt(dx*dx + dz*dz) < 1.2 * playerStats.projSize) {
        const isCrit = Math.random() < playerStats.critChance;
        e.hp -= SNOWBALL_DAMAGE * playerStats.damage * (isCrit ? 2 : 1);
        hit = true;
        spawnImpact(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, isCrit);
        // Knockback
        if (playerStats.knockback > 0 && e.mesh) {
          const kDist = Math.sqrt(dx*dx + dz*dz) || 1;
          e.mesh.position.x -= (dx / kDist) * playerStats.knockback;
          e.mesh.position.z -= (dz / kDist) * playerStats.knockback;
        }
        // Lifesteal — restore shield
        if (playerStats.lifesteal > 0 && Math.random() < playerStats.lifesteal && playerStats.shield < playerStats.maxShield) {
          playerStats.shield = Math.min(playerStats.maxShield, playerStats.shield + 1);
          updateHUD();
        }
        if (e.hp <= 0) {
          if (e.elite) spawnMapItem(e.mesh.position.x, e.mesh.position.z);
          if (e.type === 'seal') spawnXpOrb(e.mesh.position.x, e.mesh.position.z, e.elite ? 3 : 1);
          killCount++;
          document.getElementById('killHUD').textContent = `☠ ${killCount}`;
          scene.remove(e.mesh);
          enemies.splice(j, 1);
        }
        break;
      }
    }

    // Remove if hit or out of range
    if (hit || s.mesh.position.distanceTo(player.position) > 12) {
      scene.remove(s.mesh);
      snowballs.splice(i, 1);
    }
  }
}

function spawnImpact(x, y, z, crit = false) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(crit ? 0.6 : 0.4, 8, 8),
    new THREE.MeshBasicMaterial({ color: crit ? 0xffee44 : 0xaaddff, transparent: true, opacity: 0.9 })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
  explosionFX.push({ mesh, flash: null, duration: crit ? 0.35 : 0.2, timer: crit ? 0.35 : 0.2 });
}

function dropBomb(tx, tz, fromY) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6 })
  );
  mesh.position.set(tx, fromY, tz);
  scene.add(mesh);

  // danger circle on ground
  const warnMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 3, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
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
      const pulse = Math.sin(Date.now() / (b.timer * 80 + 20));
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

function explode(x, z) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 })
  );
  mesh.position.set(x, 1.5, z);
  scene.add(mesh);

  // point light flash
  const flash = new THREE.PointLight(0xff6600, 3, 20);
  flash.position.set(x, 2, z);
  scene.add(flash);

  explosionFX.push({ mesh, flash, duration: 0.45, timer: 0.45 });
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
      if (e.flash) scene.remove(e.flash);
      explosionFX.splice(i, 1);
    }
  }
}

// ── Jump ─────────────────────────────────────────────────────────────────────

let playerY  = 0;
let playerVY = 0;
const playerVel = new THREE.Vector3(); // xz velocity, updated each frame
const GRAVITY    = -22;
const JUMP_FORCE =  9;
let jumpPressed  = false;

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
    ax: x + Math.cos(angle)*half, az: z + Math.sin(angle)*half,
    bx: x - Math.cos(angle)*half, bz: z - Math.sin(angle)*half,
    halfWidth: 0.32,
  });
}

// Place cracks — avoid the spawn area near center
// Cracks spread across the full 96-radius map (avoid NW mountain & SE water)
[
  [  8,  3, 6, 0.3], [ -7, -5, 5, 1.1], [  4, -9, 7, 0.0], [-10,  8, 6, 0.7],
  [ 14, -2, 5, 1.4], [ -4, 13, 8, 0.2], [ 10, 10, 6, 0.9], [-15,  0, 7, 0.5],
  [ 28,  5, 7, 0.6], [-28,  8, 6, 1.2], [ 20,-25, 8, 0.4], [-20, 25, 5, 1.0],
  [ 35,-15, 6, 0.8], [-35, 15, 7, 0.3], [ 45,  5, 8, 1.3], [-45,-10, 6, 0.7],
  [  5, 40, 7, 0.1], [ -5,-40, 5, 0.9], [ 30, 35, 6, 1.5], [-30,-35, 8, 0.5],
  [ 55,-30, 7, 0.2], [-55, 30, 6, 1.1], [ 15,-60, 5, 0.6], [-15, 60, 7, 1.4],
  [ 60, 20, 6, 0.8],
].forEach(([x, z, len, ang]) => spawnCrack(x, z, len, ang));

// ── Snowstorm ─────────────────────────────────────────────────────────────────

let stormTriggered = false;
let stormActive    = false;
let stormTimer     = 0;
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

function updateStorm(dt) {
  if (!stormTriggered && gameTime >= 30) {
    stormTriggered = true;
    stormActive    = true;
    stormTimer     = 5;
    stormOverlay.style.display = 'block';
    stormLabel.style.display   = 'block';
    // Triple snow speed visually
    for (let i = 0; i < SNOW_COUNT; i++) snowVel[i] *= 3;
  }

  if (stormActive) {
    stormTimer -= dt;
    stormSlow   = 0.85;
    if (stormTimer <= 0) {
      stormActive = false;
      stormSlow   = 1.0;
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=name,kills,level,date&order=kills.desc&limit=10`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

async function submitOnlineScore(name, kills, level) {
  const deviceId  = getDeviceId();
  const cleanName = name.trim().slice(0, 16) || 'Anonymous';
  const date      = new Date().toLocaleDateString();
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
    <div style="font-size:13px;opacity:0.35;margin-bottom:4px">💡 L / P to jump over cracks</div>
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
    <div id="scoreboardEl" style="min-height:60px"><div style="opacity:0.4;font-size:13px">Loading scores...</div></div>
    <button id="retryBtn"
      style="margin-top:8px;background:transparent;border:2px solid #44aaff55;color:#aee8ff;
             font-family:monospace;font-size:18px;padding:10px 36px;cursor:pointer;letter-spacing:3px">RETRY</button>
  `;
  deathScreen.style.display = 'flex';

  // Load leaderboard immediately
  fetchLeaderboard().then(scores => {
    const el = document.getElementById('scoreboardEl');
    if (el) el.innerHTML = renderScoreboard(scores);
  });

  const input  = document.getElementById('nameInput');
  const submit = document.getElementById('submitScore');
  let submitted = false;

  async function doSubmit() {
    if (submitted) return;
    submitted = true;
    submit.textContent = 'SAVING...';
    submit.disabled = true;
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
  document.getElementById('retryBtn').addEventListener('click', () => location.reload());
  setTimeout(() => input.focus(), 100);
}

window.addEventListener('keydown', e => {
  const typingName = document.activeElement && document.activeElement.id === 'nameInput';
  if ((e.code === 'Space' || e.key === 'l' || e.key === 'p') && playerState.dead && !typingName) location.reload();
});

function killPlayer() {
  if (playerState.dead) return;
  // Evasion — chance to completely dodge
  if (playerStats.evasion > 0 && Math.random() < playerStats.evasion) {
    playerState.iframes = 0.8;
    return;
  }
  // Shield absorbs hit
  if (playerStats.shield > 0) {
    playerStats.shield--;
    playerState.iframes = 1.2;
    updateHUD();
    return;
  }
  playerState.dead = true;
  playerState.hp = 0;
  updateHUD();
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
  display:none; position:fixed; inset:0; z-index:200;
  background:rgba(0,8,24,0.92);
  flex-direction:column; align-items:center; justify-content:center;
  font-family:monospace; color:#aee8ff;
`;
tomeScreen.innerHTML = `
  <div style="font-size:30px;font-weight:bold;letter-spacing:4px;text-shadow:0 0 20px #44aaff;margin-bottom:8px">CHOOSE AN UPGRADE</div>
  <div style="font-size:13px;opacity:0.5;margin-bottom:32px">Pick one tome to carry forward</div>
  <div id="tomeCards" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;max-width:800px"></div>
  <div style="margin-top:28px;font-size:12px;opacity:0.4;letter-spacing:2px">A / D to navigate &nbsp;|&nbsp; L / P to confirm</div>
`;
document.body.appendChild(tomeScreen);

function pickRandomTomes(count) {
  const pool = TOME_DEFS.slice();
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
      <div style="font-size:34px;margin-bottom:10px">${tome.emoji}</div>
      <div style="font-size:15px;font-weight:bold;color:${tome.color};margin-bottom:8px">${tome.name}</div>
      <div style="font-size:12px;opacity:0.75;line-height:1.4">${tome.desc}</div>
      ${stacks > 0 ? `<div style="font-size:11px;opacity:0.45;margin-top:8px">Stack: ${stacks}</div>` : ''}
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

function applyTome(id) {
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
  tomeScreen.style.display = 'none';
  choosingTome = false;
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
  const glow = new THREE.PointLight(0x8833ff, 1.5, 6);
  glow.position.y = 0.5;
  group.add(glow);
  group.position.set(x, 1.0, z);
  scene.add(group);
  mapItems.push({ group, orb, glow, bobOffset: Math.random() * Math.PI * 2 });
}

function updateItems(dt) {
  // Elite-drop items (purple orbs) still work
  if (choosingTome) return;
  const t = Date.now() / 1000;
  for (let i = mapItems.length - 1; i >= 0; i--) {
    const item = mapItems[i];
    item.group.position.y = 1.0 + Math.sin(t * 2 + item.bobOffset) * 0.25;
    item.orb.rotation.y += dt * 1.5;
    item.glow.intensity = 1.2 + Math.sin(t * 3 + item.bobOffset) * 0.4;
    const dx = player.position.x - item.group.position.x;
    const dz = player.position.z - item.group.position.z;
    if (Math.sqrt(dx*dx + dz*dz) < playerStats.pickupRadius) {
      scene.remove(item.group);
      mapItems.splice(i, 1);
      showTomeChoice();
      break;
    }
  }
}

// ── XP System ─────────────────────────────────────────────────────────────────

let playerLevel = 1;
let playerXP    = 0;
let killCount   = 0;

function xpToNext(level) {
  // 3, 5, 8, 12, 17, 23 ... using triangular growth
  return 2 + Math.round(level * (level + 1) / 2);
}

const xpOrbs = [];

function spawnXpOrb(x, z, amount = 1) {
  const group = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.15, 0),
    new THREE.MeshStandardMaterial({ color: 0xffee44, emissive: 0xffaa00, emissiveIntensity: 1.6, roughness: 0 })
  );
  group.add(orb);
  const glow = new THREE.PointLight(0xffcc00, 1.2, 5);
  group.add(glow);
  group.position.set(x, 0.5, z);
  scene.add(group);
  xpOrbs.push({ group, orb, glow, amount, bobOffset: Math.random() * Math.PI * 2 });
}

function gainXP(amount) {
  playerXP += amount;
  const needed = xpToNext(playerLevel);
  if (playerXP >= needed) {
    playerXP -= needed;
    playerLevel++;
    updateXPBar();
    showTomeChoice();
  }
  updateXPBar();
}

function updateXpOrbs(dt) {
  if (choosingTome) return;
  const t = Date.now() / 1000;
  for (let i = xpOrbs.length - 1; i >= 0; i--) {
    const orb = xpOrbs[i];
    orb.group.position.y = 0.5 + Math.sin(t * 3 + orb.bobOffset) * 0.15;
    orb.orb.rotation.y += dt * 2;
    orb.glow.intensity = 1.0 + Math.sin(t * 4 + orb.bobOffset) * 0.3;
    const dx = player.position.x - orb.group.position.x;
    const dz = player.position.z - orb.group.position.z;
    if (Math.sqrt(dx*dx + dz*dz) < playerStats.pickupRadius + 0.8) {
      scene.remove(orb.group);
      xpOrbs.splice(i, 1);
      gainXP(orb.amount);
    }
  }
}

// ── Touch Controls ───────────────────────────────────────────────────────────

const touchInput = { dx: 0, dz: 0, jump: false };
let joystickTouchId = null;
const JOY_RADIUS = 55; // max handle travel in px

// ── Left controller — movement joystick ──────────────────────────────────────

const leftPad = document.createElement('div');
leftPad.style.cssText = `
  position:fixed; bottom:40px; left:40px;
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
  position:fixed; bottom:40px; right:40px;
  display:flex; flex-direction:column; align-items:center; gap:14px;
  touch-action:none; user-select:none; -webkit-user-select:none;
`;
document.body.appendChild(rightPad);

function makeActionBtn(label, color) {
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
  rightPad.appendChild(btn);
  return btn;
}

const jumpBtn = makeActionBtn('JUMP', '#aee8ff');
// Future buttons go here: makeActionBtn('DASH', '#ffaa44'), etc.

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

// ── Input ─────────────────────────────────────────────────────────────────────

const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

// ── Game Loop ─────────────────────────────────────────────────────────────────

const SPEED      = 7.8;
const CAM_OFFSET = new THREE.Vector3(0, 14, 13);

let lastTime = performance.now();

function update(dt) {
  updateTomeInput(dt);
  if (playerState.dead || choosingTome) return;
  playerState.iframes = Math.max(0, playerState.iframes - dt);

  // Player movement
  let dx = touchInput.dx;
  let dz = touchInput.dz;
  if (keys['w'] || keys['arrowup'])    dz -= 1;
  if (keys['s'] || keys['arrowdown'])  dz += 1;
  if (keys['a'] || keys['arrowleft'])  dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx !== 0 || dz !== 0) {
    const len = Math.sqrt(dx*dx + dz*dz);
    dx /= len; dz /= len;
    const onSnow  = playerY < 0.3 && isOnSnowPatch(player.position.x, player.position.z);
    const onWater = playerY < 0.3 && isInWater(player.position.x, player.position.z);
    const effSpeed = SPEED * stormSlow * playerStats.moveSpeed * (onSnow ? 0.8 : onWater ? 1.2 : 1.0);
    document.getElementById('ui').style.color = onWater ? '#44ffcc' : '#aee8ff';
    player.position.x = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.x + dx * effSpeed * dt));
    player.position.z = Math.max(-ARENA+1, Math.min(ARENA-1, player.position.z + dz * effSpeed * dt));
    player.rotation.y = Math.atan2(-dx, -dz);
    playerVel.set(dx * effSpeed, 0, dz * effSpeed);
  } else {
    playerVel.set(0, 0, 0);
  }

  // Jump (L or P)
  const wantsJump = keys['l'] || keys['p'] || touchInput.jump;
  if (wantsJump && !jumpPressed && playerY === 0) {
    playerVY = JUMP_FORCE;
  }
  jumpPressed = wantsJump;

  playerVY += GRAVITY * dt;
  playerY  += playerVY * dt;
  if (playerY < 0) { playerY = 0; playerVY = 0; }
  player.position.y = playerY;

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

  // Flash penguin red during iframes
  penguinMesh.visible = !(playerState.iframes > 0 && Math.floor(playerState.iframes * 10) % 2 === 0);

  camera.position.copy(player.position).add(CAM_OFFSET);
  camera.lookAt(player.position);
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

  // Auto-attack
  if (enemies.length > 0) {
    attackTimer -= dt;
    if (attackTimer <= 0) {
      const target = findNearestEnemy();
      if (target) fireSnowball(target);
      attackTimer = ATTACK_RATE * playerStats.attackRate;
    }
  }

  updateBurst(dt);
  updateItems(dt);
  updateXpOrbs(dt);
  updateStorm(dt);
  updateEnemies(dt);
  updateSnowballs(dt);
  updateBombs(dt);
  updateExplosions(dt);
}

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.05);
  lastTime  = now;
  update(dt);
  renderer.render(scene, camera);
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
