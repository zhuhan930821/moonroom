# Moonroom celestial rug — rejected experiment

- Asset ID: `RUG_MOONROOM_CELESTIAL_V1`
- Status: **rejected**. The production rug is unchanged, and this experiment is not loaded at runtime.
- Source: original Blender mesh and original celestial pattern made for Moonroom on 2026-10-21. The pile detail now uses [Poly Haven Curly Teddy Natural](https://polyhaven.com/a/curly_teddy_natural) photographed diffuse, normal, and roughness maps (CC0), tinted deep plum beneath the original star pattern.
- Visual direction attempted: deep-plum celestial plush rug with a soft bound edge and slight surface undulation. The flat candidate, triangle-fiber test, and alpha-tested pile-shell test all failed the requested fluffy close-up quality.
- Third-party reference: [Sousinho, “Rug – Square Pattern” on Sketchfab](https://sketchfab.com/3d-models/rug-square-pattern-7d708b5c991a46f993ca588d5cdf5dfa), considered as a shape reference. Sketchfab's download API returned HTTP 401, so no part of that model was downloaded or imported.
- Build: `blender -b -P scripts/build_moonroom_celestial_rug.py`. Blender's Python requires NumPy and Pillow; the script can use Pillow installed in Blender's user site packages.
- No in-game preview is enabled after rejection. The Blender experiment and screenshots remain for diagnosis only.

The mesh has a simplified underside. Interaction IDs, furniture positions, and the drum kit are unchanged. Do not promote this GLB without replacing its surface solution and repeating visual/performance tests.
