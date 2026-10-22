# Star–moon rug material test

- Existing star/moon Base Color: reproduced from Moonroom's current `Rug()` CanvasTexture in `src/scene/Furniture.jsx`; it is not replaced by the textile's color map.
- Fabric Normal (OpenGL): `poly_wool_herringbone_nor_gl_2k.jpg`.
- Fabric Roughness: `poly_wool_herringbone_rough_2k.jpg`.
- Fabric source: https://polyhaven.com/a/poly_wool_herringbone (Poly Haven, CC0; authors Rico Cilliers and colormass).
- Downloaded resolution: 2K JPG. Source MD5: Normal `954185c16339c6bb3d1825071e4cfe90`, Roughness `009bf33f8d8a5fda0ba245e5a4dd646d`.
- UV0 maps the unchanged full star/moon artwork once. UV1 repeats the fabric relief 16 × 13 times. No Poly Haven Diffuse/Base Color map is used.
- This is an opt-in candidate at `?rugMaterialTest=1`; the default production rug remains unchanged.
