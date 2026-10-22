# Moonroom soft furnishing source assets (staging only)

These files are not loaded by the game. The chosen Sketchfab sofa and bed still require authenticated downloads supplied by the user.

- `polyhaven-throw-pillows-01/`: **Throw Pillows 01**, Serhii Khromov, Poly Haven, CC0. Source: https://polyhaven.com/a/throw_pillows_01 . Downloaded as 1K glTF + binary + PBR maps via the official Poly Haven API. Official MD5 hashes were checked.
- `shapespark-textiles/shapespark_textiles-set.glb`: **Shapespark Textiles Set**, Shapespark, CC0. Source: https://github.com/shapespark/shapespark-assets/tree/main/shapespark-textiles-set . The staged Blender file keeps only its two blanket meshes; the original full GLB remains here for provenance.

Both blanket meshes are small folded/draped props (~0.5 m wide), not a ready-made oversized sofa throw. They must be reshaped or replaced after the actual sofa geometry is available; simply scaling them up would stretch the folds.

- `sketchfab-messy-bed-2/original.glb`: **Messy bed 2.0 (with wall mounted backboard)**, thethieme, Sketchfab, CC BY 4.0 as listed on the [model page](https://sketchfab.com/3d-models/messy-bed-20-with-wall-mounted-backboard-a2b2645701c94fa49e65661806219c6b). User-supplied converted GLB, received 2026-10-18. Staging only; not loaded by Moonroom. Blender preview: `screenshots/candidate-messy-bed-neutral.png`. Credit and source link must accompany any eventual redistribution. The dark wooden headboard and current gray fabrics are not yet adapted to Moonroom's art direction.
- `polyhaven-curly-teddy-natural/`: **Curly Teddy Natural**, Poly Haven, CC0. Source: https://polyhaven.com/a/curly_teddy_natural . Official 1K diffuse and OpenGL normal JPGs were downloaded and MD5-checked against the official API. The color texture is tinted lavender in the staging Blender asset; the normal map is used on its throw. This is a test material, not yet an approved Moonroom asset.
