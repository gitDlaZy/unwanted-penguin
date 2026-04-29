# Visual Upgrade Design — Unwanted Penguin
**Date:** 2026-04-29  
**Goal:** Dramatically improve graphics (map + character models) while keeping browser-playable and adding portable builds for Windows, Android, and iOS. Zero game logic changes.

---

## 1. Architecture

Four independent layers added on top of the existing codebase:

| Layer | What changes | Files touched |
|---|---|---|
| Models | Replace procedural geometry with GLB assets | `game.js` (loader setup, group swap) |
| Post-processing | EffectComposer pipeline replaces `renderer.render()` | `game.js` (one call site) |
| Mobile | Touch controls + performance tier detection | `game.js` (input + render quality) |
| Distribution | Electron (Windows), Capacitor (Android + iOS) wrappers | `main.js`, `package.json`, `capacitor.config.json` |

No gameplay code, collision, enemy AI, tome system, or level logic is modified.

---

## 2. Models

### Sources (all free, no license issues)
- [Kenney.nl](https://kenney.nl) — Animal Pack, Nature Kit, Prototype Kit
- [Quaternius](https://quaternius.com) — Ultimate Animals, Ultimate Nature
- [Sketchfab](https://sketchfab.com) — free tier, CC0/CC-BY models

### Asset targets
| Entity | Current | Replacement |
|---|---|---|
| Penguin (player) | Cylinder + sphere shapes | Penguin GLB from Kenney Animal Pack |
| Seals | Basic capsule shapes | Seal/walrus GLB |
| Skuas | Cone + wings | Bird GLB with optional wing animation |
| Krilly (boss) | Box shapes | Crab/lobster GLB from Sketchfab free |
| Map props (L1) | None | Ice chunks, stalagmites GLBs |
| Map props (L2) | None | Coral, rock GLBs |
| Map props (L3) | None | Lava rocks, stalactites GLBs |

### Implementation
- `GLTFLoader` loads all models async before game loop starts
- Loading gate added to existing `introScreen` — game only starts when all assets resolve
- Existing `penguinGroup`, enemy mesh construction replaced with loaded model references
- Skin system (Classic, Evil, FBX 1 & 2) becomes `material.map` swaps on the loaded model
- Hitbox sizes unchanged — models scaled to match existing collision radii
- `AnimationMixer` used if GLB includes animations (idle, walk); otherwise existing procedural bobbing kept

---

## 3. Post-Processing & Lighting

### EffectComposer pipeline (added once in `game.js`)
```
RenderPass → SSAOPass → UnrealBloomPass → FXAAPass → output
```

| Pass | Effect |
|---|---|
| SSAOPass | Ambient occlusion — objects feel grounded, no more "floating" look |
| UnrealBloomPass | Glow on ice, enemy auras, power-up effects |
| FXAAPass | Anti-aliasing (replaces `antialias: false` on renderer) |

### Per-level tuning
| Level | Bloom | SSAO | Palette feel |
|---|---|---|---|
| L1 (ice) | High — icy glow | Medium | Cold, crisp, blue-white |
| L2 (deep) | Low — eerie dark | High | Dark, claustrophobic |
| L3 (cave) | Medium — volcanic | Medium | Warm orange, volcanic |

### Lighting
- Add HDRI environment map (free `.hdr` from [Poly Haven](https://polyhaven.com)) for realistic reflections on all PBR materials
- Existing directional sun + rim light kept, exposure/intensity tuned per level
- Ice floor (L1) benefits most — will show reflections of player and enemies

### Code change
Replace single `renderer.render(scene, camera)` call in game loop with `composer.render()`.

---

## 4. Map

### Floor
- Replace flat-colour `MeshStandardMaterial` with tiled texture + normal map
- L1: Ice/snow texture | L2: Dark stone | L3: Cracked lava
- Source: [ambientCG.com](https://ambientcg.com) (CC0, free)

### Props
- Decorative GLB props scattered outside play area boundaries
- L1: Ice chunks, snow stalagmites | L2: Coral formations, boulders | L3: Lava rocks, cave stalactites
- No collision — purely visual depth

### Skybox / Background
- Replace flat `scene.background` colour with cubemap or procedural gradient
- L1: Night sky with aurora hints | L2: Deep ocean darkness | L3: Volcanic cave ceiling
- Existing fog (`FogExp2`) kept and retuned per level

---

## 5. Mobile (Touch Controls + Performance)

### Touch controls
- **Library:** `nipplejs` — virtual joystick, lightweight, no dependencies
- **Layout:** Left thumb = virtual joystick (movement / WASD), Right thumb = two buttons (Jump = P, Power-up = L)
- **Detection:** `'ontouchstart' in window` — controls only shown on touch devices
- **Existing keyboard input:** unchanged — desktop players unaffected

### Performance tiers
Detected automatically on load via `navigator.maxTouchPoints` + GPU renderer string:

| Tier | Device | Post-processing |
|---|---|---|
| High | Desktop / powerful mobile | Full pipeline (SSAO + Bloom + FXAA) |
| Medium | Mid-range phones | Bloom + FXAA only (SSAO disabled) |
| Low | Low-end phones | FXAA only, reduced pixel ratio |

Player can manually toggle quality in a settings button on the HUD.

---

## 6. Distribution

### Windows — Electron (Portable)
- **`main.js`** — Electron entry: opens borderless window, loads `index.html`, F11 fullscreen
- `"build:desktop": "electron-builder --win portable"`
- Output: `dist/Unwanted Penguin.exe` — ~150MB, download and double-click, no install

### Android — Capacitor
- **Capacitor** wraps the existing HTML/JS game as a native Android app
- `"build:android": "cap sync && cap open android"` — opens Android Studio for final build
- Output: `.apk` for sideloading or Google Play submission
- **Requirement:** Android Studio installed locally on your machine for the final build step (I set up all config, you press Build in Android Studio)

### iOS — Capacitor
- Same Capacitor setup as Android, different target platform
- `"build:ios": "cap sync && cap open ios"` — opens Xcode for final build
- Output: `.ipa` for TestFlight or App Store
- **Requirements:**
  - Mac with Xcode installed (iOS builds cannot be done on Windows/Linux)
  - Apple Developer account ($99/year) for App Store / TestFlight distribution
  - For testing on your own iPhone: free Apple ID is enough via Xcode direct install

### Browser version
- `npm run dev` unchanged — game still runs in browser identically on all devices

---

## 7. Constraints & Risks

| Risk | Mitigation |
|---|---|
| GLB async load delays start | Loading gate on existing intro screen |
| Model scale mismatch breaks hitboxes | Scale models to match existing collision radii, test each |
| Post-processing drops FPS on mobile | Auto-detected performance tier + manual quality toggle |
| Free models don't look right | Curate from multiple sources, test in-game before committing |
| Electron build size | Portable .exe is expected ~150MB — document this for players |
| iOS build requires Mac + Xcode | Document clearly — I configure everything, final build step is on your Mac |
| Touch controls overlap game area | Joystick/buttons use semi-transparent overlay, tuned for small screens |
