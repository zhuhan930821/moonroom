"""Import the CC0 Poly Haven plant and export a browser-ready GLB."""

import bpy
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = os.environ.get("MOONROOM_PLANT_GLTF", "/tmp/moonroom-potted-plant-02/potted_plant_02_1k.gltf")
BLEND = str(ROOT / "assets-source/botanical/potted-plant-02-polyhaven.blend")
GLB = str(ROOT / "public/assets/models/botanical/potted-plant-02-polyhaven.glb")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)

for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.name = "BOTANICAL_PottedPlant02_" + obj.name

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(filepath=GLB, export_format="GLB")
