# Moonroom — Cinematic Lighting Pass 01

## Audit

- Existing scene lighting: one ambient, one hemisphere, one directional, four environment/practical point lights, plus four drum-corner point lights and decorative `GlowOrb` point lights.
- Renderer before this pass: Three.js default sRGB output; no explicit tone mapping or exposure in the main app.
- Shadows: Canvas shadows on high quality; the existing directional light used a 2048 map; most loaded meshes cast and receive shadows.
- Post-processing: none.
- GLB lights: none of the shipped GLBs contains `KHR_lights_punctual` lights.
- Existing GLB emissives: CRT power LED, companion monitor LED, MIDI OLED, drum-corner lamp/star, moon lamp, and the unused vintage CRT glass/LED.
- Screens: CRT, laptop, and companion monitor are replaced at runtime with non-tone-mapped display materials.
- Exterior: an independent plane using `/assets/textures/moon-river-sky.png` in sRGB, with a non-tone-mapped basic material. It is not a scene background texture.

## Preset

The original setup remains available as `current`. The new layers are `moon`, `warm`, `combined`, and `bloom`, selectable with `?lightingPass=` or the temporary panel at `?lightingDebug=1`.

Final first-pass values:

- Moonlight: `#aebfff`, intensity `3.2`, 2048 shadow map on high / 1024 on low.
- Warm desk light: `#ffb56f`, intensity `105`, range `5.2`, decay `2`.
- Warm lounge practical: `#ffc07c`, intensity `60.9`, range `4.6`, decay `2`.
- Ambient hemisphere: sky `#8396c8`, ground `#382a39`, intensity `0.52`.
- Tone mapping: ACES Filmic, exposure `1.0`, sRGB output.
- Bloom: strength `0.28`, radius `0.55`, threshold `1.08`.

## Comparison renders

All captures use the fixed `hero` camera and 16:9 framing. See `screenshots/cinematic-lighting-pass-01/`.
