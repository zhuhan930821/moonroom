# Moonroom — Golden Lighting Pass 01 (I04 fairy lights + I07 candles)

Status: **default since 2026-10-22** (user approved). `?lightingPass=current` shows the previous lighting; `?fairyLights=0` hides garlands and candles.

## What changes
- `golden` preset in `src/lighting/CinematicLighting.jsx`: warm practicals lead (desk, lounge lamp, drum corner, bookshelf, bed, room fill); moonlight drops to a lavender rim (1.35); warm hemisphere; ACES exposure 1.15; bloom 0.38 / threshold 1.0.
- `src/scene/FairyLights.jsx`: 8 catenary strands (window bays, left wall over drums, bookshelf crown, bed-head wall) as one instanced mesh of ~150 HDR bulbs with slow twinkle; 4 candle groups (desk centre, bookshelf/bed gap, left wall, drum corner) with flicker. Real point lights: 1 per strand (high quality only) + 1 per candle group.
- `?fairyLights=0/1` toggles the garlands independently of the lighting pass.
- No interaction coordinates, colliders, or approved assets were changed.

## Review captures
`node scripts/capture_golden_pass.mjs` (dev server on :5174) → `screenshots/golden-pass-01/{hero,drumCorner,bed,deskView}-{current,golden}.png`.

## Known issues
- CRT bezel bloom: desk light moved to `[-.6,3.2,-3.0]` at 0.8× and bloom threshold raised to 1.12.
- Ceiling beams are still dark; the reference ceiling is warmer. Needs a loft (A01) / ceiling garland pass rather than more fill light.
- FPS from headless capture is not representative; measure on target hardware before promoting to default.
