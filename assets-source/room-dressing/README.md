# Room dressing — Blender source

`source.blend` is the editable Moonroom source for the room's potted plants,
ceiling vines, flowers, small lamps, hanging stars, fairy-light cable/sockets,
candles and continuous curtain rail. Each element has a stable descriptive
object name under `MOONROOM_ROOM_DRESSING / BOTANICAL` or
`LIGHTING_FIXTURES`.

Regenerate the browser asset with:

```sh
blender -b -t 4 --python scripts/build_room_dressing.py
```

The exported `public/assets/models/decor/room-dressing.glb` merges visible
meshes by material for real-time rendering. The source `.blend` remains
unbatched and editable. Placement is in Moonroom world metres. The build script
maps Three.js `(x, y, z)` to Blender `(x, -z, y)` and exports Y-up glTF.

Three.js still owns real-time illumination, candle flames, fairy-light pulses
and animated voile fabric. The floor lamp and moon lamp were already Blender
assets and are intentionally not duplicated here.
