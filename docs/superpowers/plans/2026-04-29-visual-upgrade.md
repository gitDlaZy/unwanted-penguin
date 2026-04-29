# Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace procedural Three.js geometry with real GLB models, add post-processing (bloom, SSAO, FXAA), HDRI lighting, mobile touch controls, and portable builds for Windows (Electron), Android, and iOS (Capacitor) — without touching any gameplay logic.

**Architecture:** Vite replaces the CDN + dynamic-script-inject setup; game.js becomes an ES module importing `three` from npm. A new `js/assetLoader.js` loads all GLB/HDRI assets asynchronously before `loop()` starts. Post-processing is wired in by replacing `renderer.render()` with `composer.render()` at line 7000.

**Tech Stack:** Three.js 0.160.0 (npm), Vite 5, nipplejs 0.10, Electron 28, electron-builder 24, @capacitor/core + android + ios 5

---

## File Map

| File | Status | Purpose |
|---|---|---|
| `package.json` | Create | deps + all build scripts |
| `vite.config.js` | Create | multi-page build (index / level2 / level3) |
| `js/assetLoader.js` | Create | async GLB + HDRI loader, exports `assets` + `loadAllAssets()` |
| `js/postProcessing.js` | Create | EffectComposer setup, exports `composer` + `initPostProcessing()` |
| `js/touchControls.js` | Create | nipplejs joystick + buttons, injects into `keys` object |
| `main.js` | Create | Electron entry (desktop window, F11 fullscreen) |
| `capacitor.config.json` | Create | Capacitor app config |
| `public/models/` | Create | GLB assets (downloaded manually per Task 5) |
| `public/textures/` | Create | floor texture + normal maps (downloaded manually per Task 11) |
| `public/hdri/` | Create | HDRI .hdr file (downloaded manually per Task 13) |
| `index.html` | Modify | remove CDN + dynamic inject → static module script |
| `level2.html` | Modify | same |
| `level3.html` | Modify | same |
| `game.js` | Modify | add imports, swap render call, swap builder fns, add props, call loadAllAssets |

---

## Task 1: Create package.json and install dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "unwanted-penguin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start:desktop": "electron .",
    "build:desktop": "electron-builder --win portable",
    "build:android": "cap sync && cap open android",
    "build:ios": "cap sync && cap open ios"
  },
  "dependencies": {
    "nipplejs": "^0.10.1",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@capacitor/android": "^5.0.0",
    "@capacitor/cli": "^5.0.0",
    "@capacitor/core": "^5.0.0",
    "@capacitor/ios": "^5.0.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `package-lock.json` generated. No errors.

- [ ] **Step 3: Verify Three.js installed**

```bash
ls node_modules/three/build/
```

Expected: `three.module.js` present.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add package.json with all visual upgrade deps"
```

---

## Task 2: Create Vite config

**Files:**
- Create: `vite.config.js`

- [ ] **Step 1: Create vite.config.js**

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index:  resolve(__dirname, 'index.html'),
        level2: resolve(__dirname, 'level2.html'),
        level3: resolve(__dirname, 'level3.html'),
      }
    }
  },
  assetsInclude: ['**/*.glb', '**/*.hdr'],
  server: { open: true }
});
```

- [ ] **Step 2: Verify Vite binary exists**

```bash
./node_modules/.bin/vite --version
```

Expected: version string like `vite/5.x.x`

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "chore: add Vite config for multi-page build"
```

---

## Task 3: Convert HTML files from CDN inject to static module script

Each HTML currently loads Three.js from CDN (line 115 in index.html, line 45 in level2.html) and injects game.js dynamically. We replace both with a single static `<script type="module" src="/game.js">`.

**Files:**
- Modify: `index.html`
- Modify: `level2.html`
- Modify: `level3.html`

- [ ] **Step 1: In index.html — remove CDN Three.js script tag (line 115)**

Find and remove:
```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
```

- [ ] **Step 2: In index.html — replace the dynamic game.js injection (lines 224-226) with a static module script**

Find:
```js
    const s = document.createElement('script');
    s.src = 'game.js?t=' + Date.now();
    document.body.appendChild(s);
```

Replace with (still inside the existing `<script>` block — leave surrounding code intact):
```js
    // game.js is loaded as ES module below; no dynamic injection needed
```

Then add at the very bottom of `<body>`, just before `</body>`:
```html
  <script type="module" src="/game.js"></script>
```

- [ ] **Step 3: In level2.html — remove CDN Three.js script tag (line 45)**

Find and remove:
```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
```

- [ ] **Step 4: In level2.html — find and replace dynamic game.js injection**

Find:
```js
    s.src = 'game.js?t=' + Date.now();
    document.body.appendChild(s);
```

Replace the two lines with:
```js
    // game.js loaded as module below
```

Add at bottom of `<body>`:
```html
  <script type="module" src="/game.js"></script>
```

- [ ] **Step 5: Repeat Step 3-4 for level3.html** (same pattern — remove CDN, remove dynamic inject, add module script)

- [ ] **Step 6: Commit**

```bash
git add index.html level2.html level3.html
git commit -m "chore: replace CDN Three.js + dynamic inject with Vite module setup"
```

---

## Task 4: Convert game.js to ES module

**Files:**
- Modify: `game.js` (top 2 lines only)

- [ ] **Step 1: Add Three.js import at the very top of game.js (before line 1)**

Open game.js and prepend:
```js
import * as THREE from 'three';
```

The first two lines of game.js should now be:
```js
import * as THREE from 'three';
// Unwanted Penguin — shared engine for all levels
```

- [ ] **Step 2: Start dev server and verify game loads**

```bash
npm run dev
```

Open browser at the URL shown (usually `http://localhost:5173`). 

Expected: Game intro screen loads. No console errors about THREE being undefined.

- [ ] **Step 3: Check level 2 and level 3 also load**

Navigate to `http://localhost:5173/level2.html` and `http://localhost:5173/level3.html`.

Expected: Both load without errors (may need to dismiss intro and check the 3D scene renders).

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: convert game.js to ES module with npm Three.js"
```

---

## Task 5: Create asset folder structure and download GLB models

This task is manual — you download free GLB files and place them at the correct paths. No code changes.

**Files:**
- Create: `public/models/` (folder)
- Create: `public/textures/` (folder)
- Create: `public/hdri/` (folder)

- [ ] **Step 1: Create the folder structure**

```bash
mkdir -p public/models public/textures public/hdri
```

- [ ] **Step 2: Download GLB models**

Go to **https://quaternius.com/packs/ultimateanimals.html** → download the free pack.
Extract and copy these files (rename as shown):

| Source file | Save as |
|---|---|
| Penguin (any penguin GLB) | `public/models/penguin.glb` |
| Seal or Walrus GLB | `public/models/seal.glb` |
| Any seabird / gull GLB | `public/models/bird.glb` |

For Krilly (boss): go to **https://sketchfab.com/search?q=crab&features=downloadable&type=models** → filter Free → download any low-poly crab → export as GLB → save as `public/models/krill.glb`

For map props:
| Description | Save as |
|---|---|
| Ice rock / boulder GLB (search Sketchfab "ice rock free") | `public/models/ice_chunk.glb` |
| Coral GLB (search "coral free") | `public/models/coral.glb` |
| Lava rock GLB (search "lava rock free") | `public/models/lava_rock.glb` |

- [ ] **Step 3: Verify files exist**

```bash
ls public/models/
```

Expected: `penguin.glb  seal.glb  bird.glb  krill.glb  ice_chunk.glb  coral.glb  lava_rock.glb`

- [ ] **Step 4: Commit**

```bash
git add public/
git commit -m "assets: add GLB model files for visual upgrade"
```

---

## Task 6: Build asset loader module

**Files:**
- Create: `js/assetLoader.js`
- Modify: `game.js` (end of file — wrap `loop()` call)

- [ ] **Step 1: Create js/assetLoader.js**

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

function loadGLB(url) {
  return new Promise((resolve, reject) =>
    loader.load(url, gltf => resolve(gltf.scene), undefined, reject)
  );
}

export const assets = {};

export async function loadAllAssets() {
  const results = await Promise.all([
    loadGLB('/models/penguin.glb'),
    loadGLB('/models/seal.glb'),
    loadGLB('/models/bird.glb'),
    loadGLB('/models/krill.glb'),
    loadGLB('/models/ice_chunk.glb'),
    loadGLB('/models/coral.glb'),
    loadGLB('/models/lava_rock.glb'),
  ]);
  [
    assets.penguin,
    assets.seal,
    assets.bird,
    assets.krill,
    assets.iceChunk,
    assets.coral,
    assets.lavaRock,
  ] = results;
}
```

- [ ] **Step 2: Add import to top of game.js (after the THREE import)**

```js
import { assets, loadAllAssets } from './js/assetLoader.js';
```

- [ ] **Step 3: Find the end of game.js (around line 7006) and wrap loop() with asset loading**

Find:
```js
loop();
```

Replace with:
```js
(async () => {
  const loadingEl = document.createElement('div');
  loadingEl.id = 'assetLoading';
  loadingEl.style.cssText = 'position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;background:rgba(2,8,20,0.97);font-family:monospace;font-size:20px;color:#44aaff;letter-spacing:4px';
  loadingEl.textContent = 'LOADING...';
  document.body.appendChild(loadingEl);

  await loadAllAssets();

  loadingEl.remove();
  loop();
})();
```

- [ ] **Step 4: Test in browser — loading screen appears then disappears**

```bash
npm run dev
```

Expected: "LOADING..." overlay appears briefly, then the normal intro screen shows. No console errors.

- [ ] **Step 5: Commit**

```bash
git add js/assetLoader.js game.js
git commit -m "feat: async GLB asset loader with loading gate before game loop"
```

---

## Task 7: Replace penguin player model with GLB

**Files:**
- Modify: `game.js` — replace `buildPenguin()` body (lines 1591-~1645)

- [ ] **Step 1: Replace the body of buildPenguin() in game.js**

Find the entire `function buildPenguin() { ... }` block (lines 1591–1645 approx) and replace its body with:

```js
function buildPenguin() {
  const clone = assets.penguin.clone();
  clone.scale.setScalar(0.9);
  clone.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  clone.userData.wings = [];
  clone.userData.feet = [];
  clone.userData.animPhase = Math.random() * Math.PI * 2;
  return clone;
}
```

- [ ] **Step 2: Test — penguin appears in game with GLB model**

```bash
npm run dev
```

Dismiss intro. Expected: player character is the downloaded penguin GLB model, positioned correctly on the floor. Movement still works.

If the model is too big or too small, adjust `clone.scale.setScalar(X)` — target: model height roughly 1.5 units.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: replace procedural penguin with GLB model"
```

---

## Task 8: Replace seal enemy model with GLB

**Files:**
- Modify: `game.js` — replace `buildSeal()` body (lines 2569–2612)

- [ ] **Step 1: Replace body of buildSeal() in game.js**

Find `function buildSeal() { ... }` and replace its body with:

```js
function buildSeal() {
  const clone = assets.seal.clone();
  clone.scale.setScalar(1.1);
  clone.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  clone.userData.bodyBob = { amp: 0.07, speed: 4 };
  clone.userData.animPhase = Math.random() * Math.PI * 2;
  return clone;
}
```

- [ ] **Step 2: Test — seals appear as GLB models**

```bash
npm run dev
```

Wait for seals to spawn (within ~5 seconds of gameplay). Expected: seals are the downloaded GLB, move correctly toward player, hitboxes still work (player takes damage on contact).

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: replace procedural seal with GLB model"
```

---

## Task 9: Replace skua and Krilly boss with GLBs

**Files:**
- Modify: `game.js` — replace `buildSkua()` (lines 2614–2645) and `buildKrill()` (lines 3366–3415)

- [ ] **Step 1: Replace body of buildSkua()**

Find `function buildSkua() { ... }` and replace its body with:

```js
function buildSkua() {
  const clone = assets.bird.clone();
  clone.scale.setScalar(0.5);
  clone.traverse(c => {
    if (c.isMesh) { c.castShadow = true; }
  });
  clone.userData.bodyBob = { amp: 0.06, speed: 5 };
  clone.userData.animPhase = Math.random() * Math.PI * 2;
  return clone;
}
```

- [ ] **Step 2: Replace body of buildKrill()**

Find `function buildKrill() { ... }` and replace its body with:

```js
function buildKrill() {
  const g = new THREE.Group();
  const clone = assets.krill.clone();
  clone.scale.setScalar(1.0);
  clone.traverse(c => {
    if (c.isMesh) { c.castShadow = true; }
  });
  g.add(clone);
  const glow = new THREE.PointLight(0xff2255, 3, 12);
  glow.position.set(0, 1, 0);
  g.add(glow);
  g.userData.legs = [];
  g.userData.animPhase = Math.random() * Math.PI * 2;
  return g;
}
```

- [ ] **Step 3: Test skuas (Level 1) and boss (Level 1 — spawns after ~2 minutes of gameplay)**

For quick boss test, open browser console and run: `spawnBoss(5, 5)` (if `spawnBoss` is globally accessible). Expected: boss appears as crab GLB model with pink glow.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: replace skua + Krilly boss with GLB models"
```

---

## Task 10: Add decorative map props per level

Props are placed outside the play area — decorative only, no collision.

**Files:**
- Modify: `game.js` — add prop spawning after the existing level-specific map setup

- [ ] **Step 1: Find the map setup section in game.js**

Search for the comment `// ── Level-specific map setup` (around line 63). After all the existing `if (CURRENT_LEVEL === N)` blocks for map geometry (around line 230), add:

```js
// ── Decorative GLB props (outside play area, no collision) ───────────────────
function spawnProps(modelClone, count, minR, maxR, scaleMin, scaleMax) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const r = minR + Math.random() * (maxR - minR);
    const prop = modelClone.clone();
    prop.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    prop.rotation.y = Math.random() * Math.PI * 2;
    const s = scaleMin + Math.random() * (scaleMax - scaleMin);
    prop.scale.setScalar(s);
    prop.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(prop);
  }
}

if (CURRENT_LEVEL === 1) {
  spawnProps(assets.iceChunk, 24, 55, 80, 0.8, 2.5);
}
if (CURRENT_LEVEL === 2) {
  spawnProps(assets.coral, 20, 55, 80, 0.6, 2.0);
}
if (CURRENT_LEVEL === 3) {
  spawnProps(assets.lavaRock, 22, 55, 80, 0.7, 2.2);
}
```

- [ ] **Step 2: Test — props visible around map edges**

```bash
npm run dev
```

Start game, use WASD to walk toward the edges. Expected: GLB props (ice chunks / coral / lava rocks) visible decorating the perimeter. No FPS drop below 30.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: add decorative GLB props around map perimeter per level"
```

---

## Task 11: Replace floor with textured PBR material

**Files:**
- Modify: `game.js` — replace flat-color floor material
- Manual: download textures from ambientCG

- [ ] **Step 1: Download floor textures (manual)**

Go to **https://ambientcg.com** and download:
- Ice/Snow texture: search "Ice001" → download 1K PNG → save `public/textures/ice_color.jpg` (color), `public/textures/ice_normal.jpg` (normal)
- Dark stone: search "Ground025" → save `public/textures/stone_color.jpg`, `public/textures/stone_normal.jpg`
- Lava/cracked: search "Lava004" → save `public/textures/lava_color.jpg`, `public/textures/lava_normal.jpg`

- [ ] **Step 2: Add texture loading to js/assetLoader.js**

Add at top of assetLoader.js:
```js
const texLoader = new THREE.TextureLoader();
function loadTex(url) { return new Promise(r => texLoader.load(url, r)); }
```

Add to the `loadAllAssets()` Promise.all array:
```js
    loadTex('/textures/ice_color.jpg'),
    loadTex('/textures/ice_normal.jpg'),
    loadTex('/textures/stone_color.jpg'),
    loadTex('/textures/stone_normal.jpg'),
    loadTex('/textures/lava_color.jpg'),
    loadTex('/textures/lava_normal.jpg'),
```

Add to the destructured results:
```js
    assets.iceTex,      assets.iceNormal,
    assets.stoneTex,    assets.stoneNormal,
    assets.lavaTex,     assets.lavaNormal,
```

- [ ] **Step 3: In game.js — find the floor material (L1 around line 78) and replace**

Find (L1 floor):
```js
    new THREE.MeshStandardMaterial({ color: 0x6ab8d4, roughness: 0.05, metalness: 0.4 })
```

Replace with:
```js
    (() => {
      const m = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 });
      m.map = assets.iceTex; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(40,40);
      m.normalMap = assets.iceNormal; m.normalMap.wrapS = m.normalMap.wrapT = THREE.RepeatWrapping; m.normalMap.repeat.set(40,40);
      m.normalScale.set(0.6, 0.6);
      return m;
    })()
```

- [ ] **Step 4: For L2 and L3, find their floor geometry and apply stone/lava textures**

Search game.js for L2 and L3 floor mesh creation and apply the same pattern using `assets.stoneTex` / `assets.stoneNormal` for L2 and `assets.lavaTex` / `assets.lavaNormal` for L3.

- [ ] **Step 5: Test — floor has texture instead of flat color**

```bash
npm run dev
```

Expected: L1 floor shows ice texture with visible surface detail. Move camera (or adjust camera angle in code) to verify texture tiling looks good.

- [ ] **Step 6: Commit**

```bash
git add js/assetLoader.js game.js public/textures/
git commit -m "feat: PBR floor textures with normal maps per level"
```

---

## Task 12: Add post-processing pipeline

**Files:**
- Create: `js/postProcessing.js`
- Modify: `game.js` — import and use composer, replace render call

- [ ] **Step 1: Create js/postProcessing.js**

```js
import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass }         from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass }       from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader }       from 'three/addons/shaders/FXAAShader.js';

export let composer;

// Per-level post-processing presets
const PRESETS = {
  1: { bloomStrength: 1.2, bloomRadius: 0.5, bloomThreshold: 0.3, ssaoRadius: 8,  ssaoMinDistance: 0.002, ssaoMaxDistance: 0.1  },
  2: { bloomStrength: 0.5, bloomRadius: 0.4, bloomThreshold: 0.5, ssaoRadius: 12, ssaoMinDistance: 0.005, ssaoMaxDistance: 0.15 },
  3: { bloomStrength: 0.9, bloomRadius: 0.6, bloomThreshold: 0.35,ssaoRadius: 10, ssaoMinDistance: 0.003, ssaoMaxDistance: 0.12 },
};

export function initPostProcessing(renderer, scene, camera, level, qualityTier) {
  const preset = PRESETS[level] || PRESETS[1];
  composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(scene, camera));

  // SSAO — skip on low-quality tier (mobile low-end)
  if (qualityTier !== 'low') {
    const ssao = new SSAOPass(scene, camera, renderer.domElement.width, renderer.domElement.height);
    ssao.kernelRadius  = preset.ssaoRadius;
    ssao.minDistance   = preset.ssaoMinDistance;
    ssao.maxDistance   = preset.ssaoMaxDistance;
    composer.addPass(ssao);
  }

  // Bloom
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
    preset.bloomStrength,
    preset.bloomRadius,
    preset.bloomThreshold
  );
  composer.addPass(bloom);

  // FXAA anti-aliasing
  const fxaa = new ShaderPass(FXAAShader);
  fxaa.uniforms['resolution'].value.set(
    1 / renderer.domElement.width,
    1 / renderer.domElement.height
  );
  composer.addPass(fxaa);

  composer.addPass(new OutputPass());

  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight);
    fxaa.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  });
}
```

- [ ] **Step 2: Add import to top of game.js (after existing imports)**

```js
import { composer, initPostProcessing } from './js/postProcessing.js';
```

- [ ] **Step 3: In game.js — after the renderer is set up (around line 45) and before loop(), call initPostProcessing**

In the async IIFE at the bottom (from Task 6), after `await loadAllAssets()` and before `loop()`, add:

```js
  initPostProcessing(renderer, scene, camera, CURRENT_LEVEL, detectQualityTier());
```

(`detectQualityTier` is added in Task 15. For now, pass `'high'` as a placeholder.)

- [ ] **Step 4: Find renderer.render() call at line 7000 in game.js and replace**

Find:
```js
  renderer.render(scene, camera);
```

Replace with:
```js
  composer.render();
```

- [ ] **Step 5: Test — game renders with bloom and SSAO**

```bash
npm run dev
```

Expected: visible glow on the ice floor (L1), objects have subtle ambient shadows where they meet the floor. FPS should stay above 30 on desktop.

- [ ] **Step 6: Commit**

```bash
git add js/postProcessing.js game.js
git commit -m "feat: post-processing pipeline — bloom, SSAO, FXAA per level"
```

---

## Task 13: Add HDRI environment map

**Files:**
- Modify: `js/assetLoader.js` — add HDRI load
- Modify: `game.js` — apply env map to scene

- [ ] **Step 1: Download HDRI (manual)**

Go to **https://polyhaven.com/hdris** → filter by night/dark (for L1 night sky feel) → download 1K .hdr → save as `public/hdri/night.hdr`.

- [ ] **Step 2: Add HDRI loader to js/assetLoader.js**

Add import at top:
```js
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
```

Add to `loadAllAssets()`:
```js
  const hdriLoader = new RGBELoader();
  assets.envMap = await new Promise(r => hdriLoader.load('/hdri/night.hdr', r));
  assets.envMap.mapping = THREE.EquirectangularReflectionMapping;
```

- [ ] **Step 3: In game.js — apply env map after loadAllAssets()**

In the async IIFE at the bottom, after `await loadAllAssets()`, add:

```js
  scene.environment = assets.envMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
```

- [ ] **Step 4: Test — materials show environmental reflections**

```bash
npm run dev
```

Expected: the ice floor and metallic materials show subtle reflections from the HDRI. Models look more grounded and realistic.

- [ ] **Step 5: Commit**

```bash
git add js/assetLoader.js game.js public/hdri/
git commit -m "feat: HDRI environment map for realistic PBR reflections"
```

---

## Task 14: Add skybox per level

**Files:**
- Modify: `game.js` — replace flat `scene.background` colour with per-level gradient canvas texture

Rather than downloading additional skybox assets, we generate a procedural gradient skybox that's much better than a flat colour.

- [ ] **Step 1: Add a createGradientBackground() function in game.js (after the imports)**

```js
function createGradientBackground(topColor, bottomColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}
```

- [ ] **Step 2: Replace the flat scene.background assignments in game.js**

Find and replace the L1 background (line 22):
```js
scene.background = new THREE.Color(0x050d1a);
```
Replace with:
```js
scene.background = createGradientBackground('#010815', '#0a1e3c');
```

Find and replace the L2 background (around line 66):
```js
scene.background = new THREE.Color(0x020c18);
```
Replace with:
```js
scene.background = createGradientBackground('#000408', '#010e20');
```

Find and replace the L3 background (around line 70):
```js
scene.background = new THREE.Color(0x3a1a00);
```
Replace with:
```js
scene.background = createGradientBackground('#1a0800', '#3d1500');
```

- [ ] **Step 3: Test — sky shows gradient instead of flat colour**

```bash
npm run dev
```

Expected: sky visibly fades from dark top to slightly lighter horizon. Much more atmospheric than flat colour.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: procedural gradient skybox per level"
```

---

## Task 15: Add mobile touch controls

**Files:**
- Create: `js/touchControls.js`
- Modify: `game.js` — import and init touch controls

- [ ] **Step 1: Create js/touchControls.js**

```js
import nipplejs from 'nipplejs';

export function initTouchControls(keys) {
  if (!('ontouchstart' in window)) return; // desktop — do nothing

  // Joystick container (left side)
  const joystickZone = document.createElement('div');
  joystickZone.style.cssText = 'position:fixed;left:0;bottom:0;width:200px;height:200px;z-index:5000;';
  document.body.appendChild(joystickZone);

  const joystick = nipplejs.create({
    zone: joystickZone,
    mode: 'static',
    position: { left: '80px', bottom: '80px' },
    color: 'rgba(100,180,255,0.4)',
    size: 120,
  });

  joystick.on('move', (_, data) => {
    const angle = data.angle?.degree ?? 0;
    const force = Math.min(data.force, 1);
    if (force < 0.2) { clearDpad(keys); return; }
    clearDpad(keys);
    if (angle > 45  && angle < 135) { keys['w'] = true; }  // up
    if (angle > 225 && angle < 315) { keys['s'] = true; }  // down
    if (angle <= 45 || angle >= 315) { keys['d'] = true; } // right
    if (angle >= 135 && angle <= 225){ keys['a'] = true; } // left
    // diagonals
    if (angle > 25  && angle < 65)  { keys['w'] = true; keys['d'] = true; }
    if (angle > 115 && angle < 155) { keys['w'] = true; keys['a'] = true; }
    if (angle > 205 && angle < 245) { keys['s'] = true; keys['a'] = true; }
    if (angle > 295 && angle < 335) { keys['s'] = true; keys['d'] = true; }
  });

  joystick.on('end', () => clearDpad(keys));

  function clearDpad(k) {
    delete k['w']; delete k['a']; delete k['s']; delete k['d'];
  }

  // Action buttons (right side)
  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'position:fixed;right:24px;bottom:40px;z-index:5000;display:flex;flex-direction:column;gap:16px;';
  document.body.appendChild(btnContainer);

  function makeBtn(label, key, color) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `width:70px;height:70px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.3);font-family:monospace;font-size:14px;color:#fff;font-weight:bold;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;`;
    btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; }, { passive: false });
    btn.addEventListener('touchend',   e => { e.preventDefault(); delete keys[key]; }, { passive: false });
    return btn;
  }

  btnContainer.appendChild(makeBtn('JUMP', 'p', 'rgba(44,120,200,0.7)'));
  btnContainer.appendChild(makeBtn('PWR',  'l', 'rgba(180,80,40,0.7)'));
}
```

- [ ] **Step 2: Add import to top of game.js**

```js
import { initTouchControls } from './js/touchControls.js';
```

- [ ] **Step 3: Find where keys{} is defined in game.js**

Search for `const keys = {}` or `let keys = {}` and note the line number. Then, in the async IIFE at the bottom, after `await loadAllAssets()`, add:

```js
  initTouchControls(keys);
```

- [ ] **Step 4: Test on mobile (or Chrome DevTools mobile emulation)**

```bash
npm run dev
```

Open Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M) → select a phone preset.

Expected: joystick appears bottom-left, JUMP and PWR buttons appear bottom-right. Dragging joystick moves the penguin. JUMP button makes penguin jump.

- [ ] **Step 5: Commit**

```bash
git add js/touchControls.js game.js
git commit -m "feat: nipplejs touch controls for mobile (desktop unaffected)"
```

---

## Task 16: Performance tier detection and quality toggle HUD

**Files:**
- Create: `js/qualityTier.js`
- Modify: `game.js` — import + call detectQualityTier(), replace placeholder, add HUD button

- [ ] **Step 1: Create js/qualityTier.js**

```js
export function detectQualityTier() {
  // Check for mobile
  const isMobile = navigator.maxTouchPoints > 0;
  if (!isMobile) return 'high';

  // Try to detect GPU capability via renderer string
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 'low';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';

  // Known high-end mobile GPUs
  const highEnd = /Apple GPU|Adreno 6[5-9]|Mali-G7[0-9]|Mali-G[89]/i;
  if (highEnd.test(gpu)) return 'medium'; // medium on mobile even if high-end GPU

  return 'low';
}

export function applyQualityTier(renderer, tier) {
  if (tier === 'low') {
    renderer.setPixelRatio(1);
  } else if (tier === 'medium') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}
```

- [ ] **Step 2: Add import to game.js**

```js
import { detectQualityTier, applyQualityTier } from './js/qualityTier.js';
```

- [ ] **Step 3: In the async IIFE — replace the placeholder 'high' with detectQualityTier()**

Find the initPostProcessing call added in Task 12:
```js
  initPostProcessing(renderer, scene, camera, CURRENT_LEVEL, 'high');
```

Replace with:
```js
  const qualityTier = detectQualityTier();
  applyQualityTier(renderer, qualityTier);
  initPostProcessing(renderer, scene, camera, CURRENT_LEVEL, qualityTier);
```

- [ ] **Step 4: Add quality toggle button to HUD**

In game.js, after the FPS HUD line (search for `fpsHUD`), add:

```js
const qualityBtn = document.createElement('button');
qualityBtn.style.cssText = 'position:fixed;top:92px;left:16px;background:none;border:1px solid #334455;border-radius:4px;padding:2px 7px;font-family:monospace;font-size:10px;color:#6699aa;cursor:pointer';
let _currentTier = 'auto';
qualityBtn.textContent = 'QUALITY: AUTO';
qualityBtn.onclick = () => {
  const tiers = ['auto', 'high', 'medium', 'low'];
  _currentTier = tiers[(tiers.indexOf(_currentTier) + 1) % tiers.length];
  qualityBtn.textContent = 'QUALITY: ' + _currentTier.toUpperCase();
  const effective = _currentTier === 'auto' ? detectQualityTier() : _currentTier;
  applyQualityTier(renderer, effective);
  initPostProcessing(renderer, scene, camera, CURRENT_LEVEL, effective);
};
document.body.appendChild(qualityBtn);
```

- [ ] **Step 5: Test quality toggle**

```bash
npm run dev
```

Expected: "QUALITY: AUTO" button appears in HUD (top-left). Clicking it cycles through AUTO → HIGH → MEDIUM → LOW. Switching to LOW visibly removes SSAO and reduces pixel ratio.

- [ ] **Step 6: Commit**

```bash
git add js/qualityTier.js game.js
git commit -m "feat: auto quality tier detection + manual toggle HUD button"
```

---

## Task 17: Set up Electron portable desktop build

**Files:**
- Create: `main.js`
- Modify: `package.json` — add electron-builder config block

- [ ] **Step 1: Create main.js**

```js
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Unwanted Penguin',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  win.loadFile(join(__dirname, 'dist/index.html'));

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      win.setFullScreen(!win.isFullScreen());
    }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
```

- [ ] **Step 2: Add electron-builder config to package.json**

Add after the `"devDependencies"` block:

```json
  "build": {
    "appId": "com.unwantedpenguin.game",
    "productName": "Unwanted Penguin",
    "files": ["dist/**/*", "main.js"],
    "win": {
      "target": [{ "target": "portable", "arch": ["x64"] }],
      "icon": "public/icon.ico"
    },
    "linux": {
      "target": "AppImage"
    },
    "mac": {
      "target": "dmg"
    }
  }
```

- [ ] **Step 3: Build the web bundle first, then test Electron**

```bash
npm run build
npm run start:desktop
```

Expected: Electron window opens showing the game. F11 toggles fullscreen.

Note: If `dist/index.html` has absolute asset paths that break in Electron, open `vite.config.js` and add `base: './'` to the config object.

- [ ] **Step 4: Commit**

```bash
git add main.js package.json
git commit -m "feat: Electron portable desktop build with F11 fullscreen"
```

---

## Task 18: Set up Capacitor for Android and iOS

**Files:**
- Create: `capacitor.config.json`
- Run: `cap init` + `cap add android` + `cap add ios`

- [ ] **Step 1: Create capacitor.config.json**

```json
{
  "appId": "com.unwantedpenguin.game",
  "appName": "Unwanted Penguin",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": { "launchShowDuration": 0 }
  }
}
```

- [ ] **Step 2: Build web bundle**

```bash
npm run build
```

Expected: `dist/` folder populated.

- [ ] **Step 3: Initialize Capacitor and add platforms**

```bash
npx cap init "Unwanted Penguin" "com.unwantedpenguin.game" --web-dir dist
npx cap add android
npx cap add ios
```

Expected: `android/` and `ios/` folders created.

- [ ] **Step 4: Sync web assets to native projects**

```bash
npx cap sync
```

Expected: dist/ contents copied into android/app/src/main/assets/public/ and ios equivalent.

- [ ] **Step 5: Open in native IDE (you do this part)**

For Android (requires Android Studio installed on your machine):
```bash
npm run build:android
```
In Android Studio: select a device/emulator → click Run ▶

For iOS (requires Mac + Xcode):
```bash
npm run build:ios
```
In Xcode: select your device → click Run ▶

- [ ] **Step 6: Commit**

```bash
git add capacitor.config.json android/ ios/
git commit -m "feat: Capacitor setup for Android and iOS builds"
```

---

## Task 19: Final deploy and verify GitHub Pages

- [ ] **Step 1: Build and verify dist/**

```bash
npm run build
ls dist/
```

Expected: `index.html`, `level2.html`, `level3.html`, `assets/` in dist.

- [ ] **Step 2: Configure Vite base URL for GitHub Pages**

In `vite.config.js`, add `base` to the config:

```js
export default defineConfig({
  base: '/unwanted-penguin/',   // matches your GitHub repo name
  // ... rest of config
});
```

Rebuild:
```bash
npm run build
```

- [ ] **Step 3: Push to GitHub — GitHub Pages serves from master branch root**

Since GitHub Pages is set to master/root, and our `dist/` is in .gitignore, we need to either:
- Add `dist/` to git and push
- OR switch GitHub Pages to serve from the `dist/` folder

Simplest: add dist to git and push master:
```bash
echo "" >> .gitignore  # ensure dist/ is NOT ignored
git add dist/
git commit -m "build: production dist for GitHub Pages"
git push origin master
```

- [ ] **Step 4: Verify live URL**

Wait ~60 seconds after push. Open:
`https://gitdlazy.github.io/unwanted-penguin/`

Expected: game loads with all visual upgrades — textured floor, GLB models, bloom effects, touch controls on mobile.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: final visual upgrade complete — all platforms"
git push origin master
```

---

## Spec Coverage Check

| Spec section | Task(s) |
|---|---|
| GLB models — penguin, seals, skuas, Krilly | Tasks 7–9 |
| Decorative map props per level | Task 10 |
| Floor textures + normal maps | Task 11 |
| Post-processing (SSAO, Bloom, FXAA) | Task 12 |
| Per-level post-proc tuning | Task 12 (PRESETS object) |
| HDRI environment map | Task 13 |
| Skybox per level | Task 14 |
| Mobile touch controls | Task 15 |
| Performance tier detection + toggle | Task 16 |
| Electron portable Windows | Task 17 |
| Capacitor Android + iOS | Task 18 |
| GitHub Pages deploy | Task 19 |
| Vite infrastructure | Tasks 1–4 |
| Asset loading gate | Task 6 |
