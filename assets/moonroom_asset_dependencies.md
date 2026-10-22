# Moonroom atomic-asset plan — audit only

## Evidence and scope

- Reference pack, contact sheet and annotated overview are preserved under `assets/reference/`. The pack contains **cropped 2D references only**; crops overlap and do not reveal hidden backs or exact metre dimensions. The main image reads as left loft/music, centre window/workstation and right lounging/bed. The large foreground soft surface labelled E01 is visually ambiguous between a bed and daybed; it must **not** automatically replace both the existing bed and sofa.
- `assets/moonroom_asset_inventory.csv` has 62 planning rows and the required per-asset fields. Approximate sizes for non-existing assets are **estimates**, not measurements from a 2D drawing. For each row `source_reference` names a member inside `assets/reference/Moonroom_Asset_Reference_Pack.zip`; the overview gives image-space placement.
- This task created no meshes, no GLBs and no runtime replacements. `assets/{category}/{asset_id}/source.blend`, `optimized.glb`, `textures/`, `previews/` and `asset.json` are proposed **future output paths**, not claims that files exist.

## Existing scene audit

Runtime: React Three Fiber/Three.js in `src/App.jsx`; composition in `src/scene/Environment.jsx` and `src/scene/Furniture.jsx`; shared GLB loader in `src/scene/AssetModel.jsx`. `src/config/scene.js` owns room dimensions (20 m wide × 16 m deep × 8 m high), furniture footprints, player colliders and interaction positions. `src/game/PlayerController.jsx` and `src/game/useInteractionSystem.js` handle movement/interaction; `src/audio/drums.js` maps drum events to sound. Materials and lights are currently mixed between Blender GLBs and Three.js-generated meshes. The exterior primarily uses `public/assets/textures/moon-river-sky.png`, procedural cloud geometry and runtime glowing tracks, not a collection of isolated GLBs.

Active architecture: `assets-source/architecture/moonroom-architecture-phase1.blend` → `public/assets/models/architecture/moonroom-architecture-phase1.glb` (160 meshes, mixed oak/plaster/stone/brass materials). Its back piers/spandrels are selectively hidden at runtime for the transparent window wall. The recent independent white model is `assets-source/blockout/moonroom-reference-blockout.blend` and is **review-only** at `?whiteModel=1`.

Active/available core GLBs:

| Asset | Source/runtime | State and binding |
| --- | --- | --- |
| D01 drum | `public/assets/models/acoustic-drum-kit.glb` / `src/scene/DrumKit.jsx` | **Protected default.** Position `[-7.1,0,-2.8]`; 4.2×2.2×3.8 m simplified collider; `drums` interaction; eight roots `Kick`, `Snare`, `HiHat_Top`, `Tom_One`, `Tom_Two`, `Floor_Tom`, `Crash`, `Ride`. `assets-source/drums/art-katja/` and `public/assets/models/candidates/...` are opt-in candidate material, not proof that the default was replaced. |
| C02 CRT | `public/assets/models/vintage-crt.glb` / `Workstation.jsx` | Active, positioned `[-2.65,1.22,-4.25]` at scale 0.72. `computer` ID. Dynamic screen is a runtime plane, so retain its separate surface and camera pose. |
| E01 bed | `public/assets/models/bed/messy-bed-2.glb` (CC BY 4.0, thethieme) / `Furniture.jsx` | **Active since 2026-10-22** at `[8.45,0,3]`, Y rotation −π/2, uniform scale 1.35, footprint 3.3×3.75 m, runtime recolour via `nodeOverrides`. Old Moon Nest behind `?bedLegacy=1`. |
| F01 lounge | `public/assets/models/lounge/cloud-sofa.glb` / `Lounge.jsx` | **Active since 2026-10-22** at `[1.3,0,3]`, seat facing the windows; `beanbag` interaction kept, 3.6×2.4 m footprint. Old `reclining-lounge.glb` behind `?loungeLegacy=1`. |
| Drum corner | `assets-source` build script → `public/assets/models/drum-corner.glb` / `DrumCorner.jsx` | Active, follows D01 position. Contains rug, lamp, plants, shelf and curtains; audit before splitting to avoid duplicate visible instances. |
| Moon lamp | `assets-source/lounge/moon-breathing-lamp.blend` → GLB / `DreamLoungeProps.jsx` | Active decorative light, separate from the reference pack's large moon. |
| Other variants | `reclining-lounge.glb`, `cloud-sofa.glb`, `moon-nest-textile-sample.glb`, `sketchfab-messy-bed-2/original.glb` | Keep provenance/status distinct. A file being present does not mean it is active, approved or legally reusable in a distributed build. See `assets-source/third-party/SOURCES.md`. |

Workdesk, laptop, speakers, MIDI keyboard, bookshelf, record player, plants, small lights and rug still have substantial Three.js procedural geometry or canvas textures. `src/scene/Foxes.jsx` supplies current foxes. These are placeholders/composition parts, **not** completed atomic Blender assets.

## Granularity and dependency graph

```text
ROOM shell A03 + floor A04
├── A01 loft ── G01 upper shelves ── G03 books/records
│            ├── H01 vines   └── I04 fairy lights
├── A02 arches ── H02/H03 foliage + I01/I02 pendants
│            └── B01–B05 exterior composition (separate distance layers)
├── C01 desk ── C02 CRT (preserve computer ID/screen)
│            ├── C03 laptop / C04 speaker prototype ×2 / C05 MIDI
│            └── C06 chair / C07 stand / C08 small props / C09 drawers / H04 plants / J01 crystal
├── D01 drums + D06 throne (protected; existing collider/anchor)
│            └── D02–D05 guitar/amp/turntable/headphones and drum-corner dressing
├── E01 bed ── E02 pillows / E03 throw / E04 accent pillow / J02 fox / J03 plush
├── F01 sofa ── F02 throw / F03 cushions (keep `beanbag` interaction)
│            └── F04 floor cushion / F05 coffee table / F06 rug / J04 books / I08 lights / J08 table items
└── G02 right shelf ── G05 art / H05 vines / J05 foxes / J07 trinkets
```

Small bolts, strings, seams, fabric folds, hair and wood grain are **components or baked details**, not separate runtime GLBs. Repeated books, foliage strands, stars, speakers and lamps should have source prototypes and may be combined/batched per zone. A parent assembly preview must show contacts, occlusion and real scale before export. Runtime collision remains a separate simplified shape; no complex visible mesh becomes a player collider.

## Production ranking (difficulty × visual effect × reuse)

| Order | Candidate | Difficulty | Visual impact | Reuse | Decision |
| --- | --- | --- | --- | --- | --- |
| 1 | **C04 one studio speaker prototype** | Low–medium | Medium | High (pair; material/node test) | **First minimal validation asset.** Visible near the centre, existing placeholder, no interaction or room-coordinate change. Build one quality speaker with near-field monitor proportions, then duplicate within one pair assembly. |
| 2 | C01 long desk | Medium | Very high | Medium | Main composition anchor, but changing silhouette before fixing equipment clearances risks rework. |
| 3 | I03 standing globe lamp | Medium | High | Medium | Validates emissive mesh versus Three.js real light; needs lounge layout approval. |
| 4 | G03 books/records prototype | Low–medium | Medium | Very high | Strong density builder after shelf geometry is stable. |
| 5 | H06 floor plant prototype | Medium | Medium | High | Foliage/alpha-performance validation. |
| 6 | F02 or E03 blanket | High | High | Low–medium | Cloth/texture quality is important but depends on approved sofa/bed contact geometry. |
| 7 | B03 castle | Very high | Very high | Low | Do only after window framing and exterior scale are locked. |

The C04 acceptance test should include: Blender neutral and PBR close-ups; correct 0.42×0.42×0.82 m scale; one GLB with named cabinet/woofer/tweeter components, an `asset.json` source/license record, readable materials in Moonroom under current lighting, draw-call/triangle count, and no alteration to C02/Drum Session. This recommendation is **not authorization to start modeling**.

## Per-asset gate and publication rule

`REFERENCE_ONLY → PLANNED → MODELING → BLENDER_PREVIEW → GLB_STAGED → THREEJS_PREVIEW → APPROVED → ACTIVE`. Do not collapse `GLB_STAGED` into `ACTIVE`. One asset ID at a time: compare to its crop and neighboring assets; select permitted base model or Blender hard-surface/sculpt/cloth; build UV and PBR maps; inspect neutral/PBR near view; export with real-time compatible modifiers/curves/hair baked or converted; load staging GLB in Three.js; measure performance; request user visual approval. Preserve third-party author, URL, license and attribution. Do not distribute source pack crops as though they were transparent textures or owned models.

## Unresolved decisions before later replacements

1. E01 in the 2D pack might be a bed/daybed/sofa hybrid, while the runtime has **two** distinct objects E01 and F01. Confirm reference ownership before changing either visual model.
2. Most concept-image dimensions and invisible back surfaces cannot be deduced; the inventory's new-asset sizes are deliberately approximate.
3. New assets should be normalized to metres and scale 1, but active older GLBs use mixed `axisCorrection` and non-unit scale. Migration must be asset-by-asset, never a global transform change.
4. The reference pack contains image crops only; it does not grant a license for third-party 3D models. Source/licensing must be verified for each eventual base mesh.
