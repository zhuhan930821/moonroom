# Moonroom Phase 1.5A — 3D Asset Audit

## Phase 1 baseline

Phase 1 did not contain GLB or GLTF files. Every visible object was constructed directly in React Three Fiber. The three Phase 1.5A targets were `CRT` in `src/scene/Workstation.jsx`, `DrumKit` in `src/scene/DrumKit.jsx`, and `Lounge` in `src/scene/Lounge.jsx`.

| Furniture / environment | Component | Phase 1 geometry |
| --- | --- | --- |
| Vintage CRT, tower, keyboard | `Workstation.jsx` | Rounded boxes, plane and sphere |
| Modern laptop, desk, speakers, music keyboard | `Workstation.jsx` | Rounded boxes and planes |
| Complete drum kit and throne | `DrumKit.jsx` | Cylinders, torus and boxes |
| Reclining lounge | `Lounge.jsx` | Scaled spheres and box |
| Bed, pillows and blanket | `Furniture.jsx` | Rounded boxes and scaled spheres |
| Bookcase and books | `Furniture.jsx` | Rounded boxes |
| Music keyboard and stand | `Furniture.jsx` | Rounded boxes and cylinders |
| Record player | `Furniture.jsx` | Rounded boxes and cylinders |
| Plants | `Primitives.jsx` | Cylinders and scaled spheres |
| Foxes | `Foxes.jsx` | Spheres and cones |
| Room shell, arches and hanging lights | `Environment.jsx` | Planes, tube, cylinders and shape geometry |

## Asset loading before and after

- Before: textures used `TextureLoader`; there was no model loader.
- After: `src/scene/AssetModel.jsx` wraps Drei `useGLTF`, preloading and `Suspense` fallback.
- The loader accepts position, rotation, scale, material overrides, node-specific materials, simplified collision meshes and interaction anchors.
- A Blender source script at `scripts/build_core_assets.py` regenerates the three GLBs deterministically.

## Interaction and collision bindings

Player collision and interaction are intentionally independent from render meshes:

- Authoritative room colliders: `COLLIDERS` in `src/config/scene.js`.
- Interaction centers and labels: `INTERACTIONS` in `src/config/scene.js`.
- Runtime selection: `nearestInteraction` in `src/game/collision.js` and `useInteractionSystem` in `src/game/useInteractionSystem.js`.
- Camera poses: `CAMERA_POSES` in `src/config/scene.js`.
- GLB-local `Collision_*` and `Anchor_*` nodes document asset bounds; `GLBAsset` also supports separate invisible box colliders and named anchors. Complex display meshes are never used for player collision.

## Replaced assets

| File | Important nodes | Interaction preserved |
| --- | --- | --- |
| `vintage-crt.glb` | `CRT_Screen`, `CRT_Body`, `Tower`, keys, vents | Dynamic canvas material on `CRT_Screen`; E opens Moonroom 98 desktop |
| `acoustic-drum-kit.glb` | `Kick`, `Snare`, `HiHat_Top`, `Tom_One`, `Tom_Two`, `Floor_Tom`, `Crash`, `Ride` | J/K/L samples and node strike animation; castle/moon-river response |
| `reclining-lounge.glb` | `Lounge_Base`, `Lounge_Seat`, `Lounge_Back`, arms, pillows | E enter/exit and existing reclining camera pose |

## Validation

- Vite production build: passed.
- Node collision/interaction tests: 3/3 passed.
- Khronos glTF validation: no errors and no warnings for all three files. Informational unused UV and empty anchor-node notices are expected.
- Browser: GLBs loaded; CRT, drum and lounge modes entered/exited; drum keys produced `kick`, `snare`, `hihat` events.
- Visual: reviewed at bed, desk and lounge debug spawns. Before files are retained in `screenshots/before-phase-1-5a/`.

## Scope boundary

Only the CRT, drum kit and reclining lounge were converted in this phase. All other furniture remains procedural for later asset passes.
