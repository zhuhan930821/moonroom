# Moonroom architecture — Phase 1 review

This started as a Blender-only architectural proposal. After review, the shell was loaded and tested in Moonroom, then made the default building. The former Three.js shell remains available with `?architecture=legacy`. Existing drum models, furniture transforms, collision data, camera anchors and interaction code were not changed. The source and export are:

- `assets-source/architecture/moonroom-architecture-phase1.blend`
- `public/assets/models/architecture/moonroom-architecture-phase1.glb`
- Generator: `scripts/build_moonroom_architecture.py`
- Neutral review renderer: `scripts/render_moonroom_architecture_review.py`

The scene uses the existing 20 × 16 × 8 metre room coordinate system. Three actual open archways align with `WINDOW_ARCHES` at X = −5.25, 0, +5.25; the back wall is at Z ≈ −7.8. A 2.2 m doorway is open at the room entry. The proposed west sleeping loft occupies X ≈ −9.8…−6.1 and Z ≈ +0.7…+7.8, behind the existing drum footprint. Floor inlays mark the workspace and lounge but do not reposition them. The drum at (−7.1, 0, −2.8), CRT, desk, bed and lounge are only reference positions and are not included in the exported GLB.

Blender Collections: `ARCH_01_Structure`, `ARCH_02_Floor`, `ARCH_03_Gothic_Windows`, `ARCH_04_Wall_Detail`, `ARCH_05_West_Loft`, `ARCH_06_Zone_Trim`. Every exported object has a stable `asset_id` custom property, preserved as GLB node extras. The GLB has 160 nodes, 165 mesh primitives, 14 materials, about 23,392 triangles and is 1.31 MB. This is a layout-stage export; draw calls should be reviewed before live integration.

## Review images

- [Front wide](../screenshots/architecture-phase-1/front_wide.png)
- [West / drum-side context](../screenshots/architecture-phase-1/west_drum_context.png)
- [East / lounge-side context](../screenshots/architecture-phase-1/east_lounge_context.png)
- [West loft underside and railing](../screenshots/architecture-phase-1/west_loft_detail.png)

These are neutral Blender Workbench geometry/material reviews, not final-lit Moonroom screenshots. The front-wide camera is positioned at the existing `curtainWall` QA spawn (0, 1.68, 5.7) with a roughly matching 66° vertical field of view and slight upward pitch. The openings show the review background because the existing moon/cloud/castle assets are deliberately **not** imported into this architectural source. The render intentionally has no furniture or drum.

## In-game integration review

- [Front, fixed QA camera](../screenshots/architecture-phase-1/browser-preview/front.png)
- [Drum corner, unchanged kit](../screenshots/architecture-phase-1/browser-preview/drum-corner.png)

The browser preview initially exposed a floor-height error that hid the star rug and a side-wall shadow artifact. The exported floor was lowered and architecture cast shadows disabled; the two final screenshots above show the rug and clean wall. The dynamic outside, curtains, drum kit and CRT were retained. Browser capture reported no page or asset-loading errors. Automated browser checks verified that computer and drum modes can be entered and exited. A headless-browser attempt to verify an actual kick sound event did not produce a hit event, so audio playback still requires interactive desktop verification. At the 1280×720 headless front view the scene reports about 541 draw calls / 262k triangles. That is a software-rendered QA sample, not a desktop GPU FPS result.

## Remaining work

Phase 2 furniture and Phase 3 decoration are separate work. This shell improves architecture and room depth, but the in-game screenshot remains much sparser than the final reference. The 160 GLB nodes should be batched or instanced selectively before the final performance pass. Player movement still uses the existing simplified collision bounds; the new doorway is visual only and does not open the world map. No claim is made that the shell alone achieves the final reference quality.
